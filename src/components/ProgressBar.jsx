function ProgressBar({ value, label }) {
  const isIndeterminate = value === null || value === undefined;

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>
          <span>{label}</span>
          {!isIndeterminate && <span>{Math.round(value)}%</span>}
        </div>
      )}
      
      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill ${isIndeterminate ? 'shimmer' : ''}`}
          style={{ width: isIndeterminate ? '50%' : `${value}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
