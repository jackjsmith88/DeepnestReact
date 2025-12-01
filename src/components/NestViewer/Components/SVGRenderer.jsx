import { useEffect, useRef, useState, useCallback } from 'react';
import { formatDimension } from '../utils/unitConversion';
import { findLabelPosition, getPolygonPoints } from '../utils/geometry';
import { analyzeShapeDimensions, getDimensionLabelPosition } from '../utils/shapeAnalysis';

/**
 * SVGRenderer - Interactive SVG renderer with click-to-select and hover dimensions
 */
export default function SVGRenderer({ 
  nest, 
  parts, 
  scale,
  showDimensions, 
  dimensionUnit, 
  labelSizePercent,
  config
}) {
  const svgRef = useRef(null);
  const [selectedPartIndex, setSelectedPartIndex] = useState(null);
  const [hoveredPartIndex, setHoveredPartIndex] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  
  // Cached placement data for hit testing
  const placementDataRef = useRef([]);
  
  // Get sheet info
  const sheetIndex = parts?.findIndex(p => p.sheet) ?? -1;
  const sheetPart = sheetIndex >= 0 ? parts[sheetIndex] : null;
  const sheetBounds = sheetPart?.bounds;
  const labelSize = sheetBounds ? Math.round(sheetBounds.width * labelSizePercent / 100) : 20;
  
  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback((screenX, screenY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    
    const pt = svg.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);
  
  // Hit test to find which part is at a point
  const hitTestPart = useCallback((svgX, svgY) => {
    const placements = placementDataRef.current;
    
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i];
      const { transformedBounds } = p;
      
      if (svgX >= transformedBounds.x && 
          svgX <= transformedBounds.x + transformedBounds.width &&
          svgY >= transformedBounds.y && 
          svgY <= transformedBounds.y + transformedBounds.height) {
        return i;
      }
    }
    return null;
  }, []);
  
  // Check if point is in kerf zone (between parts)
  const hitTestKerf = useCallback((svgX, svgY) => {
    if (!config?.spacing || config.spacing <= 0) return null;
    
    const placements = placementDataRef.current;
    const spacing = config.spacing;
    
    for (const p of placements) {
      const { transformedBounds } = p;
      
      const expanded = {
        x: transformedBounds.x - spacing / 2,
        y: transformedBounds.y - spacing / 2,
        width: transformedBounds.width + spacing,
        height: transformedBounds.height + spacing
      };
      
      if (svgX >= expanded.x && svgX <= expanded.x + expanded.width &&
          svgY >= expanded.y && svgY <= expanded.y + expanded.height) {
        
        if (!(svgX >= transformedBounds.x && 
              svgX <= transformedBounds.x + transformedBounds.width &&
              svgY >= transformedBounds.y && 
              svgY <= transformedBounds.y + transformedBounds.height)) {
          return {
            type: 'kerf',
            value: spacing,
            position: { x: svgX, y: svgY }
          };
        }
      }
    }
    return null;
  }, [config?.spacing]);
  
  // Check if point is in bin padding zone
  const hitTestBinPadding = useCallback((svgX, svgY) => {
    if (!config?.binPadding || config.binPadding <= 0 || !sheetBounds) return null;
    
    const padding = config.binPadding;
    const sheetWidth = sheetBounds.width;
    const sheetHeight = sheetBounds.height;
    
    const nearLeft = svgX >= 0 && svgX <= padding;
    const nearRight = svgX >= sheetWidth - padding && svgX <= sheetWidth;
    const nearTop = svgY >= 0 && svgY <= padding;
    const nearBottom = svgY >= sheetHeight - padding && svgY <= sheetHeight;
    
    if ((nearLeft || nearRight) && svgY >= 0 && svgY <= sheetHeight) {
      return {
        type: 'binPadding',
        value: padding,
        edge: nearLeft ? 'left' : 'right',
        lineStart: nearLeft ? { x: 0, y: svgY } : { x: sheetWidth - padding, y: svgY },
        lineEnd: nearLeft ? { x: padding, y: svgY } : { x: sheetWidth, y: svgY },
        position: { x: svgX, y: svgY }
      };
    }
    
    if ((nearTop || nearBottom) && svgX >= 0 && svgX <= sheetWidth) {
      return {
        type: 'binPadding',
        value: padding,
        edge: nearTop ? 'top' : 'bottom',
        lineStart: nearTop ? { x: svgX, y: 0 } : { x: svgX, y: sheetHeight - padding },
        lineEnd: nearTop ? { x: svgX, y: padding } : { x: svgX, y: sheetHeight },
        position: { x: svgX, y: svgY }
      };
    }
    
    return null;
  }, [config?.binPadding, sheetBounds]);
  
  // Mouse move handler
  const handleMouseMove = useCallback((e) => {
    const svgPt = screenToSVG(e.clientX, e.clientY);
    if (!svgPt) return;
    
    const partIdx = hitTestPart(svgPt.x, svgPt.y);
    setHoveredPartIndex(partIdx);
    
    if (partIdx === null) {
      const kerfHit = hitTestKerf(svgPt.x, svgPt.y);
      if (kerfHit) {
        setHoverInfo(kerfHit);
        return;
      }
      
      const paddingHit = hitTestBinPadding(svgPt.x, svgPt.y);
      if (paddingHit) {
        setHoverInfo(paddingHit);
        return;
      }
    }
    
    setHoverInfo(null);
  }, [screenToSVG, hitTestPart, hitTestKerf, hitTestBinPadding]);
  
  // Click handler
  const handleClick = useCallback((e) => {
    const svgPt = screenToSVG(e.clientX, e.clientY);
    if (!svgPt) return;
    
    const partIdx = hitTestPart(svgPt.x, svgPt.y);
    setSelectedPartIndex(partIdx === selectedPartIndex ? null : partIdx);
  }, [screenToSVG, hitTestPart, selectedPartIndex]);
  
  // Main render effect
  useEffect(() => {
    if (!nest || !parts || !sheetBounds) return;
    
    const svg = svgRef.current;
    if (!svg) return;
    
    svg.innerHTML = '';
    placementDataRef.current = [];
    
    const sheetOriginX = sheetBounds.x;
    const sheetOriginY = sheetBounds.y;
    
    // Create defs
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
    
    // Add arrow markers
    addArrowMarkers(defs, '#4a9eff', 'blue');
    addArrowMarkers(defs, '#ff6b6b', 'red');
    addArrowMarkers(defs, '#ffa500', 'orange');
    addArrowMarkers(defs, '#9966ff', 'purple');
    
    // ViewBox calculation
    const basePadding = 50;
    const dimensionPadding = showDimensions ? (labelSize * 2 + 30) : 0;
    const leftPadding = basePadding + dimensionPadding;
    const topPadding = basePadding + dimensionPadding;
    
    svg.setAttribute('viewBox', `${-leftPadding} ${-topPadding} ${sheetBounds.width + leftPadding + basePadding} ${sheetBounds.height + topPadding + basePadding}`);
    
    // Draw sheet
    const sheetGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    sheetGroup.setAttribute('class', 'sheet');
    
    if (sheetPart.svgelements) {
      sheetPart.svgelements.forEach(element => {
        const node = element.cloneNode(true);
        node.setAttribute('transform', `translate(${-sheetOriginX} ${-sheetOriginY})`);
        node.setAttribute('stroke', '#4a9eff');
        node.setAttribute('fill', 'rgba(74, 158, 255, 0.05)');
        node.setAttribute('stroke-width', '3');
        sheetGroup.appendChild(node);
      });
    }
    
    // Draw bin padding zone
    if (config?.binPadding > 0) {
      const paddingRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      paddingRect.setAttribute('x', config.binPadding);
      paddingRect.setAttribute('y', config.binPadding);
      paddingRect.setAttribute('width', Math.max(0, sheetBounds.width - config.binPadding * 2));
      paddingRect.setAttribute('height', Math.max(0, sheetBounds.height - config.binPadding * 2));
      paddingRect.setAttribute('stroke', '#9966ff');
      paddingRect.setAttribute('stroke-width', '1');
      paddingRect.setAttribute('stroke-dasharray', '5,5');
      paddingRect.setAttribute('fill', 'none');
      paddingRect.setAttribute('opacity', '0.5');
      sheetGroup.appendChild(paddingRect);
    }
    
    // Draw sheet dimensions
    if (showDimensions) {
      drawSheetDimensions(sheetGroup, sheetBounds, labelSize, dimensionUnit, scale);
    }
    
    svg.appendChild(sheetGroup);
    
    // Draw parts
    const partsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    partsGroup.setAttribute('class', 'parts');
    
    const labelsToDraw = [];
    
    nest.placements.forEach((sheetPlacement) => {
      if (!sheetPlacement.sheetplacements) return;
      
      sheetPlacement.sheetplacements.forEach((partPlacement, pIdx) => {
        const part = parts[partPlacement.source];
        if (!part || part.sheet) return;
        
        const partBounds = part.bounds;
        const hue = (360 * pIdx / Math.max(sheetPlacement.sheetplacements.length, 1)) % 360;
        
        const finalX = partPlacement.x - sheetOriginX;
        const finalY = partPlacement.y - sheetOriginY;
        const rotationDeg = partPlacement.rotation || 0;
        const partCenterX = partBounds.x + partBounds.width / 2;
        const partCenterY = partBounds.y + partBounds.height / 2;
        
        // Store placement data for hit testing
        placementDataRef.current.push({
          index: pIdx,
          sourceIndex: partPlacement.source,
          part,
          partBounds,
          finalX,
          finalY,
          rotationDeg,
          hue,
          transformedBounds: {
            x: finalX + partBounds.x,
            y: finalY + partBounds.y,
            width: partBounds.width,
            height: partBounds.height
          }
        });
        
        // Create part group
        const partGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        partGroup.setAttribute('class', 'part');
        partGroup.style.cursor = 'pointer';
        
        if (rotationDeg !== 0) {
          partGroup.setAttribute('transform', `translate(${finalX} ${finalY}) rotate(${rotationDeg} ${partCenterX} ${partCenterY})`);
        } else {
          partGroup.setAttribute('transform', `translate(${finalX} ${finalY})`);
        }
        
        const isSelected = selectedPartIndex === pIdx;
        const isHovered = hoveredPartIndex === pIdx;
        
        if (part.svgelements) {
          part.svgelements.forEach((element) => {
            const node = element.cloneNode(true);
            
            if (isSelected) {
              node.setAttribute('fill', `hsl(${hue}, 70%, 55%)`);
              node.setAttribute('stroke', '#fff');
              node.setAttribute('stroke-width', '4');
            } else if (isHovered) {
              node.setAttribute('fill', `hsl(${hue}, 60%, 60%)`);
              node.setAttribute('stroke', `hsl(${hue}, 80%, 40%)`);
              node.setAttribute('stroke-width', '3');
            } else {
              node.setAttribute('fill', `hsl(${hue}, 50%, 65%)`);
              node.setAttribute('stroke', `hsl(${hue}, 70%, 35%)`);
              node.setAttribute('stroke-width', '2');
            }
            node.setAttribute('fill-opacity', isSelected || isHovered ? '0.9' : '0.8');
            
            partGroup.appendChild(node);
          });
        }
        
        partsGroup.appendChild(partGroup);
        
        // Collect label info
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
          
          labelsToDraw.push({
            x: labelX + finalX,
            y: labelY + finalY,
            text: `#${pIdx + 1}`,
            fontSize: labelSize,
            isSelected
          });
        }
      });
    });
    
    svg.appendChild(partsGroup);
    
    // Draw labels
    if (showDimensions && labelsToDraw.length > 0) {
      const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      labelsGroup.setAttribute('class', 'labels-layer');
      
      labelsToDraw.forEach(labelInfo => {
        const dimLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dimLabel.setAttribute('x', labelInfo.x);
        dimLabel.setAttribute('y', labelInfo.y);
        dimLabel.setAttribute('text-anchor', 'middle');
        dimLabel.setAttribute('dominant-baseline', 'middle');
        dimLabel.setAttribute('fill', labelInfo.isSelected ? '#ffff00' : '#fff');
        dimLabel.setAttribute('font-size', labelInfo.fontSize.toString());
        dimLabel.setAttribute('font-weight', 'bold');
        dimLabel.setAttribute('style', 'text-shadow: 2px 2px 4px rgba(0,0,0,0.95), -2px -2px 4px rgba(0,0,0,0.95);');
        dimLabel.textContent = labelInfo.text;
        labelsGroup.appendChild(dimLabel);
      });
      
      svg.appendChild(labelsGroup);
    }
    
    // Draw selected part dimensions
    if (selectedPartIndex !== null && showDimensions) {
      const selectedData = placementDataRef.current[selectedPartIndex];
      if (selectedData) {
        drawPartDimensions(svg, selectedData, labelSize, dimensionUnit, scale);
      }
    }
    
    // Draw hover info
    if (hoverInfo) {
      drawHoverInfo(svg, hoverInfo, labelSize, dimensionUnit, scale);
    }
    
  }, [nest, parts, sheetBounds, sheetPart, showDimensions, dimensionUnit, labelSizePercent, labelSize, scale, config, selectedPartIndex, hoveredPartIndex, hoverInfo]);
  
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px', position: 'relative' }}>
      <svg
        ref={svgRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => {
          setHoveredPartIndex(null);
          setHoverInfo(null);
        }}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '100%',
          display: 'block',
          background: '#0a0a0a',
          border: '1px solid #3a3a3a',
          borderRadius: '8px',
          cursor: hoveredPartIndex !== null ? 'pointer' : 'default'
        }}
      />
      
      {selectedPartIndex !== null && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none'
        }}>
          Part #{selectedPartIndex + 1} selected • Click again to deselect
        </div>
      )}
    </div>
  );
}

function addArrowMarkers(defs, color, name) {
  const arrowStart = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  arrowStart.setAttribute('id', `arrowStart-${name}`);
  arrowStart.setAttribute('markerWidth', '10');
  arrowStart.setAttribute('markerHeight', '10');
  arrowStart.setAttribute('refX', '0');
  arrowStart.setAttribute('refY', '3');
  arrowStart.setAttribute('orient', 'auto');
  const pathStart = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathStart.setAttribute('d', 'M6,0 L6,6 L0,3 z');
  pathStart.setAttribute('fill', color);
  arrowStart.appendChild(pathStart);
  defs.appendChild(arrowStart);
  
  const arrowEnd = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  arrowEnd.setAttribute('id', `arrowEnd-${name}`);
  arrowEnd.setAttribute('markerWidth', '10');
  arrowEnd.setAttribute('markerHeight', '10');
  arrowEnd.setAttribute('refX', '6');
  arrowEnd.setAttribute('refY', '3');
  arrowEnd.setAttribute('orient', 'auto');
  const pathEnd = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEnd.setAttribute('d', 'M0,0 L0,6 L6,3 z');
  pathEnd.setAttribute('fill', color);
  arrowEnd.appendChild(pathEnd);
  defs.appendChild(arrowEnd);
}

function drawSheetDimensions(group, bounds, labelSize, unit, scale) {
  const dimGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  dimGroup.setAttribute('class', 'sheet-dimensions');
  
  // Width
  const widthText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  widthText.setAttribute('x', bounds.width / 2);
  widthText.setAttribute('y', -(labelSize + 5));
  widthText.setAttribute('text-anchor', 'middle');
  widthText.setAttribute('fill', '#4a9eff');
  widthText.setAttribute('font-size', labelSize.toString());
  widthText.setAttribute('font-weight', 'bold');
  widthText.textContent = formatDimension(bounds.width, unit, scale);
  dimGroup.appendChild(widthText);
  
  const widthLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  widthLine.setAttribute('x1', 0);
  widthLine.setAttribute('y1', -(labelSize / 2));
  widthLine.setAttribute('x2', bounds.width);
  widthLine.setAttribute('y2', -(labelSize / 2));
  widthLine.setAttribute('stroke', '#4a9eff');
  widthLine.setAttribute('stroke-width', '1');
  widthLine.setAttribute('marker-start', 'url(#arrowStart-blue)');
  widthLine.setAttribute('marker-end', 'url(#arrowEnd-blue)');
  dimGroup.appendChild(widthLine);
  
  // Height
  const heightText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  heightText.setAttribute('x', -(labelSize + 15));
  heightText.setAttribute('y', bounds.height / 2);
  heightText.setAttribute('text-anchor', 'middle');
  heightText.setAttribute('fill', '#4a9eff');
  heightText.setAttribute('font-size', labelSize.toString());
  heightText.setAttribute('font-weight', 'bold');
  heightText.setAttribute('transform', `rotate(-90, ${-(labelSize + 15)}, ${bounds.height / 2})`);
  heightText.textContent = formatDimension(bounds.height, unit, scale);
  dimGroup.appendChild(heightText);
  
  const heightLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  heightLine.setAttribute('x1', -(labelSize / 2 + 5));
  heightLine.setAttribute('y1', 0);
  heightLine.setAttribute('x2', -(labelSize / 2 + 5));
  heightLine.setAttribute('y2', bounds.height);
  heightLine.setAttribute('stroke', '#4a9eff');
  heightLine.setAttribute('stroke-width', '1');
  heightLine.setAttribute('marker-start', 'url(#arrowStart-blue)');
  heightLine.setAttribute('marker-end', 'url(#arrowEnd-blue)');
  dimGroup.appendChild(heightLine);
  
  group.appendChild(dimGroup);
}

function drawPartDimensions(svg, partData, labelSize, unit, scale) {
  const { part, partBounds, finalX, finalY, rotationDeg } = partData;
  
  const dimGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  dimGroup.setAttribute('class', 'part-dimensions');
  
  const dimensions = analyzeShapeDimensions(part.svgelements, partBounds, part.polygontree);
  
  const transform = rotationDeg !== 0 
    ? `translate(${finalX} ${finalY}) rotate(${rotationDeg} ${partBounds.x + partBounds.width/2} ${partBounds.y + partBounds.height/2})`
    : `translate(${finalX} ${finalY})`;
  
  dimGroup.setAttribute('transform', transform);
  
  const smallLabelSize = Math.max(labelSize * 0.6, 12);
  
  dimensions.forEach((dim, idx) => {
    const color = dim.priority === 1 ? '#ff6b6b' : (dim.priority === 2 ? '#ffaa00' : '#00ff88');
    const offset = dim.offset + (idx * 3);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    
    if (dim.orientation === 'horizontal') {
      line.setAttribute('x1', dim.start.x);
      line.setAttribute('y1', dim.start.y + offset);
      line.setAttribute('x2', dim.end.x);
      line.setAttribute('y2', dim.end.y + offset);
    } else if (dim.orientation === 'vertical') {
      line.setAttribute('x1', dim.start.x + offset);
      line.setAttribute('y1', dim.start.y);
      line.setAttribute('x2', dim.end.x + offset);
      line.setAttribute('y2', dim.end.y);
    } else {
      line.setAttribute('x1', dim.start.x);
      line.setAttribute('y1', dim.start.y);
      line.setAttribute('x2', dim.end.x);
      line.setAttribute('y2', dim.end.y);
    }
    
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '2');
    dimGroup.appendChild(line);
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    
    if (dim.orientation === 'horizontal') {
      text.setAttribute('x', (dim.start.x + dim.end.x) / 2);
      text.setAttribute('y', dim.start.y + offset - 5);
    } else if (dim.orientation === 'vertical') {
      text.setAttribute('x', dim.start.x + offset - 5);
      text.setAttribute('y', (dim.start.y + dim.end.y) / 2);
      text.setAttribute('transform', `rotate(-90, ${dim.start.x + offset - 5}, ${(dim.start.y + dim.end.y) / 2})`);
    } else {
      text.setAttribute('x', (dim.start.x + dim.end.x) / 2);
      text.setAttribute('y', (dim.start.y + dim.end.y) / 2 - 5);
    }
    
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', color);
    text.setAttribute('font-size', smallLabelSize.toString());
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('style', 'text-shadow: 1px 1px 2px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9);');
    text.textContent = formatDimension(dim.value, unit, scale);
    dimGroup.appendChild(text);
  });
  
  svg.appendChild(dimGroup);
}

function drawHoverInfo(svg, info, labelSize, unit, scale) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'hover-info');
  
  const color = info.type === 'kerf' ? '#ffa500' : '#9966ff';
  const smallLabelSize = Math.max(labelSize * 0.5, 10);
  
  if (info.type === 'binPadding' && info.lineStart && info.lineEnd) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', info.lineStart.x);
    line.setAttribute('y1', info.lineStart.y);
    line.setAttribute('x2', info.lineEnd.x);
    line.setAttribute('y2', info.lineEnd.y);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-start', 'url(#arrowStart-purple)');
    line.setAttribute('marker-end', 'url(#arrowEnd-purple)');
    group.appendChild(line);
  }
  
  const tooltipX = info.position.x + 15;
  const tooltipY = info.position.y - 10;
  
  const labelText = info.type === 'kerf' ? 'Kerf' : 'Edge Padding';
  const valueText = formatDimension(info.value, unit, scale);
  const fullText = `${labelText}: ${valueText}`;
  
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', tooltipX - 5);
  bg.setAttribute('y', tooltipY - smallLabelSize);
  bg.setAttribute('width', fullText.length * smallLabelSize * 0.6 + 10);
  bg.setAttribute('height', smallLabelSize + 10);
  bg.setAttribute('fill', 'rgba(0,0,0,0.85)');
  bg.setAttribute('rx', '4');
  group.appendChild(bg);
  
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', tooltipX);
  label.setAttribute('y', tooltipY);
  label.setAttribute('fill', color);
  label.setAttribute('font-size', smallLabelSize.toString());
  label.setAttribute('font-weight', 'bold');
  label.textContent = fullText;
  group.appendChild(label);
  
  svg.appendChild(group);
}
