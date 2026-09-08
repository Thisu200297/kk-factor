import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../components/Admin/AdminSidebar';
import StatsOverview from '../components/Admin/StatsOverview';
import ArticlesManager from '../components/Admin/ArticlesManager';
import CategoriesManager from '../components/Admin/CategoriesManager';
import MusicLibrary from '../components/Admin/MusicLibrary';
import PlaylistsManager from '../components/Admin/PlaylistsManager';
import ShowManager from '../components/Admin/ShowManager';
import PartnersManager from '../components/Admin/PartnersManager';
import GalleryManager from '../components/Admin/GalleryManager';
import UserManager from '../components/Admin/UserManager';
import Icon from '../components/common/Icon';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SECTIONS = {
  overview: StatsOverview,
  articles: ArticlesManager,
  categories: CategoriesManager,
  show: ShowManager,
  partners: PartnersManager,
  gallery: GalleryManager,
  music: MusicLibrary,
  playlists: PlaylistsManager,
  users: UserManager,
};

export default function AdminDashboard() {
  useDocumentTitle('Admin dashboard');

  const [section, setSection] = useState('overview');
  const { user } = useAuth();

  const Section = SECTIONS[section] || StatsOverview;

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-headline-lg">Dashboard</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Signed in as {user?.name} · {user?.email}
          </p>
        </div>

        <Link to="/" className="btn-secondary ml-auto">
          <Icon name="open_in_new" size={18} />
          View the site
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20 lg:h-fit">
          <AdminSidebar active={section} onChange={setSection} />
        </div>

        <div className="min-w-0">
          <Section onNavigate={setSection} />
        </div>
      </div>
    </div>
  );
}
