/**
 * NestResult - Immutable result object from nesting operation
 * 
 * Contains all nesting data and provides export methods
 * 
 * @example
 * ```javascript
 * const result = await deepnest.run();
 * 
 * console.log(result.sheetUsage);        // 0.85 (85%)
 * console.log(result.placedCount);       // 12
 * console.log(result.totalCount);        // 15
 * console.log(result.sheetsUsed);        // 2
 * 
 * // Export
 * const svg = result.toSVG();
 * const json = result.toJSON();
 * 
 * // Access raw data
 * result.placements.forEach(sheet => {
 *   sheet.parts.forEach(part => {
 *     console.log(part.x, part.y, part.rotation);
 *   });
 * });
 * ```
 */

/**
 * @typedef {Object} PlacedPart
 * @property {number} sourceIndex - Index in original parts array
 * @property {number} x - X translation
 * @property {number} y - Y translation
 * @property {number} rotation - Rotation in degrees
 * @property {Object} bounds - Bounding box
 */

/**
 * @typedef {Object} SheetPlacement
 * @property {number} sheetIndex - Index of the sheet part
 * @property {PlacedPart[]} parts - Parts placed on this sheet
 */

export class NestResult {
  /**
   * Create a NestResult
   * @param {Object} data - Raw nesting data
   * @param {Array} data.nests - Raw nests array from DeepNest
   * @param {Array} data.parts - Parts array
   * @param {Object} data.config - Config used for this nest
   * @param {number} data.iteration - Iteration number
   */
  constructor(data) {
    this._nests = data.nests || [];
    this._parts = data.parts || [];
    this._config = data.config || {};
    this._iteration = data.iteration || 0;
    
    // Compute derived values
    this._computeStats();
  }

  /**
   * Compute statistics from raw data
   * @private
   */
  _computeStats() {
    const firstNest = this._nests[0];
    
    if (!firstNest) {
      this._sheetUsage = 0;
      this._fitness = 1;
      this._placedCount = 0;
      this._totalCount = 0;
      this._sheetsUsed = 0;
      this._placements = [];
      return;
    }

    // Get fitness/usage from nest data
    this._fitness = firstNest.fitness || 0;
    this._sheetUsage = firstNest.sheetUsage || (1 - this._fitness);
    
    // Count parts
    const sheetParts = this._parts.filter(p => p.sheet);
    const regularParts = this._parts.filter(p => !p.sheet);
    
    this._totalCount = regularParts.reduce((sum, p) => sum + (p.quantity || 1), 0);
    
    // Count placed parts
    let placedCount = 0;
    const placements = [];
    
    if (firstNest.placements) {
      firstNest.placements.forEach((sheetPlacement, sheetIdx) => {
        const sheetData = {
          sheetIndex: sheetPlacement.sheet ?? this._parts.findIndex(p => p.sheet),
          sheetId: sheetPlacement.sheetid,
          parts: []
        };
        
        if (sheetPlacement.sheetplacements) {
          sheetPlacement.sheetplacements.forEach(p => {
            const sourcePart = this._parts[p.source];
            if (sourcePart && !sourcePart.sheet) {
              placedCount++;
              sheetData.parts.push({
                sourceIndex: p.source,
                id: p.id,
                x: p.x,
                y: p.y,
                rotation: p.rotation || 0,
                bounds: sourcePart.bounds,
                name: sourcePart.name
              });
            }
          });
        }
        
        placements.push(sheetData);
      });
    }
    
    this._placedCount = firstNest.placedCount ?? placedCount;
    this._sheetsUsed = firstNest.sheetsUsed ?? placements.length;
    this._placements = placements;
  }

  // ============ Getters ============

  /**
   * Sheet usage as a decimal (0-1)
   * @returns {number}
   */
  get sheetUsage() {
    return this._sheetUsage;
  }

  /**
   * Sheet usage as a percentage string
   * @returns {string}
   */
  get sheetUsagePercent() {
    return `${(this._sheetUsage * 100).toFixed(1)}%`;
  }

  /**
   * Fitness value (lower is better, 0 = perfect)
   * @returns {number}
   */
  get fitness() {
    return this._fitness;
  }

  /**
   * Number of parts successfully placed
   * @returns {number}
   */
  get placedCount() {
    return this._placedCount;
  }

  /**
   * Total number of parts to place
   * @returns {number}
   */
  get totalCount() {
    return this._totalCount;
  }

  /**
   * Number of sheets used
   * @returns {number}
   */
  get sheetsUsed() {
    return this._sheetsUsed;
  }

  /**
   * Whether all parts were placed
   * @returns {boolean}
   */
  get isComplete() {
    return this._placedCount >= this._totalCount;
  }

  /**
   * Iteration number this result came from
   * @returns {number}
   */
  get iteration() {
    return this._iteration;
  }

  /**
   * Configuration used for this nest
   * @returns {Object}
   */
  get config() {
    return { ...this._config };
  }

  /**
   * Original parts array
   * @returns {Array}
   */
  get parts() {
    return this._parts;
  }

  /**
   * Structured placements data
   * @returns {SheetPlacement[]}
   */
  get placements() {
    return this._placements;
  }

  /**
   * Raw nests array (for compatibility with NestViewer)
   * @returns {Array}
   */
  get rawNests() {
    return this._nests;
  }

  // ============ Export Methods ============

  /**
   * Export result as JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      sheetUsage: this._sheetUsage,
      fitness: this._fitness,
      placedCount: this._placedCount,
      totalCount: this._totalCount,
      sheetsUsed: this._sheetsUsed,
      isComplete: this.isComplete,
      iteration: this._iteration,
      config: this._config,
      placements: this._placements.map(sheet => ({
        sheetIndex: sheet.sheetIndex,
        parts: sheet.parts.map(p => ({
          sourceIndex: p.sourceIndex,
          x: p.x,
          y: p.y,
          rotation: p.rotation,
          name: p.name
        }))
      }))
    };
  }

  /**
   * Export result as JSON string
   * @param {number} indent - JSON indentation (default: 2)
   * @returns {string}
   */
  toJSONString(indent = 2) {
    return JSON.stringify(this.toJSON(), null, indent);
  }

  /**
   * Export result as SVG string
   * @param {Object} options - Export options
   * @param {boolean} options.includeSheet - Include sheet outline (default: true)
   * @param {boolean} options.includeDimensions - Include dimension annotations (default: false)
   * @param {string} options.unit - Unit for dimensions ('mm', 'inch', 'px')
   * @returns {string} SVG string
   */
  toSVG(options = {}) {
    const { 
      includeSheet = true, 
      includeDimensions = false,
      unit = this._config.units || 'mm'
    } = options;

    const sheetPart = this._parts.find(p => p.sheet);
    if (!sheetPart) {
      throw new Error('No sheet found in result');
    }

    const bounds = sheetPart.bounds;
    const scale = this._config.scale || 72;
    
    // Start SVG
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" `;
    svg += `width="${bounds.width}" height="${bounds.height}" `;
    svg += `viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">\n`;
    
    // Add metadata
    svg += `  <!-- Generated by DeepNest React -->\n`;
    svg += `  <!-- Sheet Usage: ${this.sheetUsagePercent} -->\n`;
    svg += `  <!-- Parts Placed: ${this.placedCount}/${this.totalCount} -->\n\n`;

    // Draw sheet outline
    if (includeSheet && sheetPart.svgelements) {
      svg += `  <g id="sheet" stroke="#0066cc" fill="none" stroke-width="2">\n`;
      sheetPart.svgelements.forEach(el => {
        svg += `    ${this._elementToString(el)}\n`;
      });
      svg += `  </g>\n\n`;
    }

    // Draw placed parts
    svg += `  <g id="parts">\n`;
    
    this._placements.forEach((sheet, sheetIdx) => {
      sheet.parts.forEach((placement, partIdx) => {
        const part = this._parts[placement.sourceIndex];
        if (!part || !part.svgelements) return;

        const partBounds = part.bounds;
        const cx = partBounds.x + partBounds.width / 2;
        const cy = partBounds.y + partBounds.height / 2;
        
        // Calculate transform
        const translateX = placement.x - bounds.x;
        const translateY = placement.y - bounds.y;
        
        let transform = `translate(${translateX}, ${translateY})`;
        if (placement.rotation !== 0) {
          transform += ` rotate(${placement.rotation}, ${cx}, ${cy})`;
        }

        svg += `    <g id="part-${partIdx}" transform="${transform}" fill="none" stroke="#333" stroke-width="1">\n`;
        part.svgelements.forEach(el => {
          svg += `      ${this._elementToString(el)}\n`;
        });
        svg += `    </g>\n`;
      });
    });

    svg += `  </g>\n`;
    svg += `</svg>`;

    return svg;
  }

  /**
   * Convert SVG element to string
   * @private
   */
  _elementToString(element) {
    if (!element) return '';
    
    const tag = element.tagName?.toLowerCase();
    if (!tag) return '';

    let str = `<${tag}`;
    
    // Copy attributes
    if (element.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        // Skip style-related attributes we'll override
        if (!['fill', 'stroke', 'stroke-width'].includes(attr.name)) {
          str += ` ${attr.name}="${attr.value}"`;
        }
      }
    }
    
    str += ' />';
    return str;
  }

  /**
   * Get summary string
   * @returns {string}
   */
  toString() {
    return `NestResult { usage: ${this.sheetUsagePercent}, placed: ${this.placedCount}/${this.totalCount}, sheets: ${this.sheetsUsed} }`;
  }

  /**
   * Create NestResult from raw useDeepnest data (for compatibility)
   * @param {Object} data - Data from useDeepnest hook
   * @param {Array} data.nests - Nests array
   * @param {Array} data.parts - Parts array
   * @param {Object} data.config - Config object
   * @returns {NestResult}
   */
  static fromHookData(data) {
    return new NestResult({
      nests: data.nests,
      parts: data.parts,
      config: data.config,
      iteration: data.nests?.[0]?.iteration || 0
    });
  }
}

export default NestResult;
