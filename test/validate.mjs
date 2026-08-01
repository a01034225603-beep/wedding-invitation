// 청첩장 데이터/자산 무결성 검증 스크립트 (pytest/flutter test 대체용, Node 내장 assert만 사용)
// 실행: node test/validate.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passCount = 0;
function check(name, fn) {
  fn();
  passCount++;
  console.log(`PASS: ${name}`);
}

// 1) data.js 가 존재하고 로드 가능해야 한다 (구현 전에는 실패해야 정상)
const dataPath = path.join(ROOT, "js", "data.js");
assert.ok(fs.existsSync(dataPath), "js/data.js 파일이 존재해야 합니다");

const { weddingData } = await import(`file://${dataPath}`);

check("weddingData 객체가 존재한다", () => {
  assert.ok(weddingData, "weddingData export 필요");
});

check("신랑/신부 이름이 실제 값으로 채워져 있다", () => {
  assert.equal(weddingData.groom.name, "김재원");
  assert.equal(weddingData.bride.name, "이예지");
});

check("연락처가 실제 전화번호 형식이다", () => {
  assert.match(weddingData.groom.phone, /^010-\d{4}-\d{4}$/);
  assert.match(weddingData.bride.phone, /^010-\d{4}-\d{4}$/);
});

check("예식 일시/장소 정보가 채워져 있다", () => {
  assert.equal(weddingData.venue.name, "까사그랑데");
  assert.ok(weddingData.venue.address.includes("광진구"));
  assert.ok(weddingData.dateTimeISO.startsWith("2026-10-17"));
});

check("dateTimeISO가 달력 렌더링에 사용 가능한 유효 날짜다", () => {
  const d = new Date(weddingData.dateTimeISO);
  assert.ok(!Number.isNaN(d.getTime()), "유효한 Date로 파싱되어야 합니다");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 9); // 0-indexed: 10월 = 9
  assert.equal(d.getDate(), 17);
});

check("지도 링크 3종이 모두 https 링크다", () => {
  for (const url of Object.values(weddingData.mapLinks)) {
    assert.match(url, /^https:\/\//);
  }
});

check("계좌 정보 2건(신랑/신부)이 존재한다", () => {
  assert.equal(weddingData.accounts.length, 2);
  for (const acc of weddingData.accounts) {
    assert.ok(acc.holder && acc.bank && acc.number);
  }
});

check("갤러리 사진 28장이 정의되어 있고 실제 파일이 존재한다", () => {
  assert.equal(weddingData.gallery.length, 28);
  for (const file of weddingData.gallery) {
    const p = path.join(ROOT, "photos", file);
    assert.ok(fs.existsSync(p), `사진 파일 없음: ${file}`);
  }
});

check("표지 사진이 갤러리 목록에 포함된 실제 파일이다", () => {
  const p = path.join(ROOT, "photos", weddingData.coverPhoto);
  assert.ok(fs.existsSync(p), "표지 사진 파일이 존재해야 합니다");
});

console.log(`\n총 ${passCount}개 검증 통과`);
