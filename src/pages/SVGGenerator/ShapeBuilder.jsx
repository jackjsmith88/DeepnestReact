import React from 'react'
import { Card, Row, Col, Form, Button, InputGroup } from 'react-bootstrap'
import { Plus, RotateCw } from 'lucide-react'
import { SHAPE_COLORS, mmToPx } from './svgGeneratorUtils'

const ShapeBuilder = ({ 
  currentShape, 
  setCurrentShape, 
  onAddShape,
  unit,
  dpi
}) => {
  const shapeTypes = ['L', 'T', 'U', 'Rectangle']

  const handleRotate = () => {
    setCurrentShape({ ...currentShape, rotation: (currentShape.rotation + 90) % 360 })
  }

  return (
    <Card className="mb-4" style={{ backgroundColor: '#e8f5e9', borderColor: '#81c784' }}>
      <Card.Body>
        <Card.Title className="d-flex align-items-center mb-3">
          <span className="me-2" style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: '#4caf50', 
            borderRadius: '50%',
            display: 'inline-block'
          }}></span>
          Shape Builder
        </Card.Title>
        
        <Row className="g-3 mb-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>Shape Type</Form.Label>
              <Form.Select
                value={currentShape.type}
                onChange={(e) => setCurrentShape({ ...currentShape, type: e.target.value })}
              >
                {shapeTypes.map(type => (
                  <option key={type} value={type}>{type}-Shape</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Width ({unit})</Form.Label>
              <Form.Control
                type="number"
                value={currentShape.width}
                onChange={(e) => setCurrentShape({ ...currentShape, width: Number(e.target.value) })}
                step={unit === 'mm' ? '10' : '1'}
              />
              {unit === 'mm' && (
                <Form.Text className="text-muted">
                  ≈ {Math.round(mmToPx(currentShape.width, dpi))}px
                </Form.Text>
              )}
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Height ({unit})</Form.Label>
              <Form.Control
                type="number"
                value={currentShape.height}
                onChange={(e) => setCurrentShape({ ...currentShape, height: Number(e.target.value) })}
                step={unit === 'mm' ? '10' : '1'}
              />
              {unit === 'mm' && (
                <Form.Text className="text-muted">
                  ≈ {Math.round(mmToPx(currentShape.height, dpi))}px
                </Form.Text>
              )}
            </Form.Group>
          </Col>

          {currentShape.type !== 'Rectangle' && (
            <>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    {currentShape.type === 'T' ? 'Stem Width' : currentShape.type === 'U' ? 'Gap Width' : 'Cutout Width'} ({unit})
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={currentShape.cutoutWidth}
                    onChange={(e) => setCurrentShape({ ...currentShape, cutoutWidth: Number(e.target.value) })}
                    step={unit === 'mm' ? '10' : '1'}
                  />
                  {unit === 'mm' && (
                    <Form.Text className="text-muted">
                      ≈ {Math.round(mmToPx(currentShape.cutoutWidth, dpi))}px
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    {currentShape.type === 'T' ? 'Top Bar Height' : currentShape.type === 'U' ? 'Bottom Height' : 'Cutout Height'} ({unit})
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={currentShape.cutoutHeight}
                    onChange={(e) => setCurrentShape({ ...currentShape, cutoutHeight: Number(e.target.value) })}
                    step={unit === 'mm' ? '10' : '1'}
                  />
                  {unit === 'mm' && (
                    <Form.Text className="text-muted">
                      ≈ {Math.round(mmToPx(currentShape.cutoutHeight, dpi))}px
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </>
          )}

          <Col md={4}>
            <Form.Group>
              <Form.Label>Rotation (°)</Form.Label>
              <InputGroup>
                <Form.Control
                  type="number"
                  value={currentShape.rotation}
                  onChange={(e) => setCurrentShape({ ...currentShape, rotation: Number(e.target.value) })}
                  min="0"
                  max="360"
                  step="45"
                />
                <Button variant="outline-secondary" onClick={handleRotate}>
                  <RotateCw size={18} />
                </Button>
              </InputGroup>
            </Form.Group>
          </Col>

          <Col md={12}>
            <Form.Group>
              <Form.Label>Color</Form.Label>
              <div className="d-flex gap-2">
                {SHAPE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setCurrentShape({ ...currentShape, color })}
                    className="btn p-0"
                    style={{ 
                      width: '32px', 
                      height: '32px',
                      backgroundColor: color,
                      border: currentShape.color === color ? '3px solid #333' : '2px solid #ddd',
                      borderRadius: '8px',
                      transform: currentShape.color === color ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </div>
            </Form.Group>
          </Col>
        </Row>

        <Button 
          variant="success" 
          className="w-100 d-flex align-items-center justify-content-center"
          onClick={onAddShape}
        >
          <Plus size={20} className="me-2" />
          Add Shape to Canvas
        </Button>
      </Card.Body>
    </Card>
  )
}

export default ShapeBuilder
