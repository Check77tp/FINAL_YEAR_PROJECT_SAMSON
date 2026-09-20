import { useState } from 'react';
import { upvoteRequest, removeUpvote } from '../services/requestsService';
import { ThumbsUpIcon } from './icons';
import './UpvoteButton.css';

// "Me too" toggle for someone else's request. Optimistic: the count and
// highlight change immediately and are rolled back if the server rejects it,
// so the tap feels instant even on a slow connection.
// `item` = { requestId, hasUpvoted, upvoteCount }; `onChange(next)` lets the
// parent keep its own list in sync.
function UpvoteButton({ item, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    if (busy) return;
    const previous = { hasUpvoted: item.hasUpvoted, upvoteCount: item.upvoteCount };
    const optimistic = {
      hasUpvoted: !previous.hasUpvoted,
      upvoteCount: previous.upvoteCount + (previous.hasUpvoted ? -1 : 1),
    };

    setBusy(true);
    setError('');
    onChange(optimistic);
    try {
      const result = previous.hasUpvoted
        ? await removeUpvote(item.requestId)
        : await upvoteRequest(item.requestId);
      onChange({ hasUpvoted: result.hasUpvoted, upvoteCount: result.upvoteCount });
    } catch (err) {
      onChange(previous);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upvote-button-wrap">
      <button
        type="button"
        className={`upvote-button ${item.hasUpvoted ? 'upvote-button-active' : ''}`}
        onClick={handleClick}
        aria-pressed={item.hasUpvoted}
        disabled={busy}
      >
        <ThumbsUpIcon width={16} height={16} />
        <span className="upvote-button-label">{item.hasUpvoted ? 'Upvoted' : 'Me too'}</span>
        <span className="upvote-button-count">{item.upvoteCount}</span>
      </button>
      {error && (
        <span className="upvote-button-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default UpvoteButton;
