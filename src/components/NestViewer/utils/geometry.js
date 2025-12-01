/**
 * Geometry Utilities for NestViewer
 * Functions for polygon analysis, point-in-polygon tests, and label positioning
 */

// Extract polygon points from SVG element
export const getPolygonPoints = (svgElements) => {
  const points = [];
  if (!svgElements || svgElements.length === 0) return points;
  
  for (const element of svgElements) {
    const tagName = element.tagName?.toLowerCase();
    
    if (tagName === 'polygon') {
      const pointsAttr = element.getAttribute('points');
      if (pointsAttr) {
        // Handle both "x,y x,y" and "x y x y" formats
        const nums = pointsAttr.trim().match(/[\d.-]+/g);
        if (nums && nums.length >= 4) {
          for (let i = 0; i < nums.length - 1; i += 2) {
            const x = parseFloat(nums[i]);
            const y = parseFloat(nums[i + 1]);
            if (!isNaN(x) && !isNaN(y)) {
              points.push({ x, y });
            }
          }
        }
      }
    } else if (tagName === 'path') {
      // Parse path d attribute - handle M, L, H, V commands
      const d = element.getAttribute('d');
      if (d) {
        let currentX = 0, currentY = 0;
        // Split by commands but keep the command letter
        const parts = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
        if (parts) {
          for (const part of parts) {
            const cmd = part[0].toUpperCase();
            const nums = part.slice(1).match(/[\d.-]+/g)?.map(Number) || [];
            
            if (cmd === 'M' || cmd === 'L') {
              for (let i = 0; i < nums.length - 1; i += 2) {
                currentX = nums[i];
                currentY = nums[i + 1];
                points.push({ x: currentX, y: currentY });
              }
            } else if (cmd === 'H') {
              for (const x of nums) {
                currentX = x;
                points.push({ x: currentX, y: currentY });
              }
            } else if (cmd === 'V') {
              for (const y of nums) {
                currentY = y;
                points.push({ x: currentX, y: currentY });
              }
            }
            // Z closes the path, no action needed
          }
        }
      }
    } else if (tagName === 'rect') {
      const x = parseFloat(element.getAttribute('x')) || 0;
      const y = parseFloat(element.getAttribute('y')) || 0;
      const w = parseFloat(element.getAttribute('width')) || 0;
      const h = parseFloat(element.getAttribute('height')) || 0;
      points.push({ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h });
    }
    
    if (points.length > 0) break; // Use first shape found
  }
  
  return points;
};

// Check if a point is inside a polygon using ray casting
export const pointInPolygon = (point, polygon) => {
  if (polygon.length < 3) return false;
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
};

// Calculate distance from a point to a line segment
export const pointToSegmentDistance = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  
  return Math.hypot(px - nearestX, py - nearestY);
};

// Calculate minimum distance from point to polygon edges
export const distanceToPolygonEdge = (point, polygon) => {
  let minDist = Infinity;
  
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const dist = pointToSegmentDistance(
      point.x, point.y,
      polygon[i].x, polygon[i].y,
      polygon[j].x, polygon[j].y
    );
    minDist = Math.min(minDist, dist);
  }
  
  return minDist;
};

// Find the "pole of inaccessibility" - the point furthest from any edge
// This finds the visual center of complex shapes like L, U, T
export const findPoleOfInaccessibility = (polygon, bounds, precision = 1) => {
  const minX = bounds.x;
  const minY = bounds.y;
  const maxX = bounds.x + bounds.width;
  const maxY = bounds.y + bounds.height;
  
  // Use iterative grid refinement to find the best point
  let bestPoint = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  let bestDistance = -Infinity;
  
  // Start with coarse grid, then refine
  let cellSize = Math.max(bounds.width, bounds.height) / 4;
  
  while (cellSize > precision) {
    // Search in current cell around best point
    for (let x = bestPoint.x - cellSize * 2; x <= bestPoint.x + cellSize * 2; x += cellSize) {
      for (let y = bestPoint.y - cellSize * 2; y <= bestPoint.y + cellSize * 2; y += cellSize) {
        // Clamp to bounds
        const testX = Math.max(minX, Math.min(maxX, x));
        const testY = Math.max(minY, Math.min(maxY, y));
        const testPoint = { x: testX, y: testY };
        
        if (!pointInPolygon(testPoint, polygon)) continue;
        
        const dist = distanceToPolygonEdge(testPoint, polygon);
        if (dist > bestDistance) {
          bestDistance = dist;
          bestPoint = testPoint;
        }
      }
    }
    
    // Reduce cell size for finer search
    cellSize /= 2;
  }
  
  return bestPoint;
};

// Find best label position inside a polygon
// Can use either svgElements or a polygon tree with direct point data
export const findLabelPosition = (svgElements, bounds, polygonTree = null) => {
  // Fallback to bounding box center
  const fallback = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
  
  // First try to get points from polygonTree (most accurate)
  let points = [];
  if (polygonTree && Array.isArray(polygonTree)) {
    // polygonTree is an array of {x, y} points
    points = polygonTree.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
  }
  
  // Fall back to extracting from SVG elements
  if (points.length < 3) {
    points = getPolygonPoints(svgElements);
  }
  
  if (points.length < 3) return fallback;
  
  // Use pole of inaccessibility for complex shapes
  // This finds the point furthest from all edges - ideal for L, U, T shapes
  const precision = Math.min(bounds.width, bounds.height) / 20;
  const polePoint = findPoleOfInaccessibility(points, bounds, precision);
  
  // Verify the point is inside
  if (pointInPolygon(polePoint, points)) {
    return polePoint;
  }
  
  // Fallback: sample grid and find point with maximum distance to edges
  let bestPoint = fallback;
  let bestDist = -Infinity;
  
  const gridSize = 10;
  const stepX = bounds.width / (gridSize + 1);
  const stepY = bounds.height / (gridSize + 1);
  
  for (let i = 1; i <= gridSize; i++) {
    for (let j = 1; j <= gridSize; j++) {
      const testPoint = {
        x: bounds.x + stepX * i,
        y: bounds.y + stepY * j
      };
      
      if (pointInPolygon(testPoint, points)) {
        const dist = distanceToPolygonEdge(testPoint, points);
        if (dist > bestDist) {
          bestDist = dist;
          bestPoint = testPoint;
        }
      }
    }
  }
  
  return bestPoint;
};
