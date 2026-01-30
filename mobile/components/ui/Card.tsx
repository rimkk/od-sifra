import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme, spacing, borderRadius } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
}) => {
  const theme = useTheme();

  const getStyles = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    };

    switch (variant) {
      case 'outlined':
        return {
          ...base,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'elevated':
        return {
          ...base,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 3,
        };
      default:
        return base;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[getStyles(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[getStyles(), style]}>{children}</View>;
};

const styles = StyleSheet.create({});
