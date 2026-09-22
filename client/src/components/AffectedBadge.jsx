import './AffectedBadge.css';

// "+12 affected": how many OTHER students backed this request with "Me too".
// Shown to technicians (and the reporting student) so widely-felt problems get
// fixed first. Renders nothing when nobody else is affected.
function AffectedBadge({ count }) {
  if (!count || count < 1) return null;
  return (
    <span
      className="affected-badge"
      title={`${count} other student${count === 1 ? '' : 's'} reported the same problem`}
    >
      +{count} student{count === 1 ? '' : 's'} affected
    </span>
  );
}

export default AffectedBadge;
