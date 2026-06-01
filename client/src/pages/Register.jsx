import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/ui";
import { APP_CONFIG } from "../config/appConfig";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  useEffect(() => {
    document.title = `Create account — ${APP_CONFIG.name}`;
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "name") {
      const trimmed = value.trim();

      if (!trimmed) {
        setNameError("");
      } else if (trimmed.length < 4) {
        setNameError("Name must be at least 4 characters");
      } else if (!/^[A-Za-z0-9_ ]+$/.test(trimmed)) {
        setNameError(
          "Only letters, numbers, spaces and underscores are allowed",
        );
      } else if (!/[A-Za-z]/.test(trimmed)) {
        setNameError("Name must contain at least one letter");
      } else {
        setNameError("");
      }
    }

    if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!value.trim()) {
        setEmailError("");
      } else if (!emailRegex.test(value.trim())) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
      }
    }
  };

  const pwStrength = (() => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6)
      return { label: "Too short", color: "bg-red-500", pct: 20 };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: "Weak", color: "bg-amber-500", pct: 40 };
    if (score <= 2) return { label: "Fair", color: "bg-yellow-500", pct: 60 };
    if (score <= 3) return { label: "Good", color: "bg-brand-500", pct: 80 };
    return { label: "Strong", color: "bg-emerald-500", pct: 100 };
  })();
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setNameError("");
    setEmailError("");

    const name = form.name.trim();

    if (name.length < 4) {
      setNameError("Name must be at least 4 characters");
      return;
    }

    if (!/^[A-Za-z0-9_ ]+$/.test(name)) {
      setNameError("Only letters, numbers, spaces and underscores are allowed");
      return;
    }

    if (!/[A-Za-z]/.test(name)) {
      setNameError("Name must contain at least one letter");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await register(form.name.trim(), form.email.trim(), form.password);

      navigate("/dashboard");
      // navigate("/verify-email-sent", {
      //   state: {
      //     email: form.email.trim(),
      //   },
      // });
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-500/30 mb-4">
            <svg
              className="w-7 h-7 text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl text-white mb-1">
            Create your account
          </h1>
          <p className="text-slate-400 font-body text-sm">
            Start mapping your knowledge with {APP_CONFIG.name}
          </p>
        </div>

        <div className="card p-8 space-y-5">
          <Alert type="error" message={error} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                name="name"
                type="text"
                className={`input ${nameError ? "border-red-500" : ""}`}
                placeholder="Jane Smith"
                value={form.name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-500">{nameError}</p>
              )}
            </div>
            <div>
              <label className="label">Email</label>
              <input
                name="email"
                type="email"
                className={`input ${emailError ? "border-red-500" : ""}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-500">{emailError}</p>
              )}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  className="input pr-10"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {pwStrength && (
                <div className="mt-2 space-y-1">
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${pwStrength.color}`}
                      style={{ width: `${pwStrength.pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {pwStrength.label}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !!nameError || !!emailError}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" /> Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 font-body">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-[13px] text-slate-600 mt-6 font-body">
          {APP_CONFIG.name} v{APP_CONFIG.version} — {APP_CONFIG.tagline}
        </p>
      </div>
    </div>
  );
};

export default Register;
