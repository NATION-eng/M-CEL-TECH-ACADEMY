import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Plus Jakarta Sans','sans-serif'],
        body: ['Inter','sans-serif'],
        mono: ['JetBrains Mono','monospace'],
      },
      colors: {
        brand: { 50:'#eef2ff',100:'#e0e7ff',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4F46E5',700:'#4338ca',900:'#1e1b4b' },
        accent: { 400:'#fbbf24',500:'#F59E0B',600:'#d97706' },
        ink: { 900:'#060C1A',800:'#0F1A2E',700:'#142035',600:'#1A2744',500:'#243356' },
      },
      opacity: {
        '12': '0.12',
        '15': '0.15',
        '60': '0.60',
        '70': '0.70',
      },
      animation: {
        'fade-up':'fadeUp 0.6s ease-out forwards',
        'fade-in':'fadeIn 0.4s ease-out forwards',
        'float':'float 5s ease-in-out infinite',
        'glow-pulse':'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { '0%':{ opacity:'0',transform:'translateY(24px)' },'100%':{ opacity:'1',transform:'translateY(0)' } },
        fadeIn: { '0%':{ opacity:'0' },'100%':{ opacity:'1' } },
        float: { '0%,100%':{ transform:'translateY(0)' },'50%':{ transform:'translateY(-10px)' } },
        glowPulse: { '0%,100%':{ boxShadow:'0 0 20px rgba(79,70,229,0.3)' },'50%':{ boxShadow:'0 0 40px rgba(79,70,229,0.6)' } },
      },
    },
  },
  plugins: [],
}
export default config
