# ADR 0001: 공개 Android Live Updates와 로컬 Expo 모듈

Status: accepted for Phase 1 PoC; Galaxy Now Bar capability is unverified until device observation.

Expo SDK 57의 CNG 프로젝트를 유지하고 Kotlin 코드는 로컬 Expo module에 보존한다.
생성된 android/에 수작업으로 코드를 추가하지 않는다.
공개 AndroidX NotificationCompat API를 사용하고 비공개 Samsung API·reflection·metadata 우회에 의존하지 않는다.
표준 Live Update 알림이 실제 Galaxy의 Now Bar에 노출되는지 검증한 뒤 제품 개발의 다음 단계로 진행한다.

React Native feature는 platform port만 알고 원시 native binding은 shared/platform adapter에서만 호출한다.
Expo Router route는 src/app에 두고 feature 구현은 src/features에 둔다.
Android 16 미만·승격 미허용 기기에는 일반 알림을 게시하고 이 fallback을 Now Bar 성공으로 취급하지 않는다.
