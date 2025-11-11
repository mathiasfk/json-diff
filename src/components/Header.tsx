import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gtag } from '../services/analytics';

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
          <a
            href="https://json2toon.dev/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              gtag('event', 'json2toon_click');
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/70 px-3 py-1 text-xs font-medium text-teal-200 transition hover:border-teal-400 hover:bg-gray-800 hover:text-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            <span>Try our JSON to TOON converter</span>
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M7.3335 5.66669H14.3335V12.6667M14.3335 5.66669L5.66683 14.3334"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
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


