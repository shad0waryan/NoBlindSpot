import { useState } from "react";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { APP_CONFIG } from "../config/appConfig";

const ROLES = [
  { id: "student",       label: "Student",              icon: "🎓", desc: "Learning for classes or self-study" },
  { id: "researcher",    label: "Researcher",           icon: "🔬", desc: "Exploring deep academic topics" },
  { id: "professional",  label: "Working Professional", icon: "💼", desc: "Upskilling for career growth" },
];

const STEPS = [
  {
    title: `Welcome to ${APP_CONFIG.name}!`,
    subtitle: "Let's get you set up in under a minute",
  },
  {
    title: "What describes you best?",
    subtitle: "This helps us personalize your learning experience",
  },
  {
    title: "You're all set!",
    subtitle: "Here's a quick overview of what you can do",
  },
];

const FEATURES = [
  { icon: "⚡", title: "Generate Maps", desc: "Enter any topic and AI creates a knowledge map" },
  { icon: "🧠", title: "Track Progress", desc: "Mark concepts as known, partial, or unknown" },
  { icon: "📝", title: "Quiz Yourself", desc: "AI generates quizzes on your weak areas" },
  { icon: "🗺️", title: "Learning Paths", desc: "Get AI-suggested study orders" },
];

const OnboardingModal = () => {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState(user?.role || "");
  const [saving, setSaving] = useState(false);

  if (user?.onboarded) return null;

  const handleFinish = async () => {
    setSaving(true);
    try {
      const { data } = await authAPI.onboard({ role: selectedRole });
      updateUser(data.user);
    } catch {
      updateUser({ ...user, onboarded: true, role: selectedRole });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg card p-0 overflow-hidden animate-scale-in">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6 pb-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-brand-500" : i < step ? "w-4 bg-brand-500/40" : "w-4 bg-slate-700"}`} />
          ))}
        </div>

        <div className="px-6 sm:px-8 py-6 text-center">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="animate-view-in space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-bold text-white">{STEPS[0].title}</h2>
                <p className="text-slate-400 text-sm mt-2">{STEPS[0].subtitle}</p>
              </div>
              <div className="text-left space-y-3 pt-2">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-surface-border bg-surface-hover/30">
                    <span className="text-xl mt-0.5">{f.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{f.title}</p>
                      <p className="text-slate-500 text-xs">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="animate-view-in space-y-5">
              <div>
                <h2 className="text-xl font-display font-bold text-white">{STEPS[1].title}</h2>
                <p className="text-slate-400 text-sm mt-1">{STEPS[1].subtitle}</p>
              </div>
              <div className="space-y-3 text-left">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                      selectedRole === r.id
                        ? "border-brand-500 bg-brand-500/10 shadow-sm shadow-brand-500/10"
                        : "border-surface-border hover:border-slate-600 bg-surface-hover/20"
                    }`}
                  >
                    <span className="text-2xl">{r.icon}</span>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${selectedRole === r.id ? "text-white" : "text-slate-300"}`}>{r.label}</p>
                      <p className="text-xs text-slate-500">{r.desc}</p>
                    </div>
                    {selectedRole === r.id && (
                      <svg className="w-5 h-5 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <div className="animate-view-in space-y-5">
              <div className="text-5xl animate-float">🚀</div>
              <div>
                <h2 className="text-xl font-display font-bold text-white">{STEPS[2].title}</h2>
                <p className="text-slate-400 text-sm mt-1">{STEPS[2].subtitle}</p>
              </div>
              <div className="py-4 space-y-2 text-left">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-brand-400">1.</span> Type any topic in the search bar on your Dashboard
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-brand-400">2.</span> AI generates a knowledge map of all sub-concepts
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-brand-400">3.</span> Mark each concept — the app tracks your blind spots
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-brand-400">4.</span> Use Quiz, Path & Notes to deepen your mastery
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 sm:px-8 pb-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 rounded-xl border border-surface-border text-sm text-slate-400 hover:text-white hover:bg-surface-hover transition-all font-medium"
            >
              Back
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !selectedRole}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-500/20"
            >
              {step === 0 ? "Get Started" : "Continue"}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold hover:from-brand-400 hover:to-violet-500 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20"
            >
              {saving ? "Starting..." : "Start Exploring"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
