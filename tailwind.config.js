module.exports = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a"
        },
        ink: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 24px 60px -40px rgba(0, 0, 0, 0.15)",
        card: "0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px -8px rgba(0, 0, 0, 0.1)",
        "card-hover": "0 8px 30px -8px rgba(0, 0, 0, 0.12)"
      },
      keyframes: {
        "loader-bounce": {
          "0%, 80%, 100%": { transform: "scale(0.85)", opacity: 0.6 },
          "40%": { transform: "scale(1.15)", opacity: 1 }
        }
      },
      animation: {
        "loader-bounce": "loader-bounce 1.4s ease-in-out infinite both"
      }
    }
  },
  plugins: []
};
