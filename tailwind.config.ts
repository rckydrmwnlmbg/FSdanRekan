import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    screens: {
      xs: '360px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--color-bg)',
          darker: 'var(--color-bg-darker)',
          well: 'var(--bg-photo-well)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-2)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        gold: {
          DEFAULT: 'var(--color-gold)',
          strong: 'var(--color-gold-strong)',
          dark: 'var(--color-gold-dark)',
          seal: 'var(--seal-gold)',
          on: 'var(--color-on-gold)',
        },
        navy: {
          DEFAULT: 'var(--color-navy)',
        },
        whatsapp: 'var(--color-whatsapp)',
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
      },
      fontFamily: {
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
      },
      maxWidth: {
        container: 'var(--container-max)',
        prose: 'var(--measure-body)',
      },
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        expo: 'var(--ease-out-expo)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        normal: 'var(--dur-normal)',
        slow: 'var(--dur-slow)',
      },
    },
  },
  plugins: [],
}

export default config
