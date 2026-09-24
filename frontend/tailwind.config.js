/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmos: {
          black: '#2A2622',
          cream: '#FFFFFF',
          brown: '#2A2622',
          gold: '#93402A',
          surface: '#F2EFEA',
          yellow: '#F8E4DB',
        }
      },
      fontFamily: {
        'bradford': ['Newsreader', 'Georgia', 'Times New Roman', 'serif'],
        'mono': ['DM Sans', 'system-ui', 'sans-serif'],
        'segoe': ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '20fx': '0.44rem',
        '30fx': '0.67rem',
        '40fx': '1rem',
        '50fx': '1.5rem',
        '60fx': '2.25rem',
        '70fx': '3.38rem',
        '90fx': '5rem',
        '120fx': '7rem',
      },
      borderRadius: {
        '5fx': '5px',
        '8fx': '8px',
        'pill': '50px',
      },
      boxShadow: {
        'diffuse': '0 2px 24px rgba(42,38,34,0.12)',
        'soft': '0 3px 12px rgba(42,38,34,0.10)',
        'glow': '0 0 12px rgba(147,64,42,0.20)',
      }
    },
  },
  plugins: [],
}
