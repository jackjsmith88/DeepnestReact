/**
 * Shape Analysis Utilities
 * Analyzes polygon shapes to extract all measurable dimensions
 * Handles complex shapes like L, U, T by detecting segments
 */

import { getPolygonPoints } from './geometry';

/**
 * Calculate distance between two points
 */
export const distance = (p1, p2) => {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
};

/**
 * Check if two line segments are collinear (on same line)
 */
const areCollinear = (p1, p2, p3, tolerance = 0.1) => {
  const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y));
  return area < tolerance;
};

/**
 * Determine if a segment is horizontal, vertical, or diagonal
 */
export const getSegmentOrientation = (p1, p2, tolerance = 1) => {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  
  if (dy < tolerance) return 'horizontal';
  if (dx < tolerance) return 'vertical';
  return 'diagonal';
};

/**
 * Get the angle of a segment in degrees
 */
export const getSegmentAngle = (p1, p2) => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
};

/**
 * Get midpoint of a segment
 */
export const getMidpoint = (p1, p2) => {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
};

/**
 * Extract all edge segments from a polygon
 * Returns array of { start, end, length, orientation, angle, midpoint }
 */
export const getPolygonSegments = (points) => {
  if (!points || points.length < 3) return [];
  
  const segments = [];
  
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    const len = distance(start, end);
    
    // Skip very short segments (noise)
    if (len < 1) continue;
    
    segments.push({
      start,
      end,
      length: len,
      orientation: getSegmentOrientation(start, end),
      angle: getSegmentAngle(start, end),
      midpoint: getMidpoint(start, end),
      index: i
    });
  }
  
  return segments;
};

/**
 * Group segments by their orientation and position
 * This helps identify parallel edges (like the two vertical edges of an L)
 */
export const groupParallelSegments = (segments) => {
  const horizontal = segments.filter(s => s.orientation === 'horizontal');
  const vertical = segments.filter(s => s.orientation === 'vertical');
  const diagonal = segments.filter(s => s.orientation === 'diagonal');
  
  // Sort horizontal by Y position
  horizontal.sort((a, b) => a.midpoint.y - b.midpoint.y);
  
  // Sort vertical by X position  
  vertical.sort((a, b) => a.midpoint.x - b.midpoint.x);
  
  return { horizontal, vertical, diagonal };
};

/**
 * Analyze a shape and return all meaningful dimensions
 * For simple rectangles: width, height
 * For L-shapes: overall width/height + arm widths
 * For U-shapes: overall width/height + arm widths + gap
 */
export const analyzeShapeDimensions = (svgElements, bounds, polygonTree = null) => {
  // Get polygon points
  let points = [];
  if (polygonTree && Array.isArray(polygonTree)) {
    points = polygonTree.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
  }
  if (points.length < 3) {
    points = getPolygonPoints(svgElements);
  }
  
  const dimensions = [];
  
  // Get all segments to find actual edges
  const segments = getPolygonSegments(points);
  const grouped = groupParallelSegments(segments);
  
  // Find the topmost horizontal edge (for width dimension)
  // and the leftmost vertical edge (for height dimension)
  let topEdge = null;
  let leftEdge = null;
  let bottomEdge = null;
  let rightEdge = null;
  
  // Find edges at the extremes of the bounding box
  grouped.horizontal.forEach(seg => {
    const minY = Math.min(seg.start.y, seg.end.y);
    const maxY = Math.max(seg.start.y, seg.end.y);
    
    // Top edge - at or near bounds.y
    if (Math.abs(minY - bounds.y) < 2 || Math.abs(maxY - bounds.y) < 2) {
      if (!topEdge || seg.length > topEdge.length) {
        topEdge = seg;
      }
    }
    // Bottom edge - at or near bounds.y + bounds.height
    if (Math.abs(minY - (bounds.y + bounds.height)) < 2 || Math.abs(maxY - (bounds.y + bounds.height)) < 2) {
      if (!bottomEdge || seg.length > bottomEdge.length) {
        bottomEdge = seg;
      }
    }
  });
  
  grouped.vertical.forEach(seg => {
    const minX = Math.min(seg.start.x, seg.end.x);
    const maxX = Math.max(seg.start.x, seg.end.x);
    
    // Left edge - at or near bounds.x
    if (Math.abs(minX - bounds.x) < 2 || Math.abs(maxX - bounds.x) < 2) {
      if (!leftEdge || seg.length > leftEdge.length) {
        leftEdge = seg;
      }
    }
    // Right edge - at or near bounds.x + bounds.width
    if (Math.abs(minX - (bounds.x + bounds.width)) < 2 || Math.abs(maxX - (bounds.x + bounds.width)) < 2) {
      if (!rightEdge || seg.length > rightEdge.length) {
        rightEdge = seg;
      }
    }
  });
  
  // Width dimension - place above the topmost horizontal edge, or below bottom if top is short
  const useTopForWidth = topEdge && topEdge.length >= bounds.width * 0.8;
  const widthEdge = useTopForWidth ? topEdge : bottomEdge;
  const widthY = useTopForWidth ? bounds.y : bounds.y + bounds.height;
  const widthOffset = useTopForWidth ? -25 : 25;
  
  dimensions.push({
    type: 'width',
    label: 'Width',
    value: bounds.width,
    start: { x: bounds.x, y: widthY },
    end: { x: bounds.x + bounds.width, y: widthY },
    orientation: 'horizontal',
    offset: widthOffset,
    priority: 1
  });
  
  // Height dimension - place beside the longest vertical edge on the outside
  // For L-shapes, prefer the full-height edge
  const useLeftForHeight = leftEdge && leftEdge.length >= bounds.height * 0.8;
  const useRightForHeight = rightEdge && rightEdge.length >= bounds.height * 0.8;
  
  let heightX, heightOffset;
  if (useLeftForHeight) {
    heightX = bounds.x;
    heightOffset = -25;
  } else if (useRightForHeight) {
    heightX = bounds.x + bounds.width;
    heightOffset = 25;
  } else {
    // Neither edge is full height - find longest vertical edge
    const longestVertical = grouped.vertical.reduce((longest, seg) => 
      (!longest || seg.length > longest.length) ? seg : longest, null);
    
    if (longestVertical) {
      const isOnLeft = longestVertical.midpoint.x < bounds.x + bounds.width / 2;
      heightX = isOnLeft ? bounds.x : bounds.x + bounds.width;
      heightOffset = isOnLeft ? -25 : 25;
    } else {
      heightX = bounds.x;
      heightOffset = -25;
    }
  }
  
  dimensions.push({
    type: 'height',
    label: 'Height',
    value: bounds.height,
    start: { x: heightX, y: bounds.y },
    end: { x: heightX, y: bounds.y + bounds.height },
    orientation: 'vertical',
    offset: heightOffset,
    priority: 1
  });
  
  if (points.length < 3) return dimensions;
  
  // Detect complex shapes by counting unique horizontal/vertical positions
  const horizontalYs = [...new Set(grouped.horizontal.map(s => Math.round(s.midpoint.y)))];
  const verticalXs = [...new Set(grouped.vertical.map(s => Math.round(s.midpoint.x)))];
  
  // If we have more than 2 unique Y positions for horizontal segments, it's a complex shape
  const isComplexShape = horizontalYs.length > 2 || verticalXs.length > 2;
  
  if (isComplexShape) {
    // Add individual segment dimensions for complex shapes
    // Filter to meaningful segments (not the full width/height we already have)
    
    // Find horizontal segments that aren't the full width
    grouped.horizontal.forEach((seg, idx) => {
      const segWidth = Math.abs(seg.end.x - seg.start.x);
      // Only add if significantly different from total width
      if (Math.abs(segWidth - bounds.width) > 5 && segWidth > 10) {
        dimensions.push({
          type: 'segment-width',
          label: `W${idx + 1}`,
          value: segWidth,
          start: seg.start,
          end: seg.end,
          orientation: 'horizontal',
          offset: seg.midpoint.y < bounds.y + bounds.height / 2 ? -15 : 15,
          priority: 2
        });
      }
    });
    
    // Find vertical segments that aren't the full height
    grouped.vertical.forEach((seg, idx) => {
      const segHeight = Math.abs(seg.end.y - seg.start.y);
      // Only add if significantly different from total height
      if (Math.abs(segHeight - bounds.height) > 5 && segHeight > 10) {
        dimensions.push({
          type: 'segment-height',
          label: `H${idx + 1}`,
          value: segHeight,
          start: seg.start,
          end: seg.end,
          orientation: 'vertical',
          offset: seg.midpoint.x < bounds.x + bounds.width / 2 ? -15 : 15,
          priority: 2
        });
      }
    });
    
    // Add diagonal segments
    grouped.diagonal.forEach((seg, idx) => {
      if (seg.length > 10) {
        dimensions.push({
          type: 'segment-diagonal',
          label: `D${idx + 1}`,
          value: seg.length,
          start: seg.start,
          end: seg.end,
          orientation: 'diagonal',
          angle: seg.angle,
          offset: 15,
          priority: 3
        });
      }
    });
  }
  
  return dimensions;
};

/**
 * Calculate the position for a dimension label
 * Takes into account orientation and desired offset
 */
export const getDimensionLabelPosition = (dimension, labelSize) => {
  const { start, end, orientation, offset = 0 } = dimension;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  
  if (orientation === 'horizontal') {
    return {
      x: midX,
      y: midY + offset - labelSize / 2,
      rotation: 0
    };
  } else if (orientation === 'vertical') {
    return {
      x: midX + offset - labelSize / 2,
      y: midY,
      rotation: -90
    };
  } else {
    // Diagonal - rotate label to match segment angle
    const angle = dimension.angle || 0;
    return {
      x: midX,
      y: midY + offset,
      rotation: angle > 90 || angle < -90 ? angle + 180 : angle
    };
  }
};
