/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pear: '#BCFF00',
        black: '#061414',
        laurel: '#96998C',
        celeste: '#D2D3CE',
        white: '#E9EBE6',
        cream: '#D2D3CE',
        teal: '#061414',
        gold: '#BCFF00',
        card: '#E9EBE6',
        ink: '#061414',
        muted: '#96998C',
        line: 'rgba(6, 20, 20, 0.14)',
        field: '#F1F3EF',
        tint: 'rgba(188,255,0,0.12)'
      },
      boxShadow: {
        card: '0 18px 40px rgba(6, 20, 20, 0.08)',
        float: '0 10px 24px rgba(6, 20, 20, 0.06)'
      },
      borderRadius: {
        panel: '28px'
      },
      fontFamily: {
        sans: ['Inter', '"Avenir Next"', 'Avenir', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(circle at 12% 18%, rgba(188,255,0,0.18), transparent 28%), radial-gradient(circle at 85% 15%, rgba(233,235,230,0.10), transparent 24%), linear-gradient(145deg, #061414, rgba(6,20,20,0.94))'
      }
    }
  },
  plugins: []
};
