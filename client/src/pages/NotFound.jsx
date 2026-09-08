import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');

  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-display text-outline-variant">404</span>
      <h1 className="text-headline-md font-bold">We could not find that page</h1>
      <p className="max-w-sm text-sm text-on-surface-variant">
        The link may be out of date, or the story may have been unpublished.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">
          <Icon name="home" size={18} />
          Back to the homepage
        </Link>
        <Link to="/radio" className="btn-secondary">
          <Icon name="radio" size={18} />
          Listen live instead
        </Link>
      </div>
    </div>
  );
}
