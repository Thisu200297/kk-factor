/** @type {import('tailwindcss').Config} */

/**
 * Every colour resolves through a CSS custom property, so the same class name
 * renders correctly in light and dark mode. The variables live in index.css
 * under :root and .dark — this file only wires them into Tailwind.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    // Mobile-first breakpoints, per the brief.
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        /* --- Semantic tokens --------------------------------------------- */
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        line: token('line'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        'fg-muted': token('fg-muted'),
        'fg-subtle': token('fg-subtle'),
        /** Neutral used only with an alpha, for hover and pressed fills. */
        fill: token('fill'),
        primary: token('primary'),
        'primary-fg': token('primary-fg'),
        'primary-soft': token('primary-soft'),
        accent: token('accent'),
        live: token('live'),
        success: token('success'),
        danger: token('danger'),

        /* --- Legacy aliases ----------------------------------------------
         * The first build used Material-3 role names. They are mapped onto
         * the new tokens so existing markup keeps working and picks up
         * light-mode support for free.
         * ---------------------------------------------------------------- */
        background: token('bg'),
        'surface-dim': token('bg'),
        'surface-container-lowest': token('surface'),
        'surface-container-low': token('surface'),
        'surface-container': token('surface-2'),
        'surface-container-high': token('surface-2'),
        'surface-container-highest': token('surface-3'),
        'surface-variant': token('surface-3'),
        'surface-bright': token('surface-3'),
        'on-surface': token('fg'),
        'on-surface-variant': token('fg-muted'),
        outline: token('line-strong'),
        'outline-variant': token('line'),
        'primary-container': token('primary'),
        'on-primary': token('primary-fg'),
        'on-primary-container': token('primary-fg'),
        secondary: token('fg-muted'),
        'secondary-container': token('surface-3'),
        tertiary: token('accent'),
        'tertiary-container': token('accent'),
        error: token('danger'),
        'error-container': token('danger'),
        'on-error-container': token('primary-fg'),
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Inter', 'SF Pro Text',
          'Segoe UI', 'system-ui', 'sans-serif',
        ],
        display: [
          '-apple-system', 'BlinkMacSystemFont', 'Inter', 'SF Pro Display',
          'Segoe UI', 'system-ui', 'sans-serif',
        ],
      },
      fontSize: {
        // Tight optical tracking on large type, the way Apple sets headlines.
        display: ['clamp(2rem, 5vw, 3.25rem)', { lineHeight: '1.06', letterSpacing: '-0.035em', fontWeight: '700' }],
        'headline-lg': ['clamp(1.5rem, 3.2vw, 2.125rem)', { lineHeight: '1.12', letterSpacing: '-0.028em', fontWeight: '700' }],
        'headline-md': ['1.3125rem', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '650' }],
        'headline-sm': ['1.0625rem', { lineHeight: '1.35', letterSpacing: '-0.012em', fontWeight: '600' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.65', letterSpacing: '-0.005em' }],
        'label-md': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.07em', fontWeight: '600' }],
      },
      spacing: {
        gutter: '20px',
        'player-bar': '76px',
        'player-bar-mobile': '62px',
      },
      maxWidth: {
        container: '1360px',
        prose: '44rem',
      },
      // Tailwind's default scale jumps 10 → 15; the tints in this design sit
      // between, so the missing steps are added here.
      opacity: {
        12: '0.12',
        18: '0.18',
        22: '0.22',
      },
      borderRadius: {
        card: '16px',
        panel: '20px',
        sheet: '26px',
      },
      boxShadow: {
        // Soft, low-contrast elevation — no heavy drop shadows.
        soft: '0 1px 2px rgb(var(--shadow) / 0.06), 0 4px 16px rgb(var(--shadow) / 0.06)',
        lift: '0 2px 6px rgb(var(--shadow) / 0.08), 0 12px 32px rgb(var(--shadow) / 0.10)',
        pop: '0 8px 24px rgb(var(--shadow) / 0.14), 0 24px 64px rgb(var(--shadow) / 0.18)',
        glow: '0 6px 20px rgb(var(--primary) / 0.32)',
      },
      keyframes: {
        equalize: { '0%,100%': { height: '4px' }, '50%': { height: '16px' } },
        marquee: { from: { transform: 'translate3d(0,0,0)' }, to: { transform: 'translate3d(-50%,0,0)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'pulse-live': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
        shimmer: { from: { backgroundPosition: '-600px 0' }, to: { backgroundPosition: '600px 0' } },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'fade-up': 'fade-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-live': 'pulse-live 1.8s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
      transitionTimingFunction: {
        // Apple's standard ease-out curve.
        apple: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
