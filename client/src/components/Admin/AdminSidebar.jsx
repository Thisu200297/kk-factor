import Icon from '../common/Icon';
import { classNames } from '../../utils/format';

export const ADMIN_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'articles', label: 'Articles', icon: 'article' },
  { id: 'categories', label: 'Categories', icon: 'label' },
  { id: 'show', label: 'The show', icon: 'radio' },
  { id: 'partners', label: 'Sponsors', icon: 'label' },
  { id: 'gallery', label: 'Gallery', icon: 'image' },
  { id: 'music', label: 'Music library', icon: 'library_music' },
  { id: 'playlists', label: 'Playlists', icon: 'queue_music' },
  { id: 'membership', label: 'Membership', icon: 'workspace_premium' },
  { id: 'users', label: 'Users', icon: 'group' },
];

export default function AdminSidebar({ active, onChange }) {
  return (
    <>
      {/* Desktop rail */}
      <nav className="card hidden h-full flex-col gap-1 p-3 lg:flex" aria-label="Admin sections">
        {ADMIN_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            aria-current={active === section.id ? 'page' : undefined}
            className={classNames(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active === section.id
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-fill/[0.055] hover:text-on-surface'
            )}
          >
            <Icon name={section.icon} size={20} />
            {section.label}
          </button>
        ))}
      </nav>

      {/* Mobile / tablet scroll strip */}
      <nav className="no-scrollbar -mx-1 overflow-x-auto lg:hidden" aria-label="Admin sections">
        <div className="flex min-w-max gap-1 px-1 pb-1">
          {ADMIN_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={classNames(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
                active === section.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              )}
            >
              <Icon name={section.icon} size={18} />
              {section.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
