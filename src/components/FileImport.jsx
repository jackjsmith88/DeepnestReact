import { useRef } from 'react';
import './FileImport.css';

export function FileImport({ onImport, disabled }) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      if (file.name.endsWith('.svg') || file.name.endsWith('.dxf')) {
        await onImport(file);
      } else {
        alert(`Unsupported file type: ${file.name}. Please use SVG or DXF files.`);
      }
    }
    
    // Reset input so same file can be imported again
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,.dxf"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        className="button import"
        onClick={handleClick}
        disabled={disabled}
      >
        Import SVG/DXF
      </button>
    </>
  );
}
