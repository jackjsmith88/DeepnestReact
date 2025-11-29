import { useEffect, useRef, useState } from 'react';

/**
 * NestViewer component displays the nesting results in an interactive SVG
 * Shows parts placed on sheets with different colors/patterns
 */
export default function NestViewer({ nests, parts, onSelectNest }) {
  const svgRef = useRef(null);
  const [selectedNest, setSelectedNest] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // Generate debug report
  const generateDebugReport = () => {
    if (!nests || nests.length === 0 || !parts) return '';
    
    const nest = nests[selectedNest];
    if (!nest) return '';
    
    const sheetPart = parts.find(p => p.sheet);
    const sheetBounds = sheetPart?.bounds;
    
    let report = `=== DEEPNEST DEBUG REPORT ===\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += `--- SHEET INFO ---\n`;
    report += `Sheet bounds: (${sheetBounds?.x?.toFixed(0)}, ${sheetBounds?.y?.toFixed(0)}) ${sheetBounds?.width?.toFixed(0)}x${sheetBounds?.height?.toFixed(0)}\n\n`;
    
    report += `--- NEST INFO ---\n`;
    report += `Selected Nest: ${selectedNest + 1}\n`;
    report += `Fitness: ${nest.fitness?.toFixed(2)}\n`;
    report += `Placements: ${nest.placements?.length || 0} sheets\n\n`;
    
    report += `--- PARTS INFO ---\n`;
    parts.forEach((part, idx) => {
      report += `Part ${idx}: sheet=${part.sheet}, bounds=(${part.bounds?.x?.toFixed(0)}, ${part.bounds?.y?.toFixed(0)}) ${part.bounds?.width?.toFixed(0)}x${part.bounds?.height?.toFixed(0)}\n`;
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
    console.log('[NestViewer] useEffect triggered - nests:', nests?.length, 'selectedNest:', selectedNest);
    if (nests && nests.length > 0 && parts) {
      console.log('[NestViewer] Calling renderNest for nest', selectedNest);
      renderNest(nests[selectedNest]);
    }
  }, [nests, selectedNest, parts]);
  
  const renderNest = (nest) => {
    if (!nest || !nest.placements) return;
    
    console.log('[NestViewer] renderNest called - fitness:', nest.fitness?.toFixed(0), 'placements:', nest.placements?.length);
    
    const svg = svgRef.current;
    if (!svg) return;
    
    // Clear previous content
    svg.innerHTML = '';
    
    // Create defs for patterns
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
    
    // Find the sheet (first part marked as sheet)
    const sheetIndex = parts.findIndex(p => p.sheet);
    const sheetPart = sheetIndex >= 0 ? parts[sheetIndex] : null;
    
    if (!sheetPart) {
      console.warn('No sheet found in parts');
      return;
    }
    
    const sheetBounds = sheetPart.bounds;
    console.log('[NestViewer] Sheet:', sheetIndex, 'bounds:', sheetBounds.width.toFixed(0), 'x', sheetBounds.height.toFixed(0));
    
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
      
      // Draw parts on this sheet
      if (sheetPlacement.sheetplacements) {
        console.log('[NestViewer] Drawing', sheetPlacement.sheetplacements.length, 'parts on sheet', sheetPartIdx);
        
        // Build a map of non-sheet parts for source lookup
        const nonSheetParts = parts.filter(p => !p.sheet);
        
        sheetPlacement.sheetplacements.forEach((partPlacement, pIdx) => {
          // source is the index in the original parts array (including sheets)
          const sourceIndex = partPlacement.source;
          const part = parts[sourceIndex];
          
          console.log(`[NestViewer] Part ${pIdx}: source=${sourceIndex}, placement=(${partPlacement.x?.toFixed(0)}, ${partPlacement.y?.toFixed(0)})`);
          
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
          
          console.log(`[NestViewer] Part ${pIdx} transform: translate=(${partPlacement.x?.toFixed(0)}, ${partPlacement.y?.toFixed(0)}), sheetOrigin=(${sheetOriginX.toFixed(0)}, ${sheetOriginY.toFixed(0)}), final=(${finalX.toFixed(0)}, ${finalY.toFixed(0)})`);
          console.log(`[NestViewer] Part ${pIdx} bounds: (${part?.bounds?.x?.toFixed(0)}, ${part?.bounds?.y?.toFixed(0)}) ${part?.bounds?.width?.toFixed(0)}x${part?.bounds?.height?.toFixed(0)}`);
          
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
          
          sheetGroup.appendChild(partGroup);
        });
      }
      
      svg.appendChild(sheetGroup);
    });
    
    console.log('[NestViewer] Render complete - viewBox:', svg.getAttribute('viewBox'));
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
              Nest {index + 1} (Fitness: {nest.fitness?.toFixed(0)})
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
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '14px' }}>
          <strong style={{ color: '#fff' }}>Best Fitness:</strong> {nests[selectedNest]?.fitness?.toFixed(2) || 'N/A'}
          {' | '}
          <strong style={{ color: '#fff' }}>Sheets Used:</strong> {nests[selectedNest]?.sheets || 1}
          {' | '}
          <strong style={{ color: '#fff' }}>Parts Placed:</strong> {nests[selectedNest]?.placements?.[0]?.sheetplacements?.length || 0}
        </div>
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
      
      {/* SVG display */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: '20px',
        background: '#1a1a1a'
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
    </div>
  );
}
