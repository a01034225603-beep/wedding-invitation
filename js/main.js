import { weddingData } from "./data.js";
import { calcScrollProgress, buildTypingFrames } from "./utils.js";

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
function renderContact() {
  const list = document.getElementById("contact-list");
  list.innerHTML = "";

  const people = [
    { role: "신랑", name: weddingData.groom.name, phone: weddingData.groom.phone },
    { role: "신부", name: weddingData.bride.name, phone: weddingData.bride.phone },
  ];

  for (const person of people) {
    const row = el("div", "contact-row");
    row.setAttribute("data-reveal", "");

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
}

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

/* ---------- 푸터 ---------- */
function renderFooter() {
  document.getElementById("footer-names").textContent =
    `🥂 ${weddingData.groom.name} · ${weddingData.bride.name} 🥂`;
}

/* ---------- 초기화 ---------- */
function init() {
  renderCover().catch(console.error);
  renderGreeting();
  renderInfo();
  renderGallery();
  renderContact();
  renderAccounts();
  renderFooter();
  setupScrollReveal();
  setupScrollProgress();
}

document.addEventListener("DOMContentLoaded", init);
