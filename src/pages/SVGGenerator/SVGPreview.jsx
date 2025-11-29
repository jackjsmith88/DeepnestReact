import React, { useState, useEffect, useRef } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { Eye, Maximize2 } from 'lucide-react'

const SVGPreview = ({ svgContent }) => {
  const [showModal, setShowModal] = useState(false)
  const containerRef = useRef(null)

  // Process SVG to make it scale to fit container
  const getScaledSVG = () => {
    if (!svgContent) return ''
    
    // Parse the SVG to extract viewBox or dimensions
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgContent, 'image/svg+xml')
    const svgElement = doc.querySelector('svg')
    
    if (svgElement) {
      // Get original dimensions
      const width = svgElement.getAttribute('width')
      const height = svgElement.getAttribute('height')
      
      // If no viewBox exists, create one from width/height
      if (!svgElement.getAttribute('viewBox') && width && height) {
        const numWidth = parseFloat(width)
        const numHeight = parseFloat(height)
        svgElement.setAttribute('viewBox', `0 0 ${numWidth} ${numHeight}`)
      }
      
      // Set SVG to scale to container
      svgElement.setAttribute('width', '100%')
      svgElement.setAttribute('height', '100%')
      svgElement.style.maxWidth = '100%'
      svgElement.style.maxHeight = '60vh'
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      
      return new XMLSerializer().serializeToString(doc)
    }
    
    return svgContent
  }

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
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton>
          <Modal.Title>SVG Preview (Scaled to Fit)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div 
            ref={containerRef}
            className="border rounded p-3" 
            style={{ 
              backgroundColor: '#f0f0f0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '60vh'
            }}
          >
            <div 
              dangerouslySetInnerHTML={{ __html: getScaledSVG() }} 
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            />
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
