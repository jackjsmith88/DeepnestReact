/**
 * SVGGeneratorAPI - Programmatic SVG shape generation for nesting
 * 
 * @example
 * ```javascript
 * import { SVGGenerator } from 'deepnest-react';
 * 
 * const generator = new SVGGenerator({ dpi: 72, units: 'mm' });
 * 
 * // Create a sheet (bin)
 * const sheet = generator.rect({ width: 3200, height: 1600, isSheet: true });
 * 
 * // Create parts to nest
 * const parts = [
 *   generator.rect({ width: 400, height: 300, quantity: 5 }),
 *   generator.lShape({ width: 500, height: 400, armWidth: 100, armHeight: 150 }),
 *   generator.uShape({ width: 600, height: 500, gapWidth: 200, gapHeight: 300 }),
 * ];
 * 
 * // Generate SVG string
 * const svg = generator.toSVG({ sheet, parts });
 * 
 * // Or create Sheet directly for DeepNest
 * const nestInput = generator.toNestInput({ sheet, parts });
 * ```
 */

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  dpi: 72,
  units: 'mm',
  strokeWidth: 2,
  margin: 30
};

/**
 * Shape type constants
 */
export const ShapeTypes = {
  RECTANGLE: 'Rectangle',
  L_SHAPE: 'L',
  T_SHAPE: 'T',
  U_SHAPE: 'U',
  CIRCLE: 'Circle',
  POLYGON: 'Polygon'
};

/**
 * Unit conversion utilities
 */
const mmToPx = (mm, dpi) => (mm / 25.4) * dpi;
const pxToMm = (px, dpi) => (px * 25.4) / dpi;
const inchToPx = (inch, dpi) => inch * dpi;
const pxToInch = (px, dpi) => px / dpi;

/**
 * SVGGeneratorAPI class for programmatic shape generation
 */
export class SVGGenerator {
  /**
   * Create a new SVGGenerator instance
   * @param {Object} config - Configuration options
   * @param {number} [config.dpi=72] - Dots per inch for unit conversion
   * @param {string} [config.units='mm'] - Default units ('mm', 'px', 'inch')
   * @param {number} [config.strokeWidth=2] - Default stroke width
   * @param {number} [config.margin=30] - Default margin between shapes
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._shapes = [];
    this._sheets = [];
    this._idCounter = 1;
  }

  /**
   * Convert value to pixels based on current units
   * @private
   */
  _toPx(value, units = this.config.units) {
    switch (units) {
      case 'mm': return mmToPx(value, this.config.dpi);
      case 'inch': return inchToPx(value, this.config.dpi);
      default: return value;
    }
  }

  /**
   * Convert pixels to specified units
   * @private
   */
  _fromPx(px, units = this.config.units) {
    switch (units) {
      case 'mm': return pxToMm(px, this.config.dpi);
      case 'inch': return pxToInch(px, this.config.dpi);
      default: return px;
    }
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `shape_${Date.now()}_${this._idCounter++}`;
  }

  /**
   * Create a rectangle shape
   * @param {Object} params - Rectangle parameters
   * @param {number} params.width - Width in current units
   * @param {number} params.height - Height in current units
   * @param {string} [params.color='#4CAF50'] - Fill color
   * @param {number} [params.quantity=1] - Number of copies
   * @param {number} [params.rotation=0] - Rotation in degrees
   * @param {boolean} [params.isSheet=false] - Whether this is a sheet/bin
   * @param {string} [params.id] - Custom ID
   * @returns {Object} Shape definition
   */
  rect({ width, height, color = '#4CAF50', quantity = 1, rotation = 0, isSheet = false, id = null }) {
    const shape = {
      id: id || this._generateId(),
      type: ShapeTypes.RECTANGLE,
      width,
      height,
      widthPx: this._toPx(width),
      heightPx: this._toPx(height),
      color,
      quantity,
      rotation,
      isSheet,
      units: this.config.units,
      points: this._generateRectPoints(this._toPx(width), this._toPx(height))
    };

    if (isSheet) {
      this._sheets.push(shape);
    } else {
      this._shapes.push(shape);
    }

    return shape;
  }

  /**
   * Create an L-shaped part
   * @param {Object} params - L-shape parameters
   * @param {number} params.width - Total width
   * @param {number} params.height - Total height
   * @param {number} params.armWidth - Width of vertical arm (cutout width from right)
   * @param {number} params.armHeight - Height of horizontal arm (cutout height from bottom)
   * @param {string} [params.color='#2196F3'] - Fill color
   * @param {number} [params.quantity=1] - Number of copies
   * @param {number} [params.rotation=0] - Rotation in degrees
   * @param {string} [params.id] - Custom ID
   * @returns {Object} Shape definition
   */
  lShape({ width, height, armWidth, armHeight, color = '#2196F3', quantity = 1, rotation = 0, id = null }) {
    // armWidth = width of the vertical part remaining after cutout
    // armHeight = height of the horizontal part at top
    const cutoutWidth = width - armWidth; // Width of the cutout from right side
    const cutoutHeight = height - armHeight; // Height of the cutout (bottom portion removed)

    const widthPx = this._toPx(width);
    const heightPx = this._toPx(height);
    const cutoutWidthPx = this._toPx(cutoutWidth);
    const cutoutHeightPx = this._toPx(cutoutHeight);

    const shape = {
      id: id || this._generateId(),
      type: ShapeTypes.L_SHAPE,
      width,
      height,
      armWidth,
      armHeight,
      cutoutWidth,
      cutoutHeight,
      widthPx,
      heightPx,
      color,
      quantity,
      rotation,
      isSheet: false,
      units: this.config.units,
      points: this._generateLShapePoints(widthPx, heightPx, cutoutWidthPx, cutoutHeightPx)
    };

    this._shapes.push(shape);
    return shape;
  }

  /**
   * Create a T-shaped part
   * @param {Object} params - T-shape parameters
   * @param {number} params.width - Total width (top bar)
   * @param {number} params.height - Total height
   * @param {number} params.stemWidth - Width of the stem
   * @param {number} params.barHeight - Height of the top bar
   * @param {string} [params.color='#FF9800'] - Fill color
   * @param {number} [params.quantity=1] - Number of copies
   * @param {number} [params.rotation=0] - Rotation in degrees
   * @param {string} [params.id] - Custom ID
   * @returns {Object} Shape definition
   */
  tShape({ width, height, stemWidth, barHeight, color = '#FF9800', quantity = 1, rotation = 0, id = null }) {
    const widthPx = this._toPx(width);
    const heightPx = this._toPx(height);
    const stemWidthPx = this._toPx(stemWidth);
    const barHeightPx = this._toPx(barHeight);

    const shape = {
      id: id || this._generateId(),
      type: ShapeTypes.T_SHAPE,
      width,
      height,
      stemWidth,
      barHeight,
      widthPx,
      heightPx,
      color,
      quantity,
      rotation,
      isSheet: false,
      units: this.config.units,
      points: this._generateTShapePoints(widthPx, heightPx, stemWidthPx, barHeightPx)
    };

    this._shapes.push(shape);
    return shape;
  }

  /**
   * Create a U-shaped part
   * @param {Object} params - U-shape parameters
   * @param {number} params.width - Total width
   * @param {number} params.height - Total height
   * @param {number} params.gapWidth - Width of the gap
   * @param {number} params.gapHeight - Height of the gap from top
   * @param {string} [params.color='#9C27B0'] - Fill color
   * @param {number} [params.quantity=1] - Number of copies
   * @param {number} [params.rotation=0] - Rotation in degrees
   * @param {string} [params.id] - Custom ID
   * @returns {Object} Shape definition
   */
  uShape({ width, height, gapWidth, gapHeight, color = '#9C27B0', quantity = 1, rotation = 0, id = null }) {
    const widthPx = this._toPx(width);
    const heightPx = this._toPx(height);
    const gapWidthPx = this._toPx(gapWidth);
    const gapHeightPx = this._toPx(gapHeight);

    const shape = {
      id: id || this._generateId(),
      type: ShapeTypes.U_SHAPE,
      width,
      height,
      gapWidth,
      gapHeight,
      widthPx,
      heightPx,
      color,
      quantity,
      rotation,
      isSheet: false,
      units: this.config.units,
      points: this._generateUShapePoints(widthPx, heightPx, gapWidthPx, gapHeightPx)
    };

    this._shapes.push(shape);
    return shape;
  }

  /**
   * Create a circle shape
   * @param {Object} params - Circle parameters
   * @param {number} params.radius - Radius in current units
   * @param {number} [params.segments=32] - Number of polygon segments
   * @param {string} [params.color='#E91E63'] - Fill color
   * @param {number} [params.quantity=1] - Number of copies
   * @param {string} [params.id] - Custom ID
   * @returns {Object} Shape definition
   */
  circle({ radius, segments = 32, color = '#E91E63', quantity = 1, id = null }) {
    const radiusPx = this._toPx(radius);
    const diameter = radius * 2;

    const shape = {
      id: id || this._generateId(),
      type: ShapeTypes.CIRCLE,
      radius,
      diameter,
      width: diameter,
      height: diameter,
      segments,
      radiusPx,
      widthPx: radiusPx * 2,
      heightPx: radiusPx * 2,
      color,
      quantity,
      rotation: 0,
      isSheet: false,
      units: this.config.units,
      points: this._generateCirclePoints(radiusPx, segments)
    };

    this._shapes.push(shape);
    return shape;
  }

  /**
   * Create a custom polygon shape
   * @param {Object} params - Polygon parameters
   * @param {Array<{x: number, y: number}>} params.points - Array of points in current units
   * @param {string} [params.color='#607D8B'] - Fill color
   * @param {number} [params.quantity=1] - Number of copies
   * @param {number} [params.rotation=0] - Rotation in degrees
   * @param {string} [params.id] - Custom ID
   * @returns {Object} Shape definition
   */
  polygon({ points, color = '#607D8B', quantity = 1, rotation = 0, id = null }) {
    const pointsPx = points.map(p => ({
      x: this._toPx(p.x),
      y: this._toPx(p.y)
    }));

    // Calculate bounding box
    const xs = pointsPx.map(p => p.x);
    const ys = pointsPx.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Normalize points to start from (0, 0)
    const normalizedPoints = pointsPx.map(p => ({
      x: p.x - minX,
      y: p.y - minY
    }));

    const shape = {
      id: id || this._generateId(),
      type: ShapeTypes.POLYGON,
      width: this._fromPx(maxX - minX),
      height: this._fromPx(maxY - minY),
      widthPx: maxX - minX,
      heightPx: maxY - minY,
      color,
      quantity,
      rotation,
      isSheet: false,
      units: this.config.units,
      points: normalizedPoints
    };

    this._shapes.push(shape);
    return shape;
  }

  /**
   * Generate rectangle points
   * @private
   */
  _generateRectPoints(width, height) {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ];
  }

  /**
   * Generate L-shape points
   * @private
   */
  _generateLShapePoints(width, height, cutoutWidth, cutoutHeight) {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height - cutoutHeight },
      { x: width - cutoutWidth, y: height - cutoutHeight },
      { x: width - cutoutWidth, y: height },
      { x: 0, y: height }
    ];
  }

  /**
   * Generate T-shape points
   * @private
   */
  _generateTShapePoints(width, height, stemWidth, barHeight) {
    const leftBar = (width - stemWidth) / 2;
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: barHeight },
      { x: leftBar + stemWidth, y: barHeight },
      { x: leftBar + stemWidth, y: height },
      { x: leftBar, y: height },
      { x: leftBar, y: barHeight },
      { x: 0, y: barHeight }
    ];
  }

  /**
   * Generate U-shape points
   * @private
   */
  _generateUShapePoints(width, height, gapWidth, gapHeight) {
    const barWidth = (width - gapWidth) / 2;
    return [
      { x: 0, y: 0 },
      { x: barWidth, y: 0 },
      { x: barWidth, y: gapHeight },
      { x: barWidth + gapWidth, y: gapHeight },
      { x: barWidth + gapWidth, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ];
  }

  /**
   * Generate circle points as polygon approximation
   * @private
   */
  _generateCirclePoints(radius, segments) {
    const points = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: radius + radius * Math.cos(angle),
        y: radius + radius * Math.sin(angle)
      });
    }
    return points;
  }

  /**
   * Apply rotation to points
   * @private
   */
  _rotatePoints(points, rotation, centerX, centerY) {
    if (rotation === 0) return points;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return points.map(p => {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      return {
        x: centerX + (dx * cos - dy * sin),
        y: centerY + (dx * sin + dy * cos)
      };
    });
  }

  /**
   * Generate SVG polygon points string
   * @private
   */
  _pointsToString(points, offsetX = 0, offsetY = 0) {
    return points.map(p => `${p.x + offsetX},${p.y + offsetY}`).join(' ');
  }

  /**
   * Convert hex color to RGB
   * @private
   */
  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Clear all shapes and sheets
   */
  clear() {
    this._shapes = [];
    this._sheets = [];
    this._idCounter = 1;
    return this;
  }

  /**
   * Get all shapes (not sheets)
   * @returns {Array} Array of shape definitions
   */
  getShapes() {
    return [...this._shapes];
  }

  /**
   * Get all sheets
   * @returns {Array} Array of sheet definitions
   */
  getSheets() {
    return [...this._sheets];
  }

  /**
   * Generate SVG string from shapes
   * @param {Object} params - Generation parameters
   * @param {Object} [params.sheet] - Sheet/bin definition (uses first stored sheet if not provided)
   * @param {Array} [params.parts] - Parts to include (uses stored shapes if not provided)
   * @param {boolean} [params.includeLabels=true] - Include dimension labels
   * @returns {string} SVG markup string
   */
  toSVG({ sheet = null, parts = null, includeLabels = true } = {}) {
    const sheetDef = sheet || this._sheets[0];
    const partsList = parts || this._shapes;

    if (!sheetDef) {
      throw new Error('No sheet/bin defined. Create one with .rect({ isSheet: true })');
    }

    // Expand parts by quantity
    const expandedParts = [];
    partsList.forEach(part => {
      for (let i = 0; i < (part.quantity || 1); i++) {
        expandedParts.push({ ...part, instanceIndex: i });
      }
    });

    const { margin, strokeWidth } = this.config;
    const binX = 50;
    const binY = 50;
    const shapeStartX = binX + sheetDef.widthPx + margin * 3;

    // Calculate positions for shapes to avoid overlap
    const shapePositions = [];
    let currentY = binY;
    let currentX = shapeStartX;
    let maxHeightInRow = 0;
    const maxRowWidth = 600;

    expandedParts.forEach((shape, index) => {
      const paddedWidth = shape.widthPx + margin;
      const paddedHeight = shape.heightPx + margin;

      if (currentX - shapeStartX + paddedWidth > maxRowWidth && index > 0) {
        currentX = shapeStartX;
        currentY += maxHeightInRow + margin * 2;
        maxHeightInRow = 0;
      }

      shapePositions.push({ x: currentX, y: currentY });
      currentX += paddedWidth + margin;
      maxHeightInRow = Math.max(maxHeightInRow, paddedHeight);
    });

    // Calculate SVG dimensions
    const shapesAreaWidth = shapePositions.length > 0
      ? Math.max(...shapePositions.map((pos, i) => pos.x + expandedParts[i].widthPx)) + margin * 3
      : shapeStartX;
    
    const shapesAreaHeight = shapePositions.length > 0
      ? Math.max(...shapePositions.map((pos, i) => pos.y + expandedParts[i].heightPx)) + margin * 3
      : binY + sheetDef.heightPx;

    const svgWidth = Math.max(shapesAreaWidth, binX + sheetDef.widthPx + margin * 3);
    const svgHeight = Math.max(shapesAreaHeight, binY + sheetDef.heightPx + margin * 3);

    // Build SVG
    let svg = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${svgWidth}px" height="${svgHeight}px" viewBox="0 0 ${svgWidth} ${svgHeight}">
  
  <!-- Bin outline -->
  <rect x="${binX}" y="${binY}" width="${sheetDef.widthPx}" height="${sheetDef.heightPx}" 
        fill="none" stroke="#0000FF" stroke-width="3" stroke-dasharray="10,5"/>`;

    if (includeLabels) {
      svg += `
  <text x="${binX + sheetDef.widthPx / 2}" y="${binY - 20}" text-anchor="middle" 
        fill="#0000FF" font-size="16" font-weight="bold">Bin: ${sheetDef.width}×${sheetDef.height}${this.config.units}</text>`;
    }

    svg += `
  
  <!-- Shapes to nest -->`;

    expandedParts.forEach((shape, index) => {
      const pos = shapePositions[index];
      const rgb = this._hexToRgb(shape.color);
      const fillColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`;
      
      // Apply rotation if needed
      let points = shape.points;
      if (shape.rotation) {
        points = this._rotatePoints(
          points,
          shape.rotation,
          shape.widthPx / 2,
          shape.heightPx / 2
        );
        // Normalize after rotation
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        points = points.map(p => ({ x: p.x - minX, y: p.y - minY }));
      }

      const pointsStr = this._pointsToString(points, pos.x, pos.y);
      const label = shape.quantity > 1 
        ? `${shape.type}${index + 1}` 
        : `${shape.type}`;

      svg += `
  <g id="${shape.id}">
    <polygon points="${pointsStr}" fill="${fillColor}" stroke="${shape.color}" stroke-width="${strokeWidth}"/>`;
      
      if (includeLabels) {
        svg += `
    <text x="${pos.x + shape.widthPx / 2}" y="${pos.y + shape.heightPx / 2}" 
          text-anchor="middle" dominant-baseline="middle" fill="${shape.color}" font-size="12">${label}</text>`;
      }

      svg += `
  </g>`;
    });

    svg += `
</svg>`;

    return svg;
  }

  /**
   * Generate input object for DeepNest API
   * @param {Object} params - Generation parameters
   * @param {Object} [params.sheet] - Sheet/bin definition
   * @param {Array} [params.parts] - Parts to include
   * @returns {Object} DeepNest-compatible input { sheet, parts }
   */
  toNestInput({ sheet = null, parts = null } = {}) {
    const sheetDef = sheet || this._sheets[0];
    const partsList = parts || this._shapes;

    if (!sheetDef) {
      throw new Error('No sheet/bin defined. Create one with .rect({ isSheet: true })');
    }

    // Convert sheet to DeepNest format
    const nestSheet = {
      width: sheetDef.widthPx,
      height: sheetDef.heightPx,
      points: sheetDef.points
    };

    // Convert parts to DeepNest format, expanding by quantity
    const nestParts = [];
    partsList.forEach(part => {
      for (let i = 0; i < (part.quantity || 1); i++) {
        nestParts.push({
          id: `${part.id}_${i}`,
          source: part.type,
          points: part.points,
          width: part.widthPx,
          height: part.heightPx,
          rotation: part.rotation || 0
        });
      }
    });

    return { sheet: nestSheet, parts: nestParts };
  }

  /**
   * Download generated SVG as a file (browser only)
   * @param {string} [filename] - Filename for download
   * @param {Object} [options] - SVG generation options
   */
  download(filename = `shapes-${Date.now()}.svg`, options = {}) {
    const svgContent = this.toSVG(options);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - Configuration to merge
   * @returns {SVGGenerator} this for chaining
   */
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this;
  }
}

/**
 * Factory function for creating SVGGenerator
 * @param {Object} config - Configuration options
 * @returns {SVGGenerator} New SVGGenerator instance
 */
export function createSVGGenerator(config = {}) {
  return new SVGGenerator(config);
}

export default SVGGenerator;
