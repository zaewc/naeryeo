# Native bridge

## Contract

`LiveActivityPort`의 `start`, `update`, `end`만 feature가 알림 생명주기를 제어한다.
`getStatus`, `requestPermission`, `openSettings`는 PoC의 기기 진단·권한 복구에 사용한다.

전달 값은 id, title, body, optional subtitle/chipText/ETA, phase, 정거장 진행 수, alert다.
대중교통 DTO, 위치, Android 객체는 경계를 넘지 않는다. JS 어댑터와 Kotlin 양쪽에서 검증한다.
Expo Record의 필수 필드를 명시하고 정거장 수는 Double로 받아 소수·NaN을 거절한 다음 Int로 변환한다.

## Lifecycle

- start는 tracking에서만 시작하며 동시에 하나의 알림만 허용한다.
- update는 게시 중인 동일 id에만 적용된다. 진행 후퇴·목적지 정거장 수 변경·approaching 건너뛰기를 거절한다.
- end는 반복 호출해도 안전하게 해당 tag/id만 취소한다.
- OS의 activeNotifications와 알림 extras에서 이전 상태를 읽으므로 JS reload로 알림 identity를 잃지 않는다.
- 사용자가 dismiss하거나 OS가 알림을 제거하면 update는 `not-active` 오류를 반환한다.

태그 문자열을 identity로 사용하므로 문자열 hash collision으로 다른 알림을 덮어쓰지 않는다.
알림 상태 조회는 OS 게시 상태의 snapshot이다. 게시·승격 반영이 늦을 때는 새로고침한다.

## Android rendering

AndroidX Core 1.17.0과 compileSdk 36을 사용한다.
Android 16 이상에서는 ProgressStyle, 진행 tracker, 최대 10개 segment와 4개 point를 사용한다.
낮은 버전은 BigTextStyle과 일반 progress bar로 표시한다.
POST_NOTIFICATIONS는 runtime permission, POST_PROMOTED_NOTIFICATIONS는 manifest permission이다.
ongoing, contentTitle, 공개 style, promotion 요청을 설정하고 custom RemoteViews·group summary·colorized는 사용하지 않는다.

API 36의 `ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS`를 사용하고 해당 activity가 없는 기기는 일반 알림 설정으로 fallback한다.
현재 PoC 알림은 30분 timeout으로 종료된다. JS 타이머·foreground service·백그라운드 tracking은 없다.
알림은 mock 데이터를 `VISIBILITY_PUBLIC`으로 표시한다. 실제 목적지 데이터를 도입할 때 잠금 화면 privacy 정책을 별도로 결정해야 한다.

## Error mapping

native coded error를 `invalid-payload`, `permission-denied`, `invalid-transition`,
`already-active`, `not-active`, `unavailable`, `native-failure`로 변환한다.
개발자용 원본 오류는 detail로 보존하고 화면에는 한국어 사용자 메시지만 표시한다.
지원되지 않는 플랫폼은 unavailable capability를 반환하며 시작·갱신·종료를 거절한다.

## Sources

- [Expo Module API](https://docs.expo.dev/modules/module-api/)
- [ProgressStyle](https://developer.android.com/reference/androidx/core/app/NotificationCompat.ProgressStyle)
- [Notification promotion settings](https://developer.android.com/reference/android/provider/Settings#ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS)
