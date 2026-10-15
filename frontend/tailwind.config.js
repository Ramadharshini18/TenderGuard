/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0D3B2E",       // Deep executive green
          "primary-dark": "#08241C",// Deepest shade for sidebars/headers
          "primary-light": "#175A44",
          secondary: "#1E6B4A",     // Soft/medium forest green
          "secondary-light": "#2D8A61",
          accent: "#D8CAB6",        // Mild sandal / warm beige
          "accent-light": "#EFEAE1",// Very soft sandal highlight
          "accent-dark": "#B5A188",
          bg: "#FAF8F5",            // Off-white / light sandal background
          card: "#FFFFFF",
          border: "#E7E2D7",        // Sandal-tinted border
          charcoal: "#1F2937",      // Primary dark text
          muted: "#5E6C79",         // Secondary muted text
        },
        risk: {
          low: "#15803D",
          "low-bg": "#ECFDF5",
          med: "#B45309",
          "med-bg": "#FFFBEB",
          high: "#B91C1C",
          "high-bg": "#FEF2F2",
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(13, 59, 46, 0.05), 0 1px 2px 0 rgba(13, 59, 46, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(13, 59, 46, 0.08), 0 2px 4px -1px rgba(13, 59, 46, 0.04)',
      }
    },
  },
  plugins: [],
}
