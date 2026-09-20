import { useRef, useState } from 'react';
import { compressImage } from '../utils/image';
import { CameraIcon } from './icons';
import './ResolutionProofForm.css';

const MAX_NOTE = 500;

// Shown to the technician instead of a bare "Mark as Resolved" button: they
// photograph the finished repair (opens the camera on a phone) and can add a
// short note. The photo is required — it is the proof the student and admin
// see. `onSubmit({ photoDataUrl, note })` does the actual status change.
function ResolutionProofForm({ onSubmit, busy, error }) {
  const fileInputRef = useRef(null);
  const [photo, setPhoto] = useState(null); // compressed data URL
  const [note, setNote] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoError('');
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image.');
      return;
    }

    setProcessing(true);
    try {
      setPhoto(await compressImage(file));
    } catch {
      setPhotoError('Could not read that photo — please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form
      className="resolution-proof-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (photo) onSubmit({ photoDataUrl: photo, note: note.trim() });
      }}
    >
      <p className="resolution-proof-intro">
        Take a photo of the finished work. The student and administrators will see it.
      </p>

      {photo ? (
        <div className="resolution-proof-preview">
          <img src={photo} alt="Photo of the completed work" className="resolution-proof-image" />
          <button
            type="button"
            className="resolution-proof-retake"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            Retake photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="resolution-proof-capture"
          onClick={() => fileInputRef.current?.click()}
          disabled={processing || busy}
        >
          <span className="resolution-proof-capture-icon">
            <CameraIcon width={22} height={22} />
          </span>
          <span className="resolution-proof-capture-label">
            {processing ? 'Preparing photo…' : 'Take photo of completed work'}
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="resolution-proof-file"
        onChange={handleFile}
      />

      {photoError && (
        <p className="resolution-proof-error" role="alert">
          {photoError}
        </p>
      )}

      <label className="resolution-proof-label" htmlFor="resolution-proof-note">
        Note <span className="resolution-proof-optional">Optional</span>
      </label>
      <textarea
        id="resolution-proof-note"
        className="resolution-proof-note"
        rows={3}
        maxLength={MAX_NOTE}
        placeholder="e.g. Replaced the tap washer and tested for leaks."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      {error && (
        <p className="resolution-proof-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="resolution-proof-submit" disabled={!photo || busy || processing}>
        {busy ? 'Submitting…' : 'Mark as Resolved'}
      </button>
    </form>
  );
}

export default ResolutionProofForm;
