import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, spacing, borderRadius, fontSize } from '@/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const theme = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          background: theme.colors.successBg,
          text: theme.colors.success,
        };
      case 'warning':
        return {
          background: theme.colors.warningBg,
          text: theme.colors.warning,
        };
      case 'error':
        return {
          background: theme.colors.errorBg,
          text: theme.colors.error,
        };
      case 'info':
        return {
          background: theme.colors.infoBg,
          text: theme.colors.info,
        };
      default:
        return {
          background: theme.colors.surfaceSecondary,
          text: theme.colors.textSecondary,
        };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.background,
          paddingVertical: size === 'sm' ? 2 : spacing.xs,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: size === 'sm' ? fontSize.xs : fontSize.sm,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
