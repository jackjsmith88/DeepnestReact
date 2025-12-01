/**
 * Unit Conversion Utilities for NestViewer
 * 
 * Unit Conversion Notes:
 * - SVG Generator uses DPI (default 72) to convert mm → pixels: pixels = (mm / 25.4) * DPI
 * - Deepnest uses scale (default 72, meaning 72 pixels per inch)
 * - Both systems are compatible when DPI = scale
 * - To convert pixels to mm: mm = (pixels * 25.4) / scale
 * - To convert pixels to inches: inches = pixels / scale
 */

// Default scale (pixels per inch) - matches Deepnest's default
export const DEFAULT_SCALE = 72;

// Convert pixels to millimeters
export const pxToMm = (px, scale = DEFAULT_SCALE) => (px * 25.4) / scale;

// Convert pixels to inches
export const pxToInch = (px, scale = DEFAULT_SCALE) => px / scale;

// Format dimension for display
export const formatDimension = (px, unit = 'mm', scale = DEFAULT_SCALE) => {
  if (unit === 'mm') {
    return `${pxToMm(px, scale).toFixed(1)}mm`;
  } else if (unit === 'inch') {
    return `${pxToInch(px, scale).toFixed(2)}"`;
  }
  return `${px.toFixed(0)}px`;
};
