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
  spacing: 0
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
    console.log(`[Worker] Processing nest index=${index}, parts=${individual?.placement?.length}`);
    console.log(`[Worker] Sheets count: ${sheets?.length}`);
    if (sheets && sheets[0]) {
      const bounds = getPolygonBounds(sheets[0]);
      console.log(`[Worker] First sheet bounds: (${bounds?.x?.toFixed(0)}, ${bounds?.y?.toFixed(0)}) ${bounds?.width?.toFixed(0)}x${bounds?.height?.toFixed(0)}`);
      console.log(`[Worker] Sheet[0] point: (${sheets[0][0]?.x?.toFixed(0)}, ${sheets[0][0]?.y?.toFixed(0)})`);
    }
    if (individual?.placement?.[0]) {
      const part0 = individual.placement[0];
      const pbounds = getPolygonBounds(part0);
      console.log(`[Worker] First part bounds: (${pbounds?.x?.toFixed(0)}, ${pbounds?.y?.toFixed(0)}) ${pbounds?.width?.toFixed(0)}x${pbounds?.height?.toFixed(0)}`);
      console.log(`[Worker] First part[0] point: (${part0[0]?.x?.toFixed(0)}, ${part0[0]?.y?.toFixed(0)})`);
      console.log(`[Worker] First part source: ${part0.source}, id: ${part0.id}, rotation: ${individual?.rotation?.[0]}`);
    }
    
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
        area: result.area
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
    return { placements: [], fitness: Infinity, area: 0 };
  }
  
  const totalParts = parts.length;
  let totalSheetArea = 0;
  
  // Rotate parts by their assigned rotation
  let rotated = [];
  for (let i = 0; i < parts.length; i++) {
    let r = rotatePolygon(parts[i], parts[i].rotation);
    r.rotation = parts[i].rotation;
    r.source = parts[i].source;
    r.id = parts[i].id;
    rotated.push(r);
    
    // Log rotation effect on first part
    if (i === 0 && parts[i].rotation !== 0) {
      const beforeBounds = getPolygonBounds(parts[i]);
      const afterBounds = getPolygonBounds(r);
      console.log(`[Worker] Part 0 rotation=${parts[i].rotation}°`);
      console.log(`[Worker] Before rotation bounds: (${beforeBounds.x.toFixed(0)}, ${beforeBounds.y.toFixed(0)}) ${beforeBounds.width.toFixed(0)}x${beforeBounds.height.toFixed(0)}`);
      console.log(`[Worker] After rotation bounds: (${afterBounds.x.toFixed(0)}, ${afterBounds.y.toFixed(0)}) ${afterBounds.width.toFixed(0)}x${afterBounds.height.toFixed(0)}`);
      console.log(`[Worker] Before part[0]: (${parts[i][0].x.toFixed(0)}, ${parts[i][0].y.toFixed(0)})`);
      console.log(`[Worker] After part[0]: (${r[0].x.toFixed(0)}, ${r[0].y.toFixed(0)})`);
    }
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
    totalSheetArea += sheetArea;
    fitness += sheetArea; // Penalize each new sheet
    
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      
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
    
    // Update fitness based on used width
    if (placed.length > 0) {
      let bounds = getBoundsOfPlacements(placed, placements);
      minwidth = bounds.width;
      fitness += (minwidth / sheetArea) + bounds.width * bounds.height;
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
  
  // Heavily penalize unplaced parts
  for (let i = 0; i < parts.length; i++) {
    fitness += 100000000 * (Math.abs(polygonArea(parts[i])) / totalSheetArea);
  }
  
  console.log(`[Worker] Placed ${totalParts - parts.length}/${totalParts} parts, fitness=${fitness.toFixed(2)}`);
  
  return {
    placements: allplacements,
    fitness: fitness,
    area: totalSheetArea
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
  
  console.log(`[Worker] Sheet bounds: (${sheetBounds.x.toFixed(0)}, ${sheetBounds.y.toFixed(0)}) ${sheetBounds.width.toFixed(0)}x${sheetBounds.height.toFixed(0)}`);
  console.log(`[Worker] Part bounds: (${partBounds.x.toFixed(0)}, ${partBounds.y.toFixed(0)}) ${partBounds.width.toFixed(0)}x${partBounds.height.toFixed(0)}`);
  console.log(`[Worker] Part[0]: (${part[0].x.toFixed(0)}, ${part[0].y.toFixed(0)})`);
  
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
  
  console.log(`[Worker] InnerNFP: part[0] can be at x:[${minX.toFixed(0)}-${maxX.toFixed(0)}] y:[${minY.toFixed(0)}-${maxY.toFixed(0)}]`);
  
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
  let cacheKey = `${A.source || 'A'}_${B.source || 'B'}_${A.rotation || 0}_${B.rotation || 0}_${inside}`;
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
      
      for (let i = 0; i < solution.length; i++) {
        let n = toNestCoordinates(solution[i], config.clipperScale);
        let sarea = -polygonArea(n);
        if (largestArea === null || largestArea < sarea) {
          clipperNfp = n;
          largestArea = sarea;
        }
      }
      
      // Offset by B's first point
      if (clipperNfp && B.length > 0) {
        for (let i = 0; i < clipperNfp.length; i++) {
          clipperNfp[i].x += B[0].x;
          clipperNfp[i].y += B[0].y;
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
  
  if (position) {
    console.log(`[Worker] First placement: part ${part.source} at translate(${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
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

// Signal that worker is ready
self.postMessage({ type: 'ready' });
