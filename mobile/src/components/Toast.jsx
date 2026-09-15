import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, radius, font } from '../theme';

export default function Toast({ message, type = 'success', onClose }) {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(onClose);
  }, []);

  const bg = type === 'success' ? colors.success : colors.danger;

  return (
    <Animated.View style={[s.toast, { backgroundColor: bg, opacity }]}>
      <Text style={s.text}>{message}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  toast: {
    position: 'absolute', bottom: 32, left: 16, right: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: radius.lg, zIndex: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
  text: { color: colors.white, fontSize: font.base, fontWeight: '600', textAlign: 'center' },
});
