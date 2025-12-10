/**
 * Design System Theme
 * Based on Adobe React Spectrum S2 design tokens
 * Matches project-elmo-ui visual style
 */

export const COLORS = {
  // Primary colors
  primary: '#1473E6',      // Adobe blue
  secondary: '#D7373F',    // Adobe red
  success: '#268E6C',      // Adobe green
  warning: '#DA7B11',      // Adobe orange
  error: '#D7373F',        // Adobe red
  info: '#1473E6',         // Adobe blue

  // Backgrounds
  bg: {
    base: '#FFFFFF',
    surface: '#F5F5F5',
    elevated: '#FFFFFF',
    dark: '#2C2C2C',
  },

  // Borders
  border: {
    light: '#E1E1E1',
    medium: '#D3D3D3',
    dark: '#B3B3B3',
  },

  // Text
  text: {
    primary: '#2C2C2C',
    secondary: '#6E6E6E',
    tertiary: '#959595',
    inverse: '#FFFFFF',
  },

  // Chart colors
  chart: {
    blue: '#3B82F6',
    green: '#10B981',
    orange: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    teal: '#14B8A6',
    yellow: '#F59E0B',
  },

  // Status colors
  status: {
    positive: '#268E6C',
    negative: '#D7373F',
    neutral: '#6E6E6E',
  },

  // Badge colors
  badge: {
    earned: {
      bg: '#E6F4EA',
      text: '#1E7E34',
      border: '#268E6C',
    },
    paid: {
      bg: '#FFF3CD',
      text: '#856404',
      border: '#DA7B11',
    },
    info: {
      bg: '#E3F2FD',
      text: '#0D47A1',
      border: '#1473E6',
    },
  },
};

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '40px',
};

export const BORDER_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

export const TYPOGRAPHY = {
  fontFamily: {
    base: '"adobe-clean", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Source Code Pro", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '13px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '30px',
    '5xl': '36px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const LAYOUT = {
  sidebar: {
    width: {
      collapsed: '52px',
      expanded: '220px',
    },
    transition: 'width 0.2s ease-in-out',
  },
  topBar: {
    height: '56px',
  },
  content: {
    maxWidth: '1920px',
    padding: {
      mobile: '16px',
      desktop: '24px',
    },
  },
};

export const TRANSITIONS = {
  fast: '0.15s ease-in-out',
  normal: '0.2s ease-in-out',
  slow: '0.3s ease-in-out',
};

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};
