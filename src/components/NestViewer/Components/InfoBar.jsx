import { useState } from 'react';
import { formatDimension } from '../utils/unitConversion';
import { generateDebugReport } from '../utils/debugReport';

/**
 * InfoBar - Displays nest statistics and dimension overlay controls
 */
export default function InfoBar({ 
  nest, 
  config, 
  scale,
  showDimensions,
  setShowDimensions,
  dimensionUnit,
  setDimensionUnit,
  nests,
  selectedNest,
  parts
}) {
  const [copied, setCopied] = useState(false);
  
  const copyDebugReport = async () => {
    const report = generateDebugReport({ nests, selectedNest, parts, scale });
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <div style={{ 
      padding: '10px', 
      background: '#2a2a2a',
      borderBottom: '1px solid #3a3a3a',
      color: '#ccc',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '10px'
    }}>
      <div style={{ fontSize: '14px' }}>
        <strong style={{ color: '#fff' }}>Sheet Usage:</strong> {((nest?.sheetUsage || 0) * 100).toFixed(1)}%
        {' | '}
        <strong style={{ color: '#fff' }}>Parts:</strong> {nest?.placedCount || 0}/{nest?.totalCount || 0}
        {' | '}
        <strong style={{ color: '#fff' }}>Sheets:</strong> {nest?.sheetsUsed || nest?.placements?.length || 1}
        {config?.spacing > 0 && (
          <>
            {' | '}
            <strong style={{ color: '#fff' }}>Kerf:</strong> {formatDimension(config.spacing, dimensionUnit, scale)}
          </>
        )}
        {config?.binPadding > 0 && (
          <>
            {' | '}
            <strong style={{ color: '#fff' }}>Edge Padding:</strong> {formatDimension(config.binPadding, dimensionUnit, scale)}
          </>
        )}
      </div>
      
      {/* Dimension overlay controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showDimensions}
            onChange={(e) => setShowDimensions(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: '13px' }}>Show Dimensions</span>
        </label>
        
        {showDimensions && (
          <select
            value={dimensionUnit}
            onChange={(e) => setDimensionUnit(e.target.value)}
            style={{
              padding: '4px 8px',
              background: '#444',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <option value="mm">Millimeters (mm)</option>
            <option value="inch">Inches</option>
            <option value="px">Pixels</option>
          </select>
        )}
        
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
    </div>
  );
}
