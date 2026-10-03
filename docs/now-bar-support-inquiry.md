# Now Bar 지원 조건 조사 및 문의 초안

2026-10-03 조사. 아래 문의는 **미발송**이다.

## 확인한 자료와 한계

- [Android 공식 Live Updates 문서](https://developer.android.com/develop/ui/views/notifications/live-update)는 OEM이 추가 적격성 조건을 적용할 수 있다고 명시한다.
- [공식 Android 샘플](https://github.com/android/platform-samples/blob/main/samples/user-interface/live-updates/src/main/java/com/example/platform/ui/live_updates/SnackbarNotificationManager.kt)은 내려와 같은 AndroidX `setOngoing(true)`, `setRequestPromotedOngoing(true)`, ProgressStyle을 사용한다. DEFAULT 채널 및 짧은 상태 문구도 일치한다. 샘플 전체 앱을 설치한 결과는 아니다.
- [Samsung 공식 안내](https://www.samsung.com/sg/support/mobile-devices/how-to-use-the-now-bar-on-the-lock-screen-of-your-samsung-galaxy-device/)는 지원 앱의 알림·잠금화면·실시간 정보 설정을 설명한다. 확인한 자료에서는 내려 같은 일반 앱을 등록하는 개발자 API 계약이나 신청서를 찾지 못했다.
- [Samsung Members의 2026-08-19 개발자 질문](https://r1.community.samsung.com/t5/질문/now-bar-및-avf-개발-관련-질문/m-p/39141298)은 ProgressStyle 적용 후 Now Bar에서 제외되는 현상을 묻는다. 읽은 페이지에 답변은 없었다. Samsung 공식 정책의 증거로 사용하지 않는다.
- [Aviate 공식 기능 페이지](https://www.aviate.app/features)는 지원 Android 버전에서 Now Bar live activity를 제공한다고 설명한다. 일반 사용자용 제3자 앱 지원 사례의 단서이며 내려의 지원을 보장하지 않는다.
- [Aviate 개발자 원문](https://x.com/GetAviate/status/2087154111548371070)은 X 본문 접근 시 403이었지만, 후속 조사에서 X의 공개 임베드 응답으로 직접 확인했다. 개발자는 Galaxy Now Bar 승인을 받았고, 그달 말까지 설정 목록에 표시되어 개발자 옵션이 필요 없어질 것이라고 밝혔다. **제3자 개발자가 승인을 받았다는 사례는 확인했지만 신청 경로·심사 조건·내려의 자격은 미확인**이다. Samsung의 일반 정책 문서나 내려의 승인 보장은 아니다.
- [Samsung Developer Support](https://developer.samsung.com/support)는 개발자 포럼 및 1:1 기술 지원을 제공한다. [1:1 지원](https://developer.samsung.com/dashboard/support)은 Samsung 계정 로그인이 필요하다. 문의 접수나 답변은 아직 없다.

## 개발자 지원 문의 초안

Subject: Android 16 promoted notification not displayed in Galaxy Now Bar — third-party eligibility requirements

We are developing an Expo/React Native transit alighting reminder app, package `com.naeryeo.app`, using a local Android module and public Android APIs only. The notification represents user-started, ongoing transit progress.

Device: Galaxy S24 (SM-S921N), Android 16 / API 36, One UI 8.5 (`80500`), firmware `S921NKSSHDZH3`.

Observed on this device:

- POST_NOTIFICATIONS and POST_PROMOTED_NOTIFICATIONS are granted.
- App notifications and the DEFAULT-importance notification channel are enabled; lock-screen content is set to always show.
- `NotificationManager.canPostPromotedNotifications()` returns true.
- The active notification has FLAG_ONGOING_EVENT and FLAG_PROMOTED_ONGOING, PUBLIC visibility, navigation category and standard ProgressStyle.
- The notification requests promotion, has a content title and short critical text, and has no custom RemoteViews, group summary, or colorized=true.
- Neither the home-screen status capsule nor the lock-screen Now Bar displays our notification. We confirmed an actual secure lock and an active promoted notification at the same time.
- Our app is absent from Settings → Lock screen and AOD → Now bar → Live notifications / View all.
- On One UI 8.0 before the update, enabling the developer-only “Show live notifications for all apps” option displayed our mock notification in both surfaces. We disabled that option before upgrading. Developer settings are not acceptable for our intended ordinary-user experience.

Questions:

1. What additional public eligibility conditions apply to third-party transit/navigation Live Updates on this firmware?
2. Is Android FLAG_PROMOTED_ONGOING sufficient for Samsung Now Bar rendering? If not, which documented API or permission is missing?
3. Is partner registration, app review, or package eligibility registration required? If so, where can an independent developer apply, and what are the prerequisites and review criteria?
4. Is this a known firmware issue, and which supported firmware/device versions should we use for validation?
5. What minimal reproduction and sanitized logs would your team require?

We found the Aviate developer's public announcement stating that their app was approved for Galaxy Now Bar and would become available in Now Bar settings without developer options: https://x.com/GetAviate/status/2087154111548371070 . Is an equivalent application/review path available for our independent transit reminder app?

We can provide a standalone API 36 reproduction using standard, BigTextStyle and ProgressStyle notifications, without Expo, React Native, AndroidX, private Samsung APIs or package spoofing. This reproduction has been built but device comparison is pending.
