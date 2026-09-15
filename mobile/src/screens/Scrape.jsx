import { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, AlertTriangle } from 'lucide-react-native';
import { scrapeApi, trainsApi, stationsApi, zonesApi } from '../services/api';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors, font, radius } from '../theme';

const STATUS_COLOR = {
  imported: { bg: colors.successLight, text: colors.success },
  skipped:  { bg: colors.slate100,     text: colors.slate500 },
  notFound: { bg: colors.warningLight, text: colors.warning },
  failed:   { bg: colors.dangerLight,  text: colors.danger },
};

export default function Scrape() {
  const insets = useSafeAreaInsets();
  const [trainNo, setTrainNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Bulk
  const [startSeries, setStartSeries] = useState('');
  const [count, setCount] = useState(10);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkError, setBulkError] = useState('');

  const handleSingleScrape = async () => {
    if (!trainNo.trim()) return;
    setError('');
    setLoading(true);
    try {
      const infoRes = await scrapeApi.getTrainInfo(trainNo.trim());
      const info = infoRes.data;
      const stopsRes = await scrapeApi.getStops(info.internalId);
      const stops = stopsRes.data;

      const allStations = await stationsApi.getAll();
      const stationMap = Object.fromEntries(allStations.data.map(s => [s.code.toUpperCase(), s]));
      const allZones = await zonesApi.getAll();
      const zoneMap = Object.fromEntries(allZones.data.map(z => [z.code.toUpperCase(), z.id]));

      const stopsWithIds = [];
      for (const stop of stops) {
        const code = stop.code.toUpperCase();
        let station = stationMap[code];
        if (!station) {
          const res = await stationsApi.create({ name: stop.name, code, city: stop.name, latitude: stop.latitude, longitude: stop.longitude, zoneId: zoneMap[stop.zone?.toUpperCase()] ?? null, division: stop.division ?? null });
          station = res.data;
          stationMap[code] = station;
        }
        stopsWithIds.push({ stationId: station.id, stopOrder: stop.stopOrder, distanceFromOrigin: stop.distanceFromOrigin, arrivalTime: stop.arrivalTime || null, departureTime: stop.departureTime || null });
      }

      await trainsApi.create({ trainNumber: info.trainNumber, name: info.trainName, type: 'Express', status: 'active', runningDays: info.runningDays ?? 127, zoneId: zoneMap[stops[0]?.zone?.toUpperCase()] ?? null, stops: stopsWithIds });
      setToast({ message: `Train ${info.trainNumber} imported!`, type: 'success' });
      setTrainNo('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import train');
    } finally {
      setLoading(false);
    }
  };

  const handleBulk = async () => {
    if (!startSeries.trim()) return;
    setBulkError('');
    setBulkResults(null);
    setBulkLoading(true);
    try {
      const res = await scrapeApi.bulkScrape({ startSeries: parseInt(startSeries), count });
      setBulkResults(res.data.results);
      const imported = res.data.results.filter(r => r.status === 'imported').length;
      setToast({ message: `Bulk done — ${imported} imported`, type: 'success' });
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Bulk scrape failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkSummary = bulkResults ? {
    imported: bulkResults.filter(r => r.status === 'imported').length,
    skipped:  bulkResults.filter(r => r.status === 'skipped').length,
    notFound: bulkResults.filter(r => r.status === 'notFound').length,
    failed:   bulkResults.filter(r => r.status === 'failed').length,
  } : null;

  return (
    <ScrollView style={[s.bg, { paddingTop: insets.top }]} contentContainerStyle={s.content}>

      {/* Single Scrape */}
      <Card style={s.section}>
        <Text style={s.sectionTitle}>Single Train Import</Text>
        <Text style={s.sectionSub}>Enter a train number to scrape and import its route</Text>
        <View style={s.row}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="e.g. 12345"
            placeholderTextColor={colors.slate400}
            value={trainNo}
            onChangeText={setTrainNo}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSingleScrape} disabled={loading || !trainNo.trim()}>
            {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Zap size={16} color={colors.white} />}
            <Text style={s.btnText}>{loading ? 'Importing...' : 'Import'}</Text>
          </TouchableOpacity>
        </View>
        {error ? (
          <View style={s.errorBox}>
            <AlertTriangle size={14} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}
      </Card>

      {/* Bulk Scrape */}
      <Card style={s.section}>
        <Text style={s.sectionTitle}>Bulk Scrape</Text>
        <Text style={s.sectionSub}>Scrape a range of train numbers at once</Text>
        <View style={s.field}>
          <Text style={s.label}>Start Series</Text>
          <TextInput style={s.input} placeholder="e.g. 11000" placeholderTextColor={colors.slate400} value={startSeries} onChangeText={setStartSeries} keyboardType="number-pad" />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Count</Text>
          <View style={s.countRow}>
            {[10, 20, 30, 50, 100].map(n => (
              <TouchableOpacity key={n} style={[s.countBtn, count === n && s.countBtnActive]} onPress={() => setCount(n)}>
                <Text style={[s.countBtnText, count === n && s.countBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {bulkError ? (
          <View style={s.errorBox}>
            <AlertTriangle size={14} color={colors.danger} />
            <Text style={s.errorText}>{bulkError}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={[s.btn, s.btnFull, (bulkLoading || !startSeries.trim()) && s.btnDisabled]} onPress={handleBulk} disabled={bulkLoading || !startSeries.trim()}>
          {bulkLoading ? <ActivityIndicator size="small" color={colors.white} /> : <Zap size={16} color={colors.white} />}
          <Text style={s.btnText}>{bulkLoading ? `Scraping ${startSeries}–${parseInt(startSeries || 0) + count - 1}...` : 'Start Bulk Scrape'}</Text>
        </TouchableOpacity>
      </Card>

      {/* Bulk Results */}
      {bulkResults && bulkSummary && (
        <Card style={s.section}>
          <Text style={s.sectionTitle}>Results</Text>
          <View style={s.summaryGrid}>
            {[['imported','Imported',colors.success,colors.successLight],['skipped','Skipped',colors.slate500,colors.slate100],['notFound','Not Found',colors.warning,colors.warningLight],['failed','Failed',colors.danger,colors.dangerLight]].map(([key,label,tc,bg]) => (
              <View key={key} style={[s.summaryCard, { backgroundColor: bg }]}>
                <Text style={[s.summaryNum, { color: tc }]}>{bulkSummary[key]}</Text>
                <Text style={[s.summaryLabel, { color: tc }]}>{label}</Text>
              </View>
            ))}
          </View>
          <ScrollView style={s.resultsList} nestedScrollEnabled>
            {bulkResults.map(r => {
              const c = STATUS_COLOR[r.status] ?? STATUS_COLOR.failed;
              return (
                <View key={r.trainNumber} style={s.resultRow}>
                  <Text style={s.resultNum}>{r.trainNumber}</Text>
                  {r.trainName && <Text style={s.resultName} numberOfLines={1}>{r.trainName}</Text>}
                  <View style={[s.resultBadge, { backgroundColor: c.bg }]}>
                    <Text style={[s.resultBadgeText, { color: c.text }]}>{r.status}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Card>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg:               { flex: 1, backgroundColor: colors.bg },
  content:          { padding: 16, gap: 16, paddingBottom: 48 },
  section:          { padding: 16, gap: 12 },
  sectionTitle:     { fontSize: font.md, fontWeight: '700', color: colors.slate800 },
  sectionSub:       { fontSize: font.sm, color: colors.slate400, marginTop: -6 },
  row:              { flexDirection: 'row', gap: 8, alignItems: 'center' },
  field:            { gap: 6 },
  label:            { fontSize: font.xs, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:            { borderWidth: 1, borderColor: colors.slate200, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: font.base, color: colors.slate700, backgroundColor: colors.white },
  btn:              { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.lg },
  btnFull:          { justifyContent: 'center' },
  btnDisabled:      { opacity: 0.5 },
  btnText:          { color: colors.white, fontSize: font.base, fontWeight: '700' },
  errorBox:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: 10 },
  errorText:        { flex: 1, fontSize: font.sm, color: colors.danger },
  countRow:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  countBtn:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.slate200 },
  countBtnActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
  countBtnText:     { fontSize: font.sm, fontWeight: '600', color: colors.slate600 },
  countBtnTextActive:{ color: colors.white },
  summaryGrid:      { flexDirection: 'row', gap: 8 },
  summaryCard:      { flex: 1, borderRadius: radius.lg, padding: 10, alignItems: 'center' },
  summaryNum:       { fontSize: font.xl, fontWeight: '700' },
  summaryLabel:     { fontSize: font.xs, fontWeight: '600', marginTop: 2 },
  resultsList:      { maxHeight: 300, borderTopWidth: 1, borderTopColor: colors.slate100, marginTop: 4 },
  resultRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.slate50 },
  resultNum:        { fontFamily: 'monospace', fontWeight: '700', fontSize: font.sm, color: colors.slate700, width: 56 },
  resultName:       { flex: 1, fontSize: font.sm, color: colors.slate500 },
  resultBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  resultBadgeText:  { fontSize: font.xs, fontWeight: '700' },
});
