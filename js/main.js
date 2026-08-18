import { weddingData } from "./data.js?v=20260819";
import {
  calcScrollProgress,
  buildTypingFrames,
  validateRsvpInput,
  buildRsvpPayload,
  validateGuestbookInput,
  buildGuestbookPayload,
} from "./utils.js?v=20260819";

const PHOTOS_DIR = "photos/";

/* ---------- 유틸 ---------- */
function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function toDigits(phone) {
  return phone.replace(/[^0-9]/g, "");
}

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
    if (!frames.length) {
      target.textContent = "";
      resolve();
      return;
    }
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

/* ---------- 스크롤 등장 애니메이션 ---------- */
function setupScrollReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 }
  );

  targets.forEach((t) => observer.observe(t));
}

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

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 1600);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API 미지원 환경 대비 fallback
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }
}

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

/* ---------- 2. 인사말 ---------- */
function renderGreeting() {
  const container = document.getElementById("greeting-text");
  container.innerHTML = "";
  for (const line of weddingData.greeting) {
    const p = el("p", null, line);
    p.setAttribute("data-reveal", "");
    container.appendChild(p);
  }

  const parentsContainer = document.getElementById("greeting-parents");
  parentsContainer.innerHTML = "";
  parentsContainer.appendChild(
    el(
      "p",
      null,
      `${weddingData.groom.father.name} · ${weddingData.groom.mother.name}의 장남 ${weddingData.groom.givenName}`
    )
  );
  parentsContainer.appendChild(
    el(
      "p",
      null,
      `${weddingData.bride.father.name} · ${weddingData.bride.mother.name}의 장녀 ${weddingData.bride.givenName}`
    )
  );

  document.getElementById("greeting-names").textContent =
    `신랑 ${weddingData.groom.name} · 신부 ${weddingData.bride.name}`;
}

/* ---------- 3. 예식 안내 / 오시는 길 ---------- */
const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function renderCalendar() {
  const container = document.getElementById("calendar-card");
  if (!container) return;
  container.innerHTML = "";

  const weddingDate = new Date(weddingData.dateTimeISO);
  const year = weddingDate.getFullYear();
  const month = weddingDate.getMonth(); // 0-indexed
  const day = weddingDate.getDate();

  const monthTitle = el(
    "p",
    "calendar-month",
    `${year}년 ${month + 1}월`
  );
  container.appendChild(monthTitle);

  const grid = el("div", "calendar-grid");
  DOW_LABELS.forEach((label, i) => {
    const cell = el("div", `calendar-dow${i === 0 ? " sun" : ""}`, label);
    grid.appendChild(cell);
  });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstWeekday; i++) {
    grid.appendChild(el("div", "calendar-day empty"));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const weekday = new Date(year, month, d).getDay();
    const isWedding = d === day;
    const classes = ["calendar-day"];
    if (weekday === 0) classes.push("sun");
    if (isWedding) classes.push("wedding-day");
    grid.appendChild(el("div", classes.join(" "), String(d)));
  }

  container.appendChild(grid);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(year, month, day);
  targetDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((targetDay - today) / 86400000);

  let ddayText;
  if (diffDays > 0) ddayText = `결혼식까지 D-${diffDays}`;
  else if (diffDays === 0) ddayText = "오늘이 결혼식입니다 🎉";
  else ddayText = `결혼식 후 D+${Math.abs(diffDays)}`;

  container.appendChild(el("p", "calendar-dday", ddayText));
}

function renderMapEmbed() {
  const container = document.getElementById("map-embed");
  if (!container) return;
  container.innerHTML = "";

  const query = `${weddingData.venue.name} ${weddingData.venue.address}`;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.title = "예식장 위치 지도";
  container.appendChild(iframe);
}

function renderInfo() {
  document.getElementById("info-datetime").textContent = weddingData.dateDisplay;
  renderCalendar();
  document.getElementById("info-venue").textContent = weddingData.venue.name;
  document.getElementById("info-address").textContent = weddingData.venue.address;
  renderMapEmbed();

  const mapButtons = document.getElementById("map-buttons");
  const labels = { kakao: "카카오맵", naver: "네이버지도", google: "구글맵" };
  for (const [key, url] of Object.entries(weddingData.mapLinks)) {
    const a = el("a", "map-btn", labels[key] ?? key);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    mapButtons.appendChild(a);
  }

  const directions = document.getElementById("directions");
  directions.innerHTML = "";
  const rows = [
    { label: "교통", value: weddingData.directions.transit },
    { label: "주차", value: weddingData.directions.parking },
  ];
  for (const row of rows) {
    if (!row.value) continue;
    const div = el("div", "direction-row");
    div.appendChild(el("span", "label", row.label));
    div.appendChild(el("span", "value", row.value));
    directions.appendChild(div);
  }
}

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
      const res = await fetch(weddingData.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`RSVP 전송 실패: ${res.status}`);
      showToast("참석 의사가 전달되었습니다. 감사합니다!");
      form.reset();
      syncOptionalFields();
    } catch (err) {
      console.error(err);
      showToast("전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  });
}

/* ---------- 4. 갤러리 + 라이트박스 ---------- */
let currentPhotoIndex = 0;

function openLightbox(index) {
  currentPhotoIndex = index;
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-image");
  img.src = `${PHOTOS_DIR}${weddingData.gallery[currentPhotoIndex]}`;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").hidden = true;
  document.body.style.overflow = "";
}

function showPhoto(delta) {
  const total = weddingData.gallery.length;
  currentPhotoIndex = (currentPhotoIndex + delta + total) % total;
  document.getElementById("lightbox-image").src =
    `${PHOTOS_DIR}${weddingData.gallery[currentPhotoIndex]}`;
}

function renderGallery() {
  const grid = document.getElementById("gallery-grid");
  grid.innerHTML = "";
  weddingData.gallery.forEach((file, index) => {
    const img = el("img");
    img.src = `${PHOTOS_DIR}${file}`;
    img.loading = "lazy";
    img.alt = `갤러리 사진 ${index + 1}`;
    img.setAttribute("data-reveal", "");
    img.addEventListener("click", () => openLightbox(index));
    grid.appendChild(img);
  });

  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox-prev").addEventListener("click", () => showPhoto(-1));
  document.getElementById("lightbox-next").addEventListener("click", () => showPhoto(1));

  const lightbox = document.getElementById("lightbox");
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // 스와이프 지원
  let touchStartX = 0;
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  });
  lightbox.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      showPhoto(dx > 0 ? -1 : 1);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPhoto(-1);
    if (e.key === "ArrowRight") showPhoto(1);
  });
}

/* ---------- 5. 연락처 ---------- */
function openContactModal(title, people) {
  document.getElementById("contact-modal-title").textContent = title;

  const list = document.getElementById("contact-modal-list");
  list.innerHTML = "";
  for (const person of people) {
    const row = el("div", "contact-row");

    const who = el("div", "who");
    who.appendChild(el("div", "role", person.role));
    who.appendChild(el("div", "name", person.name));
    row.appendChild(who);

    const actions = el("div", "contact-actions");

    const callBtn = el("a", "icon-btn", "전화");
    callBtn.href = `tel:${toDigits(person.phone)}`;
    actions.appendChild(callBtn);

    const smsBtn = el("a", "icon-btn", "문자");
    smsBtn.href = `sms:${toDigits(person.phone)}`;
    actions.appendChild(smsBtn);

    row.appendChild(actions);
    list.appendChild(row);
  }

  document.getElementById("contact-modal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeContactModal() {
  document.getElementById("contact-modal").hidden = true;
  document.body.style.overflow = "";
}

function renderContact() {
  const list = document.getElementById("contact-list");
  list.innerHTML = "";

  const sides = [
    {
      label: "신랑측",
      people: [
        { role: "아버지", name: weddingData.groom.father.name, phone: weddingData.groom.father.phone },
        { role: "어머니", name: weddingData.groom.mother.name, phone: weddingData.groom.mother.phone },
        { role: "신랑", name: weddingData.groom.name, phone: weddingData.groom.phone },
      ],
    },
    {
      label: "신부측",
      people: [
        { role: "아버지", name: weddingData.bride.father.name, phone: weddingData.bride.father.phone },
        { role: "어머니", name: weddingData.bride.mother.name, phone: weddingData.bride.mother.phone },
        { role: "신부", name: weddingData.bride.name, phone: weddingData.bride.phone },
      ],
    },
  ];

  for (const side of sides) {
    const card = el("button", "contact-side");
    card.type = "button";
    card.setAttribute("data-reveal", "");
    card.appendChild(el("span", "contact-side-label", side.label));
    card.appendChild(el("span", "contact-side-arrow", "›"));
    card.addEventListener("click", () => openContactModal(side.label, side.people));
    list.appendChild(card);
  }

  const modal = document.getElementById("contact-modal");
  document.getElementById("contact-modal-close").addEventListener("click", closeContactModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeContactModal();
  });
  document.addEventListener("keydown", (e) => {
    if (!modal.hidden && e.key === "Escape") closeContactModal();
  });
}

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

    const nameEl = el("div", "guestbook-name");
    nameEl.textContent = entry.name;
    item.appendChild(nameEl);

    const messageEl = el("div", "guestbook-message");
    messageEl.textContent = entry.message;
    item.appendChild(messageEl);

    list.appendChild(item);
  }
}

async function loadGuestbookEntries() {
  if (!weddingData.appsScriptUrl) return;
  try {
    const res = await fetch(`${weddingData.appsScriptUrl}?type=guestbook`);
    if (!res.ok) throw new Error(`방명록 조회 실패: ${res.status}`);
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
      const res = await fetch(weddingData.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`방명록 등록 실패: ${res.status}`);
      showToast("메시지가 등록되었습니다. 감사합니다!");
      form.reset();
      await loadGuestbookEntries();
    } catch (err) {
      console.error(err);
      showToast("등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  });
}

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

/* ---------- 9. 공유하기 ---------- */
function renderShare() {
  const copyBtn = document.getElementById("copy-link-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(window.location.href);
      showToast(ok ? "링크가 복사되었습니다" : "복사에 실패했습니다");
    });
  }

  // 카카오 공유 버튼: kakaoJsKey가 없거나 SDK가 로드되지 않았으면 숨김 상태 유지
  const kakaoBtn = document.getElementById("kakao-share-btn");
  if (!kakaoBtn || !weddingData.kakaoJsKey || !window.Kakao) {
    return;
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(weddingData.kakaoJsKey);
  }

  kakaoBtn.hidden = false;
  kakaoBtn.addEventListener("click", () => {
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `${weddingData.groom.name} · ${weddingData.bride.name} 결혼식에 초대합니다`,
        description: weddingData.dateDisplay,
        imageUrl: new URL(`${PHOTOS_DIR}${weddingData.coverPhoto}`, window.location.href).href,
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
    });
  });
}

/* ---------- 푸터 ---------- */
function renderFooter() {
  document.getElementById("footer-names").textContent =
    `🥂 ${weddingData.groom.name} · ${weddingData.bride.name} 🥂`;
}

/* ---------- 인트로 영상 ---------- */
function setupIntroVideo() {
  const overlay = document.getElementById("intro-overlay");
  const video = document.getElementById("intro-video");
  const skipBtn = document.getElementById("intro-skip");
  const playBtn = document.getElementById("intro-play");
  const unmuteBtn = document.getElementById("intro-unmute");
  if (!overlay || !video) return;

  document.body.style.overflow = "hidden";

  const finishIntro = () => {
    if (overlay.classList.contains("intro-hidden")) return;
    overlay.classList.add("intro-hidden");
    document.body.style.overflow = "";
    setTimeout(() => {
      overlay.remove();
    }, 800);
  };

  const showPlayButton = () => {
    if (playBtn) playBtn.hidden = false;
    if (unmuteBtn) unmuteBtn.hidden = true;
  };

  video.addEventListener("ended", finishIntro);
  video.addEventListener("error", finishIntro);
  if (skipBtn) {
    skipBtn.addEventListener("click", finishIntro);
  }
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      playBtn.hidden = true;
      // 사용자가 직접 탭한 시점이라 소리를 켜도 재생이 막히지 않는다.
      video.muted = false;
      if (unmuteBtn) unmuteBtn.hidden = true;
      video.play().catch(finishIntro);
    });
  }
  if (unmuteBtn) {
    unmuteBtn.addEventListener("click", () => {
      video.muted = false;
      unmuteBtn.hidden = true;
    });
  }

  // 일부 인앱 브라우저(카카오톡 등)는 muted 속성만으로는 자동재생을 허용하지 않아
  // JS 프로퍼티로도 명시적으로 음소거해준다.
  video.muted = true;
  video.defaultMuted = true;

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(showPlayButton);
  }

  // play()는 성공했다고 나와도 실제로는 재생이 안 시작되는 인앱 브라우저가 있어
  // 1초 뒤에도 여전히 멈춰있으면 재생 버튼을 보여준다.
  setTimeout(() => {
    if (video.paused && !overlay.classList.contains("intro-hidden")) {
      showPlayButton();
    }
  }, 1000);

  // 재생 버튼도 못 누를 만큼 뭔가 꼬인 경우를 대비한 최종 안전장치
  setTimeout(finishIntro, 8000);
}

/* ---------- 초기화 ---------- */
function init() {
  setupIntroVideo();
  renderCover().catch(console.error);
  renderGreeting();
  renderInfo();
  renderGallery();
  renderRsvp();
  renderContact();
  renderGuestbook();
  renderAccounts();
  renderShare();
  renderFooter();
  setupScrollReveal();
  setupScrollProgress();
}

document.addEventListener("DOMContentLoaded", init);
