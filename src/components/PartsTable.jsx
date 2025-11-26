import './PartsTable.css';

function PartPreview({ part }) {
  if (!part.polygontree || part.polygontree.length === 0) {
    return <div className="preview-placeholder">No preview</div>;
  }

  const bounds = part.bounds;
  const padding = 5;
  const viewBoxWidth = bounds.width + padding * 2;
  const viewBoxHeight = bounds.height + padding * 2;

  // Convert polygon points to SVG path
  const pointsString = part.polygontree.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg 
      width="60" 
      height="60" 
      viewBox={`${bounds.x - padding} ${bounds.y - padding} ${viewBoxWidth} ${viewBoxHeight}`}
      className="part-preview-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon
        points={pointsString}
        fill="#646cff"
        fillOpacity="0.2"
        stroke="#646cff"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {/* Render children (holes) if any */}
      {part.polygontree.children && part.polygontree.children.map((child, i) => (
        <polygon
          key={i}
          points={child.map(p => `${p.x},${p.y}`).join(' ')}
          fill="#1a1a1a"
          stroke="#646cff"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export function PartsTable({ parts, onDelete, onQuantityChange, onSheetToggle }) {
  if (parts.length === 0) {
    return (
      <div className="parts-empty">
        <p>No parts imported yet. Click "Import SVG/DXF" to get started.</p>
      </div>
    );
  }

  return (
    <div className="parts-table">
      <table>
        <thead>
          <tr>
            <th>Preview</th>
            <th>Size</th>
            <th>Sheet</th>
            <th>Quantity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part, index) => (
            <tr key={index}>
              <td className="part-preview">
                <PartPreview part={part} />
              </td>
              <td>
                {part.bounds ? 
                  `${part.bounds.width.toFixed(1)} × ${part.bounds.height.toFixed(1)}` 
                  : 'N/A'}
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={part.sheet || false}
                  onChange={() => onSheetToggle(index)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={part.quantity || 1}
                  onChange={(e) => onQuantityChange(index, e.target.value)}
                  className="quantity-input"
                />
              </td>
              <td>
                <button
                  onClick={() => onDelete(index)}
                  className="button delete-button"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
