import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Info } from 'lucide-react';

// Default scale (72 DPI)
const DEFAULT_SCALE = 72;

// Unit conversion functions
const mmToPx = (mm, scale = DEFAULT_SCALE) => (mm * scale) / 25.4;
const inchToPx = (inch, scale = DEFAULT_SCALE) => inch * scale;
const pxToMm = (px, scale = DEFAULT_SCALE) => (px * 25.4) / scale;
const pxToInch = (px, scale = DEFAULT_SCALE) => px / scale;

// Convert from user units to internal pixels
const toPixels = (value, unit, scale = DEFAULT_SCALE) => {
  if (unit === 'mm') return mmToPx(value, scale);
  if (unit === 'inch') return inchToPx(value, scale);
  return value; // already pixels
};

// Convert from internal pixels to user units
const fromPixels = (px, unit, scale = DEFAULT_SCALE) => {
  if (unit === 'mm') return pxToMm(px, scale);
  if (unit === 'inch') return pxToInch(px, scale);
  return px; // already pixels
};

// Info tooltip component
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  
  return (
    <span 
      style={{ position: 'relative', display: 'inline-flex', marginLeft: '6px', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info size={14} color="#666" />
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          padding: '10px 12px',
          background: '#1a1a1a',
          border: '1px solid #444',
          borderRadius: '6px',
          color: '#ddd',
          fontSize: '12px',
          lineHeight: '1.5',
          width: '220px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          whiteSpace: 'normal'
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #444'
          }} />
        </div>
      )}
    </span>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #3a3a3a',
  borderRadius: '4px',
  background: '#1a1a1a',
  color: '#fff',
  fontSize: '14px'
};

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '4px',
  color: '#ccc',
  fontSize: '12px',
  fontWeight: '500'
};

const fieldStyle = {
  marginBottom: '12px'
};

const sectionStyle = {
  marginBottom: '16px'
};

const sectionTitleStyle = {
  color: '#999',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '10px',
  paddingBottom: '4px',
  borderBottom: '1px solid #3a3a3a'
};

export default function NestingConfig({ config, onConfigChange, disabled }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleChange = (key, value) => {
    onConfigChange({ ...config, [key]: value });
  };

  const rotationOptions = [
    { value: 1, label: 'None (0°)' },
    { value: 2, label: '2 (0°, 180°)' },
    { value: 4, label: '4 (0°, 90°, 180°, 270°)' },
    { value: 8, label: '8 (45° increments)' },
    { value: 16, label: '16 (22.5° increments)' }
  ];

  const placementOptions = [
    { value: 'gravity', label: 'Gravity (bottom-left)' },
    { value: 'box', label: 'Bounding Box' },
    { value: 'convexhull', label: 'Convex Hull' }
  ];

  const unitOptions = [
    { value: 'mm', label: 'Millimeters (mm)' },
    { value: 'inch', label: 'Inches (in)' },
    { value: 'px', label: 'Pixels (px)' }
  ];

  return (
    <div style={{
      background: '#2a2a2a',
      borderRadius: '8px',
      border: '1px solid #3a3a3a',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          background: '#333',
          borderBottom: isExpanded ? '1px solid #3a3a3a' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} color="#646cff" />
          <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
            Nesting Configuration
          </span>
        </div>
        {isExpanded ? <ChevronUp size={18} color="#999" /> : <ChevronDown size={18} color="#999" />}
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {/* Units & Spacing Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Units & Spacing</div>
            
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Units
                <InfoTooltip text="The measurement unit used for spacing and padding values. Choose the unit that matches your design software." />
              </label>
              <select
                value={config.units || 'inch'}
                onChange={(e) => handleChange('units', e.target.value)}
                disabled={disabled}
                style={inputStyle}
              >
                {unitOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Part Spacing / Kerf
                <span style={{ color: '#666', marginLeft: '4px' }}>
                  ({config.units || 'inch'})
                </span>
                <InfoTooltip text="The gap between nested parts. Set this to your cutting tool width (laser kerf, router bit diameter, or blade thickness) to prevent parts from touching." />
              </label>
              <input
                type="number"
                value={parseFloat(fromPixels(config.spacing || 0, config.units || 'inch', config.scale || DEFAULT_SCALE).toFixed(2))}
                onChange={(e) => {
                  const userValue = parseFloat(e.target.value) || 0;
                  const pxValue = toPixels(userValue, config.units || 'inch', config.scale || DEFAULT_SCALE);
                  handleChange('spacing', pxValue);
                }}
                disabled={disabled}
                min="0"
                step={config.units === 'mm' ? '1' : '0.1'}
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Bin Edge Padding
                <span style={{ color: '#666', marginLeft: '4px' }}>
                  ({config.units || 'inch'})
                </span>
                <InfoTooltip text="Margin from the sheet edges. Use this to keep parts away from sheet borders for clamping, tension release cuts, or material defects." />
              </label>
              <input
                type="number"
                value={parseFloat(fromPixels(config.binPadding || 0, config.units || 'inch', config.scale || DEFAULT_SCALE).toFixed(2))}
                onChange={(e) => {
                  const userValue = parseFloat(e.target.value) || 0;
                  const pxValue = toPixels(userValue, config.units || 'inch', config.scale || DEFAULT_SCALE);
                  handleChange('binPadding', pxValue);
                }}
                disabled={disabled}
                min="0"
                step={config.units === 'mm' ? '1' : '0.1'}
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Curve Tolerance
                <InfoTooltip text="Controls how accurately curves are converted to line segments. Lower values = more accurate curves but slower processing. Range: 0.01 (precise) to 1 (fast)." />
              </label>
              <input
                type="number"
                value={config.curveTolerance || 0.3}
                onChange={(e) => handleChange('curveTolerance', parseFloat(e.target.value) || 0.3)}
                disabled={disabled}
                min="0.01"
                max="1"
                step="0.05"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Rotation & Placement Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Rotation & Placement</div>
            
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Allowed Rotations
                <InfoTooltip text="Number of rotation angles to try for each part. More rotations can find tighter fits but increases processing time. Use fewer rotations for parts with grain direction requirements." />
              </label>
              <select
                value={config.rotations || 4}
                onChange={(e) => handleChange('rotations', parseInt(e.target.value))}
                disabled={disabled}
                style={inputStyle}
              >
                {rotationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Placement Strategy
                <InfoTooltip text="How parts are positioned on the sheet. Gravity places parts bottom-left for efficient strip cutting. Bounding Box minimizes overall area. Convex Hull creates tighter clusters." />
              </label>
              <select
                value={config.placementType || 'gravity'}
                onChange={(e) => handleChange('placementType', e.target.value)}
                disabled={disabled}
                style={inputStyle}
              >
                {placementOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Algorithm Settings Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Genetic Algorithm</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Population Size
                  <InfoTooltip text="Number of solutions evolved each generation. Larger populations explore more possibilities but run slower. Recommended: 10-20 for most jobs." />
                </label>
                <input
                  type="number"
                  value={config.populationSize || 10}
                  onChange={(e) => handleChange('populationSize', parseInt(e.target.value) || 10)}
                  disabled={disabled}
                  min="2"
                  max="50"
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Mutation Rate (%)
                  <InfoTooltip text="Chance of random changes in each generation. Higher values explore more variations but may miss optimal solutions. Recommended: 10-25%." />
                </label>
                <input
                  type="number"
                  value={config.mutationRate || 10}
                  onChange={(e) => handleChange('mutationRate', parseInt(e.target.value) || 10)}
                  disabled={disabled}
                  min="1"
                  max="50"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Advanced Options Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Advanced</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: '#ccc',
                fontSize: '13px'
              }}>
                <input
                  type="checkbox"
                  checked={config.simplify === true}
                  onChange={(e) => handleChange('simplify', e.target.checked)}
                  disabled={disabled}
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                />
                Simplify polygons
                <InfoTooltip text="Reduces polygon complexity for faster processing. May slightly reduce nesting accuracy. Enable for complex parts or large jobs." />
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: '#ccc',
                fontSize: '13px'
              }}>
                <input
                  type="checkbox"
                  checked={config.exploreConcave !== false}
                  onChange={(e) => handleChange('exploreConcave', e.target.checked)}
                  disabled={disabled}
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                />
                Explore concave regions
                <InfoTooltip text="Allows parts to nest inside concave areas of other parts (e.g., inside an L-shape). Improves material usage but increases processing time." />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
