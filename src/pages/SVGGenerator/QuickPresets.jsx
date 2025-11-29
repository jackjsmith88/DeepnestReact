import React from 'react'
import { Card, Row, Col, Button } from 'react-bootstrap'
import { Dices, Ruler, Trash2 } from 'lucide-react'

const QuickPresets = ({ onGenerateRandom, onGeneratePreset, onClearAll }) => {
  return (
    <Card className="mb-4" style={{ 
      background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      borderColor: '#ffb74d'
    }}>
      <Card.Body>
        <Card.Title className="d-flex align-items-center mb-2">
          <span className="me-2" style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: '#ff9800', 
            borderRadius: '50%',
            display: 'inline-block'
          }}></span>
          Quick Generate
        </Card.Title>
        <Card.Text className="text-muted mb-3">
          Generate preset shape collections for quick testing
        </Card.Text>
        <Row className="g-3">
          <Col md={4}>
            <Button 
              variant="outline-warning"
              className="w-100 text-start"
              onClick={onGenerateRandom}
              style={{ height: '100%', minHeight: '80px' }}
            >
              <div>
                <div className="d-flex align-items-center mb-1">
                  <Dices size={18} className="me-2" />
                  <strong>Random Mix (6-8 shapes)</strong>
                </div>
                <small className="text-muted">
                  Randomized L, T, U, and Rectangle shapes
                </small>
              </div>
            </Button>
          </Col>
          
          <Col md={4}>
            <Button 
              variant="outline-warning"
              className="w-100 text-start"
              onClick={onGeneratePreset}
              style={{ height: '100%', minHeight: '80px' }}
            >
              <div>
                <div className="d-flex align-items-center mb-1">
                  <Ruler size={18} className="me-2" />
                  <strong>Preset L/T/U Collection</strong>
                </div>
                <small className="text-muted">
                  10 optimized shapes designed to fit 3200×1600mm
                </small>
              </div>
            </Button>
          </Col>

          <Col md={4}>
            <Button 
              variant="secondary"
              className="w-100 text-start"
              onClick={onClearAll}
              style={{ height: '100%', minHeight: '80px' }}
            >
              <div>
                <div className="d-flex align-items-center mb-1">
                  <Trash2 size={18} className="me-2" />
                  <strong>Clear All</strong>
                </div>
                <small style={{ opacity: 0.9 }}>
                  Start fresh
                </small>
              </div>
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

export default QuickPresets
