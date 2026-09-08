import { NavLink } from 'react-router-dom';
import { classNames } from '../../utils/format';

/** iOS-style segmented control; scrolls horizontally on narrow screens. */
export default function CategoryTabs({ categories = [], includeAll = true }) {
  const itemClass = ({ isActive }) =>
    classNames('segmented-item', isActive && 'segmented-item-active');

  return (
    <nav aria-label="News categories" className="no-scrollbar -mx-1 overflow-x-auto px-1 py-0.5">
      <div className="segmented w-max gap-0.5">
        {includeAll && (
          <NavLink to="/news" end className={itemClass}>
            All
          </NavLink>
        )}

        {categories.map((category) => (
          <NavLink key={category.id} to={`/news/${category.slug}`} className={itemClass}>
            {category.name}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
