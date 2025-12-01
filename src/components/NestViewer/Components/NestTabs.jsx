/**
 * NestTabs - Tab navigation for multiple nest results
 */
export default function NestTabs({ nests, selectedNest, onSelectNest }) {
  if (!nests || nests.length <= 1) return null;
  
  return (
    <div style={{ 
      display: 'flex', 
      gap: '5px', 
      padding: '10px',
      borderBottom: '1px solid #3a3a3a',
      overflowX: 'auto',
      background: '#2a2a2a'
    }}>
      {nests.map((nest, index) => (
        <button
          key={index}
          onClick={() => onSelectNest(index)}
          style={{
            padding: '8px 16px',
            border: '1px solid #3a3a3a',
            borderRadius: '4px',
            background: selectedNest === index ? '#646cff' : '#333',
            color: '#fff',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Nest {index + 1} ({((nest.sheetUsage || 0) * 100).toFixed(1)}%)
        </button>
      ))}
    </div>
  );
}
