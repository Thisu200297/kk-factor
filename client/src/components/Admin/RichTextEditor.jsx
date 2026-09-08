import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import 'react-quill/dist/quill.snow.css';
import { Spinner } from '../common/Loader';

// react-quill is ~240KB, so it is only pulled in when the editor is opened.
const ReactQuill = lazy(() => import('react-quill'));

const MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
  clipboard: { matchVisual: false },
};

const FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'blockquote', 'code-block', 'list', 'bullet', 'link', 'image',
];

/**
 * Rich-text editor for article bodies.
 *
 * The editor owns its own copy of the HTML rather than reading the parent's
 * `value` on every render. Feeding a parent state value straight back into
 * Quill makes it fight the caret while someone is typing quickly, and
 * characters get dropped. `resetKey` (the article id, or 'new') is the single
 * signal that the parent has swapped in a different document.
 *
 * Whatever HTML this produces is sanitised again on the server before it is
 * stored, so a crafted paste cannot introduce script content.
 */
export default function RichTextEditor({ value, onChange, resetKey = 'new', placeholder = 'Write the story…' }) {
  const [html, setHtml] = useState(value || '');
  const modules = useMemo(() => MODULES, []);

  useEffect(() => {
    setHtml(value || '');
    // Intentionally keyed on resetKey only — see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleChange = (next) => {
    setHtml(next);
    onChange(next);
  };

  return (
    <Suspense
      fallback={
        <div className="flex h-72 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low">
          <Spinner className="text-primary" />
        </div>
      }
    >
      <div className="quill-dark">
        <ReactQuill
          theme="snow"
          value={html}
          onChange={handleChange}
          modules={modules}
          formats={FORMATS}
          placeholder={placeholder}
        />
      </div>
    </Suspense>
  );
}
