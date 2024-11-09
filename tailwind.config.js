const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // DreamUI Colors
        'dream-blue': '#85B8FE',
        'dream-cyan': '#80FFD2',
        'dream-pink': '#FFCAE2',
        'dream-orange': '#F5A623',
        'dream-purple': '#7928CA',

        
        // Dark Theme Accents
        'dark-accent-1': '#111111',
        'dark-accent-2': '#333333',
        'dark-accent-3': '#444444',
        'dark-accent-5': '#888888',
        'gray-1100': 'rgb(10,10,11)',

        // Theme Colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Dark Tremor Colors (Now Default)
        tremor: {
          brand: {
            faint: "#0B1229",
            muted: "#172554",
            subtle: "#1e40af",
            DEFAULT: "#3b82f6",
            emphasis: "#60a5fa",
            inverted: "#030712",
          },
          background: {
            muted: "#131A2B",
            subtle: "#1f2937",
            DEFAULT: "#111827",
            emphasis: "#d1d5db",
          },
          border: {
            DEFAULT: "#1f2937",
          },
          ring: {
            DEFAULT: "#1f2937",
          },
          content: {
            subtle: "#4b5563",
            DEFAULT: "#6b7280",
            emphasis: "#e5e7eb",
            strong: "#f9fafb",
            inverted: "#000000",
          },
        },
        
        // Light Tremor Colors
        "light-tremor": {
          brand: {
            faint: "#eff6ff",
            muted: "#bfdbfe",
            subtle: "#60a5fa",
            DEFAULT: "#3b82f6",
            emphasis: "#1d4ed8",
            inverted: "#ffffff",
          },
          background: {
            muted: "#f9fafb",
            subtle: "#f3f4f6",
            DEFAULT: "#ffffff",
            emphasis: "#374151",
          },
          border: {
            DEFAULT: "#e5e7eb",
          },
          ring: {
            DEFAULT: "#e5e7eb",
          },
          content: {
            subtle: "#9ca3af",
            DEFAULT: "#6b7280",
            emphasis: "#374151",
            strong: "#111827",
            inverted: "#ffffff",
          },
        },
      },
      backgroundImage: {
        'dream-gradient': 'linear-gradient(to right, var(--gradient-start), var(--gradient-end))',
        'dream-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'dream-radial': 'radial-gradient(at center center, var(--tw-gradient-stops))',
        'dream-shine': 'linear-gradient(to right, transparent, rgba(255,255,255,0.1) 50%, transparent)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "tremor-small": "0.375rem",
        "tremor-default": "0.5rem",
        "tremor-full": "9999px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        // DreamUI Animations
        "dream-fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "dream-fade-up": {
          "0%": {
            opacity: 0,
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: 1,
            transform: "translateY(0)",
          },
        },
        "dream-scale": {
          "0%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        "dream-shine": {
          "0%": { backgroundPosition: "-200%" },
          "100%": { backgroundPosition: "200%" },
        },
        "dream-pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
        "dream-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // DreamUI Animations
        "dream-fade-in": "dream-fade-in 0.5s ease-out",
        "dream-fade-up": "dream-fade-up 0.5s ease-out",
        "dream-scale": "dream-scale 0.3s ease-out",
        "dream-shine": "dream-shine 8s ease-in-out infinite",
        "dream-pulse": "dream-pulse 2s ease-in-out infinite",
        "dream-spin": "dream-spin 1s linear infinite",
      },
      boxShadow: {
        // DreamUI Shadows (Dark Mode Optimized)
        'dream-sm': '0 2px 8px 0 rgba(0, 0, 0, 0.8)',
        'dream-md': '0 4px 12px 0 rgba(0, 0, 0, 0.8)',
        'dream-lg': '0 8px 24px 0 rgba(0, 0, 0, 0.8)',
        'dream-xl': '0 12px 32px 0 rgba(0, 0, 0, 0.8)',
        'dream-2xl': '0 16px 48px 0 rgba(0, 0, 0, 0.8)',
        'dream-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.8)',
        'dream-glow': '0 0 16px rgba(0, 0, 0, 0.8)',
      },
      fontSize: {
        "tremor-label": ["0.75rem"],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      fontFamily: {
        default: ["var(--font-inter)", ...fontFamily.sans],
        cal: ["var(--font-cal)", ...fontFamily.sans],
        title: ["var(--font-title)", ...fontFamily.sans],
        mono: ["Consolas", ...fontFamily.mono],
      },
      blur: {
        'dream': '20px',
      },
      backdropBlur: {
        'dream': '20px',
      },
    },
  },
  // Safelist for dynamic classes
  safelist: [
    // Colors
    {
      pattern: /^(bg|text|border|ring)-(dream|dark-accent)-\w+$/,
      variants: ['hover', 'focus', 'active', 'group-hover'],
    },
    // Animations
    {
      pattern: /^animate-dream-\w+$/,
    },
    // Shadows
    {
      pattern: /^shadow-dream-\w+$/,
    },
    // Original safelist patterns
    {
      pattern: /^(bg|text|border|ring|stroke|fill)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)$/,
      variants: ["hover", "ui-selected"],
    },
  ],
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};