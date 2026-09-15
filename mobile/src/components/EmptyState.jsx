import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <View style={s.wrap}>
      <View style={s.iconWrap}>
        <Icon size={28} color={colors.slate300} />
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.sub}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:     { alignItems: 'center', paddingVertical: 48 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title:    { fontSize: font.base, fontWeight: '600', color: colors.slate600 },
  sub:      { fontSize: font.sm, color: colors.slate400, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
});
