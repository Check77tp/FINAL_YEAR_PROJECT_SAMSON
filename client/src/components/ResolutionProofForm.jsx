import { useState } from 'react';
import PhotoInput from './PhotoInput';
import './ResolutionProofForm.css';

const MAX_NOTE = 500;

// Shown to the technician instead of a bare "Mark as Resolved" button: they can
// take a photo of the finished repair (camera) or choose one from their files,
// and add a short note. Both are optional; when present the student and admins
// see them. `onSubmit({ photoDataUrl, note })` does the actual status change
// (the server can be configured to require the photo - REQUIRE_RESOLUTION_PROOF).
function ResolutionProofForm({ onSubmit, busy, error }) {
  const [photo, setPhoto] = useState(null); // compressed data URL
  const [note, setNote] = useState('');

  return (
    <form
      className="resolution-proof-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ photoDataUrl: photo || undefined, note: note.trim() });
      }}
    >
      <p className="resolution-proof-intro">
        Optional: add a photo of the finished work. If you do, the student and administrators will see it.
      </p>

      <PhotoInput value={photo} onChange={setPhoto} disabled={busy} previewAlt="Photo of the completed work" />

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

      <button type="submit" className="resolution-proof-submit" disabled={busy}>
        {busy ? 'Submitting…' : 'Mark as Resolved'}
      </button>
    </form>
  );
}

export default ResolutionProofForm;
