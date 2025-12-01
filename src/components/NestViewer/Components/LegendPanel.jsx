import { formatDimension } from '../utils/unitConversion';

/**
 * LegendPanel - Displays part legend, config info, and dimension controls
 */
export default function LegendPanel({ 
  nest, 
  parts, 
  config, 
  scale, 
  dimensionUnit,
  labelSizePercent,
  setLabelSizePercent 
}) {
  const sheetPlacements = nest?.placements?.[0]?.sheetplacements;
  
  if (!sheetPlacements) return null;
  
  return (
    <div style={{
      width: '280px',
      background: '#252525',
      borderLeft: '1px solid #3a3a3a',
      overflow: 'auto',
      padding: '15px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }}>
      {/* Label Size Slider */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: '12px', 
        borderRadius: '6px',
        border: '1px solid #3a3a3a'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>Label Size</span>
          <span style={{ color: '#888', fontSize: '12px' }}>{labelSizePercent}%</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={labelSizePercent}
          onChange={(e) => setLabelSizePercent(parseInt(e.target.value))}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: '#646cff'
          }}
        />
      </div>
      
      {/* Sheet Info */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: '12px', 
        borderRadius: '6px',
        border: '1px solid #4a9eff'
      }}>
        <div style={{ 
          color: '#4a9eff', 
          fontSize: '13px', 
          fontWeight: 'bold',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          📄 Sheet
        </div>
        <div style={{ color: '#ccc', fontSize: '12px' }}>
          {(() => {
            const sheetPart = parts.find(p => p.sheet);
            if (!sheetPart) return 'No sheet';
            return `${formatDimension(sheetPart.bounds.width, dimensionUnit, scale)} × ${formatDimension(sheetPart.bounds.height, dimensionUnit, scale)}`;
          })()}
        </div>
      </div>
      
      {/* Parts Legend */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: '12px', 
        borderRadius: '6px',
        border: '1px solid #3a3a3a'
      }}>
        <div style={{ 
          color: '#fff', 
          fontSize: '13px', 
          fontWeight: 'bold',
          marginBottom: '10px'
        }}>
          Parts ({sheetPlacements.length})
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {sheetPlacements.map((placement, idx) => {
            const part = parts[placement.source];
            if (!part || part.sheet) return null;
            const hue = (360 * idx / Math.max(sheetPlacements.length, 1)) % 360;
            
            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px',
                  background: '#1a1a1a',
                  borderRadius: '4px',
                  borderLeft: `4px solid hsl(${hue}, 60%, 50%)`
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  background: `hsl(${hue}, 50%, 65%)`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}>
                  #{idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    color: '#fff', 
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {formatDimension(part.bounds.width, dimensionUnit, scale)} × {formatDimension(part.bounds.height, dimensionUnit, scale)}
                  </div>
                  {placement.rotation !== 0 && (
                    <div style={{ color: '#888', fontSize: '11px' }}>
                      Rotated {placement.rotation}°
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Kerf/Spacing Info */}
      {config?.spacing > 0 && (
        <div style={{ 
          background: '#2a2a2a', 
          padding: '12px', 
          borderRadius: '6px',
          border: '1px solid #ffa500'
        }}>
          <div style={{ 
            color: '#ffa500', 
            fontSize: '13px', 
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            ✂️ Kerf/Spacing
          </div>
          <div style={{ color: '#ccc', fontSize: '12px' }}>
            {formatDimension(config.spacing, dimensionUnit, scale)}
          </div>
        </div>
      )}
      
      {/* Bin Padding Info */}
      {config?.binPadding > 0 && (
        <div style={{ 
          background: '#2a2a2a', 
          padding: '12px', 
          borderRadius: '6px',
          border: '1px solid #9966ff'
        }}>
          <div style={{ 
            color: '#9966ff', 
            fontSize: '13px', 
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            📐 Bin Edge Padding
          </div>
          <div style={{ color: '#ccc', fontSize: '12px' }}>
            {formatDimension(config.binPadding, dimensionUnit, scale)}
          </div>
        </div>
      )}
      
      {/* Nesting Config Summary */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: '12px', 
        borderRadius: '6px',
        border: '1px solid #3a3a3a'
      }}>
        <div style={{ 
          color: '#888', 
          fontSize: '13px', 
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          ⚙️ Config
        </div>
        <div style={{ color: '#999', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>Rotations: {config?.rotations || 4}</div>
          <div>Population: {config?.populationSize || 10}</div>
          <div>Mutation: {config?.mutationRate || 10}%</div>
          <div>Placement: {config?.placementType || 'gravity'}</div>
        </div>
      </div>
    </div>
  );
}
