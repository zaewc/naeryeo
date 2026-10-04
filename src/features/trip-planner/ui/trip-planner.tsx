import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import type { LiveActivityPort } from '@/shared/platform/live-activity';
import { demoRoute } from '../model/demo-route';
import { useDemoTrip } from '../model/use-demo-trip';
export function TripPlanner({ port }: { readonly port: LiveActivityPort }) {
  const [query, setQuery] = useState('');
  const [boardingSequence, setBoarding] = useState(10);
  const [destinationSequence, setDestination] = useState(50);
  const trip = useDemoTrip(port);
  const progress = trip.session?.progress;
  function boarding(sequence: number) {
    setBoarding(sequence);
    if (destinationSequence <= sequence) setDestination(50);
  }
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Text style={styles.logo}>내려</Text><Text style={styles.region}>광주 버스</Text></View>
      {progress ? <>
        <Text style={styles.eyebrow}>테스트 운행 중</Text>
        <Text style={styles.title}>{progress.destination.name}</Text>
        <View style={styles.card}>
          <Text style={styles.large}>{progress.phase === 'arrived' ? '도착했어요' : `${progress.remainingStops}정거장`}</Text>
          <Text style={styles.cardText}>{progress.phase === 'approaching' ? '다음 정류장에서 내려 주세요.' : progress.phase === 'arrived' ? '주변을 확인하고 안전하게 내려 주세요.' : '목적지까지 남았어요'}</Text>
          <View style={styles.track}>{Array.from({ length: progress.totalStops }, (_, i) => <View key={i} style={[styles.segment, i < progress.completedStops && styles.passed]} />)}</View>
          <Text style={styles.cardText}>{progress.nextStop ? `다음 · ${progress.nextStop.name}` : '운행을 마쳤어요'}</Text>
        </View>
        <Text style={styles.note}>실제 버스 위치가 아닌 테스트예요. 아래 버튼으로 정류장 진행을 바꿀 수 있어요.</Text>
        {progress.phase !== 'arrived' && <Action label="다음 정류장으로 진행" disabled={trip.busy} onPress={() => void trip.advance()} />}
        <Action label={progress.phase === 'arrived' ? '이동 완료' : '이동 취소'} secondary disabled={trip.busy} onPress={() => void trip.end()} />
      </> : <>
        <Text style={styles.title}>{'어디에서\n내리시나요?'}</Text>
        <Text style={styles.note}>먼저 하차 알림을 체험해 보세요. 실제 광주 버스 연결을 준비하고 있어요.</Text>
        <View style={styles.notice}><Text style={styles.noticeTitle}>테스트 운행</Text><Text style={styles.note}>실제 노선이나 도착 정보가 아니에요.</Text></View>
        <Text style={styles.label}>타는 정류장</Text>
        {demoRoute.stops.filter(s => s.sequence < 50).map(stop => <Choice key={stop.sequence} label={stop.name} selected={boardingSequence === stop.sequence} disabled={trip.busy} onPress={() => boarding(stop.sequence)} />)}
        <Text style={styles.label}>내릴 정류장</Text>
        <TextInput accessibilityLabel="내릴 정류장 검색" placeholder="정류장 이름 검색" placeholderTextColor="#68776e" value={query} onChangeText={setQuery} style={styles.input} editable={!trip.busy} />
        {demoRoute.stops.filter(s => s.sequence > boardingSequence && s.name.includes(query.trim())).map(stop => <Choice key={stop.sequence} label={stop.name} selected={destinationSequence === stop.sequence} disabled={trip.busy} onPress={() => setDestination(stop.sequence)} />)}
        {query.trim() && !demoRoute.stops.some(s => s.sequence > boardingSequence && s.name.includes(query.trim())) && <Text style={styles.note}>검색 결과가 없어요. 테스트 정류장 이름으로 검색해 주세요.</Text>}
        <Action label="하차 알림 시작" disabled={trip.busy} onPress={() => void trip.start({ route: demoRoute, boardingSequence, destinationSequence })} />
      </>}
      {trip.busy && <Text accessibilityLiveRegion="polite" style={styles.note}>알림을 처리하고 있어요…</Text>}
      {trip.error && <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{trip.error}</Text><Action secondary label="기존 알림 종료" disabled={trip.busy} onPress={() => void trip.end()} /><Action secondary label="알림 설정" disabled={trip.busy} onPress={() => void trip.settings()} /></View>}
      <Text style={styles.footer}>이동을 시작하면 알림에서 남은 정거장을 확인할 수 있어요.</Text>
      <Link href="/now-bar-test" style={styles.link}>Now Bar 표시 테스트</Link>
    </ScrollView>
  </SafeAreaView>;
}
function Choice({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress} style={[styles.choice, selected && styles.selected]}><Text style={styles.choiceText}>{label}</Text><Text style={styles.choiceText}>{selected ? '●' : '○'}</Text></Pressable>;
}
function Action({ label, onPress, disabled, secondary = false }: { label: string; onPress: () => void; disabled: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.action, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.actionText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7f2' }, content: { padding: 24, gap: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  logo: { color: '#174532', fontSize: 26, fontWeight: '800' }, region: { color: '#53685a', fontSize: 14 },
  title: { color: '#173b2b', fontSize: 36, fontWeight: '700', marginBottom: 12 }, eyebrow: { color: '#53685a', fontSize: 14 },
  label: { color: '#173b2b', fontSize: 18, fontWeight: '700', marginTop: 16 }, note: { color: '#53685a', fontSize: 15, lineHeight: 23 },
  notice: { backgroundColor: '#e9efe4', borderRadius: 16, padding: 16, gap: 10 }, noticeTitle: { color: '#174532', fontSize: 16, fontWeight: '700' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#c7d4c9', borderRadius: 14, padding: 16, fontSize: 16, color: '#173b2b', minHeight: 56 },
  choice: { backgroundColor: '#fff', borderRadius: 14, padding: 16, minHeight: 56, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e0e8dc', gap: 12 }, selected: { borderColor: '#236444', backgroundColor: '#e3eddf' }, choiceText: { color: '#173b2b', fontSize: 16, flexShrink: 1 },
  action: { backgroundColor: '#174e35', borderRadius: 16, padding: 18, minHeight: 56, alignItems: 'center', marginTop: 8 }, actionText: { color: '#fff', fontSize: 17, fontWeight: '700' }, secondary: { backgroundColor: '#e3eade' }, secondaryText: { color: '#174e35' }, disabled: { opacity: 0.5 },
  card: { backgroundColor: '#174e35', borderRadius: 28, padding: 24, gap: 20 }, large: { color: '#fff', fontSize: 42, fontWeight: '700' }, cardText: { color: '#eff6e9', fontSize: 17, lineHeight: 26 },
  track: { flexDirection: 'row', gap: 6 }, segment: { height: 8, borderRadius: 4, backgroundColor: '#93b59f', flex: 1 }, passed: { backgroundColor: '#e7f982' }, error: { color: '#8c3029', fontSize: 15, lineHeight: 24 },
  footer: { color: '#53685a', fontSize: 14, lineHeight: 22, marginTop: 20 }, link: { color: '#174e35', fontSize: 14, paddingVertical: 16 },
});
