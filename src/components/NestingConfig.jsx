import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';

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
  display: 'block',
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
              <label style={labelStyle}>Units</label>
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
              <small style={{ color: '#666', fontSize: '11px' }}>
                Gap between parts (blade/laser width)
              </small>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Bin Edge Padding
                <span style={{ color: '#666', marginLeft: '4px' }}>
                  ({config.units || 'inch'})
                </span>
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
              <small style={{ color: '#666', fontSize: '11px' }}>
                Margin from sheet edges (for tension release cuts)
              </small>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Curve Tolerance</label>
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
              <small style={{ color: '#666', fontSize: '11px' }}>
                Lower = more accurate curves, slower processing
              </small>
            </div>
          </div>

          {/* Rotation & Placement Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Rotation & Placement</div>
            
            <div style={fieldStyle}>
              <label style={labelStyle}>Allowed Rotations</label>
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
              <label style={labelStyle}>Placement Strategy</label>
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
                <label style={labelStyle}>Population Size</label>
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
                <label style={labelStyle}>Mutation Rate (%)</label>
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

            <small style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '4px' }}>
              Higher population = more thorough search but slower. Higher mutation = more exploration.
            </small>
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
                  checked={config.mergeLines !== false}
                  onChange={(e) => handleChange('mergeLines', e.target.checked)}
                  disabled={disabled}
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                />
                Merge overlapping lines
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
                Explore concave areas
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
                  checked={config.simplify === true}
                  onChange={(e) => handleChange('simplify', e.target.checked)}
                  disabled={disabled}
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                />
                Simplify polygons (faster, less accurate)
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
