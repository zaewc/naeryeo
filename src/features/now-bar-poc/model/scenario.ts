import { type LiveActivityInput } from '@/shared/platform/live-activity';

export const POC_ID = 'now-bar-poc';

/** Manually advanced presentation fixtures, not a transit provider or background tracker. */
const STEPS: readonly LiveActivityInput[] = [
  { id: POC_ID, title: '강남역 · 3정거장', body: 'Hello Now Bar · 다음 역: 선릉',
    subtitle: '2호선 · 테스트', chipText: '3정거장', phase: 'tracking', totalStops: 3, completedStops: 0, alert: false },
  { id: POC_ID, title: '강남역 · 2정거장', body: '다음 역: 역삼 · 약 4분',
    subtitle: '2호선 · 테스트', chipText: '2정거장', phase: 'tracking', totalStops: 3, completedStops: 1, alert: false },
  { id: POC_ID, title: '강남역 · 다음 역에서 하차', body: '다음 역: 강남 · 하차를 준비하세요',
    subtitle: '2호선 · 테스트', chipText: '하차 준비', phase: 'approaching', totalStops: 3, completedStops: 2, alert: true },
  { id: POC_ID, title: '강남역 · 도착', body: '목적지에 도착했어요 · 테스트 종료를 눌러주세요',
    subtitle: '2호선 · 테스트', chipText: '도착', phase: 'arrived', totalStops: 3, completedStops: 3, alert: true },
];

export function getPocStep(index: number): LiveActivityInput | undefined {
  return STEPS[index];
}
