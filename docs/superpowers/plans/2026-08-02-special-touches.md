# 특별한 인터랙션 추가 (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 표지 인트로 타이핑 애니메이션, 갤러리 캐러셀, 상단 스크롤 진행률 바 3가지를 추가해 청첩장에 재미와 완성도를 더한다.

**Architecture:** DOM 조작이 필요 없는 순수 로직(타이핑 프레임 생성, 스크롤 진행률 계산)은 새 파일 `js/utils.js`로 분리해 Node 환경에서 `assert` 기반으로 단위 테스트한다(기존 `js/main.js`는 최상위에서 `document`를 참조하므로 Node에서 직접 import할 수 없음 — 그래서 로직을 분리). `js/main.js`는 `utils.js`의 함수를 가져다 DOM에 적용만 한다. 갤러리 캐러셀은 순수 CSS(`scroll-snap`)로 구현하고 기존 `renderGallery()`의 DOM 생성 로직은 건드리지 않는다.

**Tech Stack:** 순수 HTML/CSS/JS (ES modules, 빌드 도구 없음), Node 내장 `assert`

---

### Task 1: 스크롤 진행률 계산 로직 + 표시 바 (TDD)

**Files:**
- Create: `js/utils.js`
- Create: `test/utils.test.mjs`
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `test/utils.test.mjs`:

```js
// js/utils.js 순수 함수 단위 테스트 (Node 내장 assert만 사용, DOM 불필요)
// 실행: node test/utils.test.mjs
import assert from "node:assert/strict";
import { calcScrollProgress } from "../js/utils.js";

let passCount = 0;
function check(name, fn) {
  fn();
  passCount++;
  console.log(`PASS: ${name}`);
}

check("스크롤이 맨 위일 때 진행률은 0이다", () => {
  assert.equal(calcScrollProgress(0, 2000, 800), 0);
});

check("스크롤이 맨 아래일 때 진행률은 100이다", () => {
  assert.equal(calcScrollProgress(1200, 2000, 800), 100);
});

check("스크롤이 중간일 때 진행률은 비율대로 계산된다", () => {
  assert.equal(calcScrollProgress(600, 2000, 800), 50);
});

check("scrollTop이 스크롤 가능 범위를 넘어도 100을 넘지 않는다", () => {
  assert.equal(calcScrollProgress(9999, 2000, 800), 100);
});

check("콘텐츠가 화면보다 작아 스크롤이 불가능하면 0을 반환한다", () => {
  assert.equal(calcScrollProgress(0, 500, 800), 0);
});

console.log(`\n총 ${passCount}개 검증 통과`);
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node test/utils.test.mjs`
Expected: FAIL — `js/utils.js` 파일이 없어서 모듈 로드 에러(`Cannot find module`) 발생

- [ ] **Step 3: `js/utils.js` 최소 구현**

Create `js/utils.js`:

```js
export function calcScrollProgress(scrollTop, scrollHeight, clientHeight) {
  const scrollable = scrollHeight - clientHeight;
  if (scrollable <= 0) return 0;
  const ratio = (scrollTop / scrollable) * 100;
  return Math.min(100, Math.max(0, ratio));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node test/utils.test.mjs`
Expected: 5개 전부 PASS, `총 5개 검증 통과` 출력

- [ ] **Step 5: `index.html`에 진행률 바 엘리먼트 추가**

`index.html`의 `<body>` 여는 태그 바로 다음(현재 `<body>\n\n  <!-- 1. 표지 -->` 사이 빈 줄 자리)에 추가:

```html
  <div class="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
```

- [ ] **Step 6: `css/style.css`에 스타일 추가**

파일 끝에 추가:

```css
/* ===== 스크롤 진행률 바 ===== */
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 0%;
  background: var(--color-accent);
  z-index: 300;
  pointer-events: none;
}
```

- [ ] **Step 7: `js/main.js`에서 `utils.js` import 및 진행률 바 연결**

`js/main.js` 최상단의 import를 아래로 교체:

```js
import { weddingData } from "./data.js";
import { calcScrollProgress } from "./utils.js";
```

`js/main.js`의 `setupScrollReveal` 함수 바로 다음에 새 함수 추가:

```js
/* ---------- 스크롤 진행률 바 ---------- */
function setupScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;

  let ticking = false;
  const update = () => {
    const progress = calcScrollProgress(
      window.scrollY,
      document.documentElement.scrollHeight,
      window.innerHeight
    );
    bar.style.width = `${progress}%`;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  });

  update();
}
```

`js/main.js`의 `init()` 함수에서:

```js
function init() {
  renderCover();
  renderGreeting();
  renderInfo();
  renderGallery();
  renderContact();
  renderAccounts();
  renderFooter();
  setupScrollReveal();
}
```

를 아래로 교체:

```js
function init() {
  renderCover();
  renderGreeting();
  renderInfo();
  renderGallery();
  renderContact();
  renderAccounts();
  renderFooter();
  setupScrollReveal();
  setupScrollProgress();
}
```

- [ ] **Step 8: 문법 확인**

Run: `node --check js/main.js && node --check js/utils.js && node test/utils.test.mjs && node test/validate.mjs`
Expected: 문법 에러 없음, 두 테스트 파일 모두 전부 통과

- [ ] **Step 9: 실기기 확인**

폰에서 새로고침 후 스크롤하면서 상단에 딥그린 진행률 바가 채워지는지 확인.

- [ ] **Step 10: Commit**

```bash
git add index.html js/main.js js/utils.js css/style.css test/utils.test.mjs
git commit -m "feat: add scroll progress bar with unit-tested progress calculation"
```

---

### Task 2: 표지 인트로 타이핑 애니메이션 (TDD)

**Files:**
- Modify: `js/utils.js`
- Modify: `test/utils.test.mjs`
- Modify: `js/main.js`
- Modify: `css/style.css`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/utils.test.mjs`에 `import` 라인을 아래로 교체:

```js
import { calcScrollProgress, buildTypingFrames } from "../js/utils.js";
```

파일 끝, 마지막 `console.log` 직전에 추가:

```js
check("buildTypingFrames는 한 글자씩 늘어나는 프레임 배열을 만든다", () => {
  assert.deepEqual(buildTypingFrames("AB"), ["A", "AB"]);
});

check("buildTypingFrames는 빈 문자열에 대해 빈 배열을 반환한다", () => {
  assert.deepEqual(buildTypingFrames(""), []);
});

check("buildTypingFrames의 마지막 프레임은 원본 문자열과 같다", () => {
  const text = "WEDDING INVITATION";
  const frames = buildTypingFrames(text);
  assert.equal(frames[frames.length - 1], text);
  assert.equal(frames.length, text.length);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node test/utils.test.mjs`
Expected: FAIL — `buildTypingFrames` is not exported / undefined

- [ ] **Step 3: `js/utils.js`에 `buildTypingFrames` 구현**

`js/utils.js` 끝에 추가:

```js

export function buildTypingFrames(text) {
  const frames = [];
  for (let i = 1; i <= text.length; i++) {
    frames.push(text.slice(0, i));
  }
  return frames;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node test/utils.test.mjs`
Expected: 8개 전부 PASS (기존 5개 + 신규 3개)

- [ ] **Step 5: `js/main.js`에 타이핑 연출 연결**

`js/main.js`의 import를 아래로 교체:

```js
import { weddingData } from "./data.js";
import { calcScrollProgress, buildTypingFrames } from "./utils.js";
```

`toDigits` 함수 다음, `/* ---------- 스크롤 등장 애니메이션 ---------- */` 주석 앞에 추가:

```js
/* ---------- 타이핑 애니메이션 ---------- */
function prefersReducedMotion() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function typeText(target, text, speed = 55) {
  return new Promise((resolve) => {
    if (prefersReducedMotion()) {
      target.textContent = text;
      resolve();
      return;
    }

    const frames = buildTypingFrames(text);
    target.textContent = "";
    let i = 0;
    const timer = setInterval(() => {
      target.textContent = frames[i];
      i++;
      if (i >= frames.length) {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
}
```

`js/main.js`의 `renderCover` 함수를 아래로 교체:

```js
/* ---------- 1. 표지 ---------- */
async function renderCover() {
  const coverImage = document.getElementById("cover-image");
  coverImage.style.backgroundImage = `url("${PHOTOS_DIR}${weddingData.coverPhoto}")`;

  const eyebrowEl = document.querySelector(".cover-eyebrow");
  const namesEl = document.getElementById("cover-names");
  const dateEl = document.getElementById("cover-date");

  const eyebrowText = eyebrowEl.textContent;
  const namesText = `${weddingData.groom.name} · ${weddingData.bride.name}`;

  dateEl.textContent = weddingData.dateDisplay;
  dateEl.classList.add("cover-date-pending");

  await typeText(eyebrowEl, eyebrowText);
  await typeText(namesEl, namesText);

  dateEl.classList.remove("cover-date-pending");
}
```

- [ ] **Step 6: `css/style.css`에 날짜 페이드인 스타일 추가**

`.cover-date` 규칙을 아래로 교체:

```css
.cover-date {
  font-family: var(--font-base);
  font-size: 15px;
  opacity: 0.92;
  margin: 0;
  letter-spacing: 0.5px;
  transition: opacity 0.6s ease;
}

.cover-date-pending {
  opacity: 0;
}
```

- [ ] **Step 7: 문법 확인**

Run: `node --check js/main.js && node --check js/utils.js && node test/utils.test.mjs && node test/validate.mjs`
Expected: 문법 에러 없음, 전부 통과

- [ ] **Step 8: 실기기 확인**

폰에서 새로고침 후 표지에서 "WEDDING INVITATION" → "김재원 · 이예지" 순서로 타이핑되고, 끝나면 날짜가 페이드인되는지 확인. (기기 설정에서 "동작 줄이기"가 켜져 있으면 타이핑 없이 바로 표시되는 것도 정상)

- [ ] **Step 9: Commit**

```bash
git add js/main.js js/utils.js css/style.css test/utils.test.mjs
git commit -m "feat: add typewriter intro animation to cover section"
```

---

### Task 3: 갤러리 캐러셀 전환

**Files:**
- Modify: `css/style.css`

이 태스크는 순수 시각적 CSS 변경이라 자동화 테스트 대상이 없다. `renderGallery()`의 DOM 생성 로직(JS)은 변경하지 않는다 — 이미 각 사진마다 `<img>`를 생성하고 클릭 시 라이트박스를 여는 로직이 있으므로, 레이아웃만 그리드에서 가로 캐러셀로 바꾸면 클릭/라이트박스 동작은 그대로 유지된다.

- [ ] **Step 1: `.gallery-grid`를 flex 캐러셀로 전환**

`css/style.css`에서 `.gallery-grid`와 `.gallery-grid img` 규칙을 찾아 교체.

기존:
```css
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.gallery-grid img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 14px;
  box-shadow: 0 4px 10px rgba(74, 20, 60, 0.12);
  transition: transform 0.15s ease;
}
```

교체 후:
```css
.gallery-grid {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding: 0 15%;
  gap: 14px;
  padding: 0 15%;
  -webkit-overflow-scrolling: touch;
  margin: 0 -28px;
  padding-left: calc(15% + 28px);
  padding-right: calc(15% + 28px);
}

.gallery-grid img {
  flex: 0 0 70%;
  width: 70%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 14px;
  box-shadow: 0 4px 10px rgba(var(--color-ink-rgb), 0.12);
  scroll-snap-align: center;
  transition: transform 0.15s ease;
}
```

주: `box-shadow` 색상값이 기존에 `rgba(74, 20, 60, 0.12)`로, 이전 디자인 리뉴얼 작업(Task 3)에서 놓친 하드코딩된 구식 색상이었다. 이번에 같은 규칙을 손대는 김에 새 토큰(`--color-ink-rgb`)으로 함께 정리한다.

`margin: 0 -28px`와 좌우 `padding`을 쓴 이유: `.section`이 `padding: 100px 28px`를 가지고 있어 캐러셀이 그 안에 갇히면 좌우 peek 효과가 화면 가장자리까지 닿지 못한다. 캐러셀만 부모의 좌우 패딩을 상쇄(`margin: 0 -28px`)한 뒤 자체 패딩으로 peek 여백(15%)과 원래 패딩(28px)을 더해 화면 가장자리 기준으로 자연스럽게 보이게 한다.

- [ ] **Step 2: 문법 확인**

Run: `node -e "require('fs').readFileSync('css/style.css','utf8')" && echo OK`

- [ ] **Step 3: 실기기 확인**

폰에서 갤러리 섹션까지 스크롤 후, 좌우로 스와이프하며 사진이 한 장씩 스냅되는지, 양옆 사진이 살짝 보이는지, 탭하면 라이트박스가 열리는지 확인.

- [ ] **Step 4: Commit**

```bash
git add css/style.css
git commit -m "style: convert gallery grid to swipeable scroll-snap carousel"
```

---

## 완료 기준

- [ ] `node test/utils.test.mjs` 전부 통과 (8개)
- [ ] `node test/validate.mjs` 전부 통과 (11개)
- [ ] `node --check js/main.js`, `node --check js/utils.js` 통과
- [ ] 실기기에서 타이핑 인트로, 스크롤 진행률 바, 갤러리 캐러셀 3가지 모두 정상 동작 확인
- [ ] 사용자 컨펌
