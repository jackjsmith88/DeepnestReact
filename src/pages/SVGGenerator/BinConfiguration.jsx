import React from 'react'
import { Card, Row, Col, Form, ButtonGroup, Button, Badge } from 'react-bootstrap'
import { mmToPx, pxToMm } from './svgGeneratorUtils'

const BinConfiguration = ({ 
  unit, 
  setUnit, 
  dpi, 
  binWidth, 
  setBinWidth, 
  binHeight, 
  setBinHeight 
}) => {
  return (
    <Card className="mb-4" style={{ backgroundColor: '#e7f3ff', borderColor: '#90caf9' }}>
      <Card.Body>
        <Card.Title className="d-flex align-items-center mb-3">
          <span className="me-2" style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: '#2196f3', 
            borderRadius: '50%',
            display: 'inline-block'
          }}></span>
          Bin Configuration
        </Card.Title>
        
        {/* Unit Toggle */}
        <div className="mb-3 d-flex align-items-center">
          <Form.Label className="me-3 mb-0">Unit:</Form.Label>
          <ButtonGroup className="me-auto">
            <Button 
              variant={unit === 'mm' ? 'primary' : 'outline-secondary'}
              onClick={() => setUnit('mm')}
              size="sm"
            >
              Millimeters (mm)
            </Button>
            <Button 
              variant={unit === 'px' ? 'primary' : 'outline-secondary'}
              onClick={() => setUnit('px')}
              size="sm"
            >
              Pixels (px)
            </Button>
          </ButtonGroup>
          <Badge bg="light" text="dark" className="ms-auto">
            Screen DPI: <strong>{Math.round(dpi)}</strong>
            {unit === 'mm' && (
              <small className="ms-2 text-muted">
                (1mm = {(dpi / 25.4).toFixed(2)}px)
              </small>
            )}
          </Badge>
        </div>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Width ({unit})</Form.Label>
              <Form.Control
                type="number"
                value={binWidth}
                onChange={(e) => setBinWidth(Number(e.target.value))}
                step={unit === 'mm' ? '10' : '1'}
              />
              {unit === 'mm' && (
                <Form.Text className="text-muted">
                  ≈ {Math.round(mmToPx(binWidth, dpi))}px
                </Form.Text>
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Height ({unit})</Form.Label>
              <Form.Control
                type="number"
                value={binHeight}
                onChange={(e) => setBinHeight(Number(e.target.value))}
                step={unit === 'mm' ? '10' : '1'}
              />
              {unit === 'mm' && (
                <Form.Text className="text-muted">
                  ≈ {Math.round(mmToPx(binHeight, dpi))}px
                </Form.Text>
              )}
            </Form.Group>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

export default BinConfiguration
