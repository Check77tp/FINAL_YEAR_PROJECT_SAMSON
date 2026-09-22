import { useEffect, useRef, useState } from 'react';
import { getComments, addComment } from '../services/requestsService';
import { useAuth } from '../hooks/useAuth';
import { useLiveVersion } from '../hooks/useLive';
import './CommentsThread.css';

const MAX_LENGTH = 1000;
const ROLE_LABELS = { student: 'Student', technician: 'Technician', administrator: 'Admin' };

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// The conversation on a request between the student, the assigned technician
// and the administrators. New comments from other people appear by themselves
// (live updates); posting notifies the others by push.
function CommentsThread({ requestId, closed = false }) {
  const { user } = useAuth();
  const liveVersion = useLiveVersion();
  const [comments, setComments] = useState(() => getComments.peek(requestId) ?? null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    getComments(requestId)
      .then(setComments)
      .catch((err) => setError(err.message));
  }, [requestId, liveVersion]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments]);

  async function handleSend(event) {
    event?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setSendError('');
    try {
      const created = await addComment(requestId, body);
      setComments((prev) => [...(prev || []), created]);
      setText('');
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="comments-thread">
      {error && (
        <p className="comments-thread-error" role="alert">
          Could not load comments: {error}
        </p>
      )}
      {comments === null && !error && <p className="comments-thread-muted">Loading…</p>}
      {comments && comments.length === 0 && (
        <p className="comments-thread-muted">
          No comments yet. Ask a question or add detail to help get this fixed faster.
        </p>
      )}

      {comments && comments.length > 0 && (
        <ul className="comments-thread-list" ref={listRef} aria-live="polite">
          {comments.map((c) => {
            const mine = c.author?.id === user?.user_id;
            return (
              <li key={c.id} className={`comments-thread-item ${mine ? 'comments-thread-item-mine' : ''}`}>
                <div className="comments-thread-bubble">
                  <p className="comments-thread-author">
                    {mine ? 'You' : c.author?.name || 'Someone'}
                    {c.author?.role && (
                      <span className={`comments-thread-role comments-thread-role-${c.author.role}`}>
                        {ROLE_LABELS[c.author.role]}
                      </span>
                    )}
                  </p>
                  <p className="comments-thread-body">{c.body}</p>
                  <p className="comments-thread-time">{formatTime(c.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {closed ? (
        <p className="comments-thread-muted">This request is closed, so comments are turned off.</p>
      ) : (
        <form className="comments-thread-form" onSubmit={handleSend}>
          <label className="comments-thread-sr" htmlFor={`comment-${requestId}`}>
            Add a comment
          </label>
          <textarea
            id={`comment-${requestId}`}
            className="comments-thread-input"
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(e);
            }}
          />
          <div className="comments-thread-actions">
            <span className="comments-thread-count">{text.length}/{MAX_LENGTH}</span>
            <button type="submit" className="comments-thread-send" disabled={sending || !text.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          {sendError && (
            <p className="comments-thread-error" role="alert">
              {sendError}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export default CommentsThread;
