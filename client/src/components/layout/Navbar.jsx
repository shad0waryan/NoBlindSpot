import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { APP_CONFIG } from "../../config/appConfig";

const ROLE_LABELS = { student: "Student", researcher: "Researcher", professional: "Professional" };

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleLogout = () => { logout(); navigate("/login"); };

  const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <nav className="border-b border-surface-border bg-surface/60 backdrop-blur-2xl sticky top-0 z-50">
      <div className="max-w-screen mx-auto px-4 sm:px-8 lg:px-20 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-violet-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-[1.5px] rounded-[10px] bg-[#080d18] flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-400 group-hover:text-brand-300 transition-colors duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="2.5" />
                <circle cx="6" cy="18" r="2" />
                <circle cx="18" cy="17" r="2" />
                <path d="M10.5 10l-3 6M13.5 10l3 5.5" />
              </svg>
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-brand-500/20 to-violet-500/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          <div className="flex items-baseline gap-0">
            <span className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500 text-[15px] tracking-tight">
              n
            </span>
            <span className="font-display font-bold text-white/90 text-[15px] tracking-tight group-hover:text-white transition-colors duration-200">
              B
            </span>
            <span className="font-display font-medium text-slate-500 text-[15px] tracking-tight group-hover:text-slate-400 transition-colors duration-200">
              S
            </span>
          </div>
        </Link>

        {/* Right side */}
        {user && (
          <div className="flex items-center gap-1.5">
            <button onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-hover transition-all duration-200"
              title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? (
                <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)}
                className={`w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center
                           ring-2 ring-transparent hover:ring-brand-500/40 transition-all duration-200
                           ${menuOpen ? "ring-brand-500/50" : ""}
                           ${!user.avatar ? "bg-gradient-to-br from-brand-500 to-violet-600 text-[11px] font-display font-bold text-white" : ""}`}
                title={user.name}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-xl border border-surface-border bg-surface-card shadow-2xl shadow-black/30 animate-scale-in origin-top-right overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-surface-border">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${!user.avatar ? "bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-display font-bold text-white" : ""}`}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate capitalize">{user.name}</p>
                        <p className="text-slate-500 text-[11px] truncate">
                          {user.role ? ROLE_LABELS[user.role] : user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <button onClick={() => { navigate("/dashboard"); setMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-surface-hover hover:text-white transition-colors">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Dashboard
                    </button>
                    <button onClick={() => { navigate("/settings"); setMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-surface-hover hover:text-white transition-colors">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                    <button onClick={() => { navigate("/settings?section=support"); setMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-surface-hover hover:text-white transition-colors">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Support Us
                    </button>
                    <div className="border-t border-surface-border my-1" />
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/5 transition-colors font-body">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
