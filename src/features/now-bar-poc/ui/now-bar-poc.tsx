import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type LiveActivityPort } from '@/shared/platform/live-activity';

import { useNowBarPoc } from '../model/use-now-bar-poc';

interface ActionProps { label: string; onPress: () => Promise<void>; disabled?: boolean; secondary?: boolean }

function Action({ label, onPress, disabled = false, secondary = false }: ActionProps) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={() => { void onPress(); }}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || pressed) && styles.dimmed]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
  </Pressable>;
}

export function NowBarPoc({ port }: { port: LiveActivityPort }) {
  const poc = useNowBarPoc(port);
  const { status, busy } = poc;
  const available = status?.available === true;
  const active = status?.activeId != null;

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>내려 · NOW BAR TEST</Text>
      <Text style={styles.heading}>잠금 화면에서도{ '\n' }하차를 놓치지 않도록.</Text>
      <Text style={styles.description}>실제 운행 정보가 아닌 테스트 알림이에요. 시작 후 홈 화면에서 상단 캡슐을, 잠금 화면에서 Now Bar를 확인해 주세요.</Text>
      <View style={styles.card}>
        <Text style={styles.line}>2호선 · 테스트</Text>
        <Text style={styles.destination}>{poc.step?.title ?? '강남역 · 3정거장'}</Text>
        <Text style={styles.description}>{poc.step?.body ?? 'Hello Now Bar · 다음 역: 선릉'}</Text>
        <Text style={styles.caption}>버튼을 눌러 정거장 진행을 직접 바꿔요.</Text>
      </View>

      <Action label="테스트 시작" onPress={poc.start} disabled={busy || !available || active || !status?.notificationsEnabled || !status.channelEnabled} />
      <Action label="다음 정거장" onPress={poc.advance} disabled={busy || !active || !poc.canAdvance} secondary />
      <Action label="테스트 종료" onPress={poc.end} disabled={busy || !active} secondary />
      {poc.error && <Text accessibilityRole="alert" style={styles.error}>{poc.error}</Text>}

      <View style={styles.card}>
        <Text style={styles.cardHeading}>기기 상태</Text>
        <Text style={styles.status}>{status === null ? '확인 중…' : available ? `Android API ${status.sdkVersion}` : 'Android 개발 빌드가 필요해요'}</Text>
        <Text style={styles.status}>알림 권한: {status?.notificationsEnabled ? '허용' : '미허용'}</Text>
        <Text style={styles.status}>알림 채널: {status?.channelEnabled ? '켜짐' : '꺼짐'}</Text>
        <Text style={styles.status}>Live Update: {status?.liveUpdatesSupported ? '지원' : '일반 알림으로 표시'}</Text>
        <Text style={styles.status}>승격 허용: {status?.promotionAllowed ? '허용' : '미허용'}</Text>
        <Text style={styles.status}>현재 알림: {active ? '게시됨' : '없음'}</Text>
        <Text style={styles.status}>OS 승격 상태: {status?.promoted ? '승격됨' : '승격되지 않음'}</Text>
        <Text style={styles.caption}>OS 승격과 Galaxy Now Bar 표시는 별도로 확인해야 해요. 기기 설정이나 소프트웨어 버전에 따라 표시가 달라질 수 있어요.</Text>
      </View>
      <Action label="알림 권한 요청" onPress={poc.requestPermission} disabled={busy || !available} secondary />
      <Action label="알림 설정 열기" onPress={() => poc.openSettings('notifications')} disabled={busy || !available} secondary />
      <Action label="Live Update 설정 열기" onPress={() => poc.openSettings('promotion')} disabled={busy || !available} secondary />
      <Action label="상태 새로고침" onPress={poc.refresh} disabled={busy} secondary />
      <Text style={styles.caption}>내려 화면을 보고 있는 동안 상단 캡슐은 숨겨질 수 있어요. 홈 화면으로 나가 확인해 주세요. 테스트 알림은 30분 후 자동으로 종료돼요. 이 단계에서는 위치를 추적하지 않아요.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 24, gap: 12, paddingBottom: 40 },
  eyebrow: { color: '#365BD7', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heading: { fontSize: 30, lineHeight: 40, fontWeight: '700', color: '#15243B', marginVertical: 8 },
  description: { color: '#46566D', fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, gap: 10, marginVertical: 8 },
  line: { color: '#28603B', fontSize: 14, fontWeight: '600' },
  destination: { color: '#15243B', fontSize: 24, fontWeight: '700' },
  caption: { color: '#526176', fontSize: 13, lineHeight: 20 },
  button: { minHeight: 52, padding: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#304FC0' },
  secondary: { backgroundColor: '#E5EAF4' },
  dimmed: { opacity: 0.45 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryText: { color: '#243861' },
  cardHeading: { color: '#15243B', fontSize: 18, fontWeight: '700' },
  status: { color: '#35455D', fontSize: 14, lineHeight: 20 },
  error: { color: '#AA273A', fontSize: 14, lineHeight: 22 },
});
