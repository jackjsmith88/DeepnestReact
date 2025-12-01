import { useState } from 'react';
import { DEFAULT_SCALE } from './utils/unitConversion';
import NestTabs from './Components/NestTabs';
import InfoBar from './Components/InfoBar';
import LegendPanel from './Components/LegendPanel';
import SVGRenderer from './Components/SVGRenderer';

/**
 * NestViewer component displays the nesting results in an interactive SVG
 * Shows parts placed on sheets with different colors/patterns
 */
export default function NestViewer({ nests, parts, onSelectNest, config }) {
  const [selectedNest, setSelectedNest] = useState(0);
  const [showDimensions, setShowDimensions] = useState(false);
  const [dimensionUnit, setDimensionUnit] = useState('mm');
  const [labelSizePercent, setLabelSizePercent] = useState(3);
  
  // Get scale from config or use default
  const scale = config?.scale || DEFAULT_SCALE;
  
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
  
  const currentNest = nests[selectedNest];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a1a' }}>
      {/* Nest selection tabs */}
      <NestTabs 
        nests={nests} 
        selectedNest={selectedNest} 
        onSelectNest={handleNestSelection} 
      />
      
      {/* Nest info bar */}
      <InfoBar
        nest={currentNest}
        config={config}
        scale={scale}
        showDimensions={showDimensions}
        setShowDimensions={setShowDimensions}
        dimensionUnit={dimensionUnit}
        setDimensionUnit={setDimensionUnit}
        nests={nests}
        selectedNest={selectedNest}
        parts={parts}
      />
      
      {/* Main content area with SVG and optional Legend */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        overflow: 'hidden',
        background: '#1a1a1a'
      }}>
        {/* SVG display */}
        <SVGRenderer
          nest={currentNest}
          parts={parts}
          scale={scale}
          showDimensions={showDimensions}
          dimensionUnit={dimensionUnit}
          labelSizePercent={labelSizePercent}
        />
        
        {/* Legend Panel - appears when dimensions are enabled */}
        {showDimensions && (
          <LegendPanel
            nest={currentNest}
            parts={parts}
            config={config}
            scale={scale}
            dimensionUnit={dimensionUnit}
            labelSizePercent={labelSizePercent}
            setLabelSizePercent={setLabelSizePercent}
          />
        )}
      </div>
    </div>
  );
}
