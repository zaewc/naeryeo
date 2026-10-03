# 내려

Galaxy Now Bar를 활용하는 대중교통 하차 알림 앱. 현재는 **Phase 1: mock Now Bar PoC** 단계입니다.
실제 Galaxy의 Now Bar 표시가 확인되기 전에는 대중교통 API, 운행 추적, 복잡한 화면을 추가하지 않습니다.

## 개발

Node 24와 npm을 사용합니다. Expo SDK 57 / React Native 0.86 / React 19 기반이며 Expo Go는 지원하지 않습니다.

```sh
nvm use
npm ci
npx expo run:android
```

USB 기기에서 Metro를 사용할 경우 `adb reverse tcp:8081 tcp:8081` 후 `npx expo start --dev-client`를 실행합니다.
`android/`, `ios/`는 CNG로 생성하므로 직접 수정하거나 커밋하지 않습니다.
사용자 네이티브 코드는 `modules/live-update/`에 보존됩니다.

EAS 계정·프로젝트를 연결한 환경에서는 다음 프로필을 사용할 수 있습니다.

```sh
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform android --profile preview
```

development는 Metro를 사용하는 개발 클라이언트, preview는 JS 번들을 포함하는 설치용 APK입니다.
스토어 제출·OTA 배포는 아직 구성하지 않았습니다.

## 검증

```sh
npm run typecheck
npm run lint
npm run lint:arch
npm test -- --ci --runInBand --watchman=false
npx expo-doctor
```

Android SDK와 JDK가 설치된 환경에서 Kotlin 모델·상태 전이를 검증합니다.

```sh
npx expo prebuild --platform android --no-install
cd android
./gradlew :live-update:testDebugUnitTest :live-update:compileDebugKotlin
```

- [아키텍처](docs/architecture.md)
- [네이티브 경계](docs/native-bridge.md)
- [실기기 검증](docs/now-bar-verification.md)
- [추적 단계 제한](docs/tracking.md)
- [대중교통 provider 단계 제한](docs/transit-provider.md)
