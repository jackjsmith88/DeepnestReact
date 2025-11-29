import React, { useState, useEffect } from 'react'
import { Container, Card, Button } from 'react-bootstrap'
import { Download } from 'lucide-react'
import 'bootstrap/dist/css/bootstrap.min.css'

// Components
import BinConfiguration from './BinConfiguration'
import QuickPresets from './QuickPresets'
import ShapeBuilder from './ShapeBuilder'
import ShapeList from './ShapeList'
import SVGPreview from './SVGPreview'

// Utils
import { 
  generateSVG, 
  downloadSVG, 
  detectDPI,
  generateRandomShapes,
  generatePresetShapes
} from './svgGeneratorUtils'

/**
 * SVGGeneratorParent - Main component for SVG shape generation
 * Creates custom shapes for testing nesting algorithms
 */
const SVGShapeGenerator = () => {
  // State management
  const [unit, setUnit] = useState('mm')
  const [dpi, setDpi] = useState(96)
  const [binWidth, setBinWidth] = useState(3200)
  const [binHeight, setBinHeight] = useState(1600)
  const [shapes, setShapes] = useState([])
  const [currentShape, setCurrentShape] = useState({
    type: 'L',
    width: 200,
    height: 200,
    cutoutWidth: 80,
    cutoutHeight: 80,
    rotation: 0,
    color: '#FF0000'
  })

  // Detect device DPI on mount
  useEffect(() => {
    const measuredDPI = detectDPI()
    setDpi(measuredDPI)
  }, [])

  // Handlers
  const handleAddShape = () => {
    setShapes([...shapes, { ...currentShape, id: Date.now() }])
  }

  const handleRemoveShape = (id) => {
    setShapes(shapes.filter(shape => shape.id !== id))
  }

  const handleGenerateRandom = () => {
    const newShapes = generateRandomShapes(unit)
    setShapes(newShapes)
    setUnit('mm')
    setBinWidth(3200)
    setBinHeight(1600)
  }

  const handleGeneratePreset = () => {
    const newShapes = generatePresetShapes(unit)
    setShapes(newShapes)
    setUnit('mm')
    setBinWidth(3200)
    setBinHeight(1600)
  }

  const handleClearAll = () => {
    setShapes([])
  }

  const handleDownloadSVG = () => {
    const svgContent = generateSVG({ shapes, binWidth, binHeight, unit, dpi })
    downloadSVG(svgContent)
  }

  // Generate preview SVG
  const previewSVG = shapes.length > 0 
    ? generateSVG({ shapes, binWidth, binHeight, unit, dpi })
    : null

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '2rem 0'
    }}>
      <Container>
        <Card className="shadow-lg mb-4">
          <Card.Body className="p-4">
            <h1 className="display-5 fw-bold mb-2">SVG Nesting Test Generator</h1>
            <p className="text-muted mb-4">Create custom shapes for testing your nesting algorithms</p>

            {/* Bin Configuration */}
            <BinConfiguration
              unit={unit}
              setUnit={setUnit}
              dpi={dpi}
              binWidth={binWidth}
              setBinWidth={setBinWidth}
              binHeight={binHeight}
              setBinHeight={setBinHeight}
            />

            {/* Quick Generation Presets */}
            <QuickPresets
              onGenerateRandom={handleGenerateRandom}
              onGeneratePreset={handleGeneratePreset}
              onClearAll={handleClearAll}
            />

            {/* Shape Builder */}
            <ShapeBuilder
              currentShape={currentShape}
              setCurrentShape={setCurrentShape}
              onAddShape={handleAddShape}
              unit={unit}
              dpi={dpi}
            />

            {/* Shape List */}
            <ShapeList
              shapes={shapes}
              onRemoveShape={handleRemoveShape}
              unit={unit}
            />

            {/* Actions */}
            <div className="d-grid gap-2">
              <Button 
                variant="primary"
                size="lg"
                onClick={handleDownloadSVG}
                disabled={shapes.length === 0}
                className="d-flex align-items-center justify-content-center"
              >
                <Download size={24} className="me-2" />
                Download SVG
              </Button>
              
              {/* Preview Button */}
              <SVGPreview svgContent={previewSVG} />
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  )
}

export default SVGShapeGenerator
