import { useEffect, useRef, useState } from 'react';

/**
 * NestViewer component displays the nesting results in an interactive SVG
 * Shows parts placed on sheets with different colors/patterns
 */
export default function NestViewer({ nests, parts, onSelectNest }) {
  const svgRef = useRef(null);
  const [selectedNest, setSelectedNest] = useState(0);
  
  useEffect(() => {
    if (nests && nests.length > 0 && parts) {
      renderNest(nests[selectedNest]);
    }
  }, [nests, selectedNest, parts]);
  
  const renderNest = (nest) => {
    if (!nest || !nest.placements) return;
    
    console.log('renderNest called with:', nest);
    console.log('placements:', nest.placements);
    
    const svg = svgRef.current;
    if (!svg) return;
    
    // Clear previous content
    svg.innerHTML = '';
    
    let svgWidth = 0;
    let svgHeight = 0;
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;
    
    // Create defs for patterns
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
    
    // Render each sheet placement
    nest.placements.forEach((sheetPlacement, sheetIndex) => {
      const sheetPart = parts[sheetPlacement.sheet];
      if (!sheetPart) return;
      
      // Create group for this sheet
      const sheetGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      sheetGroup.setAttribute('id', `sheet${sheetPlacement.sheetid}`);
      sheetGroup.setAttribute('class', 'sheet active');
      
      const sheetBounds = sheetPart.bounds;
      sheetGroup.setAttribute('transform', `translate(${-sheetBounds.x} ${svgHeight - sheetBounds.y})`);
      
      console.log('Sheet bounds:', sheetBounds);
      console.log('Sheet transform:', `translate(${-sheetBounds.x} ${svgHeight - sheetBounds.y})`);
      
      // Track bounds for viewBox calculation
      minX = Math.min(minX, -sheetBounds.x);
      minY = Math.min(minY, svgHeight - sheetBounds.y);
      
      if (svgWidth < sheetBounds.width) {
        svgWidth = sheetBounds.width;
      }
      
      maxX = Math.max(maxX, -sheetBounds.x + sheetBounds.width);
      maxY = Math.max(maxY, svgHeight - sheetBounds.y + sheetBounds.height);
      
      // Draw sheet outline
      if (sheetPart.svgelements) {
        sheetPart.svgelements.forEach(element => {
          const node = element.cloneNode(true);
          node.setAttribute('stroke', '#cccccc');
          node.setAttribute('fill', 'none');
          node.setAttribute('stroke-width', '2');
          sheetGroup.appendChild(node);
        });
      }
      
      // Draw parts on this sheet
      if (sheetPlacement.sheetplacements) {
        console.log('Drawing parts:', sheetPlacement.sheetplacements.length);
        sheetPlacement.sheetplacements.forEach(partPlacement => {
          const part = parts[partPlacement.source];
          console.log('Part placement:', partPlacement, 'Part data:', part);
          if (!part) return;

          // Create pattern for this part if not exists
          const patternId = `part${partPlacement.source}hatch`;
          if (!defs.querySelector(`#${patternId}`)) {
            const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.setAttribute('id', patternId);
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            
            const psize = Math.max(10, parseInt(sheetBounds.width / 120));
            pattern.setAttribute('width', psize);
            pattern.setAttribute('height', psize);
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M-1,1 l2,-2 M0,${psize} l${psize},-${psize} M${psize-1},${psize+1} l2,-2`);
            const hue = 360 * (partPlacement.source / parts.length);
            path.setAttribute('stroke', `hsl(${hue}, 100%, 60%)`);
            path.setAttribute('stroke-width', '1');
            pattern.appendChild(path);
            
            defs.appendChild(pattern);
          }
          
          // Create group for this part
          const partGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          partGroup.setAttribute('id', `part${partPlacement.id}`);
          partGroup.setAttribute('class', 'part active');
          
          // Apply rotation and translation
          const rotation = partPlacement.rotation || 0;
          const x = partPlacement.x || 0;
          const y = partPlacement.y || 0;
          
          // The placement x,y are the target position for the part
          // We need to translate the part from its original position to the target
          partGroup.setAttribute('transform', 
            `translate(${x} ${y}) rotate(${rotation * (180/Math.PI)})`
          );
          
          console.log('Part', partPlacement.id, 'transform:', `translate(${x} ${y})`);
          
          // Track bounds for viewBox - part position plus its bounds
          const partBounds = part.bounds;
          const partMinX = x + partBounds.x;
          const partMinY = y + partBounds.y;
          const partMaxX = partMinX + partBounds.width;
          const partMaxY = partMinY + partBounds.height;
          
          minX = Math.min(minX, partMinX);
          minY = Math.min(minY, partMinY);
          maxX = Math.max(maxX, partMaxX);
          maxY = Math.max(maxY, partMaxY);          // Draw part elements
          if (part.svgelements) {
            console.log('Drawing', part.svgelements.length, 'SVG elements for part', partPlacement.id);
            part.svgelements.forEach((element, index) => {
              const node = element.cloneNode(true);
              console.log('Element', index, ':', element.tagName, element);
              if (index === 0) {
                node.setAttribute('fill', `url(#${patternId})`);
                node.setAttribute('fill-opacity', '0.7');
              } else {
                node.setAttribute('fill', '#404247');
              }
              node.setAttribute('stroke', '#ff0000'); // Bright red for debugging
              node.setAttribute('stroke-width', '3');
              node.removeAttribute('style'); // Remove any style that might hide it
              partGroup.appendChild(node);
            });
          }
          
          console.log('Appending part group to sheet:', partGroup);
          sheetGroup.appendChild(partGroup);
        });
      }
      
      svg.appendChild(sheetGroup);
      svgHeight += 1.1 * sheetBounds.height;
    });
    
    // Set SVG dimensions including negative coordinates
    const finalWidth = maxX - minX;
    const finalHeight = maxY - minY;
    
    svg.setAttribute('width', finalWidth);
    svg.setAttribute('height', finalHeight);
    svg.setAttribute('viewBox', `${minX} ${minY} ${finalWidth} ${finalHeight}`);
    
    console.log('SVG dimensions:', finalWidth, 'x', finalHeight);
    console.log('SVG viewBox:', `${minX} ${minY} ${finalWidth} ${finalHeight}`);
    console.log('Min/Max:', { minX, minY, maxX, maxY });
    console.log('Final SVG:', svg.outerHTML.substring(0, 500));
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Nest selection tabs */}
      {nests.length > 1 && (
        <div style={{ 
          display: 'flex', 
          gap: '5px', 
          padding: '10px',
          borderBottom: '1px solid #ddd',
          overflowX: 'auto'
        }}>
          {nests.map((nest, index) => (
            <button
              key={index}
              onClick={() => handleNestSelection(index)}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: selectedNest === index ? '#007acc' : '#fff',
                color: selectedNest === index ? '#fff' : '#000',
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
        background: '#f5f5f5',
        borderBottom: '1px solid #ddd'
      }}>
        <div style={{ fontSize: '14px' }}>
          <strong>Best Fitness:</strong> {nests[selectedNest]?.fitness?.toFixed(2) || 'N/A'}
          {' | '}
          <strong>Sheets Used:</strong> {nests[selectedNest]?.sheets || 1}
          {' | '}
          <strong>Parts Placed:</strong> {nests[selectedNest]?.placements?.[0]?.sheetplacements?.length || 0}
        </div>
      </div>
      
      {/* SVG display */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: '20px',
        background: '#ffffff'
      }}>
        <svg
          ref={svgRef}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            border: '1px solid #ddd'
          }}
        />
      </div>
    </div>
  );
}
