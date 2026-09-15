import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Train, MapPin, Activity, CircleOff } from 'lucide-react-native';
import { trainsApi, stationsApi } from '../services/api';
import Card from '../components/Card';
import { colors, font, radius } from '../theme';

export default function Dashboard({ navigation }) {
  const insets = useSafeAreaInsets();
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([trainsApi.getAll(), stationsApi.getAll()]).then(([t, s]) => {
      setTrains(t.data);
      setStations(s.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeTrains = trains.filter(t => t.status === 'active').length;
  const inactiveTrains = trains.filter(t => t.status !== 'active').length;
  const recentTrains = [...trains].slice(-5).reverse();

  const stats = [
    { label: 'Total Trains',    value: trains.length,    icon: Train,      color: colors.primary,  nav: 'Trains' },
    { label: 'Active',          value: activeTrains,     icon: Activity,   color: colors.success,  nav: 'Trains' },
    { label: 'Inactive',        value: inactiveTrains,   icon: CircleOff,  color: colors.slate500, nav: 'Trains' },
    { label: 'Stations',        value: stations.length,  icon: MapPin,     color: '#7c3aed',       nav: 'Stations' },
  ];

  return (
    <ScrollView style={s.bg} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Hero */}
      <View style={[s.hero, { paddingTop: insets.top + 20 }]}>
        <View style={s.heroBadge}>
          <Train size={12} color="#a5b4fc" />
          <Text style={s.heroBadgeText}>Railway Operations</Text>
        </View>
        <Text style={s.heroTitle}>Welcome back</Text>
        <Text style={s.heroSub}>Overview of your railway management system</Text>
      </View>

      <View style={s.content}>
        {/* Stats */}
        <View style={s.statsGrid}>
          {stats.map(({ label, value, icon: Icon, color, nav }) => (
            <TouchableOpacity key={label} style={s.statCard} onPress={() => navigation.navigate(nav)} activeOpacity={0.7}>
              <View style={[s.statIcon, { backgroundColor: color + '18' }]}>
                <Icon size={18} color={color} />
              </View>
              <Text style={s.statValue}>{loading ? '—' : value}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Trains */}
        <Card style={s.recentCard}>
          <View style={s.recentHeader}>
            <Text style={s.sectionTitle}>Recent Trains</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Trains')}>
              <Text style={s.viewAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 24 }} />
          ) : recentTrains.length === 0 ? (
            <Text style={s.empty}>No trains yet</Text>
          ) : recentTrains.map(t => (
            <View key={t.id} style={s.trainRow}>
              <View style={s.trainIcon}>
                <Train size={14} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.trainName} numberOfLines={1}>{t.name}</Text>
                <Text style={s.trainNum}>{t.trainNumber}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: t.status === 'active' ? colors.successLight : colors.dangerLight }]}>
                <Text style={[s.statusText, { color: t.status === 'active' ? colors.success : colors.danger }]}>{t.status}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Quick Actions */}
        <Card style={{ marginTop: 16 }}>
          <Text style={[s.sectionTitle, { padding: 16, paddingBottom: 8 }]}>Quick Actions</Text>
          {[
            { label: 'Manage Trains',   icon: Train,   color: colors.primary, nav: 'Trains' },
            { label: 'Manage Stations', icon: MapPin,  color: '#7c3aed',      nav: 'Stations' },
            { label: 'Scrape Route',    icon: Activity, color: colors.warning, nav: 'Scrape' },
          ].map(({ label, icon: Icon, color, nav }) => (
            <TouchableOpacity key={label} style={s.actionRow} onPress={() => navigation.navigate(nav)} activeOpacity={0.7}>
              <View style={[s.actionIcon, { backgroundColor: color + '18' }]}>
                <Icon size={16} color={color} />
              </View>
              <Text style={s.actionLabel}>{label}</Text>
              <Text style={{ color: colors.slate400 }}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg:           { flex: 1, backgroundColor: colors.bg },
  hero:         { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingBottom: 28 },
  heroBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, marginBottom: 10 },
  heroBadgeText:{ color: '#a5b4fc', fontSize: font.xs, fontWeight: '600' },
  heroTitle:    { color: colors.white, fontSize: font.xxl, fontWeight: '700' },
  heroSub:      { color: colors.slate400, fontSize: font.sm, marginTop: 4 },
  content:      { padding: 16 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard:     { flex: 1, minWidth: '45%', backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.slate200, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIcon:     { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue:    { fontSize: font.xxl, fontWeight: '700', color: colors.slate800 },
  statLabel:    { fontSize: font.xs, color: colors.slate500, marginTop: 2 },
  recentCard:   { overflow: 'hidden' },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  sectionTitle: { fontSize: font.base, fontWeight: '700', color: colors.slate700 },
  viewAll:      { fontSize: font.sm, color: colors.primary, fontWeight: '600' },
  empty:        { padding: 24, textAlign: 'center', color: colors.slate400, fontSize: font.sm },
  trainRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.slate50 },
  trainIcon:    { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  trainName:    { fontSize: font.base, fontWeight: '600', color: colors.slate700 },
  trainNum:     { fontSize: font.xs, color: colors.slate400, fontFamily: 'monospace', marginTop: 1 },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText:   { fontSize: font.xs, fontWeight: '700' },
  actionRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.slate50 },
  actionIcon:   { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionLabel:  { flex: 1, fontSize: font.base, fontWeight: '600', color: colors.slate700 },
});
