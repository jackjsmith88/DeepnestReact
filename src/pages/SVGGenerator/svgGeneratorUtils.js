/**
 * SVG Generator Utilities
 * Handles unit conversions, shape path generation, and SVG creation
 */

export const UNIT_OPTIONS = {
  MM: { label: 'mm', toCm: (val) => val / 10, fromCm: (val) => val * 10 },
  CM: { label: 'cm', toCm: (val) => val, fromCm: (val) => val },
  INCH: { label: 'inch', toCm: (val) => val * 2.54, fromCm: (val) => val / 2.54 }
}

export const SHAPE_TYPES = {
  RECTANGLE: 'rectangle',
  L_SHAPE: 'lshape',
  T_SHAPE: 'tshape',
  CIRCLE: 'circle'
}

export const BIN_PRESETS = {
  CUSTOM: { name: 'Custom', width: 0, height: 0 },
  SHEET_3200x1600: { name: 'Sheet Metal 3200×1600mm', width: 3200, height: 1600, unit: 'MM' },
  SHEET_2440x1220: { name: 'Plywood 8\'×4\' (2440×1220mm)', width: 2440, height: 1220, unit: 'MM' },
  SHEET_2000x1000: { name: 'Sheet 2000×1000mm', width: 2000, height: 1000, unit: 'MM' },
  FABRIC_1500x1000: { name: 'Fabric Roll 1500×1000mm', width: 1500, height: 1000, unit: 'MM' },
  A0_PAPER: { name: 'A0 Paper (1189×841mm)', width: 1189, height: 841, unit: 'MM' }
}

export const SHAPE_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFA500', 
  '#800080', '#008080', '#FF1493', '#FFD700'
]

/**
 * Generate random shapes that fit in the bin
 */
export const generateRandomShapes = (unit) => {
  const newShapes = []
  const numShapes = 6 + Math.floor(Math.random() * 3) // 6-8 shapes
  const shapeTypes = ['L', 'T', 'U', 'Rectangle']
  
  for (let i = 0; i < numShapes; i++) {
    const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
    const baseSize = unit === 'mm' ? 150 + Math.floor(Math.random() * 250) : 100 + Math.floor(Math.random() * 150)
    const width = baseSize
    const height = baseSize + Math.floor(Math.random() * (baseSize * 0.5))
    
    newShapes.push({
      id: Date.now() + i,
      type,
      width,
      height,
      cutoutWidth: Math.floor(width * (0.3 + Math.random() * 0.3)),
      cutoutHeight: Math.floor(height * (0.3 + Math.random() * 0.3)),
      rotation: [0, 90, 180, 270][Math.floor(Math.random() * 4)],
      color: SHAPE_COLORS[i % SHAPE_COLORS.length]
    })
  }
  
  return newShapes
}

/**
 * Generate specific L, T, U shapes that fit in 3200x1600mm
 */
export const generatePresetShapes = (unit) => {
  const presets = unit === 'mm' ? [
    // L-Shapes
    { type: 'L', width: 400, height: 400, cutoutWidth: 150, cutoutHeight: 150, rotation: 0, color: '#FF0000' },
    { type: 'L', width: 350, height: 450, cutoutWidth: 140, cutoutHeight: 180, rotation: 90, color: '#FF1493' },
    { type: 'L', width: 380, height: 380, cutoutWidth: 160, cutoutHeight: 160, rotation: 180, color: '#FF6B6B' },
    
    // T-Shapes
    { type: 'T', width: 500, height: 400, cutoutWidth: 180, cutoutHeight: 120, rotation: 0, color: '#00FF00' },
    { type: 'T', width: 420, height: 480, cutoutWidth: 160, cutoutHeight: 140, rotation: 90, color: '#00DD00' },
    
    // U-Shapes
    { type: 'U', width: 450, height: 380, cutoutWidth: 180, cutoutHeight: 120, rotation: 0, color: '#0000FF' },
    { type: 'U', width: 400, height: 420, cutoutWidth: 160, cutoutHeight: 140, rotation: 270, color: '#4169E1' },
    
    // Additional variety
    { type: 'L', width: 320, height: 500, cutoutWidth: 130, cutoutHeight: 200, rotation: 270, color: '#FFA500' },
    { type: 'T', width: 480, height: 380, cutoutWidth: 170, cutoutHeight: 110, rotation: 180, color: '#800080' },
    { type: 'U', width: 380, height: 450, cutoutWidth: 150, cutoutHeight: 160, rotation: 90, color: '#008080' },
  ] : [
    // Pixel equivalents
    { type: 'L', width: 150, height: 150, cutoutWidth: 60, cutoutHeight: 60, rotation: 0, color: '#FF0000' },
    { type: 'L', width: 130, height: 170, cutoutWidth: 50, cutoutHeight: 70, rotation: 90, color: '#FF1493' },
    { type: 'L', width: 140, height: 140, cutoutWidth: 60, cutoutHeight: 60, rotation: 180, color: '#FF6B6B' },
    
    { type: 'T', width: 180, height: 150, cutoutWidth: 70, cutoutHeight: 50, rotation: 0, color: '#00FF00' },
    { type: 'T', width: 160, height: 180, cutoutWidth: 60, cutoutHeight: 55, rotation: 90, color: '#00DD00' },
    
    { type: 'U', width: 170, height: 140, cutoutWidth: 70, cutoutHeight: 45, rotation: 0, color: '#0000FF' },
    { type: 'U', width: 150, height: 160, cutoutWidth: 60, cutoutHeight: 55, rotation: 270, color: '#4169E1' },
    
    { type: 'L', width: 120, height: 190, cutoutWidth: 50, cutoutHeight: 75, rotation: 270, color: '#FFA500' },
    { type: 'T', width: 180, height: 140, cutoutWidth: 65, cutoutHeight: 40, rotation: 180, color: '#800080' },
    { type: 'U', width: 140, height: 170, cutoutWidth: 55, cutoutHeight: 60, rotation: 90, color: '#008080' },
  ]
  
  return presets.map((preset, i) => ({
    ...preset,
    id: Date.now() + i
  }))
}

/**
 * Convert mm to pixels based on DPI
 * @param {number} mm - Value in millimeters
 * @param {number} dpi - Dots per inch
 * @returns {number} Value in pixels
 */
export const mmToPx = (mm, dpi) => {
  return (mm / 25.4) * dpi
}

/**
 * Convert pixels to mm based on DPI
 * @param {number} px - Value in pixels
 * @param {number} dpi - Dots per inch
 * @returns {number} Value in millimeters
 */
export const pxToMm = (px, dpi) => {
  return (px * 25.4) / dpi
}

/**
 * Get value in pixels (convert if needed)
 * @param {number} value - Value to convert
 * @param {string} unit - Current unit ('mm' or 'px')
 * @param {number} dpi - Dots per inch
 * @returns {number} Value in pixels
 */
export const getValueInPx = (value, unit, dpi) => {
  return unit === 'mm' ? mmToPx(value, dpi) : value
}

/**
 * Get display value in current unit
 * @param {number} pxValue - Value in pixels
 * @param {string} unit - Target unit ('mm' or 'px')
 * @param {number} dpi - Dots per inch
 * @returns {string} Formatted value
 */
export const getDisplayValue = (pxValue, unit, dpi) => {
  return unit === 'mm' ? pxToMm(pxValue, dpi).toFixed(2) : Math.round(pxValue)
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color code
 * @returns {object} RGB color object {r, g, b}
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

/**
 * Generate path points for a shape
 * @param {object} shape - Shape configuration
 * @param {number} xOffset - X offset for positioning
 * @param {number} yOffset - Y offset for positioning
 * @param {string} unit - Current unit
 * @param {number} dpi - Dots per inch
 * @returns {string} SVG polygon points string
 */
export const generateShapePath = (shape, xOffset, yOffset, unit, dpi) => {
  const width = getValueInPx(shape.width, unit, dpi)
  const height = getValueInPx(shape.height, unit, dpi)
  const cutoutWidth = getValueInPx(shape.cutoutWidth, unit, dpi)
  const cutoutHeight = getValueInPx(shape.cutoutHeight, unit, dpi)
  const { type, rotation } = shape
  let points = []

  switch (type) {
    case 'L':
      // L-shape: starts top-left, goes right, down, left (partial), down, left
      points = [
        [0, 0],
        [width, 0],
        [width, cutoutHeight],
        [cutoutWidth, cutoutHeight],
        [cutoutWidth, height],
        [0, height]
      ]
      break

    case 'T':
      // T-shape: top bar with stem down the middle
      const stemWidth = cutoutWidth
      const leftBar = (width - stemWidth) / 2
      points = [
        [0, 0],
        [width, 0],
        [width, cutoutHeight],
        [leftBar + stemWidth, cutoutHeight],
        [leftBar + stemWidth, height],
        [leftBar, height],
        [leftBar, cutoutHeight],
        [0, cutoutHeight]
      ]
      break

    case 'U':
      // U-shape: two vertical bars with bottom connection
      const gapWidth = cutoutWidth
      const barWidth = (width - gapWidth) / 2
      points = [
        [0, 0],
        [barWidth, 0],
        [barWidth, height - cutoutHeight],
        [barWidth + gapWidth, height - cutoutHeight],
        [barWidth + gapWidth, 0],
        [width, 0],
        [width, height],
        [0, height]
      ]
      break

    case 'Rectangle':
      points = [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height]
      ]
      break

    default:
      points = [[0, 0]]
  }

  // Apply rotation if needed
  if (rotation !== 0) {
    const rad = (rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const cx = width / 2
    const cy = height / 2

    points = points.map(([x, y]) => {
      const dx = x - cx
      const dy = y - cy
      return [
        cx + (dx * cos - dy * sin),
        cy + (dx * sin + dy * cos)
      ]
    })
    
    // Normalize rotated points to start from (0, 0)
    const minX = Math.min(...points.map(p => p[0]))
    const minY = Math.min(...points.map(p => p[1]))
    points = points.map(([x, y]) => [x - minX, y - minY])
  }

  // Offset points
  points = points.map(([x, y]) => [x + xOffset, y + yOffset])

  return points.map(p => p.join(',')).join(' ')
}

/**
 * Calculate bounding box for a shape considering rotation
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @param {number} rotation - Rotation in degrees
 * @returns {object} Bounding box {width, height}
 */
const getRotatedBoundingBox = (width, height, rotation) => {
  if (rotation === 0 || rotation === 180) {
    return { width, height }
  } else if (rotation === 90 || rotation === 270) {
    return { width: height, height: width }
  } else {
    // For other angles, calculate the bounding box
    const rad = (rotation * Math.PI) / 180
    const cos = Math.abs(Math.cos(rad))
    const sin = Math.abs(Math.sin(rad))
    return {
      width: width * cos + height * sin,
      height: width * sin + height * cos
    }
  }
}

/**
 * Generate complete SVG string with non-overlapping shapes
 * @param {object} params - Generation parameters
 * @returns {string} Complete SVG markup
 */
export const generateSVG = ({ shapes, binWidth, binHeight, unit, dpi }) => {
  const binWidthPx = getValueInPx(binWidth, unit, dpi)
  const binHeightPx = getValueInPx(binHeight, unit, dpi)
  const margin = 30 // Increased margin between shapes and from edges
  const binX = 50
  const binY = 50
  const shapeStartX = binX + binWidthPx + margin * 3 // Extra margin from bin
  
  // Calculate positions for shapes to avoid overlap
  const shapePositions = []
  let currentY = binY
  let currentX = shapeStartX
  let maxHeightInRow = 0
  const maxRowWidth = 600 // Narrower rows to prevent issues

  shapes.forEach((shape, index) => {
    const shapeWidthPx = getValueInPx(shape.width, unit, dpi)
    const shapeHeightPx = getValueInPx(shape.height, unit, dpi)
    
    // Get actual bounding box considering rotation
    const bbox = getRotatedBoundingBox(shapeWidthPx, shapeHeightPx, shape.rotation || 0)
    
    // Add extra padding to bounding box to ensure separation
    const paddedWidth = bbox.width + margin
    const paddedHeight = bbox.height + margin
    
    // Check if we need to move to next row
    if (currentX - shapeStartX + paddedWidth > maxRowWidth && index > 0) {
      currentX = shapeStartX
      currentY += maxHeightInRow + margin * 2 // Extra vertical spacing
      maxHeightInRow = 0
    }
    
    shapePositions.push({ x: currentX, y: currentY })
    
    currentX += paddedWidth + margin // Extra horizontal spacing
    maxHeightInRow = Math.max(maxHeightInRow, paddedHeight)
  })

  // Calculate total SVG dimensions with extra padding
  const shapesAreaWidth = Math.max(...shapePositions.map((pos, i) => {
    const shapeWidthPx = getValueInPx(shapes[i].width, unit, dpi)
    const shapeHeightPx = getValueInPx(shapes[i].height, unit, dpi)
    const bbox = getRotatedBoundingBox(shapeWidthPx, shapeHeightPx, shapes[i].rotation || 0)
    return pos.x + bbox.width
  })) + margin * 3
  
  const shapesAreaHeight = Math.max(...shapePositions.map((pos, i) => {
    const shapeWidthPx = getValueInPx(shapes[i].width, unit, dpi)
    const shapeHeightPx = getValueInPx(shapes[i].height, unit, dpi)
    const bbox = getRotatedBoundingBox(shapeWidthPx, shapeHeightPx, shapes[i].rotation || 0)
    return pos.y + bbox.height
  })) + margin * 3

  const svgWidth = Math.max(shapesAreaWidth, binX + binWidthPx + margin * 3)
  const svgHeight = Math.max(shapesAreaHeight, binY + binHeightPx + margin * 3)

  let svgContent = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${svgWidth}px" height="${svgHeight}px" viewBox="0 0 ${svgWidth} ${svgHeight}">
  
  <!-- Bin outline -->
  <rect x="${binX}" y="${binY}" width="${binWidthPx}" height="${binHeightPx}" fill="none" stroke="#0000FF" stroke-width="3" stroke-dasharray="10,5"/>
  <text x="${binX + binWidthPx / 2}" y="${binY - 20}" text-anchor="middle" fill="#0000FF" font-size="16" font-weight="bold">Bin: ${binWidth}×${binHeight}${unit}</text>
  
  <!-- Shapes area separator line -->
  <line x1="${shapeStartX - margin * 1.5}" y1="${binY - 30}" x2="${shapeStartX - margin * 1.5}" y2="${svgHeight - 30}" stroke="#999" stroke-width="1" stroke-dasharray="5,5" opacity="0.5"/>
  <text x="${shapeStartX - margin}" y="${binY - 20}" text-anchor="start" fill="#666" font-size="14">Shapes to Nest →</text>
  
`

  shapes.forEach((shape, index) => {
    const position = shapePositions[index]
    const points = generateShapePath(shape, position.x, position.y, unit, dpi)
    const rgbColor = hexToRgb(shape.color)
    const fillColor = `rgba(${rgbColor.r},${rgbColor.g},${rgbColor.b},0.3)`
    const shapeWidthPx = getValueInPx(shape.width, unit, dpi)
    const shapeHeightPx = getValueInPx(shape.height, unit, dpi)
    const bbox = getRotatedBoundingBox(shapeWidthPx, shapeHeightPx, shape.rotation || 0)

    svgContent += `  <!-- ${shape.type}-Shape ${index + 1} (${shape.width}×${shape.height}${unit}${shape.rotation ? ', ' + shape.rotation + '°' : ''}) -->
  <g id="${shape.type.toLowerCase()}shape${index + 1}">
    <polygon points="${points}" 
             fill="${fillColor}" stroke="${shape.color}" stroke-width="2"/>
    <text x="${position.x + shapeWidthPx / 2}" y="${position.y + shapeHeightPx / 2}" text-anchor="middle" fill="${shape.color}" font-size="12" font-weight="bold">${shape.type}${index + 1}</text>
  </g>
  
`
  })

  svgContent += `</svg>`
  return svgContent
}

/**
 * Detect device DPI
 * @returns {number} Detected DPI value
 */
export const detectDPI = () => {
  const div = document.createElement('div')
  div.style.width = '1in'
  div.style.visibility = 'hidden'
  div.style.position = 'absolute'
  document.body.appendChild(div)
  const measuredDPI = div.offsetWidth
  document.body.removeChild(div)
  
  return measuredDPI || (window.devicePixelRatio * 96)
}

/**
 * Download SVG content as file
 * @param {string} svgContent - SVG markup to download
 * @param {string} filename - Filename for the download
 */
export const downloadSVG = (svgContent, filename = `nesting-test-${Date.now()}.svg`) => {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
