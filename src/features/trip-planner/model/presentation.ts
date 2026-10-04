import type { TripProgress, TransitRoute } from '@/entities/trip';
import type { LiveActivityInput } from '@/shared/platform/live-activity';
export function presentTrip(id: string, route: TransitRoute, progress: TripProgress, alert: boolean): LiveActivityInput {
  return {
    id, title: `${progress.destination.name} · ${progress.phase === 'approaching' ? '다음 정류장에서 하차' : progress.phase === 'arrived' ? '도착' : `${progress.remainingStops}정거장`}`,
    subtitle: route.name,
    body: progress.freshness === 'stale' ? '위치 정보를 다시 확인하고 있어요.' :
      progress.nextStop ? `다음 정류장: ${progress.nextStop.name}` : '목적지에 도착했어요. 주변을 확인하고 내려 주세요.',
    chipText: progress.phase === 'tracking' ? `${progress.remainingStops}정거장` : progress.phase === 'approaching' ? '하차 준비' : '도착',
    phase: progress.phase, totalStops: progress.totalStops, completedStops: progress.completedStops,
    etaEpochMillis: progress.etaEpochMillis, alert: alert && progress.freshness === 'live',
  };
}
