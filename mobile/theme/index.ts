import { useColorScheme } from 'react-native';
import { colors, ColorScheme, ThemeColors } from './colors';

export { colors };

export interface Theme {
  colors: ThemeColors & {
    primary: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
  };
  isDark: boolean;
}

export const getTheme = (colorScheme: ColorScheme): Theme => {
  const themeColors = colorScheme === 'dark' ? colors.dark : colors.light;

  return {
    colors: {
      ...themeColors,
      primary: colors.primary,
      primaryDark: colors.primaryDark,
      secondary: colors.secondary,
      secondaryLight: colors.secondaryLight,
    },
    isDark: colorScheme === 'dark',
  };
};

export const useTheme = (): Theme => {
  const colorScheme = useColorScheme() ?? 'light';
  return getTheme(colorScheme);
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
