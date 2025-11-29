import React, { useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { Eye, Maximize2 } from 'lucide-react'

const SVGPreview = ({ svgContent }) => {
  const [showModal, setShowModal] = useState(false)

  if (!svgContent) return null

  return (
    <>
      <div className="d-grid">
        <Button 
          variant="info"
          size="lg"
          onClick={() => setShowModal(true)}
          className="d-flex align-items-center justify-content-center"
        >
          <Eye size={20} className="me-2" />
          Preview SVG
          <Maximize2 size={18} className="ms-2" />
        </Button>
      </div>

      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>SVG Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <div 
            className="border rounded p-3" 
            style={{ backgroundColor: '#f8f9fa' }}
          >
            <div dangerouslySetInnerHTML={{ __html: svgContent }} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default SVGPreview
