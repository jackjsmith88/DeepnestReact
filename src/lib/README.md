# DeepNest React API

A clean, reusable API for 2D nesting/bin packing operations.

## Installation

```javascript
// Import from the lib folder
import { DeepNest, SVGGenerator, NestResult } from './lib';
```

## Quick Start

```javascript
import { DeepNest, SVGGenerator } from './lib';

// 1. Create shapes
const generator = new SVGGenerator({ dpi: 72, units: 'mm' });

// Create a sheet (the bin/material)
const sheet = generator.rect({ 
  width: 3200, 
  height: 1600, 
  isSheet: true 
});

// Create parts to nest
generator.rect({ width: 400, height: 300, quantity: 5 });
generator.lShape({ 
  width: 500, 
  height: 400, 
  armWidth: 100, 
  armHeight: 150 
});

// 2. Run nesting
const deepnest = new DeepNest({ 
  spacing: 10, 
  binPadding: 15,
  rotations: 4 
});

const result = await deepnest.nestFromShapes(generator.toNestInput(), {
  onProgress: (progress) => {
    console.log(`Iteration ${progress.iteration}: ${progress.efficiency}% efficiency`);
  }
});

// 3. Export results
const svg = result.toSVG();
const json = result.toJSON();
```

## API Reference

### SVGGenerator

Create shapes programmatically.

```javascript
const generator = new SVGGenerator({ 
  dpi: 72,      // Dots per inch
  units: 'mm',  // 'mm', 'px', or 'inch'
  strokeWidth: 2,
  margin: 30
});
```

#### Shape Methods

**Rectangle**
```javascript
generator.rect({
  width: 400,
  height: 300,
  color: '#4CAF50',
  quantity: 5,
  rotation: 0,
  isSheet: false  // true for sheet/bin
});
```

**L-Shape**
```javascript
generator.lShape({
  width: 500,      // Total width
  height: 400,     // Total height
  armWidth: 100,   // Width of vertical arm
  armHeight: 150,  // Height of horizontal arm
  color: '#2196F3',
  quantity: 1
});
```

**T-Shape**
```javascript
generator.tShape({
  width: 600,      // Top bar width
  height: 500,     // Total height
  stemWidth: 150,  // Stem width
  barHeight: 100,  // Top bar height
  color: '#FF9800'
});
```

**U-Shape**
```javascript
generator.uShape({
  width: 600,      // Total width
  height: 500,     // Total height
  gapWidth: 200,   // Gap width
  gapHeight: 300,  // Gap height from top
  color: '#9C27B0'
});
```

**Circle**
```javascript
generator.circle({
  radius: 100,
  segments: 32,  // Polygon approximation segments
  color: '#E91E63'
});
```

**Custom Polygon**
```javascript
generator.polygon({
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 },
    { x: 50, y: 100 },
    { x: 0, y: 100 }
  ],
  color: '#607D8B'
});
```

#### Export Methods

```javascript
// Generate SVG string
const svg = generator.toSVG();

// Generate DeepNest input format
const input = generator.toNestInput();

// Download as file
generator.download('my-shapes.svg');

// Get all shapes
const shapes = generator.getShapes();
const sheets = generator.getSheets();

// Clear all shapes
generator.clear();
```

### DeepNest

Run nesting operations.

```javascript
const deepnest = new DeepNest({
  spacing: 10,        // Part spacing (px)
  binPadding: 15,     // Edge padding (px)
  rotations: 4,       // Rotation steps
  exploreConcave: true,
  populationSize: 10, // Genetic algorithm population
  mutationRate: 10    // Mutation rate %
});
```

#### Methods

```javascript
// From SVG string
const result = await deepnest.nestFromSVG(svgString, {
  onProgress: (progress) => { /* ... */ },
  onResult: (result) => { /* ... */ },
  onError: (error) => { /* ... */ },
  onComplete: (result) => { /* ... */ }
});

// From shapes
const result = await deepnest.nestFromShapes({ sheet, parts }, callbacks);

// Control
deepnest.pause();
deepnest.resume();
deepnest.stop();

// State
deepnest.getState();    // 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error'
deepnest.getProgress(); // { iteration, efficiency, placed, total, fitness }
```

### NestResult

Immutable result object.

```javascript
// Properties
result.placements;      // 2D array of placements per sheet
result.sheets;          // Sheet definitions
result.efficiency;      // Overall efficiency %
result.fitness;         // Fitness score
result.sheetCount;      // Number of sheets used
result.totalPartsPlaced;

// Methods
result.getPartPlacements(partIndex);
result.getSheetPlacements(sheetIndex);
result.getSheetAnalysis(sheetIndex);

// Export
result.toSVG({ showDimensions: true, dimensionUnit: 'mm' });
result.toJSON(true);  // pretty print
result.toObject();
```

## Default Configurations

```javascript
import { DefaultConfigs } from './lib';

// Pre-configured setups
DefaultConfigs.millimeters;  // mm-based, spacing: 5
DefaultConfigs.inches;       // inch-based, spacing: 0.25
DefaultConfigs.pixels;       // px-based, spacing: 10
DefaultConfigs.highQuality;  // 16 rotations, slower
DefaultConfigs.fast;         // 4 rotations, quicker
```

## Quick Workflow Factory

```javascript
import { createNestingWorkflow } from './lib';

const { generator, nester } = createNestingWorkflow({
  dpi: 72,
  units: 'mm',
  spacing: 10
});
```

## TypeScript Support

TypeScript definitions are included in `index.d.ts`.

```typescript
import type { 
  DeepNestConfig, 
  NestResult, 
  ShapeDefinition 
} from './lib';
```
