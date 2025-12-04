module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'gmgn-dark': '#0a0e13',
        'gmgn-card': '#161b22',
        'gmgn-card-dark': '#0d1117',
        'gmgn-border': '#30363d',
        'gmgn-green': '#00ff88',
        'gmgn-text': '#c9d1d9',
        'gmgn-text-muted': '#8b949e',
      },
      keyframes: {
        slideUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      animation: {
        slideUp: 'slideUp 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
