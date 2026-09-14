/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        cosmos: {
          black: '#000000',
          cream: '#FEF9ED',
          brown: '#5D524B',
          gold: '#A67C52',
          surface: '#F7ECD9',
          yellow: '#F6E5B8',
        },
      },
      fontFamily: {
        bradford: ['Bradford LL', 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', 'serif'],
        mono: ['Red Hat Mono', 'ui-monospace', 'monospace'],
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
        diffuse: '0 2px 24px rgba(93,82,75,0.12)',
        soft: '0 3px 12px rgba(0,0,0,0.10)',
        glow: '0 0 12px rgba(166,124,82,0.20)',
      },
    },
  },
  plugins: [],
}
