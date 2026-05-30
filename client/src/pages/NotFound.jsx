import { useEffect } from "react";
import { Link } from "react-router-dom";
import { APP_CONFIG } from "../config/appConfig";

const NotFound = () => {
  useEffect(() => { document.title = `404 — ${APP_CONFIG.name}`; }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-slide-up">
        <div className="text-8xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-violet-500 mb-4 select-none">
          404
        </div>
        <h1 className="font-display font-bold text-xl text-white mb-2">Page not found</h1>
        <p className="text-slate-400 text-sm mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/dashboard"
            className="px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/20">
            Go to Dashboard
          </Link>
          <Link to="/login"
            className="px-5 py-2.5 rounded-xl border border-surface-border text-sm text-slate-400 hover:text-white hover:bg-surface-hover transition-all font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
