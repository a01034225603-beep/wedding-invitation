# RSVP + 방명록 + 공유하기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 참석의사 전달(RSVP), 축하 메시지(방명록), 공유하기(링크 복사 + 카카오톡) 4가지 기능을 추가한다. 백엔드가 없는 정적 사이트이므로, RSVP/방명록은 Google Apps Script를 경량 백엔드로 사용하되 배포 전에도 페이지가 깨지지 않도록 방어적으로 구현한다.

**Architecture:** 순수 검증/페이로드 생성 로직은 `js/utils.js`에 추가해 Node로 단위 테스트한다(기존 `calcScrollProgress`, `buildTypingFrames`와 동일 패턴). `js/main.js`는 폼 이벤트를 받아 `utils.js` 함수로 검증·가공한 뒤 `weddingData.appsScriptUrl`로 `fetch`한다. `appsScriptUrl`/`kakaoJsKey`가 빈 문자열이면(아직 미배포 상태) 에러 없이 안내 토스트만 띄운다. Google Apps Script 소스는 `apps-script/Code.gs`에 참고용으로 작성해두되, 실제 배포·키 발급은 사용자가 Google/Kakao 계정에서 직접 진행해야 하므로 이 플랜의 스코프 밖이며 플랜 완료 후 별도로 단계별 안내한다.

**Tech Stack:** 순수 HTML/CSS/JS (ES modules, 빌드 도구 없음), Node 내장 `assert`, Google Apps Script(참고 소스만 포함)

**섹션 배치:** 표지 → 인사말 → 예식안내 → **RSVP(신규)** → 갤러리 → 연락처 → **방명록(신규)** → 계좌 → **공유하기(신규)** → 푸터

---

### Task 1: 설정 필드 추가 (`appsScriptUrl`, `kakaoJsKey`)

**Files:**
- Modify: `js/data.js`
- Modify: `test/validate.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/validate.mjs`의 마지막 `console.log` 직전에 추가:

```js
check("appsScriptUrl과 kakaoJsKey 필드가 문자열로 정의되어 있다 (배포 전에는 빈 문자열 허용)", () => {
  assert.equal(typeof weddingData.appsScriptUrl, "string");
  assert.equal(typeof weddingData.kakaoJsKey, "string");
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node test/validate.mjs`
Expected: FAIL — `weddingData.appsScriptUrl`이 `undefined`라 `typeof`가 `"undefined"`가 되어 assertion 실패

- [ ] **Step 3: `js/data.js`에 필드 추가**

`js/data.js`의 `mapLinks` 블록 바로 다음에 추가:

```js

  // Google Apps Script 배포 URL. 배포 전에는 빈 문자열로 두면 폼이 안전하게 안내 토스트만 띄운다.
  appsScriptUrl: "",
  // Kakao Developers JavaScript 키. 없으면 카카오 공유 버튼이 렌더링되지 않는다.
  kakaoJsKey: "",
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node test/validate.mjs`
Expected: 전부 PASS (기존 13개 + 신규 1개 = 14개)

- [ ] **Step 5: Commit**

```bash
git add js/data.js test/validate.mjs
git commit -m "feat: add appsScriptUrl and kakaoJsKey config fields (empty until deployed)"
```

---

### Task 2: RSVP 섹션 (TDD)

**Files:**
- Modify: `js/utils.js`
- Modify: `test/utils.test.mjs`
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/utils.test.mjs`의 import 라인을 교체:

```js
import {
  calcScrollProgress,
  buildTypingFrames,
  validateRsvpInput,
  buildRsvpPayload,
} from "../js/utils.js";
```

파일 끝, 마지막 `console.log` 직전에 추가:

```js
check("validateRsvpInput은 이름이 없으면 실패한다", () => {
  const result = validateRsvpInput({ name: "", attending: "yes", guestCount: "2" });
  assert.equal(result.valid, false);
});

check("validateRsvpInput은 참석 인원이 1 미만이면 실패한다", () => {
  const result = validateRsvpInput({ name: "홍길동", attending: "yes", guestCount: "0" });
  assert.equal(result.valid, false);
});

check("validateRsvpInput은 불참일 때 인원 검증을 건너뛴다", () => {
  const result = validateRsvpInput({ name: "홍길동", attending: "no", guestCount: "" });
  assert.equal(result.valid, true);
});

check("buildRsvpPayload는 불참일 때 인원을 0으로, 이름 앞뒤 공백을 제거해 정규화한다", () => {
  const payload = buildRsvpPayload({ name: " 홍길동 ", attending: "no", guestCount: "", meal: "" });
  assert.equal(payload.name, "홍길동");
  assert.equal(payload.guestCount, 0);
  assert.equal(payload.type, "rsvp");
});

check("buildRsvpPayload는 참석일 때 인원을 숫자로 변환한다", () => {
  const payload = buildRsvpPayload({ name: "홍길동", attending: "yes", guestCount: "3", meal: "yes" });
  assert.equal(payload.guestCount, 3);
  assert.equal(payload.meal, "yes");
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node test/utils.test.mjs`
Expected: FAIL — `validateRsvpInput`/`buildRsvpPayload`가 export되어 있지 않음

- [ ] **Step 3: `js/utils.js`에 구현 추가**

파일 끝에 추가:

```js

export function validateRsvpInput({ name, attending, guestCount }) {
  if (!name || !name.trim()) {
    return { valid: false, error: "이름을 입력해주세요." };
  }
  if (attending !== "yes" && attending !== "no") {
    return { valid: false, error: "참석 여부를 선택해주세요." };
  }
  if (attending === "yes") {
    const n = Number(guestCount);
    if (!Number.isInteger(n) || n < 1) {
      return { valid: false, error: "참석 인원을 올바르게 입력해주세요." };
    }
  }
  return { valid: true, error: "" };
}

export function buildRsvpPayload({ name, attending, guestCount, meal }) {
  return {
    type: "rsvp",
    name: name.trim(),
    attending,
    guestCount: attending === "yes" ? Number(guestCount) : 0,
    meal: attending === "yes" ? meal : "",
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node test/utils.test.mjs`
Expected: 전부 PASS (기존 8개 + 신규 5개 = 13개)

- [ ] **Step 5: `index.html`에 RSVP 섹션 마크업 추가**

`index.html`에서 `<!-- 4. 갤러리 -->` 주석 바로 앞(즉, `<!-- 3. 예식 안내 + 오시는 길 -->` 섹션의 닫는 `</section>` 다음)에 삽입:

```html
  <!-- 4. 참석의사 전달하기 -->
  <section id="rsvp" class="section rsvp">
    <p class="section-label" data-reveal>RSVP</p>
    <p class="rsvp-intro" data-reveal>참석 여부를 알려주시면 준비에 큰 도움이 됩니다.</p>
    <form class="rsvp-form" id="rsvp-form" data-reveal>
      <input type="text" name="name" placeholder="이름" required />
      <div class="rsvp-radio-group">
        <label><input type="radio" name="attending" value="yes" checked /> 참석</label>
        <label><input type="radio" name="attending" value="no" /> 불참</label>
      </div>
      <input type="number" name="guestCount" min="1" value="1" aria-label="참석 인원" />
      <select name="meal" aria-label="식사 여부">
        <option value="">식사 여부 (선택)</option>
        <option value="yes">식사 예정</option>
        <option value="no">식사 안 함</option>
      </select>
      <button type="submit">참석 의사 전달하기</button>
    </form>
  </section>

```

기존 `<!-- 4. 갤러리 -->` 주석은 `<!-- 5. 갤러리 -->`로, 이후 `<!-- 5. 연락처 -->`는 `<!-- 6. 연락처 -->`로, `<!-- 6. 마음 전하실 곳 (계좌) -->`는 `<!-- 8. 마음 전하실 곳 (계좌) -->`로 번호를 갱신한다 (Task 3에서 방명록이 `7`번으로 들어가므로). 번호는 주석일 뿐이라 기능에 영향 없지만, 다음 사람이 헷갈리지 않도록 맞춰준다.

- [ ] **Step 6: `js/main.js`에 RSVP 로직 추가**

import 라인 교체:

```js
import { weddingData } from "./data.js?v=20260804";
import {
  calcScrollProgress,
  buildTypingFrames,
  validateRsvpInput,
  buildRsvpPayload,
} from "./utils.js?v=20260804";
```

`renderContact` 함수 앞(또는 `renderInfo` 함수가 끝나는 지점 바로 다음)에 새 함수 추가:

```js
/* ---------- 4. 참석의사 전달하기(RSVP) ---------- */
function renderRsvp() {
  const form = document.getElementById("rsvp-form");
  if (!form) return;

  const guestCountInput = form.querySelector('input[name="guestCount"]');
  const mealSelect = form.querySelector('select[name="meal"]');

  const syncOptionalFields = () => {
    const attending = form.querySelector('input[name="attending"]:checked')?.value;
    const isAttending = attending === "yes";
    guestCountInput.disabled = !isAttending;
    mealSelect.disabled = !isAttending;
  };
  form.querySelectorAll('input[name="attending"]').forEach((radio) => {
    radio.addEventListener("change", syncOptionalFields);
  });
  syncOptionalFields();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const values = {
      name: form.elements.name.value,
      attending: form.querySelector('input[name="attending"]:checked')?.value,
      guestCount: guestCountInput.value,
      meal: mealSelect.value,
    };

    const validation = validateRsvpInput(values);
    if (!validation.valid) {
      showToast(validation.error);
      return;
    }

    if (!weddingData.appsScriptUrl) {
      showToast("RSVP 접수 준비 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const payload = buildRsvpPayload(values);
    try {
      await fetch(weddingData.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      showToast("참석 의사가 전달되었습니다. 감사합니다!");
      form.reset();
      syncOptionalFields();
    } catch (err) {
      console.error(err);
      showToast("전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  });
}
```

`init()` 함수에서 `renderInfo();` 다음 줄에 `renderRsvp();`를 추가:

```js
function init() {
  renderCover().catch(console.error);
  renderGreeting();
  renderInfo();
  renderRsvp();
  renderGallery();
  renderContact();
  renderAccounts();
  renderFooter();
  setupScrollReveal();
  setupScrollProgress();
}
```

- [ ] **Step 7: `css/style.css`에 폼 스타일 추가**

`/* ===== 4. 갤러리 ===== */` 주석 바로 앞에 추가:

```css
/* ===== RSVP 폼 ===== */
.rsvp-intro {
  font-size: 14px;
  color: var(--color-sub);
  margin: 0 0 28px;
}

.rsvp-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
}

.rsvp-form input[type="text"],
.rsvp-form input[type="number"],
.rsvp-form select {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  font-family: var(--font-base);
  color: var(--color-ink);
  background: #fff;
}

.rsvp-form input:disabled,
.rsvp-form select:disabled {
  opacity: 0.4;
}

.rsvp-radio-group {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: var(--color-ink);
}

.rsvp-radio-group label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rsvp-form button {
  border: none;
  background: var(--color-accent);
  color: #fff;
  border-radius: 999px;
  padding: 14px;
  font-size: 15px;
  font-weight: 700;
}

```

- [ ] **Step 8: 문법 확인**

Run: `node --check js/main.js && node --check js/utils.js && node test/utils.test.mjs && node test/validate.mjs`
Expected: 문법 에러 없음, `test/utils.test.mjs` 13/13, `test/validate.mjs` 14/14

- [ ] **Step 9: Commit**

```bash
git add index.html js/main.js js/utils.js css/style.css test/utils.test.mjs
git commit -m "feat: add RSVP form with client-side validation (safe no-op until backend deployed)"
```

---

### Task 3: 방명록 섹션 (TDD)

**Files:**
- Modify: `js/utils.js`
- Modify: `test/utils.test.mjs`
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/utils.test.mjs`의 import 라인을 교체:

```js
import {
  calcScrollProgress,
  buildTypingFrames,
  validateRsvpInput,
  buildRsvpPayload,
  validateGuestbookInput,
  buildGuestbookPayload,
} from "../js/utils.js";
```

파일 끝, 마지막 `console.log` 직전에 추가:

```js
check("validateGuestbookInput은 이름이 없으면 실패한다", () => {
  const result = validateGuestbookInput({ name: "", message: "축하해요" });
  assert.equal(result.valid, false);
});

check("validateGuestbookInput은 메시지가 없으면 실패한다", () => {
  const result = validateGuestbookInput({ name: "홍길동", message: "   " });
  assert.equal(result.valid, false);
});

check("buildGuestbookPayload는 이름/메시지 앞뒤 공백을 제거한다", () => {
  const payload = buildGuestbookPayload({ name: " 홍길동 ", message: " 축하해요 " });
  assert.equal(payload.name, "홍길동");
  assert.equal(payload.message, "축하해요");
  assert.equal(payload.type, "guestbook");
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node test/utils.test.mjs`
Expected: FAIL — `validateGuestbookInput`/`buildGuestbookPayload`가 export되어 있지 않음

- [ ] **Step 3: `js/utils.js`에 구현 추가**

파일 끝에 추가:

```js

export function validateGuestbookInput({ name, message }) {
  if (!name || !name.trim()) {
    return { valid: false, error: "이름을 입력해주세요." };
  }
  if (!message || !message.trim()) {
    return { valid: false, error: "메시지를 입력해주세요." };
  }
  return { valid: true, error: "" };
}

export function buildGuestbookPayload({ name, message }) {
  return {
    type: "guestbook",
    name: name.trim(),
    message: message.trim(),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node test/utils.test.mjs`
Expected: 전부 PASS (기존 13개 + 신규 3개 = 16개)

- [ ] **Step 5: `index.html`에 방명록 섹션 마크업 추가**

`<!-- 6. 연락처 -->` 섹션의 닫는 `</section>` 다음, `<!-- 8. 마음 전하실 곳 (계좌) -->` 앞에 삽입:

```html
  <!-- 7. 방명록 -->
  <section id="guestbook" class="section guestbook">
    <p class="section-label" data-reveal>GUESTBOOK</p>
    <form class="guestbook-form" id="guestbook-form" data-reveal>
      <input type="text" name="name" placeholder="이름" required />
      <textarea name="message" placeholder="축하 메시지를 남겨주세요" required></textarea>
      <button type="submit">메시지 남기기</button>
    </form>
    <div class="guestbook-list" id="guestbook-list"></div>
  </section>

```

- [ ] **Step 6: `js/main.js`에 방명록 로직 추가**

import 라인 교체:

```js
import { weddingData } from "./data.js?v=20260804";
import {
  calcScrollProgress,
  buildTypingFrames,
  validateRsvpInput,
  buildRsvpPayload,
  validateGuestbookInput,
  buildGuestbookPayload,
} from "./utils.js?v=20260804";
```

`renderAccounts` 함수 앞에 새 함수들 추가:

```js
/* ---------- 7. 방명록 ---------- */
function renderGuestbookEntries(entries) {
  const list = document.getElementById("guestbook-list");
  if (!list) return;
  list.innerHTML = "";

  if (!entries.length) {
    list.appendChild(el("p", "guestbook-empty", "아직 남겨진 메시지가 없습니다."));
    return;
  }

  for (const entry of entries) {
    const item = el("div", "guestbook-item");
    item.appendChild(el("div", "guestbook-name", entry.name));
    item.appendChild(el("div", "guestbook-message", entry.message));
    list.appendChild(item);
  }
}

async function loadGuestbookEntries() {
  if (!weddingData.appsScriptUrl) return;
  try {
    const res = await fetch(`${weddingData.appsScriptUrl}?type=guestbook`);
    const data = await res.json();
    renderGuestbookEntries(Array.isArray(data.entries) ? data.entries : []);
  } catch (err) {
    console.error(err);
  }
}

function renderGuestbook() {
  const form = document.getElementById("guestbook-form");
  if (!form) return;

  loadGuestbookEntries();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const values = {
      name: form.elements.name.value,
      message: form.elements.message.value,
    };

    const validation = validateGuestbookInput(values);
    if (!validation.valid) {
      showToast(validation.error);
      return;
    }

    if (!weddingData.appsScriptUrl) {
      showToast("방명록 준비 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const payload = buildGuestbookPayload(values);
    try {
      await fetch(weddingData.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      showToast("메시지가 등록되었습니다. 감사합니다!");
      form.reset();
      await loadGuestbookEntries();
    } catch (err) {
      console.error(err);
      showToast("등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  });
}
```

`init()`에서 `renderContact();` 다음 줄에 `renderGuestbook();` 추가:

```js
function init() {
  renderCover().catch(console.error);
  renderGreeting();
  renderInfo();
  renderRsvp();
  renderGallery();
  renderContact();
  renderGuestbook();
  renderAccounts();
  renderFooter();
  setupScrollReveal();
  setupScrollProgress();
}
```

- [ ] **Step 7: `css/style.css`에 방명록 스타일 추가**

`/* ===== 6. 계좌 ===== */` 주석 바로 앞에 추가 (RSVP 스타일 블록에서 이어지는 위치):

```css
/* ===== 방명록 ===== */
.guestbook-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
}

.guestbook-form input[type="text"],
.guestbook-form textarea {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  font-family: var(--font-base);
  color: var(--color-ink);
  background: #fff;
}

.guestbook-form textarea {
  min-height: 90px;
  resize: vertical;
}

.guestbook-form button {
  border: none;
  background: var(--color-accent);
  color: #fff;
  border-radius: 999px;
  padding: 14px;
  font-size: 15px;
  font-weight: 700;
}

.guestbook-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 28px;
  text-align: left;
}

.guestbook-item {
  background: #fff;
  border: 2px solid var(--color-line);
  border-radius: 16px;
  padding: 14px 16px;
}

.guestbook-name {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--color-accent);
  margin-bottom: 4px;
}

.guestbook-message {
  font-size: 14px;
  color: var(--color-ink);
  white-space: pre-line;
}

.guestbook-empty {
  font-size: 13px;
  color: var(--color-sub);
  margin-top: 28px;
}

```

- [ ] **Step 8: 문법 확인**

Run: `node --check js/main.js && node --check js/utils.js && node test/utils.test.mjs && node test/validate.mjs`
Expected: 문법 에러 없음, `test/utils.test.mjs` 16/16, `test/validate.mjs` 14/14

- [ ] **Step 9: Commit**

```bash
git add index.html js/main.js js/utils.js css/style.css test/utils.test.mjs
git commit -m "feat: add guestbook form and message list (safe no-op until backend deployed)"
```

---

### Task 4: 공유하기 — 링크 복사 + 카카오 버튼 자리 마련

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`

카카오 SDK 연동 코드(정확한 CDN URL/버전)는 실제 `kakaoJsKey` 발급 시점에 Kakao Developers 공식 문서를 직접 확인하여 반영한다 (이 플랜 스코프 밖, 플랜 완료 후 별도 안내). 이번 태스크에서는 링크 복사는 완전히 동작하게, 카카오 버튼은 키가 없으면 숨겨지는 자리만 만든다.

- [ ] **Step 1: `index.html`에 공유하기 섹션 마크업 추가**

`<!-- 8. 마음 전하실 곳 (계좌) -->` 섹션의 닫는 `</section>` 다음, `<footer class="footer">` 앞에 삽입:

```html
  <!-- 9. 공유하기 -->
  <section id="share" class="section share">
    <p class="section-label" data-reveal>SHARE</p>
    <div class="share-buttons" id="share-buttons" data-reveal>
      <button type="button" class="share-btn" id="copy-link-btn">청첩장 링크 복사</button>
      <button type="button" class="share-btn kakao" id="kakao-share-btn" hidden>카카오톡으로 공유</button>
    </div>
  </section>

```

- [ ] **Step 2: `js/main.js`에 공유하기 로직 추가**

`renderFooter` 함수 앞에 새 함수 추가:

```js
/* ---------- 9. 공유하기 ---------- */
function renderShare() {
  const copyBtn = document.getElementById("copy-link-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(window.location.href);
      showToast(ok ? "링크가 복사되었습니다" : "복사에 실패했습니다");
    });
  }

  // 카카오 공유 버튼: kakaoJsKey가 없으면 숨김 상태 유지 (SDK 연동은 키 발급 후 별도 작업)
  const kakaoBtn = document.getElementById("kakao-share-btn");
  if (kakaoBtn && weddingData.kakaoJsKey) {
    kakaoBtn.hidden = false;
  }
}
```

`init()`에서 `renderAccounts();` 다음 줄에 `renderShare();` 추가:

```js
function init() {
  renderCover().catch(console.error);
  renderGreeting();
  renderInfo();
  renderRsvp();
  renderGallery();
  renderContact();
  renderGuestbook();
  renderAccounts();
  renderShare();
  renderFooter();
  setupScrollReveal();
  setupScrollProgress();
}
```

- [ ] **Step 3: `css/style.css`에 공유 버튼 스타일 추가**

`/* ===== 푸터 ===== */` 주석 바로 앞에 추가:

```css
/* ===== 공유하기 ===== */
.share-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-btn {
  border: 1px solid var(--color-accent);
  background: #fff;
  color: var(--color-accent);
  border-radius: 999px;
  padding: 14px;
  font-size: 15px;
  font-weight: 700;
}

.share-btn.kakao {
  border: none;
  background: #fee500;
  color: #191600;
}

.share-btn.kakao[hidden] {
  display: none;
}

```

- [ ] **Step 4: 문법 확인**

Run: `node --check js/main.js && node -e "require('fs').readFileSync('css/style.css','utf8')" && echo OK && node -e "require('fs').readFileSync('index.html','utf8')" && echo OK`
Expected: 문법 에러 없음

- [ ] **Step 5: 실기기 확인**

폰에서 "청첩장 링크 복사" 버튼을 눌러 실제로 클립보드에 복사되고 토스트가 뜨는지 확인. 카카오 버튼은 키가 없으므로 안 보이는 게 정상.

- [ ] **Step 6: Commit**

```bash
git add index.html js/main.js css/style.css
git commit -m "feat: add share section with working link-copy and kakao button placeholder"
```

---

### Task 5: Google Apps Script 백엔드 소스 작성 (참고용, 배포는 별도 진행)

**Files:**
- Create: `apps-script/Code.gs`

이 파일은 웹사이트에 배포되지 않는다 — Google Apps Script 편집기에 사용자가 직접 붙여넣을 참고 소스다. Node로 실행/테스트할 수 없다 (Google Apps Script 전용 런타임 API인 `SpreadsheetApp`, `ContentService` 사용).

- [ ] **Step 1: `apps-script/Code.gs` 작성**

```js
// Google Apps Script 백엔드 (RSVP + 방명록)
// 사용법: script.google.com에서 새 프로젝트 생성 후 이 코드를 Code.gs에 붙여넣고,
// 아래 SHEET_ID를 실제 Google Sheet ID로 교체한 다음 웹 앱으로 배포한다.
// (배포 절차는 별도 안내 문서 참고)

const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
const RSVP_SHEET_NAME = "RSVP응답";
const GUESTBOOK_SHEET_NAME = "방명록";

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(SHEET_ID);

  if (data.type === "rsvp") {
    const sheet = ss.getSheetByName(RSVP_SHEET_NAME);
    sheet.appendRow([
      new Date(),
      data.name,
      data.attending === "yes" ? "참석" : "불참",
      data.guestCount,
      data.meal || "",
    ]);
  } else if (data.type === "guestbook") {
    const sheet = ss.getSheetByName(GUESTBOOK_SHEET_NAME);
    sheet.appendRow([new Date(), data.name, data.message]);
  } else {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "unknown type" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e.parameter || e.parameter.type !== "guestbook") {
    return ContentService
      .createTextOutput(JSON.stringify({ entries: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(GUESTBOOK_SHEET_NAME);
  const rows = sheet.getDataRange().getValues(); // [날짜, 이름, 메시지]

  const entries = rows
    .slice(1) // 헤더 행 제외
    .filter((row) => row[1])
    .map((row) => ({ name: row[1], message: row[2] }))
    .reverse(); // 최신순

  return ContentService
    .createTextOutput(JSON.stringify({ entries: entries }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 2: 문법 확인**

Run: `node --check apps-script/Code.gs`
Expected: Google Apps Script는 표준 JS 문법이라 Node 문법 검사 자체는 통과함 (단, `SpreadsheetApp`/`ContentService`는 Node에 없으므로 이 파일을 `import`/`require`하지 않는다 — 문법 검증 목적으로만 사용). `SyntaxError` 없이 통과하면 OK.

- [ ] **Step 3: Commit**

```bash
git add apps-script/Code.gs
git commit -m "docs: add reference Google Apps Script backend source for RSVP/guestbook"
```

---

## 완료 기준

- [ ] `node test/utils.test.mjs` 전부 통과 (16개)
- [ ] `node test/validate.mjs` 전부 통과 (14개)
- [ ] `node --check js/main.js`, `node --check js/utils.js` 통과
- [ ] 실기기에서 RSVP 폼 제출 시 (백엔드 미배포 상태) "준비 중" 토스트가 뜨고 페이지가 깨지지 않음
- [ ] 실기기에서 방명록 폼도 동일하게 안전하게 동작
- [ ] 링크 복사 버튼이 실제로 동작
- [ ] 카카오 버튼은 키가 없으므로 보이지 않음 (정상)
- [ ] 사용자 컨펌

## 이 플랜 이후 (별도 진행, 라이브 가이드)

- Google Apps Script 배포: Google 계정 로그인 필요 → 단계별로 안내하며 사용자가 직접 진행 → 완료 후 `js/data.js`의 `appsScriptUrl`에 실제 배포 URL 반영
- Kakao Developers 앱 생성 및 JS 키 발급: Kakao 계정 필요 → 단계별로 안내하며 사용자가 직접 진행 → 완료 후 `js/data.js`의 `kakaoJsKey`에 실제 키 반영 + 공식 문서 기준 SDK 스니펫을 `renderShare()`에 추가
