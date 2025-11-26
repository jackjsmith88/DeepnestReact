import { useState } from 'react'
import './App.css'
import { useDeepnest } from './hooks/useDeepnest'
import { PartsTable } from './components/PartsTable'
import { FileImport } from './components/FileImport'
import NestViewer from './components/NestViewer'

function App() {
  const [activeTab, setActiveTab] = useState('home')
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
    <div className="app">
      <nav className="sidenav">
        <button 
          className={activeTab === 'home' ? 'active' : ''} 
          onClick={() => setActiveTab('home')}
          aria-label="Home"
          title="Home"
        />
        <button 
          className={activeTab === 'config' ? 'active' : ''} 
          onClick={() => setActiveTab('config')}
          aria-label="Configuration"
          title="Configuration"
        />
        <button 
          className={activeTab === 'info' ? 'active' : ''} 
          onClick={() => setActiveTab('info')}
          aria-label="Info"
          title="Info"
        />
      </nav>

      <main className="main">
        {activeTab === 'home' && (
          <div className="page home">
            <div className="toolbar">
              <h1>Deepnest</h1>
              <div className="button-group">
                <FileImport onImport={importSVG} disabled={isNesting} />
                <button 
                  className={`button start ${!hasSheets || isNesting ? 'disabled' : ''}`}
                  onClick={handleStartNest}
                  disabled={!hasSheets || isNesting}
                >
                  {isNesting ? `Nesting... ${Math.round(progress * 100)}%` : 'Start Nest'}
                </button>
                {isNesting && (
                  <button className="button stop" onClick={stopNest}>
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
              borderBottom: '2px solid #ddd',
              background: '#f5f5f5'
            }}>
              <button
                onClick={() => setViewMode('parts')}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderBottom: viewMode === 'parts' ? '3px solid #007acc' : '3px solid transparent',
                  background: viewMode === 'parts' ? '#fff' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: viewMode === 'parts' ? 'bold' : 'normal'
                }}
              >
                Parts List
              </button>
              <button
                onClick={() => setViewMode('preview')}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderBottom: viewMode === 'preview' ? '3px solid #007acc' : '3px solid transparent',
                  background: viewMode === 'preview' ? '#fff' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: viewMode === 'preview' ? 'bold' : 'normal'
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
                  borderBottom: viewMode === 'nesting' ? '3px solid #007acc' : '3px solid transparent',
                  background: viewMode === 'nesting' ? '#fff' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: viewMode === 'nesting' ? 'bold' : 'normal'
                }}
                disabled={nests.length === 0}
              >
                Nesting Results {nests.length > 0 && `(${nests.length})`}
              </button>
            </div>

            {/* Parts List View */}
            {viewMode === 'parts' && (
              <div style={{ padding: '20px', overflow: 'auto', height: 'calc(100vh - 180px)' }}>
                <PartsTable
                  parts={parts}
                  onDelete={deletePart}
                  onQuantityChange={updatePartQuantity}
                  onSheetToggle={toggleSheet}
                />

                {imports.length > 0 && (
                  <div className="imports-section" style={{ marginTop: '20px' }}>
                    <h2>Imported Files</h2>
                    <ul>
                      {imports.map((imp, i) => (
                        <li key={i}>{imp.filename}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Preview View */}
            {viewMode === 'preview' && (
              <div style={{ padding: '20px', overflow: 'auto', height: 'calc(100vh - 180px)' }}>
                <h2>Part Previews</h2>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '20px',
                  marginTop: '20px'
                }}>
                  {parts.map((part, index) => (
                    <div key={index} style={{ 
                      border: '1px solid #ddd', 
                      borderRadius: '8px',
                      padding: '15px',
                      background: part.sheet ? '#e3f2fd' : '#fff'
                    }}>
                      <div style={{ 
                        background: '#f5f5f5', 
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
                              clone.setAttribute('fill', part.sheet ? '#1976d2' : '#666');
                              clone.setAttribute('stroke', '#333');
                              clone.setAttribute('stroke-width', '2');
                              return <g key={i} dangerouslySetInnerHTML={{ __html: clone.outerHTML }} />;
                            })}
                          </svg>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <div><strong>Size:</strong> {part.bounds.width.toFixed(1)} × {part.bounds.height.toFixed(1)}</div>
                        <div><strong>Quantity:</strong> {part.quantity}</div>
                        <div><strong>Type:</strong> {part.sheet ? '📄 Sheet' : '🔧 Part'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nesting Results View */}
            {viewMode === 'nesting' && (
              <div style={{ height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
                <NestViewer nests={nests} parts={parts} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="page config">
            <h1>Configuration</h1>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label>Display Units</label>
                <div>
                  <input 
                    type="radio" 
                    name="units" 
                    value="inch" 
                    checked={config.units === 'inch'}
                    onChange={(e) => updateConfig('units', e.target.value)}
                  /> inches
                  <input 
                    type="radio" 
                    name="units" 
                    value="mm" 
                    checked={config.units === 'mm'}
                    onChange={(e) => updateConfig('units', e.target.value)}
                  /> mm
                </div>
              </div>
              
              <div className="form-group">
                <label>Space between parts ({config.units})</label>
                <input 
                  type="number" 
                  value={config.spacing} 
                  min="0" 
                  step="any"
                  onChange={(e) => updateConfig('spacing', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="form-group">
                <label>Curve tolerance ({config.units})</label>
                <input 
                  type="number" 
                  value={config.curveTolerance} 
                  min="0" 
                  step="any"
                  onChange={(e) => updateConfig('curveTolerance', parseFloat(e.target.value) || 0.3)}
                />
              </div>
              
              <div className="form-group">
                <label>Rotations (0 = no rotation)</label>
                <input 
                  type="number" 
                  value={config.rotations} 
                  min="0" 
                  step="1"
                  onChange={(e) => updateConfig('rotations', parseInt(e.target.value) || 4)}
                />
              </div>

              <div className="form-group">
                <label>Population Size</label>
                <input 
                  type="number" 
                  value={config.populationSize} 
                  min="1" 
                  step="1"
                  onChange={(e) => updateConfig('populationSize', parseInt(e.target.value) || 10)}
                />
              </div>

              <div className="form-group">
                <label>Mutation Rate (%)</label>
                <input 
                  type="number" 
                  value={config.mutationRate} 
                  min="0" 
                  max="100"
                  step="1"
                  onChange={(e) => updateConfig('mutationRate', parseInt(e.target.value) || 10)}
                />
              </div>

              <div className="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={config.mergeLines}
                    onChange={(e) => updateConfig('mergeLines', e.target.checked)}
                  />
                  Merge common cutting lines
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={config.simplify}
                    onChange={(e) => updateConfig('simplify', e.target.checked)}
                  />
                  Simplify polygons (use convex hulls)
                </label>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="page info">
            <h1>About Deepnest</h1>
            <p><strong>Version 2.0.0</strong> - React Web Edition</p>
            <p>A fast, robust nesting tool for laser cutters and CNC machines</p>
            
            <h2>What's New in Web Edition</h2>
            <ul>
              <li>✅ No installation required - runs in your browser</li>
              <li>✅ Cross-platform compatibility</li>
              <li>✅ Pure JavaScript implementation (ClipperLib)</li>
              <li>✅ Modern React interface</li>
              <li>⚠️ Web Workers for background processing (coming soon)</li>
            </ul>

            <h2>How to Use</h2>
            <ol>
              <li>Import your SVG or DXF files</li>
              <li>Mark at least one part as "Sheet" (the material to nest onto)</li>
              <li>Adjust quantities for parts you want to nest</li>
              <li>Configure nesting settings if needed</li>
              <li>Click "Start Nest" to begin</li>
            </ol>

            <h2>Credits</h2>
            <p>Original Deepnest by <a href="https://github.com/Jack000" target="_blank" rel="noopener">Jack Qiao</a></p>
            <p>Based on <a href="https://github.com/Jack000/SVGnest" target="_blank" rel="noopener">SVGNest</a></p>
            <p>Web version migration - 2025</p>

            <h2>License</h2>
            <p>GPLv3</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
