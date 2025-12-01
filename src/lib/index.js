/**
 * DeepNest React Library
 * 
 * A comprehensive library for 2D nesting/bin packing operations.
 * 
 * @example
 * ```javascript
 * // Full workflow example
 * import { DeepNest, SVGGenerator, NestViewer } from 'deepnest-react';
 * 
 * // 1. Generate shapes programmatically
 * const generator = new SVGGenerator({ dpi: 72, units: 'mm' });
 * const sheet = generator.rect({ width: 3200, height: 1600, isSheet: true });
 * generator.rect({ width: 400, height: 300, quantity: 5 });
 * generator.lShape({ width: 500, height: 400, armWidth: 100, armHeight: 150 });
 * 
 * // 2. Run nesting
 * const deepnest = new DeepNest({ spacing: 10, rotations: 4 });
 * const result = await deepnest.nestFromShapes(generator.toNestInput());
 * 
 * // 3. Export result
 * const svg = result.toSVG();
 * const json = result.toJSON();
 * 
 * // Or use with React component
 * <NestViewer result={result} />
 * ```
 * 
 * @module deepnest-react
 */

// Core nesting API
export { DeepNest, createDeepNest, NestingState } from './DeepNestAPI';

// Nesting result class
export { NestResult, createNestResult } from './NestResult';

// SVG generation API
export { SVGGenerator, createSVGGenerator, ShapeTypes } from './SVGGeneratorAPI';

// Re-export types for TypeScript users (when definitions are added)
// export type { DeepNestConfig, NestingCallbacks, NestingProgress } from './DeepNestAPI';
// export type { NestResultData, Placement, SheetAnalysis } from './NestResult';
// export type { SVGGeneratorConfig, ShapeDefinition } from './SVGGeneratorAPI';

/**
 * Library version
 */
export const VERSION = '1.0.0';

/**
 * Default configuration for common use cases
 */
export const DefaultConfigs = {
  /**
   * Standard configuration for millimeter-based projects
   */
  millimeters: {
    dpi: 72,
    units: 'mm',
    spacing: 5,
    rotations: 4
  },
  
  /**
   * Configuration for inch-based projects
   */
  inches: {
    dpi: 72,
    units: 'inch',
    spacing: 0.25,
    rotations: 4
  },
  
  /**
   * Configuration for pixel-based projects
   */
  pixels: {
    dpi: 72,
    units: 'px',
    spacing: 10,
    rotations: 4
  },
  
  /**
   * High-quality nesting (slower, better results)
   */
  highQuality: {
    dpi: 72,
    spacing: 2,
    rotations: 16,
    populationSize: 20,
    mutationRate: 25
  },
  
  /**
   * Fast nesting (quicker, acceptable results)
   */
  fast: {
    dpi: 72,
    spacing: 5,
    rotations: 4,
    populationSize: 5,
    mutationRate: 50
  }
};

/**
 * Quick factory to create all APIs with shared configuration
 * @param {Object} config - Shared configuration
 * @returns {{ generator: SVGGenerator, nester: DeepNest }}
 */
export function createNestingWorkflow(config = {}) {
  const { SVGGenerator } = require('./SVGGeneratorAPI');
  const { DeepNest } = require('./DeepNestAPI');
  
  const mergedConfig = {
    ...DefaultConfigs.millimeters,
    ...config
  };
  
  return {
    generator: new SVGGenerator({
      dpi: mergedConfig.dpi,
      units: mergedConfig.units
    }),
    nester: new DeepNest(mergedConfig)
  };
}
