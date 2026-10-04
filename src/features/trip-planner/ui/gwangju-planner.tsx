import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import type { RouteSummary, TransitDataPort, TransitRoute, TransitVehicle } from '@/entities/trip';
import type { LiveActivityPort } from '@/shared/platform/live-activity';
import { useLiveTrip } from '../model/use-live-trip';
export function GwangjuPlanner({ port, data }: { port: LiveActivityPort; data: TransitDataPort }) {
  const [routes, setRoutes] = useState<readonly RouteSummary[]>([]);
  const [route, setRoute] = useState<TransitRoute | null>(null);
  const [vehicles, setVehicles] = useState<readonly TransitVehicle[]>([]);
  const [vehicle, setVehicle] = useState<TransitVehicle | null>(null);
  const [destination, setDestination] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const trip = useLiveTrip(port, data);
  useEffect(() => {
    let active = true;
    data.routes().then(value => { if (active) setRoutes(value); }).catch(e => { if (active) setError(e instanceof Error ? e.message : '다시 시도해 주세요.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [data]);
  async function selectRoute(id: string) {
    const request = ++generation.current;
    setLoading(true); setError(null); setVehicle(null); setDestination(null);
    try {
      const [nextRoute, nextVehicles] = await Promise.all([data.route(id), data.vehicles(id)]);
      if (request !== generation.current) return;
      setRoute(nextRoute); setVehicles(nextVehicles); setQuery('');
    } catch (e) { if (request === generation.current) setError(e instanceof Error ? e.message : '다시 시도해 주세요.'); }
    finally { if (request === generation.current) setLoading(false); }
  }
  async function retry() {
    setLoading(true); setError(null);
    try { setRoutes(await data.routes()); } catch (e) { setError(e instanceof Error ? e.message : '다시 시도해 주세요.'); }
    finally { setLoading(false); }
  }
  const progress = trip.session?.progress;
  const disabled = loading || trip.busy;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Text style={styles.logo}>내려</Text><Text style={styles.muted}>광주 버스</Text></View>
    {progress ? <>
      <Text style={styles.title}>{progress.destination.name}</Text>
      <View style={styles.card}><Text style={styles.count}>{progress.phase === 'arrived' ? '도착했어요' : `${progress.remainingStops}정거장`}</Text>
        <Text style={styles.white}>{progress.phase === 'approaching' ? '다음 정류장에서 내려 주세요.' : progress.nextStop ? `다음 · ${progress.nextStop.name}` : '주변을 확인하고 안전하게 내려 주세요.'}</Text>
        <Text style={styles.white}>{trip.session?.selection.route.name} · {trip.session?.vehicle.registration}</Text></View>
      <Text style={styles.muted}>현재 버전은 아래 버튼으로 실제 차량 위치를 갱신합니다. 화면을 끈 상태의 자동 갱신은 아직 준비 중이에요.</Text>
      {progress.phase !== 'arrived' && <Button label="차량 위치 갱신" disabled={disabled} onPress={() => void trip.refresh()} />}
      <Button label={progress.phase === 'arrived' ? '이동 완료' : '이동 종료'} disabled={disabled} onPress={() => void trip.end()} />
    </> : <>
      <Text style={styles.title}>{'어디에서\n내리시나요?'}</Text>
      <Text style={styles.muted}>타고 있는 버스를 선택하면 목적지까지 남은 정거장을 알려드려요.</Text>
      {!route ? <>
        <TextInput style={styles.input} accessibilityLabel="노선 검색" placeholder="노선 이름 검색 · 예: 순환01" value={query} onChangeText={setQuery} />
        {routes.filter(item => item.name.includes(query.trim())).map(item => <Button key={item.id} label={`${item.name}\n${item.direction}`} disabled={disabled} onPress={() => void selectRoute(item.id)} />)}
        {!loading && routes.length === 0 && <Button label="노선 다시 불러오기" disabled={disabled} onPress={() => void retry()} />}
      </> : <>
        <Text style={styles.label}>{route.name}</Text>
        <Button label="다른 노선 선택" disabled={disabled} onPress={() => { setRoute(null); setVehicle(null); setDestination(null); setQuery(''); }} />
        <Text style={styles.label}>타고 있는 차량</Text><Text style={styles.muted}>차량 번호를 확인해 주세요. 같은 노선의 다른 버스를 선택하면 안내가 달라질 수 있어요.</Text>
        {vehicles.map(item => <Button key={item.vehicleId} label={`${vehicle?.vehicleId === item.vehicleId ? '● ' : ''}${item.registration} · ${route.stops.find(s => s.sequence === item.reachedSequence)?.name ?? '위치 확인 중'}`} disabled={disabled} onPress={() => { setVehicle(item); setDestination(null); }} />)}
        {!vehicles.length && <Text style={styles.muted}>현재 운행 차량 정보가 없어요.</Text>}
        <Button label="차량 목록 새로고침" disabled={disabled} onPress={() => void selectRoute(route.id)} />
        {vehicle && <>
          <Text style={styles.label}>내릴 정류장</Text><TextInput style={styles.input} accessibilityLabel="목적지 검색" placeholder="정류장 이름 검색" value={query} onChangeText={setQuery} />
          {route.stops.filter(stop => stop.sequence > vehicle.reachedSequence && stop.name.includes(query.trim())).map(stop => <Button key={stop.sequence} label={`${destination === stop.sequence ? '● ' : ''}${stop.name} · ${stop.sequence}번째`} disabled={disabled} onPress={() => setDestination(stop.sequence)} />)}
          {destination !== null && <Text style={styles.label}>선택한 목적지 · {route.stops.find(s => s.sequence === destination)?.name}</Text>}
          <Button label="하차 알림 시작" disabled={disabled || destination === null} onPress={() => { if (destination !== null) void trip.start({ route, boardingSequence: vehicle.reachedSequence, destinationSequence: destination }, vehicle); }} />
        </>}
      </>}
    </>}
    {disabled && <Text accessibilityLiveRegion="polite" style={styles.muted}>정보를 확인하고 있어요…</Text>}
    {(error || trip.error) && <View style={styles.error}><Text accessibilityRole="alert">{error ?? trip.error}</Text><Button label="기존 알림 종료" disabled={disabled} onPress={() => void trip.end()} /><Button label="알림 설정" disabled={disabled} onPress={() => void port.openSettings('notifications').catch(() => setError('설정을 열지 못했어요. 기기 설정에서 내려의 알림을 확인해 주세요.'))} /></View>}
    <Link href="/demo-trip" style={styles.link}>테스트 운행 체험</Link><Link href="/now-bar-test" style={styles.link}>Now Bar 표시 테스트</Link>
  </ScrollView></SafeAreaView>;
}
function Button({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7f2' }, content: { padding: 24, gap: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  logo: { color: '#174532', fontSize: 26, fontWeight: '800' }, title: { color: '#173b2b', fontSize: 36, fontWeight: '700', marginBottom: 12 },
  muted: { color: '#53685a', fontSize: 15, lineHeight: 23 }, label: { color: '#173b2b', fontSize: 18, fontWeight: '700', marginTop: 14 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#c7d4c9', borderRadius: 14, padding: 16, fontSize: 16, minHeight: 56 },
  button: { backgroundColor: '#e3eddf', borderRadius: 14, padding: 16, minHeight: 56, justifyContent: 'center' }, buttonText: { color: '#173b2b', fontSize: 16, lineHeight: 24 }, disabled: { opacity: 0.5 },
  card: { backgroundColor: '#174e35', borderRadius: 28, padding: 24, gap: 20 }, count: { color: '#fff', fontSize: 42, fontWeight: '700' }, white: { color: '#eff6e9', fontSize: 17, lineHeight: 26 },
  error: { backgroundColor: '#f5e4e0', borderRadius: 16, padding: 16, gap: 12 }, link: { color: '#174e35', fontSize: 14, paddingVertical: 16 },
});
