import { useRef, useState } from 'react';
import Icon from '../common/Icon';
import { Spinner } from '../common/Loader';
import { InlineError } from '../common/States';
import { uploadsApi } from '../../utils/api';
import { mediaUrl } from '../../utils/constants';

const ACCEPTED = ['image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads a cover image and reports back the stored /uploads/... path. */
export default function ImageUploader({ value, onChange, label = 'Cover image' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);

    // Check client-side too so an obvious mistake never costs a round trip.
    if (!ACCEPTED.includes(file.type)) {
      setError('Only JPG and PNG images are accepted.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is larger than the 5 MB limit.');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadsApi.image(file);
      onChange(result.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <span className="label">{label}</span>

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-outline-variant">
          <img src={mediaUrl(value)} alt="" className="aspect-[16/9] max-h-56 w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-error hover:bg-black/85"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-[16/9] max-h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container-low text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Spinner className="text-primary" />
              <span className="text-sm">Uploading…</span>
            </>
          ) : (
            <>
              <Icon name="add_photo_alternate" size={32} />
              <span className="text-sm font-medium">Choose an image</span>
              <span className="text-xs">JPG or PNG, up to 5 MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="mt-2">
        <InlineError message={error} />
      </div>
    </div>
  );
}
