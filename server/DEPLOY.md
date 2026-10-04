# 외부 서버와 설치용 앱 준비

Cloudflare Workers + SQLite Durable Object로 서버를 배포합니다. 하나의 객체에서 모든 사용자의 공식 API 캐시와 호출 예산을 공유하며, 객체가 다시 시작되어도 관측 시각/호출 예산은 유지합니다. 2026-10-04에 인증 및 배포를 완료했습니다. 공개 주소는 `https://naeryeo-transit.naeryeo.workers.dev`이며 실제 노선 120개, 노선 1의 정류장 50개와 차량 응답을 HTTPS로 확인했습니다.

먼저 프로젝트 폴더에서 `nvm use`를 실행해 `.nvmrc`의 Node 24.13.0을 사용합니다. Node 20에서는 현재 Wrangler가 실행되지 않습니다.

1. Cloudflare Free 계정으로 `npx wrangler@4.147.0 login`을 실행합니다.
2. 공공데이터포털에 표시된 실제 호출 한도에 맞춰 `server/wrangler.jsonc`의 `GWANGJU_BUS_DAILY_LIMIT`를 설정합니다. 기본값 100은 보수적인 시험용 값이며 일반 사용자의 실시간 이동을 서비스하려면 증설이 필요합니다. 제한은 최근 24시간 기준으로 적용해 초기화 시각 차이에도 한도를 초과하지 않게 합니다.
3. `npm run transit:cloud:check`로 공개 배포 없이 번들/바인딩을 확인합니다.
4. `npm run transit:cloud:deploy`로 `naeryeo-transit` Worker 및 `GwangjuBackend` 객체를 배포합니다.
5. `npm run transit:cloud:secret`로 루트 `.env`에서 키만 읽어 Worker Secret에 전달합니다. 키는 콘솔이나 명령행에 출력하지 않습니다.
6. 발급된 HTTPS 주소의 `/health`, `/routes`, `/routes/1/vehicles`를 확인합니다. 루트 `.env.local`에 공개 서버 주소만 `EXPO_PUBLIC_TRANSIT_API_URL=https://발급된주소.workers.dev`로 설정합니다.
7. 로그인된 Expo 계정에서 `npx eas-cli@latest init`, `npx eas-cli@latest build --platform android --profile preview`로 서명된 내부 배포 APK를 만듭니다. 이 저장소는 API 키 파일을 EAS 업로드에서 제외합니다. 서버 Secret을 변경하면 앱을 다시 빌드하지 않아도 됩니다.

현재 한도 및 요금은 https://developers.cloudflare.com/workers/platform/pricing/ 및 https://developers.cloudflare.com/durable-objects/platform/pricing/ 를 확인하세요. Free 플랜에서 시작하고 유료 플랜 전환은 따로 결정합니다. 임시 미인증 계정에 API 키를 업로드하지 않습니다.

검증된 범위: 실제 Workers 런타임용 번들 dry-run 및 로컬 Workers 런타임에서 실제 광주 차량 API 응답, 순환 정류장/캐시 관측 시각/재시작 후 호출 예산/동시 요청 경합 단위 테스트. 앱의 실제 광주 버스 자동 갱신은 Android API 36 에뮬레이터에서 확인했습니다. 외부 서버 배포와 실제 HTTPS API 응답은 확인했습니다. Expo 프로젝트 `@haensol/naeryeo`에서 preview APK를 빌드하며, 갤럭시 표시 검증은 기기 연결 후 별도 단계입니다.
