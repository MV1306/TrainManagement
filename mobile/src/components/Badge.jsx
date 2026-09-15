import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme';

const variants = {
  active:   { bg: colors.successLight, text: colors.success },
  inactive: { bg: colors.dangerLight,  text: colors.danger },
  indigo:   { bg: colors.primaryLight, text: colors.primary },
  slate:    { bg: colors.slate100,     text: colors.slate600 },
  amber:    { bg: colors.warningLight, text: colors.warning },
};

export default function Badge({ label, variant = 'slate' }) {
  const v = variants[variant] ?? variants.slate;
  return (
    <View style={[s.badge, { backgroundColor: v.bg }]}>
      <Text style={[s.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  text:  { fontSize: font.xs, fontWeight: '700' },
});
