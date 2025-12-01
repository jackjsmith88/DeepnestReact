import { useEffect, useRef, useState } from 'react';

/**
 * NestViewer component displays the nesting results in an interactive SVG
 * Shows parts placed on sheets with different colors/patterns
 * 
 * Unit Conversion Notes:
 * - SVG Generator uses DPI (default 72) to convert mm → pixels: pixels = (mm / 25.4) * DPI
 * - Deepnest uses scale (default 72, meaning 72 pixels per inch)
 * - Both systems are compatible when DPI = scale
 * - To convert pixels to mm: mm = (pixels * 25.4) / scale
 * - To convert pixels to inches: inches = pixels / scale
 */

// Default scale (pixels per inch) - matches Deepnest's default
const DEFAULT_SCALE = 72;

// Convert pixels to millimeters
const pxToMm = (px, scale = DEFAULT_SCALE) => (px * 25.4) / scale;

// Convert pixels to inches
const pxToInch = (px, scale = DEFAULT_SCALE) => px / scale;

// Format dimension for display
const formatDimension = (px, unit = 'mm', scale = DEFAULT_SCALE) => {
  if (unit === 'mm') {
    return `${pxToMm(px, scale).toFixed(1)}mm`;
  } else if (unit === 'inch') {
    return `${pxToInch(px, scale).toFixed(2)}"`;
  }
  return `${px.toFixed(0)}px`;
};

// Extract polygon points from SVG element
const getPolygonPoints = (svgElements) => {
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
const pointInPolygon = (point, polygon) => {
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
const pointToSegmentDistance = (px, py, x1, y1, x2, y2) => {
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
const distanceToPolygonEdge = (point, polygon) => {
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
const findPoleOfInaccessibility = (polygon, bounds, precision = 1) => {
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
    let improved = false;
    
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
          improved = true;
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
const findLabelPosition = (svgElements, bounds, polygonTree = null) => {
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

export default function NestViewer({ nests, parts, onSelectNest, config }) {
  const svgRef = useRef(null);
  const [selectedNest, setSelectedNest] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [dimensionUnit, setDimensionUnit] = useState('mm');
  const [labelSizePercent, setLabelSizePercent] = useState(3); // Label size as percentage of sheet width
  
  // Get scale from config or use default
  const scale = config?.scale || DEFAULT_SCALE;
  
  // Generate debug report
  const generateDebugReport = () => {
    if (!nests || nests.length === 0 || !parts) return '';
    
    const nest = nests[selectedNest];
    if (!nest) return '';
    
    const sheetPart = parts.find(p => p.sheet);
    const sheetBounds = sheetPart?.bounds;
    
    let report = `=== DEEPNEST DEBUG REPORT ===\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += `--- UNIT CONVERSION ---\n`;
    report += `Scale: ${scale} pixels/inch\n`;
    report += `1 inch = 25.4mm = ${scale}px\n`;
    report += `1mm = ${(scale / 25.4).toFixed(3)}px\n\n`;
    
    report += `--- SHEET INFO ---\n`;
    report += `Sheet bounds (px): (${sheetBounds?.x?.toFixed(0)}, ${sheetBounds?.y?.toFixed(0)}) ${sheetBounds?.width?.toFixed(0)}x${sheetBounds?.height?.toFixed(0)}\n`;
    report += `Sheet size (mm): ${pxToMm(sheetBounds?.width, scale).toFixed(1)} × ${pxToMm(sheetBounds?.height, scale).toFixed(1)}\n\n`;
    
    report += `--- NEST INFO ---\n`;
    report += `Selected Nest: ${selectedNest + 1}\n`;
    report += `Fitness: ${nest.fitness?.toFixed(4)} (lower is better, 1.0 = 100% sheet used)\n`;
    report += `Placements: ${nest.placements?.length || 0} sheets\n\n`;
    
    report += `--- PARTS INFO ---\n`;
    parts.forEach((part, idx) => {
      const widthMm = pxToMm(part.bounds?.width, scale).toFixed(1);
      const heightMm = pxToMm(part.bounds?.height, scale).toFixed(1);
      report += `Part ${idx}: sheet=${part.sheet || false}, size=${widthMm}×${heightMm}mm (${part.bounds?.width?.toFixed(0)}×${part.bounds?.height?.toFixed(0)}px)\n`;
    });
    report += `\n`;
    
    report += `--- PLACEMENT DETAILS ---\n`;
    if (nest.placements) {
      nest.placements.forEach((sheetPlacement, sIdx) => {
        report += `Sheet ${sIdx}:\n`;
        if (sheetPlacement.sheetplacements) {
          sheetPlacement.sheetplacements.forEach((p, pIdx) => {
            const part = parts[p.source];
            report += `  Part ${pIdx}: source=${p.source}, translate=(${p.x?.toFixed(0)}, ${p.y?.toFixed(0)}), rotation=${p.rotation || 0}\n`;
            report += `    Part bounds: (${part?.bounds?.x?.toFixed(0)}, ${part?.bounds?.y?.toFixed(0)}) ${part?.bounds?.width?.toFixed(0)}x${part?.bounds?.height?.toFixed(0)}\n`;
            if (sheetBounds) {
              const finalX = p.x - sheetBounds.x;
              const finalY = p.y - sheetBounds.y;
              report += `    Final transform: translate(${finalX.toFixed(0)}, ${finalY.toFixed(0)})\n`;
              const expectedX = part?.bounds?.x + finalX;
              const expectedY = part?.bounds?.y + finalY;
              report += `    Expected position: (${expectedX?.toFixed(0)}, ${expectedY?.toFixed(0)})\n`;
            }
          });
        }
      });
    }
    
    return report;
  };
  
  const copyDebugReport = async () => {
    const report = generateDebugReport();
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  useEffect(() => {
    if (nests && nests.length > 0 && parts) {
      renderNest(nests[selectedNest]);
    }
  }, [nests, selectedNest, parts, showDimensions, dimensionUnit, labelSizePercent]);
  
  const renderNest = (nest) => {
    if (!nest || !nest.placements) return;
    
    const svg = svgRef.current;
    if (!svg) return;
    
    // Clear previous content
    svg.innerHTML = '';
    
    // Create defs for patterns
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
    
    // Add arrow markers for dimension lines
    if (showDimensions) {
      const arrowStart = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      arrowStart.setAttribute('id', 'arrowStart');
      arrowStart.setAttribute('markerWidth', '10');
      arrowStart.setAttribute('markerHeight', '10');
      arrowStart.setAttribute('refX', '0');
      arrowStart.setAttribute('refY', '3');
      arrowStart.setAttribute('orient', 'auto');
      const pathStart = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathStart.setAttribute('d', 'M6,0 L6,6 L0,3 z');
      pathStart.setAttribute('fill', '#4a9eff');
      arrowStart.appendChild(pathStart);
      defs.appendChild(arrowStart);
      
      const arrowEnd = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      arrowEnd.setAttribute('id', 'arrowEnd');
      arrowEnd.setAttribute('markerWidth', '10');
      arrowEnd.setAttribute('markerHeight', '10');
      arrowEnd.setAttribute('refX', '6');
      arrowEnd.setAttribute('refY', '3');
      arrowEnd.setAttribute('orient', 'auto');
      const pathEnd = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEnd.setAttribute('d', 'M0,0 L0,6 L6,3 z');
      pathEnd.setAttribute('fill', '#4a9eff');
      arrowEnd.appendChild(pathEnd);
      defs.appendChild(arrowEnd);
    }
    
    // Find the sheet (first part marked as sheet)
    const sheetIndex = parts.findIndex(p => p.sheet);
    const sheetPart = sheetIndex >= 0 ? parts[sheetIndex] : null;
    
    if (!sheetPart) {
      console.warn('No sheet found in parts');
      return;
    }
    
    const sheetBounds = sheetPart.bounds;
    
    // Calculate label size based on percentage of sheet width
    // labelSizePercent is 1-10, representing 1-10% of sheet width
    const labelSize = Math.round(sheetBounds.width * labelSizePercent / 100);
    
    // The sheet's original position in the SVG
    const sheetOriginX = sheetBounds.x;
    const sheetOriginY = sheetBounds.y;
    
    // ViewBox: we want to see the sheet area (normalized to 0,0) plus padding
    const padding = 50;
    const viewBoxX = -padding;
    const viewBoxY = -padding;
    const viewBoxWidth = sheetBounds.width + padding * 2;
    const viewBoxHeight = sheetBounds.height + padding * 2;
    
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    
    // Render each sheet placement
    nest.placements.forEach((sheetPlacement, idx) => {
      // Get the sheet part using the sheet index from placement
      const sheetPartIdx = sheetPlacement.sheet !== undefined ? sheetPlacement.sheet : sheetIndex;
      const currentSheet = parts[sheetPartIdx] || sheetPart;
      const currentSheetBounds = currentSheet.bounds;
      

      
      // Create group for this sheet - this group transforms everything to normalized coordinates
      const sheetGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      sheetGroup.setAttribute('id', `sheet${sheetPlacement.sheetid}`);
      sheetGroup.setAttribute('class', 'sheet');
      
      // Draw sheet outline
      // The sheet elements have original coordinates, so we translate them to start at 0,0
      if (currentSheet.svgelements) {
        currentSheet.svgelements.forEach(element => {
          const node = element.cloneNode(true);
          node.setAttribute('transform', `translate(${-sheetOriginX} ${-sheetOriginY})`);
          node.setAttribute('stroke', '#4a9eff');
          node.setAttribute('fill', 'rgba(74, 158, 255, 0.05)');
          node.setAttribute('stroke-width', '3');
          sheetGroup.appendChild(node);
        });
      }
      
      // Add sheet dimension overlay if enabled
      if (showDimensions) {
        const dimGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        dimGroup.setAttribute('class', 'sheet-dimensions');
        
        // Sheet width dimension (top)
        const widthText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        widthText.setAttribute('x', currentSheetBounds.width / 2);
        widthText.setAttribute('y', -(labelSize + 5));
        widthText.setAttribute('text-anchor', 'middle');
        widthText.setAttribute('fill', '#4a9eff');
        widthText.setAttribute('font-size', labelSize.toString());
        widthText.setAttribute('font-weight', 'bold');
        widthText.textContent = formatDimension(currentSheetBounds.width, dimensionUnit, scale);
        dimGroup.appendChild(widthText);
        
        // Width dimension line
        const widthLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        widthLine.setAttribute('x1', 0);
        widthLine.setAttribute('y1', -(labelSize / 2));
        widthLine.setAttribute('x2', currentSheetBounds.width);
        widthLine.setAttribute('y2', -(labelSize / 2));
        widthLine.setAttribute('stroke', '#4a9eff');
        widthLine.setAttribute('stroke-width', '1');
        widthLine.setAttribute('marker-start', 'url(#arrowStart)');
        widthLine.setAttribute('marker-end', 'url(#arrowEnd)');
        dimGroup.appendChild(widthLine);
        
        // Sheet height dimension (left)
        const heightText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        heightText.setAttribute('x', -(labelSize + 15));
        heightText.setAttribute('y', currentSheetBounds.height / 2);
        heightText.setAttribute('text-anchor', 'middle');
        heightText.setAttribute('fill', '#4a9eff');
        heightText.setAttribute('font-size', labelSize.toString());
        heightText.setAttribute('font-weight', 'bold');
        heightText.setAttribute('transform', `rotate(-90, ${-(labelSize + 15)}, ${currentSheetBounds.height / 2})`);
        heightText.textContent = formatDimension(currentSheetBounds.height, dimensionUnit, scale);
        dimGroup.appendChild(heightText);
        
        // Height dimension line
        const heightLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        heightLine.setAttribute('x1', -(labelSize / 2 + 5));
        heightLine.setAttribute('y1', 0);
        heightLine.setAttribute('x2', -(labelSize / 2 + 5));
        heightLine.setAttribute('y2', currentSheetBounds.height);
        heightLine.setAttribute('stroke', '#4a9eff');
        heightLine.setAttribute('stroke-width', '1');
        heightLine.setAttribute('marker-start', 'url(#arrowStart)');
        heightLine.setAttribute('marker-end', 'url(#arrowEnd)');
        dimGroup.appendChild(heightLine);
        
        sheetGroup.appendChild(dimGroup);
      }
      
      // Draw parts on this sheet - collect label info for later
      const labelsToDraw = [];
      
      if (sheetPlacement.sheetplacements) {
        
        // Build a map of non-sheet parts for source lookup
        const nonSheetParts = parts.filter(p => !p.sheet);
        
        sheetPlacement.sheetplacements.forEach((partPlacement, pIdx) => {
          // source is the index in the original parts array (including sheets)
          const sourceIndex = partPlacement.source;
          const part = parts[sourceIndex];
          
          if (!part) {
            console.warn('Part not found for source:', sourceIndex);
            return;
          }
          
          // Skip sheets
          if (part.sheet) return;
          
          const partBounds = part.bounds;

          
          // Create unique color for this part
          const hue = (360 * pIdx / Math.max(sheetPlacement.sheetplacements.length, 1)) % 360;
          
          // Create pattern
          const patternId = `part${partPlacement.id}hatch`;
          if (!defs.querySelector(`#${patternId}`)) {
            const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.setAttribute('id', patternId);
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            const psize = 8;
            pattern.setAttribute('width', psize);
            pattern.setAttribute('height', psize);
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M0,0 L${psize},${psize} M-1,${psize-1} L1,${psize+1} M${psize-1},-1 L${psize+1},1`);
            path.setAttribute('stroke', `hsl(${hue}, 80%, 60%)`);
            path.setAttribute('stroke-width', '1');
            pattern.appendChild(path);
            defs.appendChild(pattern);
          }
          
          // Create part group
          const partGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          partGroup.setAttribute('id', `part${partPlacement.id}`);
          partGroup.setAttribute('class', 'part');
          
          // The placement x,y are the translation from original position to target position
          // The original position is partBounds.x, partBounds.y
          // After applying translation (x, y), the part moves to: original + translation
          // We also need to normalize to the sheet's coordinate system (subtract sheetOrigin)
          
          // Final transform combines:
          // 1. The worker's translation (partPlacement.x, y) which moves from original to target
          // 2. Normalization to put the sheet at 0,0 (subtract sheetOrigin)
          const finalX = partPlacement.x - sheetOriginX;
          const finalY = partPlacement.y - sheetOriginY;
          
          // Rotation is in degrees from the worker
          // The worker rotates the polygon around its center before computing placement.
          // We apply the same rotation in the viewer around the part's center.
          const rotationDeg = partPlacement.rotation || 0;
          
          // The part's center in original coordinates (for rotation pivot)
          const partCenterX = partBounds.x + partBounds.width / 2;
          const partCenterY = partBounds.y + partBounds.height / 2;
          
          // Apply transform: first rotate around part center, then translate
          // SVG transforms apply right-to-left, so this order is correct
          if (rotationDeg !== 0) {
            partGroup.setAttribute('transform', `translate(${finalX} ${finalY}) rotate(${rotationDeg} ${partCenterX} ${partCenterY})`);
          } else {
            partGroup.setAttribute('transform', `translate(${finalX} ${finalY})`);
          }
          

          
          // Draw part elements
          if (part.svgelements) {
            part.svgelements.forEach((element, elIdx) => {
              const node = element.cloneNode(true);
              
              // Style the element
              node.setAttribute('fill', `hsl(${hue}, 50%, 65%)`);
              node.setAttribute('fill-opacity', '0.8');
              node.setAttribute('stroke', `hsl(${hue}, 70%, 35%)`);
              node.setAttribute('stroke-width', '2');
              
              partGroup.appendChild(node);
            });
          }
          
          // Store label info to draw later (on top of all parts)
          if (showDimensions) {
            // Find the best position inside the polygon for the label
            // Pass polygontree if available for accurate polygon points
            const labelPos = findLabelPosition(part.svgelements, partBounds, part.polygontree);
            
            // Transform label position to final screen coordinates
            // First apply rotation around part center, then translation
            let labelX = labelPos.x;
            let labelY = labelPos.y;
            
            if (rotationDeg !== 0) {
              // Rotate around part center
              const rad = rotationDeg * Math.PI / 180;
              const dx = labelPos.x - partCenterX;
              const dy = labelPos.y - partCenterY;
              labelX = partCenterX + dx * Math.cos(rad) - dy * Math.sin(rad);
              labelY = partCenterY + dx * Math.sin(rad) + dy * Math.cos(rad);
            }
            
            // Then translate
            labelX += finalX;
            labelY += finalY;
            
            labelsToDraw.push({
              x: labelX,
              y: labelY,
              text: `#${pIdx + 1}`,
              fontSize: labelSize
            });
          }
          
          sheetGroup.appendChild(partGroup);
        });
      }
      
      svg.appendChild(sheetGroup);
      
      // Draw all labels on top in a separate group
      if (showDimensions && labelsToDraw.length > 0) {
        const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        labelsGroup.setAttribute('class', 'labels-layer');
        
        labelsToDraw.forEach(labelInfo => {
          const dimLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          dimLabel.setAttribute('x', labelInfo.x);
          dimLabel.setAttribute('y', labelInfo.y);
          dimLabel.setAttribute('text-anchor', 'middle');
          dimLabel.setAttribute('dominant-baseline', 'middle');
          dimLabel.setAttribute('fill', '#fff');
          dimLabel.setAttribute('font-size', labelInfo.fontSize.toString());
          dimLabel.setAttribute('font-weight', 'bold');
          dimLabel.setAttribute('style', `text-shadow: 2px 2px 4px rgba(0,0,0,0.95), -2px -2px 4px rgba(0,0,0,0.95), 2px -2px 4px rgba(0,0,0,0.95), -2px 2px 4px rgba(0,0,0,0.95);`);
          dimLabel.textContent = labelInfo.text;
          labelsGroup.appendChild(dimLabel);
        });
        
        svg.appendChild(labelsGroup);
      }
    });
    
  };
  
  const handleNestSelection = (index) => {
    setSelectedNest(index);
    if (onSelectNest) {
      onSelectNest(nests[index]);
    }
  };
  
  if (!nests || nests.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
        No nesting results yet. Click "Start Nest" to begin.
      </div>
    );
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a1a' }}>
      {/* Nest selection tabs */}
      {nests.length > 1 && (
        <div style={{ 
          display: 'flex', 
          gap: '5px', 
          padding: '10px',
          borderBottom: '1px solid #3a3a3a',
          overflowX: 'auto',
          background: '#2a2a2a'
        }}>
          {nests.map((nest, index) => (
            <button
              key={index}
              onClick={() => handleNestSelection(index)}
              style={{
                padding: '8px 16px',
                border: '1px solid #3a3a3a',
                borderRadius: '4px',
                background: selectedNest === index ? '#646cff' : '#333',
                color: '#fff',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Nest {index + 1} ({((nest.sheetUsage || 0) * 100).toFixed(1)}%)
            </button>
          ))}
        </div>
      )}
      
      {/* Nest info */}
      <div style={{ 
        padding: '10px', 
        background: '#2a2a2a',
        borderBottom: '1px solid #3a3a3a',
        color: '#ccc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ fontSize: '14px' }}>
          <strong style={{ color: '#fff' }}>Sheet Usage:</strong> {((nests[selectedNest]?.sheetUsage || 0) * 100).toFixed(1)}%
          {' | '}
          <strong style={{ color: '#fff' }}>Parts:</strong> {nests[selectedNest]?.placedCount || 0}/{nests[selectedNest]?.totalCount || 0}
          {' | '}
          <strong style={{ color: '#fff' }}>Sheets:</strong> {nests[selectedNest]?.sheetsUsed || nests[selectedNest]?.placements?.length || 1}
          {config?.spacing > 0 && (
            <>
              {' | '}
              <strong style={{ color: '#fff' }}>Kerf:</strong> {formatDimension(config.spacing, dimensionUnit, scale)}
            </>
          )}
          {config?.binPadding > 0 && (
            <>
              {' | '}
              <strong style={{ color: '#fff' }}>Edge Padding:</strong> {formatDimension(config.binPadding, dimensionUnit, scale)}
            </>
          )}
        </div>
        
        {/* Dimension overlay controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showDimensions}
              onChange={(e) => setShowDimensions(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px' }}>Show Dimensions</span>
          </label>
          
          {showDimensions && (
            <select
              value={dimensionUnit}
              onChange={(e) => setDimensionUnit(e.target.value)}
              style={{
                padding: '4px 8px',
                background: '#444',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="mm">Millimeters (mm)</option>
              <option value="inch">Inches</option>
              <option value="px">Pixels</option>
            </select>
          )}
          
          <button
            onClick={copyDebugReport}
            style={{
              padding: '6px 12px',
              background: copied ? '#28a745' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Debug Report'}
          </button>
        </div>
      </div>
      
      {/* Main content area with SVG and optional Legend */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        overflow: 'hidden',
        background: '#1a1a1a'
      }}>
        {/* SVG display */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '20px',
        }}>
          <svg
            ref={svgRef}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '100%',
              display: 'block',
              background: '#0a0a0a',
              border: '1px solid #3a3a3a',
              borderRadius: '8px'
            }}
          />
        </div>
        
        {/* Legend Panel - appears when dimensions are enabled */}
        {showDimensions && nests[selectedNest]?.placements?.[0]?.sheetplacements && (
          <div style={{
            width: '280px',
            background: '#252525',
            borderLeft: '1px solid #3a3a3a',
            overflow: 'auto',
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {/* Label Size Slider */}
            <div style={{ 
              background: '#2a2a2a', 
              padding: '12px', 
              borderRadius: '6px',
              border: '1px solid #3a3a3a'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>Label Size</span>
                <span style={{ color: '#888', fontSize: '12px' }}>{labelSizePercent}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={labelSizePercent}
                onChange={(e) => setLabelSizePercent(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  accentColor: '#646cff'
                }}
              />
            </div>
            
            {/* Sheet Info */}
            <div style={{ 
              background: '#2a2a2a', 
              padding: '12px', 
              borderRadius: '6px',
              border: '1px solid #4a9eff'
            }}>
              <div style={{ 
                color: '#4a9eff', 
                fontSize: '13px', 
                fontWeight: 'bold',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                📄 Sheet
              </div>
              <div style={{ color: '#ccc', fontSize: '12px' }}>
                {(() => {
                  const sheetPart = parts.find(p => p.sheet);
                  if (!sheetPart) return 'No sheet';
                  return `${formatDimension(sheetPart.bounds.width, dimensionUnit, scale)} × ${formatDimension(sheetPart.bounds.height, dimensionUnit, scale)}`;
                })()}
              </div>
            </div>
            
            {/* Parts Legend */}
            <div style={{ 
              background: '#2a2a2a', 
              padding: '12px', 
              borderRadius: '6px',
              border: '1px solid #3a3a3a'
            }}>
              <div style={{ 
                color: '#fff', 
                fontSize: '13px', 
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                Parts ({nests[selectedNest].placements[0].sheetplacements.length})
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {nests[selectedNest].placements[0].sheetplacements.map((placement, idx) => {
                  const part = parts[placement.source];
                  if (!part || part.sheet) return null;
                  const hue = (360 * idx / Math.max(nests[selectedNest].placements[0].sheetplacements.length, 1)) % 360;
                  
                  return (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px',
                        background: '#1a1a1a',
                        borderRadius: '4px',
                        borderLeft: `4px solid hsl(${hue}, 60%, 50%)`
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        background: `hsl(${hue}, 50%, 65%)`,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        #{idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          color: '#fff', 
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {formatDimension(part.bounds.width, dimensionUnit, scale)} × {formatDimension(part.bounds.height, dimensionUnit, scale)}
                        </div>
                        {placement.rotation !== 0 && (
                          <div style={{ color: '#888', fontSize: '11px' }}>
                            Rotated {placement.rotation}°
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Kerf/Spacing Info */}
            {config?.spacing > 0 && (
              <div style={{ 
                background: '#2a2a2a', 
                padding: '12px', 
                borderRadius: '6px',
                border: '1px solid #ffa500'
              }}>
                <div style={{ 
                  color: '#ffa500', 
                  fontSize: '13px', 
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  ✂️ Kerf/Spacing
                </div>
                <div style={{ color: '#ccc', fontSize: '12px' }}>
                  {formatDimension(config.spacing, dimensionUnit, scale)}
                </div>
              </div>
            )}
            
            {/* Bin Padding Info */}
            {config?.binPadding > 0 && (
              <div style={{ 
                background: '#2a2a2a', 
                padding: '12px', 
                borderRadius: '6px',
                border: '1px solid #9966ff'
              }}>
                <div style={{ 
                  color: '#9966ff', 
                  fontSize: '13px', 
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  📐 Bin Edge Padding
                </div>
                <div style={{ color: '#ccc', fontSize: '12px' }}>
                  {formatDimension(config.binPadding, dimensionUnit, scale)}
                </div>
              </div>
            )}
            
            {/* Nesting Config Summary */}
            <div style={{ 
              background: '#2a2a2a', 
              padding: '12px', 
              borderRadius: '6px',
              border: '1px solid #3a3a3a'
            }}>
              <div style={{ 
                color: '#888', 
                fontSize: '13px', 
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                ⚙️ Config
              </div>
              <div style={{ color: '#999', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Rotations: {config?.rotations || 4}</div>
                <div>Population: {config?.populationSize || 10}</div>
                <div>Mutation: {config?.mutationRate || 10}%</div>
                <div>Placement: {config?.placementType || 'gravity'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
