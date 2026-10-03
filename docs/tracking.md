# Tracking

현재 단계에는 tracking engine이 없다. PoC 화면 버튼은 고정된 mock 표시 데이터만 전달한다.
알림은 앱이 background로 이동해도 OS에 남지만, 이는 위치 추적·백그라운드 실행 검증을 뜻하지 않는다.
process kill과 force-stop 이후 지속 추적도 아직 보장하지 않는다.

Now Bar 실기기 검증 통과 후 Phase 2에서 순수 진행 계산과 trip state machine을 구현하고,
Phase 3에서 mock provider를 연결한다. Phase 5에서 native lifecycle·scheduler·상태 복구를 구현한다.
JS timer가 항상 실행된다는 가정으로 background tracking을 만들지 않는다.
API rate limit, stale/offline 상태, backoff, update coalescing, 배터리 정책은 해당 단계에서 결정·테스트한다.
