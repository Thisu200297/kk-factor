import { useEffect } from 'react';
import { SITE_NAME } from '../utils/constants';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
