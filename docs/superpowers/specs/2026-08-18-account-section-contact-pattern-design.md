# 계좌 섹션을 연락처 UI 패턴으로 변경

## 배경

계좌 섹션은 현재 "마음 전하실 곳" 아코디언을 눌러야 신랑/신부 2건의 계좌가 평평한 리스트로 펼쳐지는 구조. 부모님 4분(신랑 아버지 김옥현, 신랑 어머니 차소영, 신부 아버지 이충원, 신부 어머니 김숙영)의 계좌를 추가하기로 하면서, 연락처 섹션처럼 신랑측/신부측 버튼을 눌러 각자의 계좌만 모달로 확인하는 구조로 통일하기로 함. 연락처·계좌 두 섹션의 순서와 분리는 그대로 유지 (병합하지 않음).

## 1. 계좌 데이터 확장 (`js/data.js`)

`accounts` 배열을 2건에서 6건으로 확장하고, 신랑측/신부측 필터링을 위해 각 항목에 `side` 필드 추가.

```js
accounts: [
  { side: "groom", role: "신랑", holder: "김재원", bank: "신한", number: "110-393-403899" },
  { side: "groom", role: "아버지", holder: "김옥현", bank: "기업은행", number: "064-077467-01-013" },
  { side: "groom", role: "어머니", holder: "차소영", bank: "기업은행", number: "064-077233-01-014" },
  { side: "bride", role: "신부", holder: "이예지", bank: "신한", number: "110-031-619449" },
  { side: "bride", role: "아버지", holder: "이충원", bank: "SC제일은행", number: "151-20-174648" },
  { side: "bride", role: "어머니", holder: "김숙영", bank: "신한", number: "110-455-921290" },
],
```

## 2. HTML 구조 (`index.html`)

- `accounts-toggle`(아코디언 버튼), `accounts-panel`(hidden 래퍼) 제거
- 연락처 섹션과 동일한 패턴으로 신랑측/신부측 버튼 2개를 섹션에 바로 노출 (`.contact-side`와 동일 클래스/구조 재사용)
- `accounts-intro` 문구는 모달 상단으로 이동 (기존 텍스트 그대로: "직접 축하 전하지 못하는 분들을 위해 안내드립니다. 너그러운 마음으로 양해 부탁드립니다.")
- 계좌 전용 모달 `account-modal` 신규 추가 (`contact-modal`과 동일 구조: 닫기 버튼, 제목, 리스트 영역)

```html
<section id="accounts" class="section accounts">
  <p class="section-label" data-reveal>ACCOUNT</p>
  <div class="account-side-list" id="account-side-list"></div>
</section>

<div class="account-modal" id="account-modal" hidden>
  <div class="account-modal-panel">
    <button type="button" class="account-modal-close" id="account-modal-close" aria-label="닫기">✕</button>
    <p class="account-modal-intro" id="account-modal-intro"></p>
    <h3 class="account-modal-title" id="account-modal-title"></h3>
    <div class="account-modal-list" id="account-modal-list"></div>
  </div>
</div>
```

## 3. JS 변경 (`js/main.js`)

`renderAccounts()`를 `renderContact()`/`openContactModal()`과 동일한 패턴으로 재작성.

- `openAccountModal(side)`: `weddingData.accounts`를 `side`로 필터링해서 `account-modal-list`에 각 계좌를 `역할 · 예금주` / `은행 계좌번호` / 복사 버튼 형태로 렌더링 (기존 `renderAccounts()`의 row 생성 로직·복사 버튼 클릭 핸들러 재사용)
- `renderAccounts()`: "신랑측"/"신부측" 버튼 2개 생성, 클릭 시 `openAccountModal("groom"/"bride")` 호출
- 모달 닫기(✕ 버튼, 배경 클릭, Escape 키) 로직은 `closeContactModal()` 패턴 그대로 `closeAccountModal()`로 복제
- 기존 아코디언 토글(`accounts-toggle` 클릭 리스너) 코드 삭제

## 4. CSS 변경 (`css/style.css`)

- `.accordion-toggle`, `.accounts-panel`, `.accounts-intro`(섹션 내 위치) 규칙 삭제
- `.contact-side`/`.contact-side-label`/`.contact-side-arrow` 스타일을 계좌 버튼에도 적용되도록 클래스 공유 또는 동일 규칙 추가
- `.account-modal`/`.account-modal-panel`/`.account-modal-close`/`.account-modal-title`은 `.contact-modal` 계열 스타일 재사용
- `.account-modal-list` 내부 행은 기존 `.account-row`(계좌 정보 + 복사 버튼) 스타일 재사용, 모달 내부 여백만 조정
- `.account-modal-intro`는 `.accounts-intro`의 기존 폰트/색상 스타일 유지

## 파일 변경 범위

- `js/data.js`: `accounts` 배열 2건 → 6건, `side` 필드 추가
- `index.html`: 계좌 섹션 마크업 단순화, `account-modal` 신규 추가
- `js/main.js`: `renderAccounts()` 재작성, `openAccountModal()`/`closeAccountModal()` 신규, 아코디언 관련 코드 삭제
- `css/style.css`: 아코디언 스타일 삭제, 연락처 버튼/모달 스타일 재사용 규칙 추가

## 테스트 방식

- `test/validate.mjs`: "계좌 정보 6건이 존재하고 각 항목에 side 필드가 있다" 검증으로 기존 "2건" 검증 대체
- `node --check`로 `js/main.js`, `js/data.js` 문법 검증
- 시각적 동작(모달 열림/닫힘, 신랑측·신부측 각 3건 노출, 복사 버튼 동작)은 로컬 서버로 사용자가 직접 확인 후 커밋
