# 계좌 섹션 연락처 패턴 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계좌 섹션을 아코디언(마음 전하실 곳 토글 → 평평한 6줄 리스트) 방식에서, 연락처 섹션과 동일한 "신랑측/신부측 버튼 → 모달" 방식으로 바꾸고, 부모님 4분의 실제 계좌를 추가한다.

**Architecture:** `weddingData.accounts`에 `side`("groom"|"bride") 필드를 추가해 6건으로 확장한다. `index.html`의 계좌 섹션 마크업을 연락처 섹션과 동일한 구조(`contact-side` 버튼 2개)로 교체하고, 계좌 전용 모달(`account-modal`)을 `contact-modal`과 동일한 CSS 클래스로 재사용해 신규 CSS를 최소화한다. `js/main.js`의 `renderAccounts()`를 `renderContact()`/`openContactModal()` 패턴을 그대로 복제해 재작성한다.

**Tech Stack:** Vanilla JS (ES modules), 순수 HTML/CSS, Node 내장 `assert`(테스트), 정적 파일 - 별도 빌드 없음.

---

## 파일 변경 범위

- `js/data.js`: `accounts` 배열 2건 → 6건, 각 항목에 `side` 필드 추가
- `index.html`: 계좌 섹션 마크업 단순화(버튼 2개), `account-modal` 신규 추가
- `js/main.js`: `renderAccounts()` 재작성, `openAccountModal()`/`closeAccountModal()` 신규 추가, 아코디언 토글 로직 삭제
- `css/style.css`: 아코디언 전용 규칙 삭제(`.accordion-toggle`, `.chevron`, `.accounts-panel`, 미사용 `.account-list`), 나머지는 기존 `.contact-*`/`.account-row`/`.copy-btn` 재사용이라 신규 규칙 없음
- `test/validate.mjs`: 계좌 6건 + `side` 필드 검증으로 기존 "2건" 검증 대체

---

### Task 1: 계좌 데이터 확장 (`js/data.js`)

**Files:**
- Modify: `test/validate.mjs:77-82` (기존 "계좌 정보 2건" 검증)
- Modify: `js/data.js:49-55` (`accountsIntro`, `accounts` 배열)

- [ ] **Step 1: 실패하는 테스트로 먼저 수정**

`test/validate.mjs`의 기존 블록:

```js
check("계좌 정보 2건(신랑/신부)이 존재한다", () => {
  assert.equal(weddingData.accounts.length, 2);
  for (const acc of weddingData.accounts) {
    assert.ok(acc.holder && acc.bank && acc.number);
  }
});
```

을 다음으로 교체:

```js
check("계좌 정보 6건(신랑/신랑 부모/신부/신부 부모)이 side 필드와 함께 존재한다", () => {
  assert.equal(weddingData.accounts.length, 6);
  for (const acc of weddingData.accounts) {
    assert.ok(acc.holder && acc.bank && acc.number, "holder/bank/number 필요");
    assert.match(acc.side, /^(groom|bride)$/, "side는 groom 또는 bride");
  }
  const groomCount = weddingData.accounts.filter((a) => a.side === "groom").length;
  const brideCount = weddingData.accounts.filter((a) => a.side === "bride").length;
  assert.equal(groomCount, 3, "신랑측 계좌는 3건(본인/아버지/어머니)");
  assert.equal(brideCount, 3, "신부측 계좌는 3건(본인/아버지/어머니)");
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd "/Users/kjw/모바일청첩장/wedding-invitation" && node test/validate.mjs`
Expected: FAIL — `AssertionError` at `assert.equal(weddingData.accounts.length, 6)` (현재 2건이므로)

- [ ] **Step 3: `js/data.js`의 `accounts` 배열을 6건으로 확장**

`js/data.js:52-55`의 기존:

```js
  accounts: [
    { role: "신랑", holder: "김재원", bank: "신한", number: "110-393-403899" },
    { role: "신부", holder: "이예지", bank: "신한", number: "110-031-619449" },
  ],
```

을 다음으로 교체:

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

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd "/Users/kjw/모바일청첩장/wedding-invitation" && node test/validate.mjs`
Expected: PASS — 전체 14개 검증(수정된 항목 포함) 통과

- [ ] **Step 5: 커밋**

```bash
cd "/Users/kjw/모바일청첩장/wedding-invitation"
git add js/data.js test/validate.mjs
git commit -m "feat: 계좌 데이터에 부모님 4분 추가하고 side 필드로 신랑/신부측 구분"
```

---

### Task 2: 계좌 섹션 HTML을 연락처 패턴으로 교체 (`index.html`)

**Files:**
- Modify: `index.html:116-126` (계좌 섹션)
- Modify: `index.html:149-156` 다음에 계좌 모달 추가

- [ ] **Step 1: 계좌 섹션 마크업 교체**

`index.html:116-126`의 기존:

```html
  <!-- 8. 마음 전하실 곳 (계좌) -->
  <section id="accounts" class="section accounts">
    <p class="section-label" data-reveal>ACCOUNT</p>
    <button type="button" class="accordion-toggle" id="accounts-toggle" data-reveal>
      마음 전하실 곳 <span class="chevron">▾</span>
    </button>
    <div class="accounts-panel" id="accounts-panel" hidden>
      <p class="accounts-intro" id="accounts-intro"></p>
      <div class="account-list" id="account-list"></div>
    </div>
  </section>
```

을 다음으로 교체:

```html
  <!-- 8. 마음 전하실 곳 (계좌) -->
  <section id="accounts" class="section accounts">
    <p class="section-label" data-reveal>ACCOUNT</p>
    <div class="contact-list" id="account-side-list"></div>
  </section>
```

- [ ] **Step 2: 계좌 모달 마크업 추가**

`index.html:149-156`의 연락처 모달 블록 바로 다음(방명록 모달 없음, 156번째 줄 `</div>` 이후, 158번째 줄 `<!-- 복사 완료 토스트 -->` 이전)에 아래 블록 삽입:

```html
  <!-- 계좌 모달 -->
  <div class="contact-modal" id="account-modal" hidden>
    <div class="contact-modal-panel">
      <button type="button" class="contact-modal-close" id="account-modal-close" aria-label="닫기">✕</button>
      <h3 class="contact-modal-title" id="account-modal-title"></h3>
      <p class="accounts-intro" id="account-modal-intro"></p>
      <div class="contact-modal-list" id="account-modal-list"></div>
    </div>
  </div>
```

- [ ] **Step 3: 구문 확인**

Run: `cd "/Users/kjw/모바일청첩장/wedding-invitation" && node -e "require('fs').readFileSync('index.html','utf8')" && echo "read ok"`
Expected: `read ok` 출력 (HTML은 별도 파서 검증 도구가 없어 파일 읽기 성공 여부만 1차 확인, 실제 렌더링은 Task 3 완료 후 로컬 서버로 확인)

- [ ] **Step 4: 커밋**

```bash
cd "/Users/kjw/모바일청첩장/wedding-invitation"
git add index.html
git commit -m "feat: 계좌 섹션 마크업을 연락처 버튼+모달 구조로 교체"
```

---

### Task 3: `renderAccounts()` 재작성 + 계좌 모달 열기/닫기 (`js/main.js`)

**Files:**
- Modify: `js/main.js:586-619` (`renderAccounts()`)

- [ ] **Step 1: 기존 `renderAccounts()`를 신규 함수 3개로 교체**

`js/main.js:586-619`의 기존:

```js
/* ---------- 6. 계좌 ---------- */
function renderAccounts() {
  document.getElementById("accounts-intro").textContent = weddingData.accountsIntro;

  const list = document.getElementById("account-list");
  list.innerHTML = "";

  for (const acc of weddingData.accounts) {
    const row = el("div", "account-row");

    const info = el("div", "acc-info");
    info.appendChild(el("div", "acc-role", `${acc.role} · ${acc.holder}`));
    info.appendChild(el("div", "acc-detail", `${acc.bank} ${acc.number}`));
    row.appendChild(info);

    const copyBtn = el("button", "copy-btn", "복사");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(acc.number);
      showToast(ok ? "계좌번호가 복사되었습니다" : "복사에 실패했습니다");
    });
    row.appendChild(copyBtn);

    list.appendChild(row);
  }

  const toggle = document.getElementById("accounts-toggle");
  const panel = document.getElementById("accounts-panel");
  toggle.addEventListener("click", () => {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });
}
```

을 다음으로 교체:

```js
/* ---------- 6. 계좌 ---------- */
function openAccountModal(title, accounts) {
  document.getElementById("account-modal-title").textContent = title;
  document.getElementById("account-modal-intro").textContent = weddingData.accountsIntro;

  const list = document.getElementById("account-modal-list");
  list.innerHTML = "";
  for (const acc of accounts) {
    const row = el("div", "account-row");

    const info = el("div", "acc-info");
    info.appendChild(el("div", "acc-role", `${acc.role} · ${acc.holder}`));
    info.appendChild(el("div", "acc-detail", `${acc.bank} ${acc.number}`));
    row.appendChild(info);

    const copyBtn = el("button", "copy-btn", "복사");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(acc.number);
      showToast(ok ? "계좌번호가 복사되었습니다" : "복사에 실패했습니다");
    });
    row.appendChild(copyBtn);

    list.appendChild(row);
  }

  document.getElementById("account-modal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeAccountModal() {
  document.getElementById("account-modal").hidden = true;
  document.body.style.overflow = "";
}

function renderAccounts() {
  const list = document.getElementById("account-side-list");
  list.innerHTML = "";

  const sides = [
    { key: "groom", label: "신랑측" },
    { key: "bride", label: "신부측" },
  ];

  for (const side of sides) {
    const accounts = weddingData.accounts.filter((acc) => acc.side === side.key);
    const card = el("button", "contact-side");
    card.type = "button";
    card.setAttribute("data-reveal", "");
    card.appendChild(el("span", "contact-side-label", side.label));
    card.appendChild(el("span", "contact-side-arrow", "›"));
    card.addEventListener("click", () => openAccountModal(side.label, accounts));
    list.appendChild(card);
  }

  const modal = document.getElementById("account-modal");
  document.getElementById("account-modal-close").addEventListener("click", closeAccountModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeAccountModal();
  });
  document.addEventListener("keydown", (e) => {
    if (!modal.hidden && e.key === "Escape") closeAccountModal();
  });
}
```

- [ ] **Step 2: 구문 검증**

Run: `cd "/Users/kjw/모바일청첩장/wedding-invitation" && node --check js/main.js`
Expected: 에러 없이 종료 (구문 오류 없음)

- [ ] **Step 3: 유닛 테스트 재실행 (회귀 확인)**

Run: `cd "/Users/kjw/모바일청첩장/wedding-invitation" && node test/utils.test.mjs && node test/validate.mjs`
Expected: 두 테스트 모두 전부 PASS (기존 `js/utils.js`를 건드리지 않았으므로 회귀 없어야 함)

- [ ] **Step 4: 커밋**

```bash
cd "/Users/kjw/모바일청첩장/wedding-invitation"
git add js/main.js
git commit -m "feat: renderAccounts를 신랑측/신부측 버튼+모달 방식으로 재작성"
```

---

### Task 4: 아코디언 전용 CSS 정리 (`css/style.css`)

**Files:**
- Modify: `css/style.css:646-685` (계좌 섹션 스타일 블록 앞부분)

- [ ] **Step 1: 미사용 규칙 삭제**

`css/style.css:646-685`의 기존:

```css
/* ===== 6. 계좌 ===== */
.accordion-toggle {
  width: 100%;
  border: 1px solid var(--color-accent);
  background: #fff;
  border-radius: 999px;
  padding: 14px 18px;
  font-family: var(--font-display);
  font-size: 15px;
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.chevron {
  transition: transform 0.2s ease;
}

.accordion-toggle[aria-expanded="true"] .chevron {
  transform: rotate(180deg);
}

.accounts-panel {
  margin-top: 16px;
  text-align: left;
}

.accounts-intro {
  font-size: 13px;
  color: var(--color-sub);
  margin: 0 0 20px;
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.account-row {
```

을 다음으로 교체 (`.accordion-toggle`, `.chevron`, `.accounts-panel`, `.account-list` 규칙 삭제, `.accounts-intro`는 모달에서 재사용하므로 유지, `.account-row`부터는 그대로 이어짐):

```css
/* ===== 6. 계좌 ===== */
.accounts-intro {
  font-size: 13px;
  color: var(--color-sub);
  margin: 0 0 20px;
}

.account-row {
```

- [ ] **Step 2: 브라우저 렌더링으로 최종 확인 (다음 태스크에서 로컬 서버 실행 후 함께 확인)**

이 단계는 별도 자동 검증 도구가 없으므로 Task 5의 로컬 서버 확인 시 함께 확인한다.

- [ ] **Step 3: 커밋**

```bash
cd "/Users/kjw/모바일청첩장/wedding-invitation"
git add css/style.css
git commit -m "style: 계좌 섹션 아코디언 전용 CSS 삭제, 연락처 스타일 재사용"
```

---

### Task 5: 전체 검증 및 로컬 서버로 사용자 확인

**Files:** 없음 (검증만 수행)

- [ ] **Step 1: 전체 자동 테스트 + 문법 검증 실행**

Run:
```bash
cd "/Users/kjw/모바일청첩장/wedding-invitation" && \
node --check js/data.js && node --check js/main.js && node --check js/utils.js && \
node test/utils.test.mjs && node test/validate.mjs
```
Expected: 모든 `node --check` 무오류 종료, 두 테스트 스크립트 전부 PASS 출력

- [ ] **Step 2: 로컬 정적 서버 실행**

Run: `cd "/Users/kjw/모바일청첩장/wedding-invitation" && python3 -m http.server 8791 &`
Expected: 서버 기동, `http://localhost:8791/` 접근 가능

- [ ] **Step 3: 사용자에게 아래 체크리스트로 직접 확인 요청 (컨펌 후 진행)**

- 연락처 섹션: 신랑측/신부측 버튼 클릭 시 기존과 동일하게 모달 동작
- 계좌 섹션: "신랑측"/"신부측" 버튼이 연락처 버튼과 동일한 스타일로 보이는지
- 계좌 섹션 "신랑측" 클릭 → 모달에 신랑/아버지 김옥현/어머니 차소영 3건, 각 계좌번호와 복사 버튼 표시
- 계좌 섹션 "신부측" 클릭 → 모달에 신부/아버지 이충원/어머니 김숙영 3건 표시
- 복사 버튼 클릭 시 토스트("계좌번호가 복사되었습니다") 표시 및 실제 클립보드 복사 확인
- 모달 배경 클릭/✕ 버튼/Escape 키로 닫히는지
- 아코디언(마음 전하실 곳) 흔적이 남아있지 않은지

- [ ] **Step 4: 확인 완료 후 로컬 서버 종료**

Run: `pkill -f "http.server 8791"`

---

## 제외 항목

- 연락처/계좌 섹션 순서 변경, 두 섹션 병합 — 이번 스코프에서 제외(사용자가 명시적으로 유지 결정)
