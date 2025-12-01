/**
 * DeepNest API - Clean Promise-based nesting interface
 * 
 * @example
 * ```javascript
 * import { DeepNest } from 'deepnest-react';
 * 
 * // Create instance with config
 * const nest = new DeepNest({
 *   spacing: 10,
 *   binPadding: 15,
 *   rotations: 4
 * });
 * 
 * // Import SVG and run nesting
 * await nest.importSVG(svgString, { filename: 'parts.svg' });
 * 
 * const result = await nest.run({
 *   onProgress: (progress) => console.log(`${progress}% complete`),
 *   onIteration: (result) => console.log(`Usage: ${result.sheetUsage}%`)
 * });
 * 
 * console.log(result.sheetUsage);
 * console.log(result.toSVG());
 * ```
 */

import DeepNestCore from './deepnest.js';
import { NestResult } from './NestResult.js';

/**
 * Default configuration for nesting
 */
export const DEFAULT_CONFIG = {
  units: 'mm',
  scale: 72,           // pixels per inch
  spacing: 0,          // space between parts (in pixels at scale)
  binPadding: 0,       // margin from sheet edges (in pixels at scale)
  curveTolerance: 0.3,
  rotations: 4,        // number of rotation steps (4 = 0°, 90°, 180°, 270°)
  threads: 4,
  populationSize: 10,  // GA population size
  mutationRate: 10,    // GA mutation rate percentage
  placementType: 'gravity',
  mergeLines: true,
  timeRatio: 0.5,
  simplify: false,
};

/**
 * DeepNest - Main API class for nesting operations
 */
export class DeepNest {
  /**
   * Create a new DeepNest instance
   * @param {Partial<typeof DEFAULT_CONFIG>} config - Configuration options
   */
  constructor(config = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._core = new DeepNestCore();
    this._core.config(this._config);
    this._isRunning = false;
    this._onProgress = null;
    this._onIteration = null;
  }

  /**
   * Get current configuration
   * @returns {typeof DEFAULT_CONFIG}
   */
  get config() {
    return { ...this._config };
  }

  /**
   * Get the parts list
   * @returns {Array}
   */
  get parts() {
    return [...this._core.parts];
  }

  /**
   * Check if nesting is currently running
   * @returns {boolean}
   */
  get isRunning() {
    return this._isRunning;
  }

  /**
   * Update configuration
   * @param {Partial<typeof DEFAULT_CONFIG>} newConfig - New configuration values
   * @returns {DeepNest} this instance for chaining
   */
  configure(newConfig) {
    this._config = { ...this._config, ...newConfig };
    this._core.config(this._config);
    return this;
  }

  /**
   * Convert user units (mm/inch) to pixels
   * @param {number} value - Value in user units
   * @param {string} unit - 'mm' or 'inch'
   * @returns {number} Value in pixels
   */
  toPixels(value, unit = this._config.units) {
    const scale = this._config.scale;
    if (unit === 'mm') {
      return (value / 25.4) * scale;
    } else if (unit === 'inch') {
      return value * scale;
    }
    return value; // already pixels
  }

  /**
   * Convert pixels to user units
   * @param {number} px - Value in pixels
   * @param {string} unit - 'mm' or 'inch'
   * @returns {number} Value in user units
   */
  fromPixels(px, unit = this._config.units) {
    const scale = this._config.scale;
    if (unit === 'mm') {
      return (px * 25.4) / scale;
    } else if (unit === 'inch') {
      return px / scale;
    }
    return px;
  }

  /**
   * Import an SVG string
   * @param {string} svgString - SVG content
   * @param {Object} options - Import options
   * @param {string} options.filename - Filename for reference
   * @param {boolean} options.autoDetectSheet - Auto-detect largest shape as sheet (default: true)
   * @returns {Promise<{ parts: Array, sheetIndex: number | null }>}
   */
  async importSVG(svgString, options = {}) {
    const { filename = 'import.svg', autoDetectSheet = true } = options;

    return new Promise((resolve, reject) => {
      try {
        this._core.importsvg(filename, '', svgString, 1, false);

        if (autoDetectSheet && this._core.parts.length > 0) {
          const hasSheet = this._core.parts.some(p => p.sheet);
          
          if (!hasSheet) {
            let largestIndex = 0;
            let largestArea = 0;
            
            for (let i = 0; i < this._core.parts.length; i++) {
              const part = this._core.parts[i];
              const area = part.area || (part.bounds?.width * part.bounds?.height) || 0;
              if (area > largestArea) {
                largestArea = area;
                largestIndex = i;
              }
            }
            
            this._core.parts[largestIndex].sheet = true;
          }
        }

        const sheetIndex = this._core.parts.findIndex(p => p.sheet);

        resolve({
          parts: [...this._core.parts],
          sheetIndex: sheetIndex >= 0 ? sheetIndex : null
        });
      } catch (error) {
        reject(new Error(`Failed to import SVG: ${error.message}`));
      }
    });
  }

  /**
   * Import from a File object (browser)
   * @param {File} file - File object from input or drag/drop
   * @param {Object} options - Import options
   * @returns {Promise<{ parts: Array, sheetIndex: number | null }>}
   */
  async importFile(file, options = {}) {
    const svgString = await file.text();
    return this.importSVG(svgString, { 
      filename: file.name, 
      ...options 
    });
  }

  /**
   * Add a programmatically created shape
   * @param {Object} shape - Shape definition with svgelements, bounds, polygontree
   * @param {Object} options - Options
   * @param {boolean} options.isSheet - Mark as sheet/bin
   * @param {number} options.quantity - Number of copies
   * @returns {number} Index of the added part
   */
  addShape(shape, options = {}) {
    const { isSheet = false, quantity = 1 } = options;
    
    const part = {
      ...shape,
      sheet: isSheet,
      quantity
    };
    
    this._core.parts.push(part);
    return this._core.parts.length - 1;
  }

  /**
   * Set a part as the sheet/bin
   * @param {number} index - Part index
   * @returns {DeepNest} this instance for chaining
   */
  setSheet(index) {
    // Clear existing sheets
    this._core.parts.forEach(p => p.sheet = false);
    
    if (index >= 0 && index < this._core.parts.length) {
      this._core.parts[index].sheet = true;
    }
    
    return this;
  }

  /**
   * Set part quantity
   * @param {number} index - Part index
   * @param {number} quantity - Number of copies
   * @returns {DeepNest} this instance for chaining
   */
  setQuantity(index, quantity) {
    if (index >= 0 && index < this._core.parts.length) {
      this._core.parts[index].quantity = Math.max(1, Math.floor(quantity));
    }
    return this;
  }

  /**
   * Remove a part
   * @param {number} index - Part index
   * @returns {DeepNest} this instance for chaining
   */
  removePart(index) {
    if (index >= 0 && index < this._core.parts.length) {
      this._core.parts.splice(index, 1);
    }
    return this;
  }

  /**
   * Clear all parts
   * @returns {DeepNest} this instance for chaining
   */
  clearParts() {
    this._core.parts.length = 0;
    this._core.imports.length = 0;
    return this;
  }

  /**
   * Run the nesting algorithm
   * @param {Object} options - Run options
   * @param {number} options.iterations - Max iterations (0 = run until stopped)
   * @param {number} options.timeout - Timeout in ms (0 = no timeout)
   * @param {Function} options.onProgress - Progress callback (0-100)
   * @param {Function} options.onIteration - Called with NestResult after each iteration
   * @returns {Promise<NestResult>} The best nesting result
   */
  async run(options = {}) {
    const { 
      iterations = 0, 
      timeout = 0,
      onProgress,
      onIteration 
    } = options;

    if (this._isRunning) {
      throw new Error('Nesting is already running');
    }

    const sheets = this._core.parts.filter(p => p.sheet);
    const parts = this._core.parts.filter(p => !p.sheet);

    if (sheets.length === 0) {
      throw new Error('No sheet/bin defined. Use setSheet() or mark a part as sheet.');
    }

    if (parts.length === 0) {
      throw new Error('No parts to nest. Import an SVG or add shapes.');
    }

    return new Promise((resolve, reject) => {
      this._isRunning = true;
      let iterationCount = 0;
      let bestResult = null;
      let timeoutId = null;

      const progressCallback = (progress) => {
        if (onProgress) {
          onProgress(progress);
        }
      };

      const displayCallback = (nests) => {
        if (!nests || nests.length === 0) return;

        iterationCount++;
        
        const result = new NestResult({
          nests: JSON.parse(JSON.stringify(nests)),
          parts: [...this._core.parts],
          config: { ...this._config },
          iteration: iterationCount
        });

        // Track best result
        if (!bestResult || result.sheetUsage > bestResult.sheetUsage) {
          bestResult = result;
        }

        if (onIteration) {
          onIteration(result);
        }

        // Check if we should stop
        if (iterations > 0 && iterationCount >= iterations) {
          this.stop();
          cleanup();
          resolve(bestResult);
        }
      };

      const cleanup = () => {
        this._isRunning = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      // Set timeout if specified
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          this.stop();
          cleanup();
          if (bestResult) {
            resolve(bestResult);
          } else {
            reject(new Error('Nesting timed out with no results'));
          }
        }, timeout);
      }

      try {
        this._core.start(progressCallback, displayCallback);
      } catch (error) {
        cleanup();
        reject(new Error(`Nesting failed: ${error.message}`));
      }
    });
  }

  /**
   * Run nesting for a single iteration (useful for step-by-step)
   * @param {Object} options - Run options
   * @returns {Promise<NestResult>}
   */
  async runOnce(options = {}) {
    return this.run({ ...options, iterations: 1 });
  }

  /**
   * Stop the running nesting process
   */
  stop() {
    if (this._core) {
      this._core.stop();
    }
    this._isRunning = false;
  }

  /**
   * Reset the instance (clear parts and results)
   * @returns {DeepNest} this instance for chaining
   */
  reset() {
    this.stop();
    this.clearParts();
    this._core = new DeepNestCore();
    this._core.config(this._config);
    return this;
  }

  /**
   * Static factory method for quick nesting
   * @param {Object} options - Options
   * @param {string} options.svg - SVG string to nest
   * @param {Object} options.config - Nesting configuration
   * @param {number} options.iterations - Number of iterations
   * @param {Function} options.onProgress - Progress callback
   * @returns {Promise<NestResult>}
   * 
   * @example
   * ```javascript
   * const result = await DeepNest.nest({
   *   svg: mySvgString,
   *   config: { spacing: 10, rotations: 4 },
   *   iterations: 5
   * });
   * ```
   */
  static async nest(options) {
    const { svg, config = {}, iterations = 1, onProgress, onIteration } = options;
    
    const instance = new DeepNest(config);
    await instance.importSVG(svg);
    
    return instance.run({ iterations, onProgress, onIteration });
  }
}

export default DeepNest;
