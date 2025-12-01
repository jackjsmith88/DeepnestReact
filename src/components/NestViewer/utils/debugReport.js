import { formatDimension, pxToMm } from './unitConversion';

/**
 * Generates a debug report for the current nesting result
 */
export const generateDebugReport = ({ nests, selectedNest, parts, scale }) => {
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
