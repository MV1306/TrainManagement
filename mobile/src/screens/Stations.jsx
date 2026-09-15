import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Plus, X, Search } from 'lucide-react-native';
import { stationsApi, zonesApi } from '../services/api';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import { colors, font, radius } from '../theme';

const empty = { name: '', code: '', city: '', latitude: '', longitude: '', zoneId: '', division: '' };

export default function Stations() {
  const insets = useSafeAreaInsets();
  const [stations, setStations] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await stationsApi.getAll();
      setStations(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    zonesApi.getAll().then(r => setZones(r.data)).catch(() => {});
  }, []);

  const filtered = stations.filter(s => {
    const q = search.trim().toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q);
  });

  const openAdd = () => { setForm(empty); setEditId(null); setModalOpen(true); };
  const openEdit = (s) => {
    setForm({ name: s.name, code: s.code, city: s.city, latitude: s.latitude?.toString() ?? '', longitude: s.longitude?.toString() ?? '', zoneId: s.zoneId?.toString() ?? '', division: s.division ?? '' });
    setEditId(s.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.city.trim()) {
      setToast({ message: 'Name, code and city are required', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name, code: form.code.toUpperCase(), city: form.city,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        zoneId: form.zoneId ? parseInt(form.zoneId) : null,
        division: form.division || null,
      };
      if (editId) await stationsApi.update(editId, payload);
      else await stationsApi.create(payload);
      setModalOpen(false);
      await load(true);
      setToast({ message: `Station ${editId ? 'updated' : 'added'}`, type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('Delete Station', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await stationsApi.remove(id);
            await load(true);
            setToast({ message: 'Station deleted', type: 'success' });
          } catch {
            setToast({ message: 'Failed to delete', type: 'error' });
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: s }) => (
    <Card style={s2.card}>
      <View style={s2.row}>
        <View style={s2.iconWrap}>
          <MapPin size={14} color="#d97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s2.name}>{s.name}</Text>
          <Text style={s2.city}>{s.city}</Text>
        </View>
        <View style={s2.codeBadge}>
          <Text style={s2.codeText}>{s.code}</Text>
        </View>
      </View>
      <View style={s2.meta}>
        {s.zoneCode && <View style={s2.zoneBadge}><Text style={s2.zoneText}>{s.zoneCode}</Text></View>}
        {s.division && <Text style={s2.division}>{s.division}</Text>}
        {s.latitude != null && <Text style={s2.coords}>{s.latitude}, {s.longitude}</Text>}
      </View>
      <View style={s2.actions}>
        <TouchableOpacity style={s2.editBtn} onPress={() => openEdit(s)}>
          <Text style={s2.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s2.deleteBtn} onPress={() => handleDelete(s.id, s.name)}>
          <Text style={s2.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={[s2.container, { paddingTop: insets.top }]}>
      <View style={s2.toolbar}>
        <View style={s2.searchWrap}>
          <Search size={14} color={colors.slate400} style={{ marginRight: 8 }} />
          <TextInput style={s2.searchInput} placeholder="Search stations..." placeholderTextColor={colors.slate400} value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><X size={14} color={colors.slate400} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity style={s2.addBtn} onPress={openAdd}>
          <Plus size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => String(s.id)}
          renderItem={renderItem}
          contentContainerStyle={s2.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon={MapPin} title="No stations found" />}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={s2.modal}>
          <View style={s2.modalHeader}>
            <Text style={s2.modalTitle}>{editId ? 'Edit Station' : 'Add Station'}</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}><X size={20} color={colors.slate500} /></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s2.modalBody}>
            {[
              { label: 'Station Name *', key: 'name', placeholder: 'e.g. Chennai Central' },
              { label: 'Code *', key: 'code', placeholder: 'e.g. MAS', upper: true, mono: true },
              { label: 'City *', key: 'city', placeholder: 'e.g. Chennai' },
              { label: 'Division', key: 'division', placeholder: 'e.g. SR' },
              { label: 'Latitude', key: 'latitude', placeholder: '13.0827', keyboard: 'decimal-pad' },
              { label: 'Longitude', key: 'longitude', placeholder: '80.2707', keyboard: 'decimal-pad' },
            ].map(({ label, key, placeholder, upper, mono, keyboard }) => (
              <View key={key} style={s2.field}>
                <Text style={s2.label}>{label}</Text>
                <TextInput
                  style={[s2.input, mono && { fontFamily: 'monospace', letterSpacing: 2 }]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.slate400}
                  value={form[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: upper ? v.toUpperCase() : v }))}
                  keyboardType={keyboard || 'default'}
                  autoCapitalize={upper ? 'characters' : 'sentences'}
                />
              </View>
            ))}
            {zones.length > 0 && (
              <View style={s2.field}>
                <Text style={s2.label}>Zone</Text>
                <View style={s2.zoneList}>
                  <TouchableOpacity style={[s2.zoneOption, !form.zoneId && s2.zoneOptionActive]} onPress={() => setForm(f => ({ ...f, zoneId: '' }))}>
                    <Text style={[s2.zoneOptionText, !form.zoneId && s2.zoneOptionTextActive]}>None</Text>
                  </TouchableOpacity>
                  {zones.map(z => (
                    <TouchableOpacity key={z.id} style={[s2.zoneOption, form.zoneId === String(z.id) && s2.zoneOptionActive]} onPress={() => setForm(f => ({ ...f, zoneId: String(z.id) }))}>
                      <Text style={[s2.zoneOptionText, form.zoneId === String(z.id) && s2.zoneOptionTextActive]}>{z.code}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
          <View style={s2.modalFooter}>
            <TouchableOpacity style={s2.cancelBtn} onPress={() => setModalOpen(false)}>
              <Text style={s2.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s2.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={s2.saveBtnText}>{editId ? 'Update' : 'Add Station'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </View>
  );
}

const s2 = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  toolbar:            { flexDirection: 'row', gap: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingHorizontal: 16, paddingVertical: 10 },
  searchWrap:         { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput:        { flex: 1, fontSize: font.base, color: colors.slate700 },
  addBtn:             { width: 40, height: 40, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list:               { padding: 16, gap: 10, paddingBottom: 32 },
  card:               { padding: 14 },
  row:                { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap:           { width: 32, height: 32, borderRadius: radius.md, backgroundColor: '#fffbeb', alignItems: 'center', justifyContent: 'center' },
  name:               { fontSize: font.base, fontWeight: '600', color: colors.slate700 },
  city:               { fontSize: font.xs, color: colors.slate400, marginTop: 1 },
  codeBadge:          { backgroundColor: colors.slate100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.md },
  codeText:           { fontFamily: 'monospace', fontSize: font.xs, fontWeight: '700', color: colors.slate800, letterSpacing: 1 },
  meta:               { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  zoneBadge:          { backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  zoneText:           { fontSize: font.xs, fontWeight: '700', color: colors.primary },
  division:           { fontSize: font.xs, color: colors.slate500 },
  coords:             { fontSize: font.xs, color: colors.slate400, fontFamily: 'monospace' },
  actions:            { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: colors.slate100, paddingTop: 10 },
  editBtn:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.primaryLight },
  editBtnText:        { fontSize: font.xs, fontWeight: '600', color: colors.primary },
  deleteBtn:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.dangerLight },
  deleteBtnText:      { fontSize: font.xs, fontWeight: '600', color: colors.danger },
  modal:              { flex: 1, backgroundColor: colors.white },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  modalTitle:         { fontSize: font.lg, fontWeight: '700', color: colors.slate800 },
  modalBody:          { padding: 20, gap: 16 },
  field:              { gap: 6 },
  label:              { fontSize: font.xs, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:              { borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: font.base, color: colors.slate700, backgroundColor: colors.white },
  zoneList:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zoneOption:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.slate200 },
  zoneOptionActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
  zoneOptionText:     { fontSize: font.xs, fontWeight: '600', color: colors.slate600 },
  zoneOptionTextActive:{ color: colors.white },
  modalFooter:        { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.slate100 },
  cancelBtn:          { flex: 1, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.slate200, alignItems: 'center' },
  cancelBtnText:      { fontSize: font.base, fontWeight: '600', color: colors.slate600 },
  saveBtn:            { flex: 1, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText:        { fontSize: font.base, fontWeight: '700', color: colors.white },
});
