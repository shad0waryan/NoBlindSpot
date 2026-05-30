/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Outfit'", "sans-serif"],
        serif: ["'Instrument Serif'", "Georgia", "serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        brand: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          card:    "var(--color-surface-card)",
          border:  "var(--color-surface-border)",
          hover:   "var(--color-surface-hover)",
        },
      },
      animation: {
        "fade-in":      "fadeIn 0.5s ease forwards",
        "slide-up":     "slideUp 0.5s cubic-bezier(.21,1.02,.73,1) forwards",
        "slide-down":   "slideDown 0.4s cubic-bezier(.21,1.02,.73,1) forwards",
        "pulse-slow":   "pulse 3s infinite",
        "toast-in":     "toastIn 0.35s cubic-bezier(.21,1.02,.73,1) forwards",
        "view-in":      "viewIn 0.3s cubic-bezier(.21,1.02,.73,1) forwards",
        "scale-in":     "scaleIn 0.4s cubic-bezier(.21,1.02,.73,1) forwards",
        "glow":         "glow 3s ease-in-out infinite alternate",
        "shimmer":      "shimmer 2s linear infinite",
        "float":        "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: "translateY(20px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        slideDown: { from: { opacity: 0, transform: "translateY(-12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        toastIn:   { from: { opacity: 0, transform: "translateX(24px) scale(0.95)" }, to: { opacity: 1, transform: "translateX(0) scale(1)" } },
        viewIn:    { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        scaleIn:   { from: { opacity: 0, transform: "scale(0.95)" }, to: { opacity: 1, transform: "scale(1)" } },
        glow:      { from: { boxShadow: "0 0 20px rgba(14,165,233,0.1)" }, to: { boxShadow: "0 0 40px rgba(14,165,233,0.2)" } },
        shimmer:   { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
        float:     { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
