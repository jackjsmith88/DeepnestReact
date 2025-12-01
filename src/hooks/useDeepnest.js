import { useState, useCallback, useRef } from 'react';
import DeepNest from '../lib/deepnest.js';

// Initial config - defined outside component to avoid recreation
const initialConfig = {
  units: 'mm',
  scale: 72,
  spacing: 0,
  binPadding: 0,  // Edge margin - how far from bin edges parts must stay
  curveTolerance: 0.3,
  rotations: 4,
  threads: 4,
  populationSize: 10,
  mutationRate: 10,
  placementType: 'gravity',
  mergeLines: true,
  timeRatio: 0.5,
  simplify: false,
  exploreConcave: true,  // Explore concave areas of NFP for better fitting
};

export function useDeepnest() {
  const [parts, setParts] = useState([]);
  const [imports, setImports] = useState([]);
  const [config, setConfig] = useState(initialConfig);
  const [isNesting, setIsNesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [nests, setNests] = useState([]);
  
  const deepnestRef = useRef(null);

  // Initialize DeepNest instance and sync initial config
  if (!deepnestRef.current) {
    deepnestRef.current = new DeepNest();
    // Apply initial config to the DeepNest instance
    deepnestRef.current.config(initialConfig);
  }

  const importSVG = useCallback(async (file) => {
    try {
      const text = await file.text();
      const filename = file.name;
      
      // Import the SVG
      deepnestRef.current.importsvg(filename, '', text, 1, false);
      
      // Auto-detect the largest shape as the sheet/bin
      const parts = deepnestRef.current.parts;
      if (parts.length > 0) {
        // Check if there's already a sheet defined
        const hasSheet = parts.some(p => p.sheet);
        
        if (!hasSheet) {
          // Find the largest part by area
          let largestIndex = 0;
          let largestArea = 0;
          
          for (let i = 0; i < parts.length; i++) {
            const area = parts[i].area || (parts[i].bounds?.width * parts[i].bounds?.height) || 0;
            if (area > largestArea) {
              largestArea = area;
              largestIndex = i;
            }
          }
          
          // Mark the largest part as the sheet
          parts[largestIndex].sheet = true;
        }
      }
      
      // Update parts and imports from DeepNest
      setParts([...deepnestRef.current.parts]);
      setImports([...deepnestRef.current.imports]);
      
      return { success: true };
    } catch (error) {
      console.error('Error importing SVG:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const deletePart = useCallback((index) => {
    deepnestRef.current.parts.splice(index, 1);
    setParts([...deepnestRef.current.parts]);
  }, []);

  const updatePartQuantity = useCallback((index, quantity) => {
    if (deepnestRef.current.parts[index]) {
      deepnestRef.current.parts[index].quantity = parseInt(quantity) || 1;
      setParts([...deepnestRef.current.parts]);
    }
  }, []);

  const toggleSheet = useCallback((index) => {
    if (deepnestRef.current.parts[index]) {
      deepnestRef.current.parts[index].sheet = !deepnestRef.current.parts[index].sheet;
      setParts([...deepnestRef.current.parts]);
    }
  }, []);

  const startNest = useCallback(() => {
    setIsNesting(true);
    setProgress(0);
    setNests([]);
    
    // Ensure config is synced to DeepNest instance before starting
    if (deepnestRef.current) {
      deepnestRef.current.config(config);
    }
    
    const progressCallback = (prog) => {
      setProgress(prog);
    };
    
    const displayCallback = (nestsArray) => {
      // Update display when new results are available
      // displayCallback received nests
      if (nestsArray && nestsArray.length > 0) {
        // Deep clone to ensure React detects the change
        const clonedNests = JSON.parse(JSON.stringify(nestsArray));
        // Setting nests state
        setNests(clonedNests);
      }
    };
    
    try {
      deepnestRef.current.start(
        progressCallback,
        displayCallback
      );
    } catch (error) {
      console.error('Error starting nest:', error);
      setIsNesting(false);
    }
  }, [config]);

  const stopNest = useCallback(() => {
    if (deepnestRef.current) {
      deepnestRef.current.stop();
    }
    setIsNesting(false);
  }, []);

  const updateConfig = useCallback((keyOrConfig, value) => {
    // Support both updateConfig({...newConfig}) and updateConfig('key', value)
    if (typeof keyOrConfig === 'object') {
      setConfig(keyOrConfig);
      // Also update the DeepNest instance config
      if (deepnestRef.current) {
        deepnestRef.current.config(keyOrConfig);
      }
    } else {
      setConfig(prev => {
        const newConfig = { ...prev, [keyOrConfig]: value };
        // Also update the DeepNest instance config
        if (deepnestRef.current) {
          deepnestRef.current.config(newConfig);
        }
        return newConfig;
      });
    }
  }, []);

  return {
    parts,
    imports,
    config,
    isNesting,
    progress,
    nests,
    importSVG,
    deletePart,
    updatePartQuantity,
    toggleSheet,
    startNest,
    stopNest,
    updateConfig,
  };
}
