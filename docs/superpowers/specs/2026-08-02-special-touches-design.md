# 특별한 인터랙션 추가 (Phase 1: 즉시 제작 가능한 3가지)

## 배경

디자인 리뉴얼 완료 후, 청첩장을 더 특별하게 만들기 위한 브레인스토밍을 진행함. 5가지 아이디어 중 실제 콘텐츠(날짜·문구) 없이 바로 제작 가능한 3가지를 이번 스코프로 확정. 나머지 2가지(우리의 이야기 타임라인, 숨은 메시지 이스터에그)는 사용자가 실제 내용을 제공한 뒤 별도로 진행.

## 1. 인트로 타이핑 애니메이션

- 페이지 로드 시 표지의 `.cover-eyebrow`("WEDDING INVITATION")가 한 글자씩 타이핑되고, 완료 후 `.cover-names`("김재원 · 이예지")가 이어서 타이핑됨
- 타이핑 완료 후 `.cover-date`가 페이드인
- `prefers-reduced-motion: reduce` 환경에서는 타이핑 없이 전체 텍스트를 즉시 표시 (접근성)
- 텍스트 자체는 기존 로직(`renderCover`, 하드코딩된 eyebrow)을 그대로 사용하며, 표시 방식만 바뀜

## 2. 갤러리 캐러셀

- `.gallery-grid`를 3열 그리드에서 `scroll-snap` 기반 가로 스와이프 캐러셀로 변경 (외부 라이브러리 불필요)
- 사진 1장이 화면 대부분을 채우고, 좌우로 다음/이전 사진이 살짝 보임 (peek)
- 사진 탭 시 기존 라이트박스 동작 그대로 유지 (index 기반 네비게이션 변경 없음)
- `renderGallery()`의 DOM 생성 로직은 그대로 두고, CSS만 그리드 → flex 캐러셀로 변경

## 3. 상단 스크롤 진행률 바

- 화면 최상단에 고정된 3px 높이 바, 스크롤 진행률만큼 `--color-accent`로 채워짐
- `scroll` 이벤트를 `requestAnimationFrame`으로 스로틀링하여 진행률(`scrollTop / (scrollHeight - clientHeight) * 100`)을 계산, 바의 `width`에 반영
- 순수 장식 요소 (클릭 불가, `aria-hidden`)

## 파일 변경 범위

- `index.html`: `<body>` 최상단에 `.scroll-progress` div 추가
- `css/style.css`: `.scroll-progress` 규칙 추가, `.gallery-grid`/`.gallery-grid img` 캐러셀 스타일로 전환, 타이핑 중 커서 표시용 스타일(선택)
- `js/main.js`: `typeText()` 헬퍼 함수 추가, `renderCover()`에 타이핑 시퀀스 연결, `setupScrollProgress()` 함수 추가 및 `init()`에서 호출

## 제외 항목 (다음 단계)

- 우리의 이야기 타임라인: 실제 스토리(날짜·문구) 확보 후 별도 스펙 진행
- 숨은 메시지(이스터에그): 실제 문구 확보 후 별도 스펙 진행

## 테스트 방식

- 로직이 있는 부분(`typeText`, 스크롤 진행률 계산)은 순수 함수로 분리 가능한 부분만 Node `assert` 기반 단위 테스트 추가 (`test/validate.mjs` 확장 또는 신규 테스트 파일)
- 시각적 동작(타이핑 리듬, 캐러셀 스와이프 느낌, 진행률 바 움직임)은 로컬 서버(`http://172.30.1.56:8080`)로 폰에서 직접 확인
