export { colors } from './colors';
export { typography } from './typography';
export { spacing, spacingPatterns } from './spacing';

// Re-export everything for convenience
import { colors } from './colors';
import { typography } from './typography';
import { spacing, spacingPatterns } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
  spacingPatterns,
};

export default theme;

