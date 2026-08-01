# 디자인 리뉴얼 (귀여운 톤 → 고급스러운 톤) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 청첩장의 귀여운 손글씨체·핑크 파스텔·하트 이모지 톤을 세리프 폰트·아이보리/차콜/딥그린 기반의 차분하고 고급스러운 톤으로 전환한다.

**Architecture:** `css/style.css`의 `:root` CSS 커스텀 프로퍼티(디자인 토큰)만 교체하고, 기존 코드 전반에서 이미 그 변수를 참조하고 있는 규칙은 변수명 전역 치환으로 자동 반영한다. 변수를 쓰지 않고 하드코딩된 색상(섹션 배경 그라디언트, box-shadow, text-shadow)만 개별적으로 교체한다. 플로팅 하트 배경은 HTML/CSS/JS 3곳에서 완전히 제거한다.

**Tech Stack:** 순수 HTML/CSS/JS (빌드 도구 없음), Node 내장 `assert`로 구조적 검증(`test/validate.mjs` 확장)

**참고:** 이 작업은 전부 시각적 변경이라 자동화 단위테스트로 검증할 수 있는 로직이 거의 없다. CSS/HTML 변경은 "수정 → 문법 확인 → 실기기(`http://172.30.1.56:8080`)에서 눈으로 확인" 흐름을 따른다. 유일하게 로직이 있는 플로팅 배경 제거(Task 6)만 TDD로 진행한다.

---

### Task 1: 디자인 토큰(`:root`) 교체

**Files:**
- Modify: `css/style.css:2-22`

- [ ] **Step 1: 기존 `:root` 블록을 새 토큰으로 교체**

`css/style.css`의 2~22번 줄(`:root { ... }` 전체)을 아래로 교체한다.

```css
:root {
  --color-bg: #faf7f2;
  --color-ink: #2f2f2c;
  --color-sub: #857f74;
  --color-accent: #40573f;
  --color-line: #e2ddd0;

  --font-base: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
    "Malgun Gothic", "Noto Sans KR", sans-serif;
  --font-display: "Song Myung", serif;
  --max-width: 480px;
}
```

기존 `--pink`, `--pink-deep`, `--orange`, `--purple`, `--gradient-vivid`, `--gradient-soft`, `--font-cute`, `--font-hand`, 그리고 기존(미사용) `--color-accent: #ff5c8a`는 모두 제거된다. (`--orange`, `--purple`, `--gradient-soft`, `--font-hand`는 파일 전체에서 참조되는 곳이 없는 죽은 코드였다.)

- [ ] **Step 2: 문법 확인**

Run: `python3 -c "print('n/a - CSS')"` 대신 브라우저 개발자도구 콘솔에 CSS 파싱 에러가 없는지 확인하거나, 아래로 기본 문법만 체크:

Run: `node -e "require('fs').readFileSync('css/style.css','utf8')" && echo OK`
Expected: `OK` (파일이 읽히는지만 확인하는 최소 체크. 이 시점에는 `var(--pink-deep)` 등 이전 변수를 참조하는 곳이 아직 많이 남아있어 브라우저에서는 해당 색상이 `currentColor`/투명 등으로 깨져 보이는 게 정상이다. Task 2에서 해결됨)

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "style: replace design tokens with elegant ivory/charcoal/deep-green theme"
```

(주: 저장소가 아직 git init 되지 않았다면 이 커밋 단계는 건너뛰고 전체 작업 완료 후 한 번에 커밋한다.)

---

### Task 2: 액센트 컬러 / 폰트 변수 전역 치환

**Files:**
- Modify: `css/style.css` (전역, `replace_all`)

Task 1에서 새 변수명(`--color-accent`, `--font-display`)을 도입했으니, 옛 변수를 참조하던 모든 곳을 새 이름으로 치환한다. 값은 자동으로 새 토큰을 따라간다.

- [ ] **Step 1: `--pink-deep` → `--color-accent` 전역 치환**

`css/style.css` 안의 `var(--pink-deep)` 문자열 12곳을 전부 `var(--color-accent)`로 바꾼다 (`replace_all`).

대상 라인(치환 전): 153, 252, 262, 296, 311, 333, 408, 456, 494, 538, 568 (`color: var(--pink-deep);` 형태), 그리고 `--gradient-vivid` 정의 내부의 `var(--pink-deep)` (Task 1에서 정의 자체가 삭제되었으므로 실제로는 11곳)

- [ ] **Step 2: `var(--gradient-vivid)` → `var(--color-accent)` 전역 치환**

5곳(`calendar-day.wedding-day`, `.map-btn`, `.icon-btn`, `.copy-btn`, `.toast`)의 `background: var(--gradient-vivid);`를 전부 `background: var(--color-accent);`로 바꾼다 (`replace_all`). 그라디언트 대신 단색 딥그린으로 통일해 화려함을 줄인다.

- [ ] **Step 3: `var(--font-cute)` → `var(--font-display)` 전역 치환**

11곳의 `font-family: var(--font-cute);`를 전부 `font-family: var(--font-display);`로 바꾼다 (`replace_all`).

- [ ] **Step 4: `var(--pink)` 단독 참조 수정 (accordion-toggle 보더)**

`css/style.css:488` 부근:

```css
.accordion-toggle {
  width: 100%;
  border: 2px solid var(--pink);
```

를 아래로 교체 (얇고 차분한 보더로):

```css
.accordion-toggle {
  width: 100%;
  border: 1px solid var(--color-accent);
```

- [ ] **Step 5: 문법 확인**

Run: `node -e "require('fs').readFileSync('css/style.css','utf8')" && echo OK`
Expected: `OK`

- [ ] **Step 6: 실기기 확인**

로컬 서버(`http://172.30.1.56:8080`)를 폰에서 새로고침해 전체적으로 딥그린/세리프 톤이 적용됐는지 확인. 이 시점엔 아직 배경 그라디언트, 하트 이모지, 그림자 색상은 예전 핑크 계열이 남아있는 게 정상 (Task 3~4에서 처리).

- [ ] **Step 7: Commit**

```bash
git add css/style.css
git commit -m "style: apply new accent color and display font across all rules"
```

---

### Task 3: 하드코딩된 색상(그라디언트/그림자) 정리

**Files:**
- Modify: `css/style.css`

변수를 쓰지 않고 직접 hex/rgba로 박혀 있던 색상들을 새 톤에 맞게 개별 교체한다.

- [ ] **Step 1: 섹션 배경 그라디언트 → 단색으로 단순화**

`css/style.css:42-56`:

```css
.greeting {
  background: linear-gradient(180deg, #fff5fa 0%, #fff0e8 100%);
}

.info {
  background: linear-gradient(180deg, #fff0e8 0%, #f6f0ff 100%);
}

.contact {
  background: linear-gradient(180deg, #ffffff 0%, #fff5fa 100%);
}

.accounts {
  background: linear-gradient(180deg, #fff5fa 0%, #ffffff 100%);
}
```

를 아래로 교체:

```css
.greeting,
.info,
.contact,
.accounts {
  background: var(--color-bg);
}
```

- [ ] **Step 2: 표지 오버레이 / 텍스트 그림자 색상 교체**

`css/style.css:174-183` (`.cover-overlay`):

```css
.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(74, 43, 69, 0.05) 0%,
    rgba(74, 43, 69, 0.05) 45%,
    rgba(74, 43, 69, 0.55) 100%
  );
}
```

를 아래로 교체:

```css
.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(47, 47, 44, 0.05) 0%,
    rgba(47, 47, 44, 0.05) 45%,
    rgba(47, 47, 44, 0.55) 100%
  );
}
```

`css/style.css:209` (`.cover-names`의 `text-shadow`):

```css
  text-shadow: 0 2px 10px rgba(74, 43, 69, 0.35);
```

를 아래로 교체:

```css
  text-shadow: 0 2px 10px rgba(47, 47, 44, 0.35);
```

- [ ] **Step 3: 달력 카드 보더/그림자 톤 다운**

`css/style.css:266-273` (`.calendar-card`):

```css
.calendar-card {
  background: #fff;
  border: 2px solid var(--color-line);
  border-radius: 20px;
  padding: 20px 16px 22px;
  margin: 0 0 28px;
  box-shadow: 0 4px 14px rgba(226, 120, 159, 0.1);
}
```

를 아래로 교체:

```css
.calendar-card {
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: 20px;
  padding: 20px 16px 22px;
  margin: 0 0 28px;
  box-shadow: 0 4px 14px rgba(47, 47, 44, 0.08);
}
```

- [ ] **Step 4: 결혼식 날짜 칸의 하트 이모지 장식 제거**

`css/style.css:314-328`:

```css
.calendar-day.wedding-day {
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
  position: relative;
}

.calendar-day.wedding-day::after {
  content: "💕";
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
}
```

를 아래로 교체 (`::after` 블록 완전 삭제):

```css
.calendar-day.wedding-day {
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
}
```

- [ ] **Step 5: 버튼류 box-shadow 색상 교체 (map-btn / icon-btn / copy-btn / toast)**

`css/style.css`에서 아래 4곳을 각각 교체:

`.map-btn` (약 380행대):
```css
  box-shadow: 0 6px 14px rgba(255, 92, 138, 0.35);
```
→
```css
  box-shadow: 0 6px 14px rgba(64, 87, 63, 0.25);
```

`.icon-btn` (약 480행대):
```css
  box-shadow: 0 4px 10px rgba(255, 92, 138, 0.3);
```
→
```css
  box-shadow: 0 4px 10px rgba(64, 87, 63, 0.22);
```

`.copy-btn` (약 555행대):
```css
  box-shadow: 0 3px 8px rgba(255, 92, 138, 0.3);
```
→
```css
  box-shadow: 0 3px 8px rgba(64, 87, 63, 0.22);
```

`.toast` (약 638행대):
```css
  box-shadow: 0 6px 16px rgba(255, 46, 120, 0.4);
```
→
```css
  box-shadow: 0 6px 16px rgba(47, 47, 44, 0.3);
```

- [ ] **Step 6: 나머지 핑크 계열 box-shadow(연락처/계좌 카드) 교체**

`.contact-row` (약 445행대):
```css
  box-shadow: 0 4px 12px rgba(255, 92, 138, 0.1);
```
→
```css
  box-shadow: 0 4px 12px rgba(47, 47, 44, 0.06);
```

- [ ] **Step 7: 문법 확인 + 실기기 확인**

Run: `node -e "require('fs').readFileSync('css/style.css','utf8')" && echo OK`

폰에서 새로고침해 하트 이모지, 핑크 그림자가 모두 사라졌는지 확인. 사용자 확인 전까지 다음 태스크로 넘어가지 않는다.

- [ ] **Step 8: Commit**

```bash
git add css/style.css
git commit -m "style: replace hardcoded pink gradients/shadows with neutral tones, remove heart decoration"
```

---

### Task 4: 구글 폰트 교체

**Files:**
- Modify: `index.html:10-13`

- [ ] **Step 1: 폰트 링크 교체**

`index.html:10-13`:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Jua&family=Gaegu:wght@400;700&display=swap"
  rel="stylesheet"
/>
```

를 아래로 교체:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Song+Myung&family=Cormorant+Garamond:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 2: 실기기 확인**

폰에서 새로고침 후 이름/날짜/라벨 폰트가 세리프체로 바뀌었는지 확인. 폰트 로딩 실패 시 `--font-base`(시스템 산세리프)로 자연스럽게 폴백되는지도 확인 (네트워크 끊고 새로고침해보면 확인 가능).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: switch Google Fonts to Song Myung / Cormorant Garamond"
```

---

### Task 5: 섹션 라벨 이모지 제거

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 이모지가 포함된 라벨 텍스트를 영문 대문자 라벨로 교체**

`index.html`에서 아래 6곳을 각각 교체한다.

```html
<p class="cover-eyebrow">✨ WEDDING INVITATION ✨</p>
```
→
```html
<p class="cover-eyebrow">WEDDING INVITATION</p>
```

```html
<p class="section-label">💌 INVITATION</p>
```
→
```html
<p class="section-label">INVITATION</p>
```

```html
<p class="section-label">📍 LOCATION</p>
```
→
```html
<p class="section-label">LOCATION</p>
```

```html
<p class="section-label">📸 GALLERY</p>
```
→
```html
<p class="section-label">GALLERY</p>
```

```html
<p class="section-label">💕 CONTACT</p>
```
→
```html
<p class="section-label">CONTACT</p>
```

```html
<p class="section-label">🎁 ACCOUNT</p>
```
→
```html
<p class="section-label">ACCOUNT</p>
```

- [ ] **Step 2: `.section-label`에 letter-spacing 살짝 늘려 라인 구분자 느낌 강화**

`css/style.css:149-156`:

```css
.section-label {
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 2px;
  color: var(--color-accent);
  font-weight: 400;
  margin: 0 0 20px;
}
```

를 아래로 교체:

```css
.section-label {
  font-family: var(--font-base);
  font-size: 12px;
  letter-spacing: 4px;
  color: var(--color-accent);
  font-weight: 500;
  margin: 0 0 20px;
}
```

(라벨은 세리프 대신 시스템 산세리프 대문자로, 자간을 넓혀 얇은 구분선 같은 느낌을 준다.)

- [ ] **Step 3: 실기기 확인 + Commit**

폰에서 라벨이 이모지 없이 깔끔하게 보이는지 확인 후:

```bash
git add index.html css/style.css
git commit -m "style: remove emoji from section labels, use letter-spaced text labels instead"
```

---

### Task 6: 섹션 여백 확대 + 얇은 divider 추가

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: 섹션 상하 패딩 확대**

`css/style.css:142-147` (`.section`):

```css
.section {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 64px 28px;
  text-align: center;
}
```

를 아래로 교체 (상하 여백만 확대):

```css
.section {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 88px 28px;
  text-align: center;
}
```

- [ ] **Step 2: 표지를 제외한 섹션 사이에 얇은 구분선 추가**

`css/style.css:105-109` (`.section` 관련 z-index 블록) 바로 다음에 아래 규칙을 추가한다.

```css
.section + .section:not(.cover) {
  border-top: 1px solid var(--color-line);
}
```

(표지(`.cover`)는 풀스크린 이미지라 구분선이 필요 없고, 표지 바로 다음 섹션인 `.greeting`부터 위쪽에 얇은 라인이 생긴다.)

- [ ] **Step 3: 문법 확인 + 실기기 확인**

Run: `node -e "require('fs').readFileSync('css/style.css','utf8')" && echo OK`

폰에서 스크롤하며 섹션 사이 여백이 넉넉해졌는지, 각 섹션 상단에 얇은 라인이 보이는지 확인.

- [ ] **Step 4: Commit**

```bash
git add css/style.css
git commit -m "style: increase section spacing and add subtle divider lines between sections"
```

---

### Task 7: 플로팅 하트 배경 완전 제거 (TDD)

**Files:**
- Modify: `test/validate.mjs`
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`

여기만 로직(JS 함수 호출 + DOM 요소)이 얽혀 있어 TDD로 진행한다. `test/validate.mjs`는 파일 내용을 문자열로 읽어 검사하는 기존 패턴을 그대로 따른다(브라우저 DOM 없이도 검증 가능).

- [ ] **Step 1: 실패하는 테스트 작성**

`test/validate.mjs` 끝(78번 줄, `console.log` 직전)에 아래 체크를 추가한다.

```js
check("플로팅 하트 배경 요소가 index.html에 없다", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.ok(!html.includes("floating-bg"), "floating-bg 요소가 남아있으면 안 됩니다");
});

check("플로팅 배경 렌더 함수가 main.js에 없다", () => {
  const mainJs = fs.readFileSync(path.join(ROOT, "js", "main.js"), "utf8");
  assert.ok(
    !mainJs.includes("renderFloatingBackground"),
    "renderFloatingBackground 관련 코드가 남아있으면 안 됩니다"
  );
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node test/validate.mjs`
Expected: 새로 추가한 두 체크 중 최소 하나가 `AssertionError`로 실패 (현재 `index.html`에 `floating-bg`, `main.js`에 `renderFloatingBackground`가 아직 존재하기 때문)

- [ ] **Step 3: `index.html`에서 플로팅 배경 div 제거**

`index.html:18-19`:

```html
  <!-- 떠다니는 하트/이모지 배경 (장식용, 클릭 불가) -->
  <div class="floating-bg" id="floating-bg" aria-hidden="true"></div>

```

를 삭제한다 (해당 두 줄과 뒤따르는 빈 줄 제거).

- [ ] **Step 4: `js/main.js`에서 관련 함수/호출/상수 제거**

`js/main.js:17-43`의 아래 블록 전체 삭제:

```js
/* ---------- 떠다니는 하트/이모지 배경 ---------- */
const FLOATING_EMOJIS = ["💕", "✨", "🤍"];
const FLOATING_ITEM_COUNT = 7;

function renderFloatingBackground() {
  const container = document.getElementById("floating-bg");
  if (!container) return;

  for (let i = 0; i < FLOATING_ITEM_COUNT; i++) {
    const span = el("span", "floating-item");
    span.textContent =
      FLOATING_EMOJIS[Math.floor(Math.random() * FLOATING_EMOJIS.length)];

    const left = Math.random() * 100;
    const duration = 16 + Math.random() * 10; // 16~26s (느리게)
    const delay = Math.random() * 14; // 0~14s
    const swayDuration = 3.5 + Math.random() * 2;
    const size = 12 + Math.random() * 8; // 12~20px (작게)

    span.style.left = `${left}%`;
    span.style.fontSize = `${size}px`;
    span.style.animationDuration = `${duration}s, ${swayDuration}s`;
    span.style.animationDelay = `${delay}s, ${delay}s`;

    container.appendChild(span);
  }
}

```

그리고 `js/main.js`의 `init()` 함수(약 370~380행)에서:

```js
function init() {
  renderFloatingBackground();
  renderCover();
```

를 아래로 교체:

```js
function init() {
  renderCover();
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node test/validate.mjs`
Expected: 전체 통과, 마지막 줄에 `총 11개 검증 통과` 출력 (기존 9개 + 신규 2개)

- [ ] **Step 6: `css/style.css`에서 관련 스타일 제거**

`css/style.css:63-103`의 아래 블록 전체 삭제:

```css
/* ===== 플로팅 배경 장식 (하트/이모지) ===== */
.floating-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.floating-item {
  position: absolute;
  bottom: -10%;
  font-size: 16px;
  opacity: 0.28;
  animation-name: floatUp, sway;
  animation-timing-function: linear, ease-in-out;
  animation-iteration-count: infinite, infinite;
  will-change: transform;
}

@keyframes floatUp {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.3;
  }
  90% {
    opacity: 0.2;
  }
  100% {
    transform: translateY(-115vh) rotate(180deg);
    opacity: 0;
  }
}

@keyframes sway {
  0%, 100% { margin-left: 0; }
  50% { margin-left: 12px; }
}

```

- [ ] **Step 7: 문법 확인**

Run: `node --check js/main.js && node test/validate.mjs`
Expected: 문법 에러 없음, 테스트 전부 통과

- [ ] **Step 8: 실기기 확인**

폰에서 새로고침해 배경에 떠다니던 하트/이모지가 완전히 사라졌는지 확인. 스크롤 애니메이션 등 다른 기능은 정상 동작하는지 함께 확인.

- [ ] **Step 9: Commit**

```bash
git add index.html js/main.js css/style.css test/validate.mjs
git commit -m "refactor: remove floating heart background decoration entirely"
```

---

## 완료 기준

- [ ] `node test/validate.mjs` 전부 통과 (11개)
- [ ] `node --check js/main.js` 통과
- [ ] 실기기(폰)에서 표지·인사말·예식정보·갤러리·연락처·계좌 6개 섹션 모두 새 톤(아이보리/차콜/딥그린, 세리프 폰트)으로 보임
- [ ] 하트 이모지/핑크 파스텔 흔적이 전혀 없음
- [ ] 사용자가 직접 확인 후 컨펌
