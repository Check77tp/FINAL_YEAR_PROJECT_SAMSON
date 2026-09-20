import { useEffect, useState } from 'react';
import { getTriageSuggestion } from '../services/requestsService';
import { PRIORITY_LABELS } from '../utils/requestFormat';
import './TriageSuggestion.css';

const MIN_CHARS = 15;
const DEBOUNCE_MS = 1000;

// Under the description box: once the student has typed enough, suggests a
// category + urgency ("Looks like Plumbing, High priority — Apply"). It only
// ever suggests; the student's own choices are never overwritten unless they
// tap Apply. Fails silently — the form works exactly the same without it.
function TriageSuggestion({ description, categories, categoryId, priority, onApply }) {
  const [result, setResult] = useState(null); // { description, suggestion }
  const [dismissedFor, setDismissedFor] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const text = description.trim();
    if (text.length < MIN_CHARS) return undefined;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      getTriageSuggestion(text)
        .then((suggestion) => {
          if (!cancelled) setResult({ description: text, suggestion });
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [description]);

  const text = description.trim();
  if (text.length < MIN_CHARS) return null;

  if (loading && !result) {
    return <p className="triage-suggestion-thinking">Reading your description…</p>;
  }
  if (!result || dismissedFor === result.description) return null;

  const { suggestion } = result;
  const category = categories?.find((c) => c.id === suggestion.categoryId);
  const alreadyApplied =
    (!category || category.id === categoryId) && suggestion.priority === priority;
  if (alreadyApplied) return null;

  return (
    <div className="triage-suggestion" role="status">
      <div className="triage-suggestion-body">
        <span className="triage-suggestion-badge">
          {suggestion.source === 'ai' ? 'AI suggestion' : 'Suggestion'}
        </span>
        <p className="triage-suggestion-text">
          Looks like{' '}
          {category && <strong>{category.name}</strong>}
          {category && ', '}
          <strong>{PRIORITY_LABELS[suggestion.priority]} priority</strong>.
        </p>
        {suggestion.reason && <p className="triage-suggestion-reason">{suggestion.reason}</p>}
      </div>
      <div className="triage-suggestion-actions">
        <button
          type="button"
          className="triage-suggestion-apply"
          onClick={() =>
            onApply({
              categoryId: category ? category.id : null,
              priority: suggestion.priority,
            })
          }
        >
          Apply
        </button>
        <button
          type="button"
          className="triage-suggestion-dismiss"
          onClick={() => setDismissedFor(result.description)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default TriageSuggestion;
