import { useEffect, useRef } from 'react';
import { formatDimension } from '../utils/unitConversion';
import { findLabelPosition } from '../utils/geometry';

/**
 * SVGRenderer - Renders the nesting result as an interactive SVG
 */
export default function SVGRenderer({ 
  nest, 
  parts, 
  scale,
  showDimensions, 
  dimensionUnit, 
  labelSizePercent 
}) {
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (nest && parts) {
      renderNest();
    }
  }, [nest, parts, showDimensions, dimensionUnit, labelSizePercent]);
  
  const renderNest = () => {
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
    const labelSize = Math.round(sheetBounds.width * labelSizePercent / 100);
    
    // The sheet's original position in the SVG
    const sheetOriginX = sheetBounds.x;
    const sheetOriginY = sheetBounds.y;
    
    // ViewBox: we want to see the sheet area (normalized to 0,0) plus padding
    // When dimensions are shown, we need extra padding for the labels
    const basePadding = 50;
    const dimensionPadding = showDimensions ? (labelSize * 2 + 30) : 0;
    const leftPadding = basePadding + dimensionPadding;
    const topPadding = basePadding + dimensionPadding;
    const rightPadding = basePadding;
    const bottomPadding = basePadding;
    
    const viewBoxX = -leftPadding;
    const viewBoxY = -topPadding;
    const viewBoxWidth = sheetBounds.width + leftPadding + rightPadding;
    const viewBoxHeight = sheetBounds.height + topPadding + bottomPadding;
    
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    
    // Render each sheet placement
    nest.placements.forEach((sheetPlacement, idx) => {
      const sheetPartIdx = sheetPlacement.sheet !== undefined ? sheetPlacement.sheet : sheetIndex;
      const currentSheet = parts[sheetPartIdx] || sheetPart;
      const currentSheetBounds = currentSheet.bounds;
      
      // Create group for this sheet
      const sheetGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      sheetGroup.setAttribute('id', `sheet${sheetPlacement.sheetid}`);
      sheetGroup.setAttribute('class', 'sheet');
      
      // Draw sheet outline
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
        sheetPlacement.sheetplacements.forEach((partPlacement, pIdx) => {
          const sourceIndex = partPlacement.source;
          const part = parts[sourceIndex];
          
          if (!part) {
            console.warn('Part not found for source:', sourceIndex);
            return;
          }
          
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
          
          const finalX = partPlacement.x - sheetOriginX;
          const finalY = partPlacement.y - sheetOriginY;
          const rotationDeg = partPlacement.rotation || 0;
          
          const partCenterX = partBounds.x + partBounds.width / 2;
          const partCenterY = partBounds.y + partBounds.height / 2;
          
          if (rotationDeg !== 0) {
            partGroup.setAttribute('transform', `translate(${finalX} ${finalY}) rotate(${rotationDeg} ${partCenterX} ${partCenterY})`);
          } else {
            partGroup.setAttribute('transform', `translate(${finalX} ${finalY})`);
          }
          
          // Draw part elements
          if (part.svgelements) {
            part.svgelements.forEach((element) => {
              const node = element.cloneNode(true);
              node.setAttribute('fill', `hsl(${hue}, 50%, 65%)`);
              node.setAttribute('fill-opacity', '0.8');
              node.setAttribute('stroke', `hsl(${hue}, 70%, 35%)`);
              node.setAttribute('stroke-width', '2');
              partGroup.appendChild(node);
            });
          }
          
          // Store label info to draw later
          if (showDimensions) {
            const labelPos = findLabelPosition(part.svgelements, partBounds, part.polygontree);
            
            let labelX = labelPos.x;
            let labelY = labelPos.y;
            
            if (rotationDeg !== 0) {
              const rad = rotationDeg * Math.PI / 180;
              const dx = labelPos.x - partCenterX;
              const dy = labelPos.y - partCenterY;
              labelX = partCenterX + dx * Math.cos(rad) - dy * Math.sin(rad);
              labelY = partCenterY + dx * Math.sin(rad) + dy * Math.cos(rad);
            }
            
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
      
      // Draw all labels on top
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
  
  return (
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
  );
}
