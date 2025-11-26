import { useState, useCallback, useRef } from 'react';
import DeepNest from '../lib/deepnest.js';

export function useDeepnest() {
  const [parts, setParts] = useState([]);
  const [imports, setImports] = useState([]);
  const [config, setConfig] = useState({
    units: 'inch',
    scale: 72,
    spacing: 0,
    curveTolerance: 0.3,
    rotations: 4,
    threads: 4,
    populationSize: 10,
    mutationRate: 10,
    placementType: 'box',
    mergeLines: true,
    timeRatio: 0.5,
    simplify: false,
  });
  const [isNesting, setIsNesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [nests, setNests] = useState([]);
  
  const deepnestRef = useRef(null);

  // Initialize DeepNest instance
  if (!deepnestRef.current) {
    deepnestRef.current = new DeepNest();
  }

  const importSVG = useCallback(async (file) => {
    try {
      const text = await file.text();
      const filename = file.name;
      
      // Import the SVG
      deepnestRef.current.importsvg(filename, '', text, 1, false);
      
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
    
    const progressCallback = (prog) => {
      setProgress(prog);
    };
    
    const displayCallback = (nestsArray) => {
      // Update display when new results are available
      console.log('New nesting result available', nestsArray);
      if (nestsArray && nestsArray.length > 0) {
        setNests([...nestsArray]);
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

  const updateConfig = useCallback((key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
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
