import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import RadioBar from './components/RadioPlayer/RadioBar';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { PageLoader } from './components/common/Loader';
import Home from './pages/Home';
import Show from './pages/Show';
import About from './pages/About';
import Contact from './pages/Contact';
import Gallery from './pages/Gallery';
import SponsorsPartners from './pages/SponsorsPartners';
import Account from './pages/Account';
import NewsCategory from './pages/NewsCategory';
import ArticleView from './pages/ArticleView';
import Search from './pages/Search';
import Music from './pages/Music';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import ScrollToTop from './components/common/ScrollToTop';

// The dashboard and its rich-text editor are admin-only, so they are split
// out of the main bundle and fetched on demand.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

export default function App() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />

      <main className="flex-1">
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />

              {/* The show: /show opens on whatever is current, /show/:slug on one episode. */}
              <Route path="/show" element={<Show />} />
              <Route path="/show/:slug" element={<Show />} />

              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/partners" element={<SponsorsPartners />} />

              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                }
              />

              <Route path="/news" element={<NewsCategory />} />
              <Route path="/news/:slug" element={<NewsCategory />} />
              <Route path="/article/:slug" element={<ArticleView />} />
              <Route path="/search" element={<Search />} />

              <Route path="/music" element={<Music />} />

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Mounted outside <Routes> so audio survives every navigation. */}
      <RadioBar />
    </div>
  );
}
