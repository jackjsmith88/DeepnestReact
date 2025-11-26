// Web Worker for background nesting calculations
// This replaces the Electron IPC background worker
// Note: We can't use importScripts with ES modules in Vite, so we'll use a simpler approach

// Store NFP cache in worker
let nfpCache = {};

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  if (type === 'background-start') {
    processNesting(data);
  } else if (type === 'stop') {
    self.close();
  }
};

function processNesting(data) {
  const { index, sheets, individual, config } = data;
  
  try {
    console.log('Worker processing:', { index, individual, sheets });
    
    // For now, we'll do a simple fitness calculation
    // In a full implementation, this would run the placement algorithm
    
    let totalFitness = 0;
    const sheetPlacements = [];
    
    // Group placements by sheet (for now, all on one sheet)
    if (individual.placement && individual.placement.length > 0) {
      const partPlacements = [];
      
      // Simple grid layout for testing - position parts in a visible grid
      let currentX = 100;
      let currentY = 100;
      let maxHeightInRow = 0;
      const spacing = 50;
      const maxWidth = 2000;
      
      individual.placement.forEach((part, partIndex) => {
        if (part && part.length > 0) {
          const bounds = getPolygonBounds(part);
          console.log('Part', partIndex, 'bounds:', bounds);
          totalFitness += bounds.width * bounds.height;
          
          // Grid layout logic
          if (currentX + bounds.width > maxWidth) {
            currentX = 100;
            currentY += maxHeightInRow + spacing;
            maxHeightInRow = 0;
          }
          
          partPlacements.push({
            id: partIndex,
            source: partIndex,  // index into the parts array
            x: currentX - bounds.x,  // Offset to position part at currentX
            y: currentY - bounds.y,  // Offset to position part at currentY
            rotation: 0
          });
          
          maxHeightInRow = Math.max(maxHeightInRow, bounds.height);
          currentX += bounds.width + spacing;
        }
      });
      
      // Create sheet placement structure
      if (partPlacements.length > 0) {
        sheetPlacements.push({
          sheet: 0,           // index of the sheet part
          sheetid: 0,         // unique sheet id
          sheetplacements: partPlacements
        });
      }
    }
    
    // Send result back to main thread
    self.postMessage({
      type: 'background-response',
      payload: {
        placements: sheetPlacements,
        fitness: totalFitness,
        sheets: sheetPlacements.length,
        index: index,
        area: totalFitness
      }
    });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      stack: error.stack,
      index: index
    });
  }
}

function getPolygonBounds(polygon) {
  if (!polygon || polygon.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (let i = 0; i < polygon.length; i++) {
    if (polygon[i] && typeof polygon[i].x === 'number' && typeof polygon[i].y === 'number') {
      minX = Math.min(minX, polygon[i].x);
      minY = Math.min(minY, polygon[i].y);
      maxX = Math.max(maxX, polygon[i].x);
      maxY = Math.max(maxY, polygon[i].y);
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// Signal that worker is ready
self.postMessage({ type: 'ready' });
