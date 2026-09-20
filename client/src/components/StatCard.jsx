import './StatCard.css';

// Read-only summary tile: icon chip, label, big number. Deliberately flat
// (white card, thin border, no fill colour, no hover effect) so it doesn't
// look clickable — a solid coloured tile reads as a button. `tone` only tints
// the small icon chip: 'primary' | 'secondary' | 'tertiary'.
function StatCard({ icon, label, value, tone = 'primary' }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <span className="stat-card-icon" aria-hidden="true">{icon}</span>
      <div className="stat-card-body">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
      </div>
    </div>
  );
}

export default StatCard;
