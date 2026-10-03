# 공개 Android API 비교 진단

Expo·React Native·AndroidX를 포함하지 않는 별도 Android API 36 진단 앱이다.
내려의 패키지나 데이터를 변경하지 않는다. Samsung metadata, 숨겨진 API, 패키지 위장,
미디어 세션, overlay를 사용하지 않는다. 공식 Android Live Updates 요건을 따른다.

Android SDK platform 36 / build-tools 36.0.0, JDK 17 이상, 기존 Android debug keystore가 필요하다.
`ANDROID_HOME`, `JAVA_HOME`을 지정하고 `sh tools/now-bar-probe/build.sh`를 실행한다.
스크립트는 임시 폴더의 APK 경로만 출력하며 기기에는 설치하지 않는다.

1. 출력된 APK를 `adb install <APK 경로>`로 설치한다.
2. `adb shell am start -n com.naeryeo.probe/.ProbeActivity`로 열고 일반 알림 권한을 허용한다.
3. standard → bigtext → progress → eta 버튼을 각각 누른다. 새 알림은 이전 진단 알림을 대체한다.
4. 앱의 `hasPromotable`, `canPost` 결과를 확인한 뒤 홈 화면 상단 캡슐을 별도로 확인한다.
5. 실제 보안 잠금 상태에서 잠금화면 Now Bar도 따로 확인한다.
6. cancel 버튼으로 알림을 제거하고 `adb uninstall com.naeryeo.probe`로 진단 앱을 제거한다.

모든 변형은 중요도 DEFAULT 채널, ongoing, 공개 내용, 승격 요청, 짧은 상태 문구를 사용한다.
기본 알림 소리가 날 수 있다. eta 변형은 10분 뒤 시간과 countdown을 추가한다.
30분 timeout은 stale 진단 알림만 정리하며 자동 정거장 진행은 없다.
권한 허용 뒤 변형을 자동 선택하려면 아래 명령을 사용한다.

```sh
adb shell am start -S -n com.naeryeo.probe/.ProbeActivity --es mode progress
```

알림의 승격 여부는 게시 이후 시스템 record에서 확인한다.
빌드나 `hasPromotable=true`만으로 Galaxy 시각적 표시 성공이라고 기록하지 않는다.
2026-10-03: APK 빌드·서명 검증 및 같은 Galaxy S24 설치·일반 알림 권한 허용을 완료했다.
standard, bigtext, progress, eta 모두 `hasPromotable=true`, `canPost=true`였다.
실제 게시 알림에서 `PROMOTED_ONGOING`도 확인했다.
네 변형 모두 홈 화면에서는 일반 지도 알림 아이콘만 보였고 진단 캡슐은 보이지 않았다.
처음 비교 때 다른 앱의 음악 캡슐이 있어 사용자가 음악을 정지한 뒤 다시 확인했다.
음악 캡슐이 사라진 홈 화면에서도 같은 결과였다.
Progress 변형은 사용자가 직접 보안 잠금한 상태에서도 진단 Now Bar가 보이지 않았다.
같은 시점에 `showing=true`와 활성 `PROMOTED_ONGOING`을 확인했다.
잠금화면의 Samsung Now brief는 보였다. 다른 세 변형의 보안 잠금화면은 미검증이다.
비교 후 진단 앱을 제거했다.

[Android 공식 요건](https://developer.android.com/develop/ui/views/notifications/live-update)
[공식 비교 샘플](https://github.com/android/platform-samples/tree/main/samples/user-interface/live-updates)
