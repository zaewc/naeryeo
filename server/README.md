# 광주 버스 데이터 서버

Node 24에서 `npm run start:transit`로 실행합니다. 저장소에서 제외되는 루트 `.env`에 `GWANGJU_BUS_SERVICE_KEY`와 선택적으로 `GWANGJU_BUS_SERVICE_URL`을 설정합니다. 인코딩 키와 디코딩 키 모두 처리합니다. 키는 응답, 오류 메시지, 앱 번들에 포함하지 않습니다.

공식 계약: https://www.data.go.kr/data/15157923/openapi.do 의 Swagger. 실제 `lineInfo`, `lineStationInfo`, `busLocationInfo` 응답으로 필드를 확인했습니다. `SEQ`는 정류장 순서이며 `BUS_ID`는 차량 선택에 사용합니다. 도착 ETA는 추정하지 않습니다.

- `GET /routes`: 노선 요약 목록
- `GET /routes/:id`: 노선과 순서대로 정렬된 정류장
- `GET /routes/:id/vehicles`: 선택 노선의 차량 위치와 관측 시각

목록/정류장은 1시간, 차량은 15초 캐시합니다. 동시 요청은 합칩니다. 캐시를 반환할 때 관측 시각을 새 시각으로 바꾸지 않습니다. 개발 계정 호출량은 실제 활용신청 화면에서 확인하고 운영 전에 증설하세요. 기본 한도가 100이면 짧은 시험만 가능합니다.

서버는 개발용으로 loopback 8084에만 바인딩합니다. Android USB 시험은 `adb reverse tcp:8084 tcp:8084`를 사용합니다. 외부 배포에는 HTTPS, 접근 제한, 공유 캐시 및 전역 호출 예산이 필요합니다. 배포한 서버 주소만 `EXPO_PUBLIC_TRANSIT_API_URL`로 설정하세요.

`npm run test:server`로 응답 계약, 순환 정류장, 요청 합치기, 캐시 관측 시각, 오류 내 키 비노출을 검증합니다.
