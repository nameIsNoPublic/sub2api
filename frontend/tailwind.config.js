/** @type {import('tailwindcss').Config} */

/*
 * 52code 设计令牌（Signal Paper）
 * - gray：暖调纸面中性色，覆盖 Tailwind 默认 gray，全站 bg/border/text 随之统一
 * - primary：Signal Indigo，源自 dev-uiux 的靛蓝，向紫罗兰偏移形成自有识别
 * - ember：信号橙，介于 dev-uiux 珊瑚橙与 aa8 琥珀之间，仅用于点缀（光点、高亮、提示）
 * - dark：深色模式表面色，近黑并带极轻的靛蓝倾向
 * 规范详见 docs/ui/52code-design-system.md
 */
const ember = {
  50: '#fff6ed',
  100: '#ffead5',
  200: '#fed1aa',
  300: '#fdb174',
  400: '#fb8b3c',
  500: '#f2711c',
  600: '#d95a0e',
  700: '#b4440e',
  800: '#8f3713',
  900: '#742f13',
  950: '#3f1607'
}

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 主色调 - Signal Indigo
        primary: {
          50: '#f4f3ff',
          100: '#ebe9fe',
          200: '#d9d5fe',
          300: '#bbb3fc',
          400: '#9688f8',
          500: '#7262f1',
          600: '#5b47e6',
          700: '#4c37cc',
          800: '#3f2fa6',
          900: '#352a84',
          950: '#20184f'
        },
        // 信号色 - Ember（accent 作为别名保留，兼容 text-gradient 等旧用法）
        ember,
        accent: ember,
        // 暖调纸面中性色（覆盖默认 gray）
        gray: {
          50: '#f7f7f5',
          100: '#efefec',
          200: '#e4e4e0',
          300: '#d3d3ce',
          400: '#a5a6a9',
          500: '#76787e',
          600: '#55575e',
          700: '#3b3d44',
          800: '#26272c',
          900: '#17181c',
          950: '#0c0d10'
        },
        // 深色模式表面色
        dark: {
          50: '#f5f5f7',
          100: '#e8e8ec',
          200: '#cfd0d7',
          300: '#a9abb5',
          400: '#83858f',
          500: '#61636c',
          600: '#45474f',
          700: '#2e3037',
          800: '#1c1d23',
          900: '#131418',
          950: '#0a0a0d'
        },
        // 语义别名：纸面与墨色
        paper: '#f7f7f5',
        ink: '#0c0d10'
      },
      fontFamily: {
        sans: [
          '"Geist Variable"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: [
          '"Geist Mono Variable"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'PingFang SC',
          'Microsoft YaHei',
          'monospace'
        ]
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }]
      },
      letterSpacing: {
        tightest: '-0.045em',
        kicker: '0.14em'
      },
      boxShadow: {
        glass: '0 12px 40px -12px rgba(23, 24, 28, 0.12)',
        'glass-sm': '0 6px 20px -8px rgba(23, 24, 28, 0.1)',
        glow: '0 0 0 4px rgba(114, 98, 241, 0.14)',
        'glow-lg': '0 0 0 6px rgba(114, 98, 241, 0.18), 0 12px 32px -8px rgba(91, 71, 230, 0.35)',
        card: '0 1px 0 rgba(23, 24, 28, 0.03)',
        'card-hover': '0 14px 36px -14px rgba(23, 24, 28, 0.16)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        ember: '0 0 0 4px rgba(242, 113, 28, 0.16)',
        pop: '0 18px 48px -18px rgba(12, 13, 16, 0.28)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #7262f1 0%, #5b47e6 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1c1d23 0%, #0a0a0d 100%)',
        'gradient-glass':
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'mesh-gradient':
          'radial-gradient(at 12% 0%, rgba(114, 98, 241, 0.07) 0px, transparent 45%), radial-gradient(at 92% 8%, rgba(242, 113, 28, 0.05) 0px, transparent 40%)',
        'dot-grid': 'radial-gradient(rgba(23, 24, 28, 0.09) 1px, transparent 1px)',
        'dot-grid-dark': 'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)'
      },
      backgroundSize: {
        'dot-sm': '16px 16px',
        'dot-md': '24px 24px'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        'signal-ping': 'signalPing 2.2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'caret-blink': 'caretBlink 1.1s steps(1, end) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        glow: {
          '0%': { boxShadow: '0 0 0 3px rgba(114, 98, 241, 0.12)' },
          '100%': { boxShadow: '0 0 0 6px rgba(114, 98, 241, 0.22)' }
        },
        signalPing: {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '80%, 100%': { transform: 'scale(2.6)', opacity: '0' }
        },
        caretBlink: {
          '0%, 55%': { opacity: '1' },
          '56%, 100%': { opacity: '0' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  },
  plugins: []
}
