// Web Worker for background nesting calculations
// This replaces the Electron IPC background worker with NFP-based placement

// Import ClipperLib for Minkowski sum calculations
importScripts('./clipper.js');

// Configuration
const config = {
  clipperScale: 10000000,
  rotations: 4, // 0, 90, 180, 270 degrees
  placementType: 'gravity', // 'gravity', 'box', or 'hull'
  curveTolerance: 0.3,
  spacing: 0,
  scale: 72,
  mergeLines: true,
  timeRatio: 0.5,
  exploreConcave: true
};

// NFP cache
const nfpCache = new Map();

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  if (type === 'background-start') {
    processNesting(data);
  } else if (type === 'stop') {
    self.close();
  }
};

// Main nesting function - ports placeParts from background.js
function processNesting(data) {
  const { index, sheets, individual, config: userConfig, ids, sources, children, sheetsources } = data;
  
  try {
    // Merge user config
    Object.assign(config, userConfig || {});
    
    if (!sheets || sheets.length === 0) {
      throw new Error('No sheets provided');
    }
    
    // Prepare parts with rotation, source, id
    let parts = [];
    for (let i = 0; i < individual.placement.length; i++) {
      let part = individual.placement[i];
      if (!part || part.length < 3) continue;
      
      // Clone the part polygon
      let p = part.map(pt => ({ x: pt.x, y: pt.y }));
      p.rotation = individual.rotation ? individual.rotation[i] : 0;
      p.source = sources && sources[i] !== undefined ? sources[i] : i;
      p.id = ids && ids[i] !== undefined ? ids[i] : i;
      parts.push(p);
    }
    
    // Prepare sheets
    let sheetList = sheets.map((sheet, i) => {
      let s = sheet.map(pt => ({ x: pt.x, y: pt.y }));
      s.id = i;
      s.source = sheetsources && sheetsources[i] !== undefined ? sheetsources[i] : i;
      return s;
    });
    
    // Place parts using NFP algorithm
    const result = placeParts(sheetList, parts, config, index);
    
    // Send result back to main thread
    self.postMessage({
      type: 'background-response',
      payload: {
        placements: result.placements,
        fitness: result.fitness,
        sheets: result.placements.length,
        index: index,
        area: result.area,
        usedArea: result.usedArea,
        sheetUsage: result.sheetUsage,
        sheetsUsed: result.sheetsUsed,
        placedCount: result.placedCount,
        totalCount: result.totalCount
      }
    });
    
  } catch (error) {
    console.error('[Worker] Error:', error);
    self.postMessage({
      type: 'error',
      error: error.message,
      stack: error.stack,
      index: index
    });
  }
}

// Main placement algorithm - ported from background.js placeParts
function placeParts(sheets, parts, config, nestindex) {
  if (!sheets || sheets.length === 0) {
    return { placements: [], fitness: Infinity, area: 0, usedArea: 0, sheetsUsed: 0, placedCount: 0, totalCount: 0 };
  }
  
  const totalParts = parts.length;
  let totalSheetArea = 0;
  let totalUsedArea = 0;  // Bounding box area of placed parts (actual material usage)
  let sheetsUsed = 0;
  
  // Rotate parts by their assigned rotation
  let rotated = [];
  for (let i = 0; i < parts.length; i++) {
    let r = rotatePolygon(parts[i], parts[i].rotation);
    r.rotation = parts[i].rotation;
    r.source = parts[i].source;
    r.id = parts[i].id;
    rotated.push(r);
  }
  parts = rotated;
  
  let allplacements = [];
  let fitness = 0;
  let minwidth = 0;
  
  while (parts.length > 0) {
    let placed = [];
    let placements = [];
    
    // Open a new sheet
    let sheet = sheets.shift();
    if (!sheet) break;
    
    let sheetArea = Math.abs(polygonArea(sheet));
    let sheetBounds = getPolygonBounds(sheet);
    totalSheetArea += sheetArea;
    sheetsUsed++;
    
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      let partBounds = getPolygonBounds(part);
      
      // Get inner NFP (where the part can be placed inside the sheet)
      let sheetNfp = getInnerNfp(sheet, part, config);
      
      // Try rotations if needed
      if (!sheetNfp || sheetNfp.length === 0) {
        for (let j = 0; j < Math.floor(360 / (360 / config.rotations)) && j > 0; j++) {
          let r = rotatePolygon(part, 360 / config.rotations);
          r.rotation = (part.rotation || 0) + (360 / config.rotations);
          r.source = part.source;
          r.id = part.id;
          part = r;
          parts[i] = r;
          
          sheetNfp = getInnerNfp(sheet, part, config);
          if (sheetNfp && sheetNfp.length > 0) break;
        }
      }
      
      // Part unplaceable on this sheet
      if (!sheetNfp || sheetNfp.length === 0) {
        continue;
      }
      
      let position = null;
      
      if (placed.length === 0) {
        // First part - place at top-left corner
        position = findFirstPlacement(sheetNfp, part);
        if (position) {
          placements.push(position);
          placed.push(part);
        }
        continue;
      }
      
      // Calculate combined NFP of all placed parts
      let combinedNfp = getCombinedNfp(placed, placements, part, config);
      
      if (!combinedNfp) {
        continue;
      }
      
      // Find valid placement positions (sheetNfp - combinedNfp)
      let finalNfp = subtractNfps(sheetNfp, combinedNfp, config);
      
      if (!finalNfp || finalNfp.length === 0) {
        continue;
      }
      
      // Choose best placement position
      position = findBestPlacement(finalNfp, part, placed, placements, config);
      
      if (position) {
        placed.push(part);
        placements.push(position);
      }
    }
    
    // Update fitness based on used width (as ratio of sheet width)
    if (placed.length > 0) {
      let bounds = getBoundsOfPlacements(placed, placements);
      minwidth = bounds.width;
      // Fitness based on how much of the sheet width is used (lower is better)
      // Using width ratio as primary metric, with small height component
      let widthRatio = minwidth / sheetBounds.width;
      let heightRatio = bounds.height / sheetBounds.height;
      // Weight width more heavily (we want to minimize horizontal spread)
      fitness += widthRatio + (heightRatio * 0.1);
      
      // Calculate bounding box area for material usage (this is what actually gets "used")
      // The usable area is from (0,0) to (maxX, maxY) of the placed parts
      let usedBoundsArea = bounds.width * bounds.height;
      totalUsedArea += usedBoundsArea;  // This now represents bounding box area, not polygon area
    } else {
      // Penalize unused sheet
      fitness += 2;
    }
    
    // Remove placed parts from the list
    for (let i = 0; i < placed.length; i++) {
      let idx = parts.indexOf(placed[i]);
      if (idx >= 0) {
        parts.splice(idx, 1);
      }
    }
    
    if (placements.length > 0) {
      allplacements.push({
        sheet: sheet.source,
        sheetid: sheet.id,
        sheetplacements: placements
      });
    } else {
      break; // Something went wrong
    }
    
    if (sheets.length === 0) break;
  }
  
  // Heavily penalize unplaced parts (each unplaced part adds 10 to fitness)
  for (let i = 0; i < parts.length; i++) {
    fitness += 10;
  }
  
  const placedCount = totalParts - parts.length;
  const sheetUsage = totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) : 0;
  
  return {
    placements: allplacements,
    fitness: fitness,
    area: totalSheetArea,
    usedArea: totalUsedArea,
    sheetUsage: sheetUsage,
    sheetsUsed: sheetsUsed,
    placedCount: placedCount,
    totalCount: totalParts
  };
}

// Get NFP for placing part inside sheet (inner NFP)
function getInnerNfp(sheet, part, config) {
  // For simple rectangular sheets, use a direct calculation
  // The inner NFP represents valid positions for part[0] such that the whole part fits in sheet
  return getSimpleInnerNfp(sheet, part);
}

// Simple inner NFP - calculate where part[0] can be placed so the part fits in the sheet
function getSimpleInnerNfp(sheet, part) {
  let sheetBounds = getPolygonBounds(sheet);
  let partBounds = getPolygonBounds(part);
  
  if (!sheetBounds || !partBounds) return null;
  
  // The part's first point position relative to the part's bounding box
  // part[0] is at (part[0].x, part[0].y) 
  // partBounds top-left is at (partBounds.x, partBounds.y)
  // So part[0] is at offset (part[0].x - partBounds.x, part[0].y - partBounds.y) from top-left of bounds
  
  const part0OffsetX = part[0].x - partBounds.x;  // How far part[0] is from left edge of part
  const part0OffsetY = part[0].y - partBounds.y;  // How far part[0] is from top edge of part
  
  // Valid range for part[0].x: 
  // - Minimum: sheet left edge + distance from part[0] to part's left edge
  //   = sheetBounds.x + part0OffsetX
  // - Maximum: sheet right edge - distance from part[0] to part's right edge  
  //   = sheetBounds.x + sheetBounds.width - (partBounds.width - part0OffsetX)
  //   = sheetBounds.x + sheetBounds.width - partBounds.width + part0OffsetX
  
  const minX = sheetBounds.x + part0OffsetX;
  const maxX = sheetBounds.x + sheetBounds.width - partBounds.width + part0OffsetX;
  const minY = sheetBounds.y + part0OffsetY;
  const maxY = sheetBounds.y + sheetBounds.height - partBounds.height + part0OffsetY;
  
  // Check if part fits at all
  if (maxX < minX || maxY < minY) {
    console.log(`[Worker] Part doesn't fit: sheet=${sheetBounds.width}x${sheetBounds.height}, part=${partBounds.width}x${partBounds.height}`);
    return null;
  }
  
  // Return the inner NFP as a polygon (valid positions for part[0])
  let innerNfp = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
  
  return [innerNfp];
}

// Create a frame around polygon A (for inner NFP calculation)
function getFrame(A) {
  let bounds = getPolygonBounds(A);
  
  // Expand bounds by 10%
  bounds.width *= 1.1;
  bounds.height *= 1.1;
  bounds.x -= 0.5 * (bounds.width - (bounds.width / 1.1));
  bounds.y -= 0.5 * (bounds.height - (bounds.height / 1.1));
  
  let frame = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ];
  
  frame.children = [A];
  frame.source = A.source;
  frame.rotation = 0;
  
  return frame;
}

// Get outer NFP between two polygons using ClipperLib MinkowskiSum
function getOuterNfp(A, B, inside) {
  // Check cache
  let cacheKey = `${A.source || 'A'}_${B.source || 'B'}_${A.rotation || 0}_${B.rotation || 0}_${inside}_${config.exploreConcave}`;
  if (nfpCache.has(cacheKey)) {
    return nfpCache.get(cacheKey);
  }
  
  let nfp = null;
  
  // For simple shapes (no holes), use ClipperLib MinkowskiSum
  // This is the JavaScript fallback that doesn't need the C++ addon
  try {
    let Ac = toClipperCoordinates(A);
    ClipperLib.JS.ScaleUpPath(Ac, config.clipperScale);
    
    let Bc = toClipperCoordinates(B);
    ClipperLib.JS.ScaleUpPath(Bc, config.clipperScale);
    
    // Negate B for Minkowski difference (NFP)
    for (let i = 0; i < Bc.length; i++) {
      Bc[i].X *= -1;
      Bc[i].Y *= -1;
    }
    
    let solution = ClipperLib.Clipper.MinkowskiSum(Ac, Bc, true);
    
    if (solution && solution.length > 0) {
      // Find the largest area polygon (outer NFP)
      let clipperNfp = null;
      let largestArea = null;
      let nfpChildren = []; // Collect smaller polygons as potential concave areas
      
      for (let i = 0; i < solution.length; i++) {
        let n = toNestCoordinates(solution[i], config.clipperScale);
        let sarea = -polygonArea(n);
        if (largestArea === null || largestArea < sarea) {
          // If we had a previous largest, it might be a child (concave area)
          if (clipperNfp !== null && config.exploreConcave) {
            nfpChildren.push(clipperNfp);
          }
          clipperNfp = n;
          largestArea = sarea;
        } else if (config.exploreConcave && sarea > 0) {
          // Smaller positive-area polygons are potential concave placement areas
          nfpChildren.push(n);
        }
      }
      
      // Offset by B's first point
      if (clipperNfp && B.length > 0) {
        for (let i = 0; i < clipperNfp.length; i++) {
          clipperNfp[i].x += B[0].x;
          clipperNfp[i].y += B[0].y;
        }
        
        // Also offset children if exploreConcave is enabled
        if (config.exploreConcave && nfpChildren.length > 0) {
          clipperNfp.children = [];
          for (let c = 0; c < nfpChildren.length; c++) {
            let child = nfpChildren[c];
            for (let i = 0; i < child.length; i++) {
              child[i].x += B[0].x;
              child[i].y += B[0].y;
            }
            clipperNfp.children.push(child);
          }
        }
      }
      
      nfp = clipperNfp;
    }
  } catch (e) {
    console.error('[Worker] MinkowskiSum error:', e);
    return null;
  }
  
  if (!nfp || nfp.length === 0) {
    return null;
  }
  
  // Cache the result
  nfpCache.set(cacheKey, nfp);
  
  return nfp;
}

// Get combined NFP of all placed parts
function getCombinedNfp(placed, placements, part, config) {
  if (placed.length === 0) return null;
  
  let clipper = new ClipperLib.Clipper();
  let combinedNfp = new ClipperLib.Paths();
  
  for (let j = 0; j < placed.length; j++) {
    let nfp = getOuterNfp(placed[j], part, false);
    
    if (!nfp) {
      continue;
    }
    
    // Shift NFP to placed location
    let shiftedNfp = [];
    for (let m = 0; m < nfp.length; m++) {
      shiftedNfp.push({
        x: nfp[m].x + placements[j].x,
        y: nfp[m].y + placements[j].y
      });
    }
    
    // Convert to clipper coordinates
    let clipperNfp = toClipperCoordinates(shiftedNfp);
    ClipperLib.JS.ScaleUpPath(clipperNfp, config.clipperScale);
    
    clipper.AddPath(clipperNfp, ClipperLib.PolyType.ptSubject, true);
    
    // If exploreConcave is enabled and NFP has children (concave areas), include them
    if (config.exploreConcave && nfp.children && nfp.children.length > 0) {
      for (let c = 0; c < nfp.children.length; c++) {
        let child = nfp.children[c];
        // Shift child to placed location
        let shiftedChild = [];
        for (let m = 0; m < child.length; m++) {
          shiftedChild.push({
            x: child[m].x + placements[j].x,
            y: child[m].y + placements[j].y
          });
        }
        
        // Ensure correct winding order for holes (should be opposite to outer)
        let childArea = polygonArea(shiftedChild);
        if (childArea < 0) {
          shiftedChild.reverse();
        }
        
        let clipperChild = toClipperCoordinates(shiftedChild);
        ClipperLib.JS.ScaleUpPath(clipperChild, config.clipperScale);
        clipper.AddPath(clipperChild, ClipperLib.PolyType.ptSubject, true);
      }
    }
  }
  
  // Union all NFPs
  if (!clipper.Execute(ClipperLib.ClipType.ctUnion, combinedNfp, 
      ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)) {
    return null;
  }
  
  return combinedNfp;
}

// Subtract combined NFP from sheet inner NFP
function subtractNfps(sheetNfp, combinedNfp, config) {
  if (!sheetNfp || sheetNfp.length === 0) return null;
  
  // Convert sheet NFP to clipper coordinates
  let clipperSheetNfp = new ClipperLib.Paths();
  for (let i = 0; i < sheetNfp.length; i++) {
    let path = toClipperCoordinates(sheetNfp[i]);
    ClipperLib.JS.ScaleUpPath(path, config.clipperScale);
    clipperSheetNfp.push(path);
  }
  
  let finalNfp = new ClipperLib.Paths();
  let clipper = new ClipperLib.Clipper();
  
  clipper.AddPaths(combinedNfp, ClipperLib.PolyType.ptClip, true);
  clipper.AddPaths(clipperSheetNfp, ClipperLib.PolyType.ptSubject, true);
  
  if (!clipper.Execute(ClipperLib.ClipType.ctDifference, finalNfp,
      ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftNonZero)) {
    return null;
  }
  
  if (!finalNfp || finalNfp.length === 0) {
    return null;
  }
  
  // Convert back to nest coordinates
  let result = [];
  for (let j = 0; j < finalNfp.length; j++) {
    result.push(toNestCoordinates(finalNfp[j], config.clipperScale));
  }
  
  return result;
}

// Find first placement position (top-left corner)
function findFirstPlacement(sheetNfp, part) {
  let position = null;
  
  for (let j = 0; j < sheetNfp.length; j++) {
    for (let k = 0; k < sheetNfp[j].length; k++) {
      // sheetNfp[j][k] is a valid position for part[0]
      // The translation needed is: targetPos - originalPos
      let testX = sheetNfp[j][k].x - part[0].x;
      let testY = sheetNfp[j][k].y - part[0].y;
      
      if (position === null || 
          testX < position.x || 
          (almostEqual(testX, position.x) && testY < position.y)) {
        position = {
          x: testX,
          y: testY,
          id: part.id,
          rotation: part.rotation || 0,
          source: part.source
        };
      }
    }
  }
  
  return position;
}

// Find best placement position using gravity or box strategy
function findBestPlacement(finalNfp, part, placed, placements, config) {
  let minarea = null;
  let minwidth = null;
  let position = null;
  let minx = null;
  let miny = null;
  
  // Get bounds of all placed parts
  let allpoints = [];
  for (let m = 0; m < placed.length; m++) {
    for (let n = 0; n < placed[m].length; n++) {
      allpoints.push({
        x: placed[m][n].x + placements[m].x,
        y: placed[m][n].y + placements[m].y
      });
    }
  }
  
  let allbounds = getPolygonBounds(allpoints);
  let partbounds = getPolygonBounds(part);
  
  // Pre-calculate shifted placed parts for mergeLines (if enabled)
  let shiftedPlaced = null;
  if (config.mergeLines) {
    shiftedPlaced = [];
    for (let m = 0; m < placed.length; m++) {
      shiftedPlaced.push(shiftPolygon(placed[m], placements[m]));
    }
  }
  
  // Minimum line length for mergeLines - about 0.5 inches at current scale
  const minMergeLength = 0.5 * (config.scale || 72);
  
  // Evaluate each potential position
  for (let j = 0; j < finalNfp.length; j++) {
    let nf = finalNfp[j];
    
    for (let k = 0; k < nf.length; k++) {
      let shiftvector = {
        x: nf[k].x - part[0].x,
        y: nf[k].y - part[0].y,
        id: part.id,
        source: part.source,
        rotation: part.rotation || 0
      };
      
      // Calculate resulting bounding box
      let rectbounds = getPolygonBounds([
        // All current bounds
        { x: allbounds.x, y: allbounds.y },
        { x: allbounds.x + allbounds.width, y: allbounds.y },
        { x: allbounds.x + allbounds.width, y: allbounds.y + allbounds.height },
        { x: allbounds.x, y: allbounds.y + allbounds.height },
        // New part bounds
        { x: partbounds.x + shiftvector.x, y: partbounds.y + shiftvector.y },
        { x: partbounds.x + partbounds.width + shiftvector.x, y: partbounds.y + shiftvector.y },
        { x: partbounds.x + partbounds.width + shiftvector.x, y: partbounds.y + partbounds.height + shiftvector.y },
        { x: partbounds.x + shiftvector.x, y: partbounds.y + partbounds.height + shiftvector.y }
      ]);
      
      let area;
      if (config.placementType === 'gravity') {
        // Weight width more for gravity placement
        area = rectbounds.width * 2 + rectbounds.height;
      } else {
        area = rectbounds.width * rectbounds.height;
      }
      
      // Merge lines optimization: subtract line overlap savings from area score
      let merged = null;
      if (config.mergeLines && shiftedPlaced) {
        const shiftedPart = shiftPolygon(part, shiftvector);
        merged = mergedLength(shiftedPlaced, shiftedPart, minMergeLength, 0.1 * config.curveTolerance);
        // Reduce area score by merged length * timeRatio (overlapping lines save cut time)
        area -= merged.totalLength * (config.timeRatio || 0.5);
      }
      
      // Choose minimum area, with tiebreakers for x and y position
      if (minarea === null ||
          area < minarea ||
          (almostEqual(minarea, area) && (minx === null || shiftvector.x < minx)) ||
          (almostEqual(minarea, area) && minx !== null && almostEqual(shiftvector.x, minx) && shiftvector.y < miny)) {
        minarea = area;
        minwidth = rectbounds.width;
        position = shiftvector;
        if (minx === null || shiftvector.x < minx) {
          minx = shiftvector.x;
        }
        if (miny === null || shiftvector.y < miny) {
          miny = shiftvector.y;
        }
        
        // Store merge info on position for potential reporting
        if (merged) {
          position.mergedLength = merged.totalLength;
          position.mergedSegments = merged.segments;
        }
      }
    }
  }
  
  return position;
}

// Get bounds of all placed parts
function getBoundsOfPlacements(placed, placements) {
  let allpoints = [];
  for (let m = 0; m < placed.length; m++) {
    for (let n = 0; n < placed[m].length; n++) {
      allpoints.push({
        x: placed[m][n].x + placements[m].x,
        y: placed[m][n].y + placements[m].y
      });
    }
  }
  return getPolygonBounds(allpoints);
}

// ==================== Helper Functions ====================

function toClipperCoordinates(polygon) {
  let clone = [];
  for (let i = 0; i < polygon.length; i++) {
    clone.push({
      X: polygon[i].x,
      Y: polygon[i].y
    });
  }
  return clone;
}

function toNestCoordinates(polygon, scale) {
  let clone = [];
  for (let i = 0; i < polygon.length; i++) {
    clone.push({
      x: polygon[i].X / scale,
      y: polygon[i].Y / scale
    });
  }
  return clone;
}

function rotatePolygon(polygon, degrees) {
  if (degrees === 0 || !degrees) return polygon.map(p => ({ x: p.x, y: p.y }));
  
  let rotated = [];
  let angle = degrees * Math.PI / 180;
  
  // Calculate center of polygon (centroid)
  let bounds = getPolygonBounds(polygon);
  let cx = bounds.x + bounds.width / 2;
  let cy = bounds.y + bounds.height / 2;
  
  for (let i = 0; i < polygon.length; i++) {
    // Translate to origin, rotate, translate back
    let x = polygon[i].x - cx;
    let y = polygon[i].y - cy;
    let x1 = x * Math.cos(angle) - y * Math.sin(angle);
    let y1 = x * Math.sin(angle) + y * Math.cos(angle);
    rotated.push({ x: x1 + cx, y: y1 + cy });
  }
  
  return rotated;
}

function getPolygonBounds(polygon) {
  if (!polygon || polygon.length < 1) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let xmin = polygon[0].x;
  let xmax = polygon[0].x;
  let ymin = polygon[0].y;
  let ymax = polygon[0].y;
  
  for (let i = 1; i < polygon.length; i++) {
    if (polygon[i].x > xmax) xmax = polygon[i].x;
    else if (polygon[i].x < xmin) xmin = polygon[i].x;
    
    if (polygon[i].y > ymax) ymax = polygon[i].y;
    else if (polygon[i].y < ymin) ymin = polygon[i].y;
  }
  
  return {
    x: xmin,
    y: ymin,
    width: xmax - xmin,
    height: ymax - ymin
  };
}

function polygonArea(polygon) {
  let area = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    area += (polygon[j].x + polygon[i].x) * (polygon[j].y - polygon[i].y);
  }
  return 0.5 * area;
}

const TOL = Math.pow(10, -9);

function almostEqual(a, b, tolerance) {
  if (!tolerance) tolerance = TOL;
  return Math.abs(a - b) < tolerance;
}

// ==================== Merge Lines Support ====================

/**
 * Shift a polygon by a vector, preserving exact flags and children
 */
function shiftPolygon(p, shift) {
  let shifted = [];
  for (let i = 0; i < p.length; i++) {
    shifted.push({ x: p[i].x + shift.x, y: p[i].y + shift.y, exact: p[i].exact });
  }
  if (p.children && p.children.length) {
    shifted.children = [];
    for (let i = 0; i < p.children.length; i++) {
      shifted.children.push(shiftPolygon(p.children[i], shift));
    }
  }
  return shifted;
}

/**
 * Calculate the total length of merged/overlapping lines between parts.
 * Returns the total length of line segments that can be shared between adjacent parts
 * (reducing cut time when laser/router can skip overlapping edges).
 * 
 * @param {Array} parts - Array of already-placed polygon parts
 * @param {Array} p - The new part being evaluated
 * @param {number} minlength - Minimum line length to consider (filters small segments)
 * @param {number} tolerance - Tolerance for considering lines as overlapping
 * @returns {{totalLength: number, segments: Array}} Total merged length and segment list
 */
function mergedLength(parts, p, minlength, tolerance) {
  const min2 = minlength * minlength;
  let totalLength = 0;
  let segments = [];

  for (let i = 0; i < p.length; i++) {
    const A1 = p[i];
    const A2 = (i + 1 === p.length) ? p[0] : p[i + 1];

    // Skip non-exact points (simplified/curved segments)
    if (!A1.exact || !A2.exact) {
      continue;
    }

    const Ax2 = (A2.x - A1.x) * (A2.x - A1.x);
    const Ay2 = (A2.y - A1.y) * (A2.y - A1.y);

    // Skip short segments
    if (Ax2 + Ay2 < min2) {
      continue;
    }

    // Calculate rotation to make A1-A2 horizontal
    const angle = Math.atan2(A2.y - A1.y, A2.x - A1.x);
    const c = Math.cos(-angle);
    const s = Math.sin(-angle);
    const c2 = Math.cos(angle);
    const s2 = Math.sin(angle);

    const relA2 = { x: A2.x - A1.x, y: A2.y - A1.y };
    const rotA2x = relA2.x * c - relA2.y * s;

    for (let j = 0; j < parts.length; j++) {
      const B = parts[j];
      if (B.length > 1) {
        for (let k = 0; k < B.length; k++) {
          const B1 = B[k];
          const B2 = (k + 1 === B.length) ? B[0] : B[k + 1];

          if (!B1.exact || !B2.exact) {
            continue;
          }

          const Bx2 = (B2.x - B1.x) * (B2.x - B1.x);
          const By2 = (B2.y - B1.y) * (B2.y - B1.y);

          if (Bx2 + By2 < min2) {
            continue;
          }

          // B relative to A1 (our point of rotation)
          const relB1 = { x: B1.x - A1.x, y: B1.y - A1.y };
          const relB2 = { x: B2.x - A1.x, y: B2.y - A1.y };

          // Rotate so A1-A2 is horizontal
          const rotB1 = { x: relB1.x * c - relB1.y * s, y: relB1.x * s + relB1.y * c };
          const rotB2 = { x: relB2.x * c - relB2.y * s, y: relB2.x * s + relB2.y * c };

          // Check if B is on the same horizontal line (y ≈ 0)
          if (!almostEqual(rotB1.y, 0, tolerance) || !almostEqual(rotB2.y, 0, tolerance)) {
            continue;
          }

          const min1 = Math.min(0, rotA2x);
          const max1 = Math.max(0, rotA2x);
          const min2val = Math.min(rotB1.x, rotB2.x);
          const max2val = Math.max(rotB1.x, rotB2.x);

          // Check for overlap
          if (min2val >= max1 || max2val <= min1) {
            continue;
          }

          let len = 0;
          let relC1x = 0;
          let relC2x = 0;

          // Calculate overlap length
          if (almostEqual(min1, min2val) && almostEqual(max1, max2val)) {
            // A is B (same line)
            len = max1 - min1;
            relC1x = min1;
            relC2x = max1;
          } else if (min1 > min2val && max1 < max2val) {
            // A inside B
            len = max1 - min1;
            relC1x = min1;
            relC2x = max1;
          } else if (min2val > min1 && max2val < max1) {
            // B inside A
            len = max2val - min2val;
            relC1x = min2val;
            relC2x = max2val;
          } else {
            // Partial overlap
            len = Math.max(0, Math.min(max1, max2val) - Math.max(min1, min2val));
            relC1x = Math.min(max1, max2val);
            relC2x = Math.max(min1, min2val);
          }

          if (len * len > min2) {
            totalLength += len;

            // Convert overlap points back to original coordinates
            const relC1 = { x: relC1x * c2, y: relC1x * s2 };
            const relC2 = { x: relC2x * c2, y: relC2x * s2 };

            const C1 = { x: relC1.x + A1.x, y: relC1.y + A1.y };
            const C2 = { x: relC2.x + A1.x, y: relC2.y + A1.y };

            segments.push([C1, C2]);
          }
        }
      }

      // Recursively check children (holes)
      if (B.children && B.children.length > 0) {
        const child = mergedLength(B.children, p, minlength, tolerance);
        totalLength += child.totalLength;
        segments = segments.concat(child.segments);
      }
    }
  }

  return { totalLength: totalLength, segments: segments };
}

// Signal that worker is ready
self.postMessage({ type: 'ready' });
