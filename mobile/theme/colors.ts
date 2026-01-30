// Od Sifra Brand Colors
// Primary: #CFFC92 (Lime Green)
// Secondary: #00353B (Dark Teal)

export const colors = {
  // Brand colors
  primary: '#CFFC92',
  primaryDark: '#B8E67D',
  secondary: '#00353B',
  secondaryLight: '#004D54',

  // Light mode (GitHub-style)
  light: {
    background: '#FFFFFF',
    backgroundSecondary: '#F6F8FA',
    surface: '#FFFFFF',
    surfaceSecondary: '#F6F8FA',
    border: '#D0D7DE',
    borderSecondary: '#E1E4E8',
    text: '#1F2328',
    textSecondary: '#656D76',
    textTertiary: '#8B949E',
    icon: '#57606A',
    success: '#1A7F37',
    successBg: '#DAFBE1',
    warning: '#9A6700',
    warningBg: '#FFF8C5',
    error: '#CF222E',
    errorBg: '#FFEBE9',
    info: '#0969DA',
    infoBg: '#DDF4FF',
  },

  // Dark mode (GitHub-style)
  dark: {
    background: '#0D1117',
    backgroundSecondary: '#161B22',
    surface: '#161B22',
    surfaceSecondary: '#21262D',
    border: '#30363D',
    borderSecondary: '#21262D',
    text: '#E6EDF3',
    textSecondary: '#8B949E',
    textTertiary: '#6E7681',
    icon: '#8B949E',
    success: '#3FB950',
    successBg: '#122117',
    warning: '#D29922',
    warningBg: '#2D2308',
    error: '#F85149',
    errorBg: '#2D1417',
    info: '#58A6FF',
    infoBg: '#0D2035',
  },
};

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof colors.light | typeof colors.dark;
