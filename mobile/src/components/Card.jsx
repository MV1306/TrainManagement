import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
