import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-bright': '#31394d',
        'surface-container': '#171f33',
        'tertiary-fixed': '#c9e6ff',
        'tertiary-container': '#009ada',
        'on-primary-fixed-variant': '#2f2ebe',
        secondary: '#ddb7ff',
        'secondary-fixed': '#f0dbff',
        'on-tertiary-container': '#002d43',
        'primary-fixed': '#e1e0ff',
        'primary-fixed-dim': '#c0c1ff',
        'on-tertiary': '#00344d',
        'on-secondary-fixed-variant': '#6900b3',
        'surface-variant': '#2d3449',
        'on-tertiary-fixed': '#001e2f',
        'on-tertiary-fixed-variant': '#004c6e',
        'on-error-container': '#ffdad6',
        'surface-tint': '#c0c1ff',
        'error-container': '#93000a',
        'inverse-primary': '#494bd6',
        'surface-container-low': '#131b2e',
        primary: '#c0c1ff',
        'on-background': '#dae2fd',
        'on-surface': '#dae2fd',
        'tertiary-fixed-dim': '#89ceff',
        'surface-container-high': '#222a3d',
        surface: '#0b1326',
        'on-surface-variant': '#c7c4d7',
        outline: '#908fa0',
        'on-primary-fixed': '#07006c',
        'on-secondary-fixed': '#2c0051',
        'secondary-container': '#6f00be',
        'outline-variant': '#464554',
        tertiary: '#89ceff',
        'inverse-surface': '#dae2fd',
        'primary-container': '#8083ff',
        error: '#ffb4ab',
        'on-secondary-container': '#d6a9ff',
        'inverse-on-surface': '#283044',
        'on-error': '#690005',
        'secondary-fixed-dim': '#ddb7ff',
        background: '#0b1326',
        'on-primary-container': '#0d0096',
        'surface-dim': '#0b1326',
        'on-primary': '#1000a9',
        'surface-container-highest': '#2d3449',
        'on-secondary': '#490080',
        'surface-container-lowest': '#060e20'
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      },
      spacing: {
        'container-max': '1280px',
        xs: '0.5rem',
        gutter: '24px',
        md: '1.5rem',
        sm: '1rem',
        lg: '2rem',
        xl: '3rem',
        base: '4px'
      },
      fontFamily: {
        display: ['Inter'],
        'body-md': ['Inter'],
        'body-lg': ['Inter'],
        h1: ['Inter'],
        h2: ['Inter'],
        'label-sm': ['Inter']
      },
      fontSize: {
        display: ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        h1: ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        h2: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'label-sm': ['13px', { lineHeight: '1', letterSpacing: '0.02em', fontWeight: '500' }]
      }
    }
  },
  plugins: []
};

export default config;
