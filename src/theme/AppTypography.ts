import { StyleSheet, TextStyle, Platform } from 'react-native';
import AppColors from './AppColors';

const fontStack = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
});

const fontBold = Platform.select({
  ios: 'System',
  android: 'sans-serif-condensed',
  default: 'System',
});

export const AppTypography = StyleSheet.create({
  hero: {
    fontFamily: fontBold,
    fontSize: 34,
    fontWeight: '800',
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
  } as TextStyle,
  title1: {
    fontFamily: fontBold,
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  } as TextStyle,
  title2: {
    fontFamily: fontBold,
    fontSize: 21,
    fontWeight: '700',
    color: AppColors.textPrimary,
  } as TextStyle,
  title3: {
    fontFamily: fontStack,
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
  } as TextStyle,
  body: {
    fontFamily: fontStack,
    fontSize: 15,
    fontWeight: '400',
    color: AppColors.textSecondary,
    lineHeight: 22,
  } as TextStyle,
  bodyBold: {
    fontFamily: fontStack,
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textPrimary,
  } as TextStyle,
  callout: {
    fontFamily: fontStack,
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
  } as TextStyle,
  caption: {
    fontFamily: fontStack,
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.textSecondary,
    letterSpacing: 0.2,
  } as TextStyle,
  tag: {
    fontFamily: fontStack,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,
  buttonText: {
    fontFamily: fontBold,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  } as TextStyle,
});

export default AppTypography;
