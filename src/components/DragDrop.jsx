import { useState, useRef } from 'react';

function DragDrop({ accept, onFile, label = 'Drag & drop file here or click to browse', icon = '📁' }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcessFile(file);
    }
  };

  const validateAndProcessFile = (file) => {
    // If accept filter is provided, check if type matches
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileType = file.type;
      const fileName = file.name;
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          // Extension check
          return fileName.endsWith(type);
        } else if (type.endsWith('/*')) {
          // Wildcard mime type check (e.g. video/*)
          const baseType = type.split('/')[0];
          return fileType.startsWith(baseType);
        } else {
          // Exact mime type check
          return fileType === type;
        }
      });

      if (!isAccepted) {
        alert(`Invalid file type. Accepted types: ${accept}`);
        return;
      }
    }
    
    onFile(file);
  };

  return (
    <div
      className={`drag-drop-zone ${isDragOver ? 'dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={accept}
        style={{ display: 'none' }}
      />
      <div className="drag-drop-icon">{icon}</div>
      <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>{label}</p>
      <p className="text-xs" style={{ color: 'var(--text-dark)' }}>
        Supported: {accept ? accept.replace(/\/\*/g, '') : 'Any files'}
      </p>
    </div>
  );
}

export default DragDrop;
