import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gtag } from '../services/analytics';
import { Json2ToonCta } from './Json2ToonCta';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isFaq = location.pathname === '/faq';

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4" role="banner">
      <div className="max-w-screen-2xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart JSON Diff</h1>
          <p className="text-sm text-gray-400 mt-1">
            Compare JSON objects semantically with smart array matching
          </p>
          <Json2ToonCta />
        </div>
        <nav aria-label="Primary">
          {isFaq ? (
            <button
              onClick={() => {
                gtag('event', 'faq_back_click');
                navigate(-1);
              }}
              className="text-sm text-gray-400 hover:text-gray-200"
              aria-label="Go back to previous view"
            >
              ← Back
            </button>
          ) : (
            <Link
              to="/faq"
              onClick={() => {
                gtag('event', 'faq_open_click');
              }}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              FAQ
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}


