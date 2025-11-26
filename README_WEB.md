# Deepnest React - Web Edition

A React/Vite web version of [Deepnest](https://deepnest.io), a nesting tool for laser cutters and CNC machines.

## What Changed from Original Deepnest

### ✅ Removed (Electron Desktop → React Web)
- **Electron** - Desktop wrapper removed
- **C++ Native Addon** - Minkowski sum calculations now use pure JavaScript (ClipperLib)
- **Node.js dependencies** - `graceful-fs`, `electron-config`, etc.
- **node-gyp** - No more C++ compilation required

### ✨ New Stack
- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **ClipperLib** - Pure JavaScript polygon operations (already included)

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies (no C++ compilation!)
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app will be available at `http://localhost:3000`

## Project Structure

```
DeepnestReact/
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # Main application component
│   ├── App.css           # Application styles
│   └── index.css         # Global styles
├── main/                 # Original Deepnest code (to be migrated)
│   ├── deepnest.js       # Core nesting algorithm
│   ├── svgparser.js      # SVG parsing logic
│   ├── util/
│   │   ├── clipper.js    # ClipperLib - polygon operations
│   │   ├── geometryutil.js
│   │   └── ...
│   └── ...
├── index.html
├── vite.config.js
└── package.json
```

## Migration Plan

### Phase 1: Basic React App ✅
- [x] Remove Electron dependencies
- [x] Set up Vite + React
- [x] Create basic UI structure

### Phase 2: Core Logic Migration (In Progress)
- [ ] Adapt `deepnest.js` for browser (remove Node.js dependencies)
- [ ] Adapt `svgparser.js` for browser
- [ ] Move utility libraries to `src/lib/`
- [ ] Replace Electron file operations with browser File API

### Phase 3: NFP Calculation
- [ ] Use ClipperLib for all NFP calculations (no C++ addon)
- [ ] Test performance with ClipperLib-only implementation
- [ ] (Optional) Add WebAssembly support later if needed

### Phase 4: Features
- [ ] SVG/DXF import via file input
- [ ] Parts management (add/remove/edit)
- [ ] Configuration panel
- [ ] Nesting algorithm integration
- [ ] Results visualization
- [ ] Export functionality

## Key Technical Decisions

### Why ClipperLib Instead of C++?
The original Deepnest used a C++ addon (Boost Polygon) for calculating No-Fit Polygons (NFP) when dealing with complex shapes with holes. However:

1. **Most parts don't have holes** - L-shapes, rectangles, custom cutouts are all handled fine by JavaScript
2. **ClipperLib is already included** - The original code used it as a fallback
3. **Browser compatibility** - ClipperLib works everywhere without compilation
4. **Good enough performance** - For typical nesting jobs, the performance difference is acceptable

If performance becomes an issue later, we can add WebAssembly support.

## Development

### Available Scripts

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## License

Original Deepnest: GPLv3
This web version: GPLv3

## Credits

- Original Deepnest by [Jack Qiao](https://github.com/Jack000)
- Based on [SVGNest](https://github.com/Jack000/SVGnest)
- Web migration: In progress
