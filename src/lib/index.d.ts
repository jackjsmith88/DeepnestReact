/**
 * TypeScript definitions for deepnest-react
 */

// ============================================================================
// DeepNestAPI Types
// ============================================================================

export interface DeepNestConfig {
  /** Part spacing in pixels (default: 0) */
  spacing?: number;
  /** Bin edge padding in pixels (default: 0) */
  binPadding?: number;
  /** Number of rotations to try (default: 4) */
  rotations?: number;
  /** Explore concave areas (default: false) */
  exploreConcave?: boolean;
  /** Population size for genetic algorithm (default: 10) */
  populationSize?: number;
  /** Mutation rate percentage (default: 10) */
  mutationRate?: number;
  /** Use hole detection (default: false) */
  useHoles?: boolean;
  /** Scale factor (default: 72) */
  scale?: number;
}

export interface NestingProgress {
  /** Current iteration number */
  iteration: number;
  /** Current efficiency percentage */
  efficiency: number;
  /** Number of placed parts */
  placed: number;
  /** Total number of parts */
  total: number;
  /** Current fitness score */
  fitness: number;
}

export interface NestingCallbacks {
  /** Called when nesting progress updates */
  onProgress?: (progress: NestingProgress) => void;
  /** Called when a nest result is received */
  onResult?: (result: NestResult) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when nesting is complete */
  onComplete?: (result: NestResult) => void;
}

export interface NestInputSheet {
  width: number;
  height: number;
  points?: Array<{ x: number; y: number }>;
}

export interface NestInputPart {
  id?: string;
  source?: string;
  points: Array<{ x: number; y: number }>;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface NestShapesInput {
  sheet: NestInputSheet;
  parts: NestInputPart[];
}

export declare const NestingState: {
  IDLE: 'idle';
  RUNNING: 'running';
  PAUSED: 'paused';
  STOPPED: 'stopped';
  COMPLETED: 'completed';
  ERROR: 'error';
};

export declare class DeepNest {
  constructor(config?: DeepNestConfig);
  
  /** Get current configuration */
  getConfig(): DeepNestConfig;
  
  /** Update configuration */
  setConfig(config: Partial<DeepNestConfig>): this;
  
  /** Get current nesting state */
  getState(): string;
  
  /** Get current progress */
  getProgress(): NestingProgress | null;
  
  /** Run nesting from SVG string */
  nestFromSVG(svg: string, callbacks?: NestingCallbacks): Promise<NestResult>;
  
  /** Run nesting from shape definitions */
  nestFromShapes(input: NestShapesInput, callbacks?: NestingCallbacks): Promise<NestResult>;
  
  /** Pause nesting */
  pause(): this;
  
  /** Resume nesting */
  resume(): this;
  
  /** Stop nesting */
  stop(): this;
}

export declare function createDeepNest(config?: DeepNestConfig): DeepNest;

// ============================================================================
// NestResult Types
// ============================================================================

export interface Placement {
  id: string | number;
  x: number;
  y: number;
  rotation: number;
  source: string;
  sheet: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetAnalysis {
  sheetIndex: number;
  partCount: number;
  usedArea: number;
  totalArea: number;
  efficiency: number;
  boundingBox: BoundingBox;
  placements: Placement[];
}

export interface NestResultData {
  placements: any[][];
  sheets: any[];
  paths: any[];
  fitness: number;
  efficiency: number;
  config: DeepNestConfig;
  timestamp: number;
}

export interface SVGExportOptions {
  showDimensions?: boolean;
  dimensionUnit?: 'mm' | 'px' | 'inch';
  scale?: number;
  includeSheet?: boolean;
  sheetIndex?: number;
}

export declare class NestResult {
  constructor(data: NestResultData);
  
  /** Get all placements */
  readonly placements: any[][];
  
  /** Get all sheets */
  readonly sheets: any[];
  
  /** Get all paths */
  readonly paths: any[];
  
  /** Get fitness score */
  readonly fitness: number;
  
  /** Get efficiency percentage */
  readonly efficiency: number;
  
  /** Get nesting configuration */
  readonly config: DeepNestConfig;
  
  /** Get timestamp */
  readonly timestamp: number;
  
  /** Get overall bounding box */
  readonly boundingBox: BoundingBox;
  
  /** Get number of sheets used */
  readonly sheetCount: number;
  
  /** Get total parts placed */
  readonly totalPartsPlaced: number;
  
  /** Get placements for specific part */
  getPartPlacements(partIndex: number): Placement[];
  
  /** Get placements for specific sheet */
  getSheetPlacements(sheetIndex: number): Placement[];
  
  /** Get analysis for specific sheet */
  getSheetAnalysis(sheetIndex: number): SheetAnalysis;
  
  /** Export as SVG string */
  toSVG(options?: SVGExportOptions): string;
  
  /** Export as JSON string */
  toJSON(pretty?: boolean): string;
  
  /** Export as plain object */
  toObject(): NestResultData;
  
  /** Check if part fits on sheet */
  partFitsOnSheet(partIndex: number, sheetIndex: number): boolean;
  
  /** Clone result with modified config */
  clone(): NestResult;
}

export declare function createNestResult(data: NestResultData): NestResult;

// ============================================================================
// SVGGeneratorAPI Types
// ============================================================================

export interface SVGGeneratorConfig {
  /** Dots per inch (default: 72) */
  dpi?: number;
  /** Units for dimensions (default: 'mm') */
  units?: 'mm' | 'px' | 'inch';
  /** Default stroke width (default: 2) */
  strokeWidth?: number;
  /** Margin between shapes (default: 30) */
  margin?: number;
}

export interface RectParams {
  width: number;
  height: number;
  color?: string;
  quantity?: number;
  rotation?: number;
  isSheet?: boolean;
  id?: string;
}

export interface LShapeParams {
  width: number;
  height: number;
  armWidth: number;
  armHeight: number;
  color?: string;
  quantity?: number;
  rotation?: number;
  id?: string;
}

export interface TShapeParams {
  width: number;
  height: number;
  stemWidth: number;
  barHeight: number;
  color?: string;
  quantity?: number;
  rotation?: number;
  id?: string;
}

export interface UShapeParams {
  width: number;
  height: number;
  gapWidth: number;
  gapHeight: number;
  color?: string;
  quantity?: number;
  rotation?: number;
  id?: string;
}

export interface CircleParams {
  radius: number;
  segments?: number;
  color?: string;
  quantity?: number;
  id?: string;
}

export interface PolygonParams {
  points: Array<{ x: number; y: number }>;
  color?: string;
  quantity?: number;
  rotation?: number;
  id?: string;
}

export interface ShapeDefinition {
  id: string;
  type: string;
  width: number;
  height: number;
  widthPx: number;
  heightPx: number;
  color: string;
  quantity: number;
  rotation: number;
  isSheet: boolean;
  units: string;
  points: Array<{ x: number; y: number }>;
}

export interface SVGExportParams {
  sheet?: ShapeDefinition;
  parts?: ShapeDefinition[];
  includeLabels?: boolean;
}

export declare const ShapeTypes: {
  RECTANGLE: 'Rectangle';
  L_SHAPE: 'L';
  T_SHAPE: 'T';
  U_SHAPE: 'U';
  CIRCLE: 'Circle';
  POLYGON: 'Polygon';
};

export declare class SVGGenerator {
  constructor(config?: SVGGeneratorConfig);
  
  /** Create a rectangle shape */
  rect(params: RectParams): ShapeDefinition;
  
  /** Create an L-shaped part */
  lShape(params: LShapeParams): ShapeDefinition;
  
  /** Create a T-shaped part */
  tShape(params: TShapeParams): ShapeDefinition;
  
  /** Create a U-shaped part */
  uShape(params: UShapeParams): ShapeDefinition;
  
  /** Create a circle shape */
  circle(params: CircleParams): ShapeDefinition;
  
  /** Create a custom polygon */
  polygon(params: PolygonParams): ShapeDefinition;
  
  /** Clear all shapes */
  clear(): this;
  
  /** Get all shapes (not sheets) */
  getShapes(): ShapeDefinition[];
  
  /** Get all sheets */
  getSheets(): ShapeDefinition[];
  
  /** Generate SVG string */
  toSVG(params?: SVGExportParams): string;
  
  /** Generate DeepNest input */
  toNestInput(params?: { sheet?: ShapeDefinition; parts?: ShapeDefinition[] }): NestShapesInput;
  
  /** Download SVG file */
  download(filename?: string, options?: SVGExportParams): void;
  
  /** Get configuration */
  getConfig(): SVGGeneratorConfig;
  
  /** Update configuration */
  setConfig(config: Partial<SVGGeneratorConfig>): this;
}

export declare function createSVGGenerator(config?: SVGGeneratorConfig): SVGGenerator;

// ============================================================================
// Module Exports
// ============================================================================

export declare const VERSION: string;

export declare const DefaultConfigs: {
  millimeters: DeepNestConfig & SVGGeneratorConfig;
  inches: DeepNestConfig & SVGGeneratorConfig;
  pixels: DeepNestConfig & SVGGeneratorConfig;
  highQuality: DeepNestConfig;
  fast: DeepNestConfig;
};

export declare function createNestingWorkflow(config?: DeepNestConfig & SVGGeneratorConfig): {
  generator: SVGGenerator;
  nester: DeepNest;
};
