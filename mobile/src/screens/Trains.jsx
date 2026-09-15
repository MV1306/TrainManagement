import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Train, Search, X, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react-native';
import { trainsApi } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import { colors, font, radius } from '../theme';

const PAGE_SIZE = 25;

export default function Trains() {
  const insets = useSafeAreaInsets();
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await trainsApi.getAll();
      setTrains(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trains.filter(t => {
      const matchSearch = !q || t.trainNumber?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [trains, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggle = async (id) => {
    setToggling(id);
    try {
      await trainsApi.toggleStatus(id);
      await load(true);
    } catch {
      setToast({ message: 'Failed to toggle status', type: 'error' });
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('Delete Train', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await trainsApi.remove(id);
            await load(true);
            setToast({ message: 'Train deleted', type: 'success' });
          } catch {
            setToast({ message: 'Failed to delete', type: 'error' });
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: t }) => (
    <Card style={s.trainCard}>
      <View style={s.trainHeader}>
        <View style={s.trainIconWrap}>
          <Train size={15} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.trainNum}>{t.trainNumber}</Text>
          <Text style={s.trainName} numberOfLines={1}>{t.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleToggle(t.id)}
          disabled={toggling === t.id}
          style={[s.toggleBtn, { backgroundColor: t.status === 'active' ? colors.successLight : colors.dangerLight }]}
        >
          {toggling === t.id
            ? <ActivityIndicator size="small" color={t.status === 'active' ? colors.success : colors.danger} />
            : t.status === 'active'
              ? <ToggleRight size={14} color={colors.success} />
              : <ToggleLeft size={14} color={colors.danger} />}
          <Text style={[s.toggleText, { color: t.status === 'active' ? colors.success : colors.danger }]}>
            {t.status === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={s.trainMeta}>
        {t.type && <Badge label={t.type} variant="slate" />}
        {t.zoneCode && <Badge label={t.zoneCode} variant="indigo" />}
        <View style={s.days}>
          {['M','T','W','T','F','S','S'].map((d, i) => {
            const active = (t.runningDays >> i & 1) === 1;
            return (
              <View key={i} style={[s.day, { backgroundColor: active ? colors.primaryLight : colors.slate100 }]}>
                <Text style={[s.dayText, { color: active ? colors.primary : colors.slate300 }]}>{d}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={s.trainActions}>
        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(t.id, t.name)}>
          <Text style={s.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const Pagination = () => (
    <View style={s.pagination}>
      <Text style={s.pageInfo}>Page {page} of {totalPages} · {filtered.length} trains</Text>
      <View style={s.pageButtons}>
        <TouchableOpacity style={[s.pageBtn, page === 1 && s.pageBtnDisabled]} onPress={() => setPage(1)} disabled={page === 1}>
          <Text style={s.pageBtnText}>«</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.pageBtn, page === 1 && s.pageBtnDisabled]} onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          <ChevronLeft size={14} color={page === 1 ? colors.slate300 : colors.slate600} />
        </TouchableOpacity>
        <View style={s.pageActive}>
          <Text style={s.pageActiveText}>{page}</Text>
        </View>
        <TouchableOpacity style={[s.pageBtn, page === totalPages && s.pageBtnDisabled]} onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          <ChevronRight size={14} color={page === totalPages ? colors.slate300 : colors.slate600} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.pageBtn, page === totalPages && s.pageBtnDisabled]} onPress={() => setPage(totalPages)} disabled={page === totalPages}>
          <Text style={s.pageBtnText}>»</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Toolbar */}
      <View style={s.toolbar}>
        <View style={s.searchWrap}>
          <Search size={14} color={colors.slate400} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search number or name..."
            placeholderTextColor={colors.slate400}
            value={search}
            onChangeText={v => { setSearch(v); setPage(1); }}
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); setPage(1); }}>
              <X size={14} color={colors.slate400} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={s.filterRow}>
          {['all', 'active', 'inactive'].map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, statusFilter === f && s.filterBtnActive]}
              onPress={() => { setStatusFilter(f); setPage(1); }}
            >
              <Text style={[s.filterText, statusFilter === f && s.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={paginated}
          keyExtractor={t => String(t.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon={Train} title="No trains found" subtitle="Try changing your search or filters." />}
          ListFooterComponent={filtered.length > PAGE_SIZE ? <Pagination /> : null}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  toolbar:        { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  searchWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput:    { flex: 1, fontSize: font.base, color: colors.slate700 },
  filterRow:      { flexDirection: 'row', gap: 6 },
  filterBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.slate100 },
  filterBtnActive:{ backgroundColor: colors.primary },
  filterText:     { fontSize: font.xs, fontWeight: '600', color: colors.slate600 },
  filterTextActive:{ color: colors.white },
  list:           { padding: 16, gap: 10, paddingBottom: 32 },
  trainCard:      { padding: 14 },
  trainHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  trainIconWrap:  { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  trainNum:       { fontSize: font.xs, fontFamily: 'monospace', fontWeight: '700', color: colors.slate800 },
  trainName:      { fontSize: font.base, fontWeight: '600', color: colors.slate700 },
  toggleBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.full },
  toggleText:     { fontSize: font.xs, fontWeight: '700' },
  trainMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  days:           { flexDirection: 'row', gap: 2, marginLeft: 'auto' },
  day:            { width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  dayText:        { fontSize: 8, fontWeight: '700' },
  trainActions:   { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.slate100 },
  deleteBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.dangerLight },
  deleteBtnText:  { fontSize: font.xs, fontWeight: '600', color: colors.danger },
  pagination:     { marginTop: 8, padding: 16, alignItems: 'center', gap: 8 },
  pageInfo:       { fontSize: font.xs, color: colors.slate400 },
  pageButtons:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageBtn:        { width: 32, height: 32, borderRadius: radius.md, borderWidth: 1, borderColor: colors.slate200, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  pageBtnDisabled:{ opacity: 0.4 },
  pageBtnText:    { fontSize: font.sm, color: colors.slate600, fontWeight: '600' },
  pageActive:     { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pageActiveText: { fontSize: font.sm, color: colors.white, fontWeight: '700' },
});
