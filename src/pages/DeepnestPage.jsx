import { useState } from 'react'
import { useDeepnest } from '../hooks/useDeepnest'
import { PartsTable } from '../components/PartsTable'
import { FileImport } from '../components/FileImport'
import NestViewer from '../components/NestViewer'
import NestingConfig from '../components/NestingConfig'

export default function DeepnestPage() {
  const [viewMode, setViewMode] = useState('parts') // 'parts', 'preview', 'nesting'
  
  const {
    parts,
    imports,
    config,
    isNesting,
    progress,
    nests,
    importSVG,
    deletePart,
    updatePartQuantity,
    toggleSheet,
    startNest,
    stopNest,
    updateConfig,
  } = useDeepnest()

  const hasSheets = parts.some(p => p.sheet)
  
  // Auto-switch to nesting view when nesting starts
  const handleStartNest = () => {
    startNest()
    setViewMode('nesting')
  }

  return (
    <div className="deepnest-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="toolbar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        borderBottom: '2px solid #3a3a3a',
        background: '#2a2a2a'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#fff' }}>Deepnest</h1>
        <div className="button-group" style={{ display: 'flex', gap: '10px' }}>
          <FileImport onImport={importSVG} disabled={isNesting} />
          <button 
            className={`button start ${!hasSheets || isNesting ? 'disabled' : ''}`}
            onClick={handleStartNest}
            disabled={!hasSheets || isNesting}
            style={{
              padding: '10px 20px',
              backgroundColor: isNesting ? '#666' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: !hasSheets || isNesting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isNesting ? `Nesting... ${Math.round(progress * 100)}%` : 'Start Nest'}
          </button>
          {isNesting && (
            <button 
              className="button stop"
              onClick={stopNest}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* View mode tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '5px', 
        padding: '10px 20px',
        borderBottom: '2px solid #3a3a3a',
        background: '#1a1a1a'
      }}>
        <button
          onClick={() => setViewMode('parts')}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderBottom: viewMode === 'parts' ? '3px solid #646cff' : '3px solid transparent',
            background: viewMode === 'parts' ? '#2a2a2a' : 'transparent',
            color: viewMode === 'parts' ? '#fff' : '#999',
            cursor: 'pointer',
            fontWeight: viewMode === 'parts' ? 'bold' : 'normal',
            fontSize: '14px'
          }}
        >
          Parts List
        </button>
        <button
          onClick={() => setViewMode('preview')}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderBottom: viewMode === 'preview' ? '3px solid #646cff' : '3px solid transparent',
            background: viewMode === 'preview' ? '#2a2a2a' : 'transparent',
            color: viewMode === 'preview' ? '#fff' : '#999',
            cursor: 'pointer',
            fontWeight: viewMode === 'preview' ? 'bold' : 'normal',
            fontSize: '14px'
          }}
          disabled={parts.length === 0}
        >
          Preview Parts
        </button>
        <button
          onClick={() => setViewMode('nesting')}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderBottom: viewMode === 'nesting' ? '3px solid #646cff' : '3px solid transparent',
            background: viewMode === 'nesting' ? '#2a2a2a' : 'transparent',
            color: viewMode === 'nesting' ? '#fff' : '#999',
            cursor: 'pointer',
            fontWeight: viewMode === 'nesting' ? 'bold' : 'normal',
            fontSize: '14px'
          }}
          disabled={nests.length === 0}
        >
          Nesting Results {nests.length > 0 && `(${nests.length})`}
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* Parts List View - with config sidebar */}
        {viewMode === 'parts' && (
          <div style={{ 
            display: 'flex', 
            height: '100%', 
            background: '#1a1a1a'
          }}>
            {/* Main content area */}
            <div style={{ 
              flex: 1, 
              padding: '20px', 
              overflow: 'auto'
            }}>
              <PartsTable
                parts={parts}
                onDelete={deletePart}
                onQuantityChange={updatePartQuantity}
                onSheetToggle={toggleSheet}
              />

              {imports.length > 0 && (
                <div className="imports-section" style={{ marginTop: '20px' }}>
                  <h2 style={{ color: '#fff' }}>Imported Files</h2>
                  <ul style={{ color: '#ccc' }}>
                    {imports.map((imp, i) => (
                      <li key={i}>{imp.filename}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Config sidebar */}
            <div style={{ 
              width: '320px', 
              minWidth: '320px',
              padding: '20px',
              borderLeft: '1px solid #3a3a3a',
              overflow: 'auto',
              background: '#1e1e1e'
            }}>
              <NestingConfig 
                config={config} 
                onConfigChange={updateConfig}
                disabled={isNesting}
              />
            </div>
          </div>
        )}

        {/* Preview View */}
        {viewMode === 'preview' && (
          <div style={{ padding: '20px', overflow: 'auto', height: '100%', background: '#1a1a1a' }}>
            <h2 style={{ color: '#fff' }}>Part Previews</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '20px',
              marginTop: '20px'
            }}>
              {parts.map((part, index) => (
                <div key={index} style={{ 
                  border: '1px solid #3a3a3a', 
                  borderRadius: '8px',
                  padding: '15px',
                  background: part.sheet ? '#1e3a5f' : '#2a2a2a'
                }}>
                  <div style={{ 
                    background: '#1a1a1a', 
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    minHeight: '150px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {part.svgelements && part.svgelements.length > 0 && (
                      <svg
                        width="100%"
                        height="150"
                        viewBox={`${part.bounds.x - 10} ${part.bounds.y - 10} ${part.bounds.width + 20} ${part.bounds.height + 20}`}
                        style={{ maxWidth: '100%' }}
                      >
                        {part.svgelements.map((el, i) => {
                          const clone = el.cloneNode(true);
                          clone.setAttribute('fill', part.sheet ? '#4a90e2' : '#999');
                          clone.setAttribute('stroke', part.sheet ? '#64a9ff' : '#ccc');
                          clone.setAttribute('stroke-width', '2');
                          return <g key={i} dangerouslySetInnerHTML={{ __html: clone.outerHTML }} />;
                        })}
                      </svg>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#ccc' }}>
                    <div><strong style={{ color: '#fff' }}>Size:</strong> {part.bounds.width.toFixed(1)} × {part.bounds.height.toFixed(1)}</div>
                    <div><strong style={{ color: '#fff' }}>Quantity:</strong> {part.quantity}</div>
                    <div><strong style={{ color: '#fff' }}>Type:</strong> {part.sheet ? '📄 Sheet' : '🔧 Part'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nesting Results View */}
        {viewMode === 'nesting' && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <NestViewer nests={nests} parts={parts} config={config} />
          </div>
        )}
      </div>
    </div>
  )
}
