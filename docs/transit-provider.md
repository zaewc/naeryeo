# Transit provider

현재 Phase 1에는 provider·API client·API key가 없다. 화면의 2호선·정거장 데이터는 알림 표시용 fixture다.
Now Bar의 실제 표시 검증 전에는 서울·광주 등 실제 대중교통 API를 연결하지 않는다.

후속 구현에서는 API DTO → mapper → domain entity → repository port → use case → feature의 경계를 지킨다.
외부 provider마다 stable ID·route sequence·vehicle 위치·예상 도착의 의미를 실제 API 계약으로 확인한다.
도시별 응답 구조가 UI나 알림 port로 유출되지 않게 한다.
API key 배포 방식은 제공자의 계약·보안 정책을 확인한 후 결정하고 repository에 하드코딩하지 않는다.
