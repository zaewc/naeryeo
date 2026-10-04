import type { TransitRoute } from '@/entities/trip';
/** Deliberately synthetic; not a real Gwangju bus route or API response. */
export const demoRoute: TransitRoute = {
  id: 'demo:gwangju:01', name: '광주 테스트 버스', direction: '하차 체험',
  stops: [
    { id: 'demo:boarding', name: '탑승 정류장', sequence: 10 },
    { id: 'demo:terminal', name: '터미널 · 예시', sequence: 20 },
    { id: 'demo:city-hall', name: '시청 · 예시', sequence: 30 },
    { id: 'demo:park', name: '공원 · 예시', sequence: 40 },
    { id: 'demo:destination', name: '하차 정류장', sequence: 50 },
  ],
};
