import React from 'react'
import { Card, ListGroup, Button, Badge } from 'react-bootstrap'
import { Trash2 } from 'lucide-react'

const ShapeList = ({ shapes, onRemoveShape, unit }) => {
  if (shapes.length === 0) return null

  return (
    <Card className="mb-4" style={{ backgroundColor: '#f3e5f5', borderColor: '#ce93d8' }}>
      <Card.Body>
        <Card.Title className="d-flex align-items-center mb-3">
          <span className="me-2" style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: '#9c27b0', 
            borderRadius: '50%',
            display: 'inline-block'
          }}></span>
          Added Shapes ({shapes.length})
        </Card.Title>
        <ListGroup variant="flush">
          {shapes.map((shape, index) => (
            <ListGroup.Item 
              key={shape.id}
              className="d-flex align-items-center justify-content-between"
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{ 
                    width: '24px', 
                    height: '24px',
                    backgroundColor: shape.color,
                    borderRadius: '4px'
                  }}
                />
                <strong>{shape.type}{index + 1}</strong>
                <span className="text-muted">
                  {shape.width}×{shape.height}{unit}
                  {shape.rotation > 0 && ` • ${shape.rotation}°`}
                </span>
              </div>
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={() => onRemoveShape(shape.id)}
              >
                <Trash2 size={16} />
              </Button>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  )
}

export default ShapeList
