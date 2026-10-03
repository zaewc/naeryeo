# Galaxy Now Bar 실기기 검증

## 단계 통과 기준

일반 notification 게시, Android OS 승격, Galaxy Now Bar의 시각적 표시는 각각 별도로 기록한다.
Now Bar에서 mock 목적지와 정거장 수를 직접 확인하기 전에는 Phase 2 이후 구현을 시작하지 않는다.

## 절차

1. native module을 포함한 개발 빌드 또는 JS bundle이 포함된 preview APK를 설치한다. Expo Go는 사용하지 않는다.
2. 앱에서 알림 권한을 요청한다. 필요한 경우 알림 채널·Live Update 설정을 확인한다.
3. 테스트 시작을 누른 뒤 알림 패널에서 `강남역 · 3정거장`을 확인한다.
4. 상태 새로고침을 눌러 OS 승격을 확인한다. 일반 알림 게시와 구분한다.
5. 화면을 잠그고 Galaxy Now Bar에 같은 알림이 보이는지 직접 확인한다.
6. 다음 정거장으로 2정거장 → 하차 준비 → 도착을 진행하며 표시 갱신과 alert를 확인한다.
7. 종료를 누르고 알림 패널·Now Bar 양쪽에서 제거됐는지 확인한다.
8. 알림 권한 거절·채널 차단, 기존 알림 상태에서 앱 재실행, timeout/dismiss 후 복구를 확인한다.

앱은 공개 Android API만 사용한다. Samsung 비공개 metadata·allowlist 우회·숨겨진 API를 추가하지 않는다.
기기 개발자 옵션 변경으로만 보이는 경우 일반 사용자 설정에서의 성공으로 기록하지 않는다.

## One UI 8.0 개발자 설정 PoC

2026-10-03: Galaxy S24 (`SM-S921N`), Android 16 (API 36), One UI 8.0.
arm64 개발 APK 빌드와 23개 Kotlin 테스트를 통과했고, USB로 APK를 설치한 뒤 Metro 연결 및 JS bundle 로드를 확인했다.

확인한 결과:

- 앱 화면과 네이티브 알림에서 3정거장 → 2정거장 → 하차 준비 → 도착 → 종료가 동작했다.
- Samsung 알림 패널에서 `강남역 · 다음 역에서 하차`, `2호선 · 테스트`, 하차 준비 문구를 확인했다.
- 종료 후 앱의 OS 상태 조회에서 활성 알림이 없는 것을 확인했다.
- 알림 권한과 채널은 허용되어 있고 API 36 Live Update 지원은 감지됐다.
- OS의 `promotionAllowed`, 실제 알림의 `promoted`는 모두 false였다.
- 설정 → 잠금화면 및 AOD → Now bar → 실시간 정보 목록 전체에서 내려 항목이 보이지 않았다.

Now Bar 도움말은 앱 알림·잠금화면 알림 허용과 잠금화면 내용 표시를 요구한다.
추가 검증에서 앱별 잠금화면 내용 표시는 `항상 표시`인 것을 확인했다.
설정 검색에서 `Live notifications`를 검색하여 개발자 옵션의 **모든 앱의 실시간 정보 보기**
(`Real Time Notification Test.`)를 찾았고, 꺼짐 → 켜짐으로 변경했다.
그 뒤 실제 잠금화면 하단 Now Bar에서 `강남역 · 다음 역에서 하차`, `하차 준비`를 직접 확인했다.
UI hierarchy의 `com.samsung.android.app.aodservice:id/nowbar_main_text_on_normal_card`와
`nowbar_sub_text_on_normal_card`도 같은 문구를 반환했다. 일반 알림 패널과 다른 실제 Now Bar 표면이다.

이 펌웨어에서는 Samsung Now Bar가 표시돼도 `promotionAllowed`와 `promoted`는 false였다.
시스템 permission 목록에는 `POST_PROMOTED_NOTIFICATIONS`가 나타나지 않았고,
공개 `APP_NOTIFICATION_PROMOTION_SETTINGS` intent도 처리되지 않았다.
따라서 Android OS 승격 플래그만을 Samsung 표시의 필수 성공 조건으로 삼으면 안 된다.
알림 record에서 표준 ProgressStyle, ONGOING_EVENT, PUBLIC visibility,
`android.requestPromotedOngoing=true`를 확인했다. Samsung 전용 비공개 extras는 추가하지 않았다.
권한 거절, 채널 차단, timeout, 재부팅, 화면 꺼짐 중 갱신, 소리·진동의 실제 동작도 미검증이다.
권한 요청 대화상자의 최초 표시 과정은 직접 확인하지 않았다.

**개발자 옵션을 사용하는 Now Bar / 상태표시줄 표시 PoC는 성공했다.**
일반 사용자 설정만으로의 표시를 검증한 것은 아니므로 이를 일반 배포 MVP 성공으로 기록하지 않는다.
개발 APK는 Metro 연결이 필요하다. 독립 실행 release/preview APK 빌드와 EAS 클라우드 빌드는 완료하지 않았다.

## 재현 설정

1. 앱 알림 허용·잠금화면 표시와 내용 표시를 확인한다.
2. 이 Galaxy 펌웨어에서는 설정 검색에 `Live notifications`를 입력하고
   개발자 옵션 → 모든 앱의 실시간 정보 보기를 켠다. 전체 앱에 적용되는 기기 개발용 테스트 설정이다.
3. 내려의 mock 테스트를 시작하고 기기를 **실제로 잠근다**. 화면 꺼짐과 보안 잠금은 다르다.
4. Now Bar의 목적지·정거장/하차 준비 문구를 직접 확인한다.

## 상태표시줄 캡슐 검증

같은 기기·설정에서 실제 홈 화면의 시계 옆 캡슐을 확인했다.
내려 앱을 foreground로 보고 있는 동안에는 캡슐이 숨겨졌고, 홈 화면으로 나가면 표시됐다.
테스트 버튼을 누른 뒤 홈으로 나가는 절차를 반복해 다음을 시각적으로 검증했다.

| 단계 | 상태표시줄 결과 |
| --- | --- |
| 시작 | 전철 아이콘 + 파란색 `3정거장` |
| 다음 정거장 | 파란색 `2정거장`으로 갱신 |
| 하차 준비 | 주황색 `하차 준비`로 갱신 |
| 도착 | 초록색 `도착`으로 갱신 |
| 종료 | 내려의 캡슐 제거 |

알림 패널에서도 `실시간 정보` 구역에 `강남역 · 3정거장`과 mock 다음 역 문구를 확인했다.
잠금화면 Now Bar, 알림 패널 실시간 구역, 상태표시줄 캡슐은 각각 별도 표면으로 검증한다.
잠금화면의 모든 정거장 단계·종료 제거와 재부팅 이후는 추가 검증 대상이다.

## One UI 8.5 일반 사용자 설정 검증

2026-10-03, 사용자가 직접 시스템을 업데이트한 같은 Galaxy S24에서 검증했다.
One UI 값은 `80500`, 펌웨어는 `S921NKSSHDZH3`, Android API는 36이다.
업데이트 전 개발자 옵션의 **모든 앱의 실시간 정보 보기**를 끈 상태를 확인했다.
업데이트 후 개발자 테스트 설정을 켜지 않았다.

| 항목 | 실제 결과 |
| --- | --- |
| 공개 `POST_PROMOTED_NOTIFICATIONS` 권한 | 시스템에 존재하고 내려에 부여됨 |
| 앱 상태 `promotionAllowed` | true |
| 게시한 알림의 OS 승격 | `PROMOTED_ONGOING` 플래그 확인 |
| 홈 화면 상단 캡슐 | 3정거장과 하차 준비 단계 모두 내려의 캡슐이 보이지 않음 |
| 일반 앱 알림 설정 | 허용·잠금화면 내용 항상 표시, 별도 Live notifications 항목은 보이지 않음 |
| 공개 승격 설정 intent | 내려의 일반 앱 알림 설정으로 연결됨 |
| 잠금화면 Now Bar | 추가 실기기 확인 대기 |

버튼을 누른 뒤 앱에서 게시·갱신 결과를 확인하고 홈으로 이동했다.
홈 화면에는 일반 전철 알림 아이콘이 보였지만 정거장 수·하차 준비 캡슐은 보이지 않았다.
OS 승격 성공만으로 Samsung 표시 성공을 기록하지 않는다.
이 결과는 해당 기기·펌웨어·현재 공개 API 구현에 대한 관찰이며,
모든 Galaxy에서 불가능하다거나 Samsung의 앱 승인 정책이 확인됐다는 뜻은 아니다.
일반 사용자 설정만으로의 MVP 표시 성공은 아직 확인하지 못했다.

모델·펌웨어에 따라 메뉴가 없거나 일반 Live notifications 설정이 제공될 수 있다.
[Samsung 공식 Now Bar 설정 안내](https://www.samsung.com/sg/support/mobile-devices/how-to-use-the-now-bar-on-the-lock-screen-of-your-samsung-galaxy-device/)도 함께 확인한다.
