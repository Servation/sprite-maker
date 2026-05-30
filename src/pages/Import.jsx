import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, TYPES } from '../context/AppContext';
import { useToast } from '../components/Toast';
import DragDrop from '../components/DragDrop';

function Import() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');

  const handleVideoFile = (file) => {
    // Generate object URL for preview
    const url = URL.createObjectURL(file);
    setSelectedVideo(file);
    setVideoUrl(url);
    addToast(`Loaded video: ${file.name}`, 'info');
  };

  const handleContinue = () => {
    if (!selectedVideo) return;
    
    // Save to context
    dispatch({
      type: TYPES.SET_VIDEO,
      payload: {
        video: selectedVideo,
        videoUrl: videoUrl,
      }
    });

    addToast('Video loaded into Editor. Preparing workspace...', 'success');
    navigate('/editor');
  };

  const handleReset = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setSelectedVideo(null);
    setVideoUrl('');
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Import Local Video</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Upload an animation loop from your device to convert it directly into a sprite sheet.
        </p>
      </div>

      {!selectedVideo ? (
        <div className="card glass" style={{ padding: '40px' }}>
          <DragDrop
            accept="video/mp4,video/webm,video/quicktime"
            onFile={handleVideoFile}
            label="Drag & drop your MP4/WebM video here or click to browse"
            icon="🎬"
          />
          <div style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6' }}>
            <h4 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>Tips for best results:</h4>
            <ul style={{ paddingLeft: '20px', listStyleType: 'disc' }}>
              <li>Ensure the video loops cleanly (the last frame returns to the starting pose).</li>
              <li>Use high contrast or solid backgrounds to make chroma-key removal easier.</li>
              <li>Keep clips short (1–5 seconds) to minimize memory usage and processing time.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              src={videoUrl}
              controls
              style={{ width: '100%', maxHeight: '400px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }} className="truncate">{selectedVideo.name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Size: {formatSize(selectedVideo.size)}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary text-sm" onClick={handleReset}>
                Choose Another
              </button>
              <button className="btn btn-primary text-sm" onClick={handleContinue}>
                Continue to Editor →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Import;
