import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { authAPI, donateAPI } from "../services/api";
import { APP_CONFIG } from "../config/appConfig";

const ROLES = [
  { id: "student",       label: "Student",              icon: "🎓" },
  { id: "researcher",    label: "Researcher",           icon: "🔬" },
  { id: "professional",  label: "Working Professional", icon: "💼" },
];

const VIEW_OPTIONS = [
  { id: "list",  label: "List",  icon: "☰" },
  { id: "tree",  label: "Tree",  icon: "🌳" },
  { id: "graph", label: "Graph", icon: "◉" },
];

const SECTIONS = [
  { id: "profile",     label: "Profile",     icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "preferences", label: "Preferences", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
  { id: "security",    label: "Security",    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { id: "support",     label: "Support Us",  icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
];

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [activeSection, setActiveSection] = useState("profile");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState(user?.role || "");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [prefs, setPrefs] = useState(user?.preferences || { theme: "dark", defaultView: "list", autoSave: true, showDescriptions: true, compactMode: false });
  const [prefsSaving, setPrefsSaving] = useState(false);

  const [tiers, setTiers] = useState([]);
  const [currency, setCurrency] = useState("inr");
  const [customDonation, setCustomDonation] = useState("");
  const [donateLoading, setDonateLoading] = useState(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = APP_CONFIG.siteUrl || window.location.origin;
  const shareText = `${APP_CONFIG.name} – ${APP_CONFIG.tagline}. An AI-powered tool that maps out everything you need to learn for any topic.`;

  useEffect(() => { document.title = `Settings — ${APP_CONFIG.name}`; }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || ""); setEmail(user.email || ""); setRole(user.role || "");
      setPrefs(user.preferences || { theme: "dark", defaultView: "list", autoSave: true, showDescriptions: true, compactMode: false });
    }
  }, [user]);

  useEffect(() => {
    donateAPI.getTiers().then(({ data }) => { setTiers(data.tiers); if (data.currency) setCurrency(data.currency); }).catch(() => {});
  }, []);

  useEffect(() => {
    const d = searchParams.get("donation");
    if (d === "success") toast("Thank you for your support! 💙", { type: "success", duration: 5000 });
    else if (d === "cancelled") toast("Donation cancelled", { type: "info" });
    const section = searchParams.get("section");
    if (section && SECTIONS.find((s) => s.id === section)) setActiveSection(section);
  }, [searchParams]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      if (name !== user.name) payload.name = name;
      if (email !== user.email) payload.email = email;
      if (role !== (user.role || "")) payload.role = role;
      if (!Object.keys(payload).length) { toast("No changes", { type: "info" }); setSaving(false); return; }
      const { data } = await authAPI.updateProfile(payload);
      updateUser(data.user);
      toast("Profile updated!", { type: "success" });
    } catch (err) {
      toast(err.response?.data?.message || "Failed to update", { type: "error" });
    } finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast("File too large (max 2 MB)", { type: "error" }); return; }
    setAvatarUploading(true);
    try {
      const { data } = await authAPI.uploadAvatar(file);
      updateUser(data.user);
      toast("Avatar updated!", { type: "success" });
    } catch (err) {
      toast(err.response?.data?.message || "Upload failed", { type: "error" });
    } finally { setAvatarUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleAvatarDelete = async () => {
    try {
      const { data } = await authAPI.deleteAvatar();
      updateUser(data.user);
      toast("Avatar removed", { type: "success" });
    } catch { toast("Failed to remove avatar", { type: "error" }); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast("Passwords don't match", { type: "error" }); return; }
    setSaving(true);
    try {
      await authAPI.updateProfile({ currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast("Password changed!", { type: "success" });
    } catch (err) {
      toast(err.response?.data?.message || "Failed to change password", { type: "error" });
    } finally { setSaving(false); }
  };

  const handlePrefChange = async (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setPrefsSaving(true);
    try {
      const { data } = await authAPI.updateProfile({ preferences: { [key]: value } });
      updateUser(data.user);
    } catch { toast("Failed to save preference", { type: "error" }); }
    finally { setPrefsSaving(false); }
  };

  const handleDonate = async (tierId) => {
    setDonateLoading(tierId);
    try {
      const { data } = await donateAPI.checkout({ tierId });
      if (data.url) window.location.href = data.url;
      else toast(data.message || "Payment not available", { type: "info" });
    } catch (err) {
      toast(err.response?.data?.message || "Donation failed", { type: err.response?.data?.configured === false ? "info" : "error" });
    } finally { setDonateLoading(null); }
  };

  const handleCustomDonate = async () => {
    const paise = Math.round(parseFloat(customDonation) * 100);
    if (!paise || paise < 100) { toast("Minimum ₹1", { type: "error" }); return; }
    setDonateLoading("custom");
    try {
      const { data } = await donateAPI.checkout({ customAmount: paise });
      if (data.url) window.location.href = data.url;
      else toast(data.message || "Payment not available", { type: "info" });
    } catch (err) {
      toast(err.response?.data?.message || "Donation failed", { type: err.response?.data?.configured === false ? "info" : "error" });
    } finally { setDonateLoading(null); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: APP_CONFIG.name, text: shareText, url: shareUrl }); toast("Thanks for sharing!", { type: "success" }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    setShareOpen(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); toast("Link copied!", { type: "success", duration: 1500 }); setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast("Failed to copy", { type: "error" }));
  };

  const inputCls = "w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all";
  const labelCls = "text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-1.5 block";
  const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const currencySymbol = currency === "inr" ? "₹" : "$";

  const Toggle = ({ on, onToggle, label, desc }) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-surface-border">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <button onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 ${on ? "bg-brand-500" : "bg-slate-700"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${on ? "left-[calc(100%-22px)]" : "left-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-slide-up">
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        <span className="text-slate-600">/</span>
        <span className="text-white font-medium">Settings</span>
      </nav>

      <h1 className="text-xl sm:text-2xl font-display font-bold text-white mb-6">Settings</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar */}
        <div className="sm:w-48 shrink-0">
          <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
            {SECTIONS.map((s) => (
              <button key={s.id} data-section={s.id} onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeSection === s.id
                    ? "bg-brand-500/10 text-white border border-brand-500/30"
                    : "text-slate-400 hover:text-white hover:bg-surface-hover border border-transparent"
                }`}>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  {s.id === "preferences" && <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />}
                </svg>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ═══════════ PROFILE ═══════════ */}
          {activeSection === "profile" && (
            <form onSubmit={handleProfileSave} className="card p-5 sm:p-6 space-y-5 animate-view-in">
              {/* Avatar section */}
              <div className="flex items-center gap-5 pb-5 border-b border-surface-border">
                <div className="relative group">
                  <div className={`w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg ${!user?.avatar ? "bg-gradient-to-br from-brand-500 to-violet-600" : ""}`}>
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-display font-bold text-white">{initials}</span>
                    )}
                  </div>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div>
                  <h2 className="text-white font-display font-semibold">Profile Photo</h2>
                  <p className="text-xs text-slate-500 mt-0.5">JPG, PNG, GIF or WebP. Max 2 MB.</p>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                      className="text-xs px-3 py-1 rounded-lg border border-brand-500/30 text-brand-400 hover:bg-brand-500/10 transition-all font-medium disabled:opacity-50">
                      {avatarUploading ? "Uploading..." : "Upload"}
                    </button>
                    {user?.avatar && (
                      <button type="button" onClick={handleAvatarDelete}
                        className="text-xs px-3 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-medium">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
                </div>
              </div>

              <div>
                <label className={labelCls}>I am a...</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <button key={r.id} type="button" onClick={() => setRole(r.id)}
                      className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                        role === r.id ? "border-brand-500 bg-brand-500/10 shadow-sm shadow-brand-500/10" : "border-surface-border hover:border-slate-600"
                      }`}>
                      <span className="text-xl block mb-1">{r.icon}</span>
                      <span className={`text-xs font-medium ${role === r.id ? "text-white" : "text-slate-400"}`}>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-400 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* ═══════════ PREFERENCES ═══════════ */}
          {activeSection === "preferences" && (
            <div className="space-y-4 animate-view-in">
              <div className="card p-5 sm:p-6 space-y-4">
                <div className="pb-3 border-b border-surface-border flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-display font-semibold">Preferences</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Customize your experience</p>
                  </div>
                  {prefsSaving && <span className="text-[10px] text-brand-400 animate-pulse">Saving...</span>}
                </div>

                {/* Theme */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-surface-border">
                  <div>
                    <p className="text-sm text-white font-medium">Appearance</p>
                    <p className="text-xs text-slate-500 mt-0.5">Switch between dark and light mode</p>
                  </div>
                  <button onClick={() => { toggleTheme(); handlePrefChange("theme", theme === "dark" ? "light" : "dark"); }}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${theme === "dark" ? "bg-brand-500" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center text-[11px] ${
                      theme === "dark" ? "left-0.5" : "left-[calc(100%-26px)]"
                    }`}>
                      {theme === "dark" ? "🌙" : "☀️"}
                    </span>
                  </button>
                </div>

                {/* Default View */}
                <div className="p-4 rounded-xl border border-surface-border">
                  <p className="text-sm text-white font-medium mb-1">Default Map View</p>
                  <p className="text-xs text-slate-500 mb-3">Choose which view opens by default</p>
                  <div className="flex gap-2">
                    {VIEW_OPTIONS.map((v) => (
                      <button key={v.id} onClick={() => handlePrefChange("defaultView", v.id)}
                        className={`flex-1 p-2.5 rounded-lg border text-center transition-all duration-200 ${
                          prefs.defaultView === v.id ? "border-brand-500 bg-brand-500/10 text-white" : "border-surface-border text-slate-400 hover:border-slate-600"
                        }`}>
                        <span className="block text-base mb-0.5">{v.icon}</span>
                        <span className="text-[11px] font-medium">{v.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Toggle on={prefs.autoSave} onToggle={() => handlePrefChange("autoSave", !prefs.autoSave)}
                  label="Auto-save Progress" desc="Automatically save when you change a node's status" />

                <Toggle on={prefs.showDescriptions} onToggle={() => handlePrefChange("showDescriptions", !prefs.showDescriptions)}
                  label="Show Descriptions" desc="Display concept descriptions in list and tree views" />

                <Toggle on={prefs.compactMode} onToggle={() => handlePrefChange("compactMode", !prefs.compactMode)}
                  label="Compact Mode" desc="Reduce spacing for denser information display" />
              </div>

              {/* Shortcuts & About */}
              <div className="card p-5 space-y-4">
                <div className="p-4 rounded-xl border border-surface-border">
                  <p className="text-sm text-white font-medium mb-2">Keyboard Shortcuts</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[["1 / 2 / 3", "Switch views"], ["Esc", "Close panel / Go back"], ["Enter", "Submit forms"]].map(([key, desc]) => (
                      <div key={key} className="flex items-center gap-2">
                        <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px]">{key}</kbd>
                        <span className="text-slate-500">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-surface-border">
                  <p className="text-sm text-white font-medium mb-1">About</p>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>{APP_CONFIG.name} v{APP_CONFIG.version}</p>
                    <p>{APP_CONFIG.tagline}</p>
                    <a href={APP_CONFIG.github} target="_blank" rel="noopener noreferrer"
                      className="text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1 mt-1">
                      View on GitHub
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </div>
                </div>

                {/* Data management */}
                <div className="p-4 rounded-xl border border-surface-border">
                  <p className="text-sm text-white font-medium mb-1">Data</p>
                  <p className="text-xs text-slate-500 mb-3">Export or clear your local cached data</p>
                  <div className="flex gap-2">
                    <button onClick={() => { localStorage.removeItem("nbs_theme"); localStorage.removeItem("nbs_recent_topics"); toast("Cache cleared — refresh to see defaults", { type: "success" }); }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-all font-medium">
                      Clear Local Cache
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ SECURITY ═══════════ */}
          {activeSection === "security" && (
            <form onSubmit={handlePasswordChange} className="card p-5 sm:p-6 space-y-5 animate-view-in">
              <div className="pb-4 border-b border-surface-border">
                <h2 className="text-white font-display font-semibold">Security</h2>
                <p className="text-xs text-slate-500 mt-0.5">Change your password</p>
              </div>
              <div className="space-y-4 max-w-sm">
                <div><label className={labelCls}>Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} required placeholder="Enter current password" /></div>
                <div><label className={labelCls}>New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} required minLength={6} placeholder="Min 6 characters" /></div>
                <div><label className={labelCls}>Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} required minLength={6} placeholder="Repeat new password" /></div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving || !currentPassword || !newPassword}
                  className="px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-400 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20">
                  {saving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          )}

          {/* ═══════════ SUPPORT / DONATE ═══════════ */}
          {activeSection === "support" && (
            <div className="space-y-4 animate-view-in">
              <div className="card p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-violet-500/5 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-surface-border">
                    <span className="text-3xl">💙</span>
                    <div>
                      <h2 className="text-white font-display font-semibold">Support {APP_CONFIG.name}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Help us keep building and improving this tool</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                    {APP_CONFIG.name} is free and open to all. If it's been helpful to you, consider supporting
                    the development. Every contribution goes directly towards server costs, AI API usage, and new features.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {tiers.map((tier) => (
                      <button key={tier.id} onClick={() => handleDonate(tier.id)} disabled={donateLoading === tier.id}
                        className="p-4 rounded-xl border border-surface-border hover:border-brand-500/40 hover:bg-brand-500/5 transition-all duration-200 text-center group disabled:opacity-50">
                        <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">{tier.emoji}</span>
                        <p className="text-white text-sm font-medium">{currencySymbol}{(tier.amount / 100).toFixed(0)}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{tier.label}</p>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">{currencySymbol}</span>
                      <input type="number" min="1" step="1" value={customDonation} onChange={(e) => setCustomDonation(e.target.value)}
                        placeholder="Custom amount" className={`${inputCls} pl-7`} />
                    </div>
                    <button onClick={handleCustomDonate} disabled={donateLoading === "custom" || !customDonation}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold hover:from-brand-400 hover:to-violet-500 disabled:opacity-40 transition-all shadow-lg shadow-brand-500/20 whitespace-nowrap">
                      {donateLoading === "custom" ? "Processing..." : "Donate"}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-3 text-center">Secure payments powered by Stripe. You will be redirected to a secure checkout page.</p>
                </div>
              </div>

              {/* Other ways to support */}
              <div className="card p-5 space-y-3">
                <h3 className="text-white text-sm font-display font-semibold">Other ways to support</h3>

                <a href={APP_CONFIG.github} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-surface-border hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-200 group">
                  <span className="text-xl group-hover:scale-110 transition-transform">⭐</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">Star on GitHub</p>
                    <p className="text-[11px] text-slate-500 truncate">{APP_CONFIG.github.replace("https://", "")}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>

                <button onClick={handleShare}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-surface-border hover:border-brand-500/30 hover:bg-brand-500/5 transition-all duration-200 group text-left">
                  <span className="text-xl group-hover:scale-110 transition-transform">📣</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">Share with friends</p>
                    <p className="text-[11px] text-slate-500">Spread the word via link, Twitter, or LinkedIn</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>

                <a href={APP_CONFIG.issuesUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-surface-border hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-200 group">
                  <span className="text-xl group-hover:scale-110 transition-transform">🐛</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">Report bugs & suggest features</p>
                    <p className="text-[11px] text-slate-500">Open an issue on GitHub</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>

              {/* Share Modal */}
              {shareOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShareOpen(false)}>
                  <div className="card p-5 sm:p-6 w-full max-w-sm space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-display font-semibold">Share {APP_CONFIG.name}</h3>
                      <button onClick={() => setShareOpen(false)} className="text-slate-500 hover:text-white transition-colors text-sm">✕</button>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" readOnly value={shareUrl} className={`${inputCls} text-xs font-mono`} />
                      <button onClick={handleCopyLink}
                        className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-400 transition-all shrink-0">
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-surface-border hover:border-sky-500/30 hover:bg-sky-500/5 transition-all">
                        <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        <span className="text-[10px] text-slate-500">Twitter / X</span>
                      </a>
                      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-surface-border hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
                        <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        <span className="text-[10px] text-slate-500">LinkedIn</span>
                      </a>
                      <a href={`mailto:?subject=${encodeURIComponent(`Check out ${APP_CONFIG.name}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-surface-border hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span className="text-[10px] text-slate-500">Email</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
