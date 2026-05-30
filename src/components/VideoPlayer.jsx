import { forwardRef } from 'react';

const VideoPlayer = forwardRef(({ src }, ref) => {
  if (!src) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: 'var(--text-dark)', fontSize: '0.9rem' }}>
        No video file loaded.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video
        ref={ref}
        src={src}
        controls
        style={{ width: '100%', maxHeight: '350px', outline: 'none' }}
      />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
