import './ResolutionProof.css';

// Read-only "Work Completed" block: the technician's photo and note. Renders
// nothing when a request has no proof, so callers can drop it in anywhere.
function ResolutionProof({ resolution, className = '' }) {
  if (!resolution?.photoUrl) return null;

  return (
    <div className={`resolution-proof ${className}`}>
      <a href={resolution.photoUrl} target="_blank" rel="noreferrer" className="resolution-proof-link">
        <img src={resolution.photoUrl} alt="Completed work" className="resolution-proof-photo" />
      </a>
      {resolution.note && <p className="resolution-proof-text">&ldquo;{resolution.note}&rdquo;</p>}
      {resolution.createdAt && (
        <p className="resolution-proof-date">
          Submitted {new Date(resolution.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </div>
  );
}

export default ResolutionProof;
