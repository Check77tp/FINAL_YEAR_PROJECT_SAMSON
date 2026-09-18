import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCategories } from '../../services/categoriesService';
import { createRequest } from '../../services/requestsService';
import { saveDraft } from '../../services/draftQueue';
import { categoryIcon } from '../../utils/requestFormat';
import { CameraIcon, XIcon } from '../../components/icons';
import './SubmitRequest.css';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function SubmitRequest() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState(null);
  const [categoriesError, setCategoriesError] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [description, setDescription] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => setCategoriesError(err.message));
  }, []);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError('Photo must be a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Photo must be 5MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result);
    reader.onerror = () => setPhotoError('Could not read that file — please try again.');
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    if (!categoryId) {
      setSubmitError('Please choose a category.');
      return;
    }
    if (!description.trim()) {
      setSubmitError('Please describe the issue.');
      return;
    }

    setSubmitting(true);
    try {
      await createRequest({ categoryId, description: description.trim(), photoDataUrl });
      navigate('/requests');
    } catch (err) {
      // A real network failure (offline, or the server's briefly
      // unreachable) doesn't have to mean losing the draft — queue it
      // locally and it'll submit itself once connectivity returns (see
      // hooks/useDraftSync.js). A validation/server error, in contrast,
      // needs the student to see and fix it, not silently queue forever.
      if (err.isNetworkError) {
        const categoryName = categories?.find((category) => category.id === categoryId)?.name;
        await saveDraft({ categoryId, categoryName, description: description.trim(), photoDataUrl });
        navigate('/requests');
        return;
      }
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="submit-request">
      <header className="submit-request-header">
        <h1 className="submit-request-title">Report New Issue</h1>
        <p className="submit-request-subtitle">
          Please provide accurate details to help our maintenance team respond faster.
        </p>
      </header>

      <form className="submit-request-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="submit-request-fieldset">
          <legend className="submit-request-label">Category</legend>

          {categoriesError && (
            <p className="submit-request-error" role="alert">
              Could not load categories: {categoriesError}
            </p>
          )}
          {!categoriesError && categories === null && (
            <p className="submit-request-loading">Loading categories…</p>
          )}

          {categories && (
            <div className="submit-request-categories">
              {categories.map((category) => {
                const Icon = categoryIcon(category.name);
                const selected = categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={`submit-request-category ${
                      selected ? 'submit-request-category-selected' : ''
                    }`}
                    onClick={() => setCategoryId(category.id)}
                    aria-pressed={selected}
                  >
                    <Icon width={22} height={22} />
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <label className="submit-request-label" htmlFor="submit-request-description">
          Description
        </label>
        <textarea
          id="submit-request-description"
          className="submit-request-textarea"
          placeholder="Please describe the issue in detail. For example: 'The tap in the bathroom is leaking constantly even when tightly closed...'"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
        />

        <div className="submit-request-photo-row">
          <span className="submit-request-label">Attach Photo</span>
          <span className="submit-request-optional">Optional</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="submit-request-file-input"
          onChange={handlePhotoChange}
        />

        {photoDataUrl ? (
          <div className="submit-request-photo-preview">
            <img src={photoDataUrl} alt="Selected issue evidence" />
            <button
              type="button"
              className="submit-request-photo-remove"
              onClick={() => setPhotoDataUrl(null)}
              aria-label="Remove photo"
            >
              <XIcon width={16} height={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="submit-request-photo-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="submit-request-photo-dropzone-icon">
              <CameraIcon width={22} height={22} />
            </span>
            <span className="submit-request-photo-dropzone-title">Tap to upload photo</span>
            <span className="submit-request-photo-dropzone-note">JPG, PNG, or WebP up to 5MB</span>
          </button>
        )}
        {photoError && (
          <p className="submit-request-error" role="alert">
            {photoError}
          </p>
        )}

        {submitError && (
          <p className="submit-request-error" role="alert">
            {submitError}
          </p>
        )}

        <div className="submit-request-actions">
          <button type="submit" className="submit-request-submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
          <Link to="/requests" className="submit-request-cancel">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

export default SubmitRequest;
