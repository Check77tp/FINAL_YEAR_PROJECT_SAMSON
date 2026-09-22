import { useEffect, useRef, useState } from 'react';
import { compressImage } from '../utils/image';
import { CameraIcon, ImageIcon, XIcon } from './icons';
import './PhotoInput.css';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Phones and tablets: the browser's own camera app is best (capture attribute).
const isTouchDevice = () => window.matchMedia?.('(pointer: coarse)').matches;

// Live camera preview for laptops/desktops, which have no "camera app" behind
// <input capture>. Opens the webcam, shows it, and hands back a JPEG File.
function CameraModal({ onCapture, onClose, onUnavailable }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.play().then(() => setReady(true)).catch(() => {});
      })
      .catch(() => onUnavailable()); // permission denied / no camera -> fall back to file picker

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop()); // turn the camera light off
    };
  }, [onUnavailable]);

  function capture() {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => blob && onCapture(new File([blob], 'capture.jpg', { type: 'image/jpeg' })),
      'image/jpeg',
      0.92
    );
  }

  return (
    <div className="photo-input-modal" role="dialog" aria-modal="true" aria-label="Take a photo">
      <div className="photo-input-modal-card">
        <video ref={videoRef} className="photo-input-video" playsInline muted />
        {!ready && <p className="photo-input-hint">Starting camera… allow access if your browser asks.</p>}
        <div className="photo-input-modal-actions">
          <button type="button" className="photo-input-capture" onClick={capture} disabled={!ready}>
            <CameraIcon width={18} height={18} /> Capture
          </button>
          <button type="button" className="photo-input-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Photo picker used by the request form and the technician's proof form. Two
// clear options: TAKE a photo (camera) or CHOOSE one from files/gallery. The
// result is downscaled + compressed in the browser, and returned as a data
// URL through onChange (null when removed).
function PhotoInput({ value, onChange, disabled = false, previewAlt = 'Selected photo' }) {
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file) {
    if (!file) return;
    setError('');
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Photo must be a JPEG, PNG, or WebP image.');
      return;
    }
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } catch {
      setError('Could not read that photo — please try again.');
    } finally {
      setBusy(false);
    }
  }

  const fromInput = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    handleFile(file);
  };

  function takePhoto() {
    setError('');
    if (isTouchDevice() || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click(); // phone camera app (or file picker as a fallback)
    } else {
      setShowCamera(true); // webcam preview on a computer
    }
  }

  return (
    <div className="photo-input">
      {value && (
        <div className="photo-input-preview">
          <img src={value} alt={previewAlt} />
          <button
            type="button"
            className="photo-input-remove"
            onClick={() => onChange(null)}
            aria-label="Remove photo"
            disabled={disabled}
          >
            <XIcon width={16} height={16} />
          </button>
        </div>
      )}

      <div className="photo-input-buttons">
        <button type="button" className="photo-input-button" onClick={takePhoto} disabled={disabled || busy}>
          <CameraIcon width={20} height={20} />
          {value ? 'Retake photo' : 'Take photo'}
        </button>
        <button
          type="button"
          className="photo-input-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || busy}
        >
          <ImageIcon width={20} height={20} />
          {value ? 'Choose another' : 'Choose from files'}
        </button>
      </div>
      <p className="photo-input-note">
        {busy ? 'Preparing photo…' : 'JPG, PNG or WebP. Large photos are shrunk automatically.'}
      </p>

      {/* Two hidden inputs: one opens the camera, the other the gallery/files */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="photo-input-file"
        onChange={fromInput}
      />
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="photo-input-file" onChange={fromInput} />

      {error && (
        <p className="photo-input-error" role="alert">
          {error}
        </p>
      )}

      {showCamera && (
        <CameraModal
          onClose={() => setShowCamera(false)}
          onUnavailable={() => {
            setShowCamera(false);
            setError('Could not open the camera. Allow camera access, or use "Choose from files".');
          }}
          onCapture={(file) => {
            setShowCamera(false);
            handleFile(file);
          }}
        />
      )}
    </div>
  );
}

export default PhotoInput;
