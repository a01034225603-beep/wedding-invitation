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

check("양가 부모님 성함/연락처가 실제 값으로 채워져 있다", () => {
  const phoneRe = /^010-\d{4}-\d{4}$/;

  assert.equal(weddingData.groom.father.name, "김옥현");
  assert.match(weddingData.groom.father.phone, phoneRe);
  assert.equal(weddingData.groom.mother.name, "차소영");
  assert.match(weddingData.groom.mother.phone, phoneRe);

  assert.equal(weddingData.bride.father.name, "이충원");
  assert.match(weddingData.bride.father.phone, phoneRe);
  assert.equal(weddingData.bride.mother.name, "김숙영");
  assert.match(weddingData.bride.mother.phone, phoneRe);
});

check("신랑/신부 인사말용 이름(성 제외)이 채워져 있다", () => {
  assert.equal(weddingData.groom.givenName, "재원");
  assert.equal(weddingData.bride.givenName, "예지");
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

check("지도 링크 2종(네이버/구글)이 모두 https 링크다", () => {
  assert.deepEqual(Object.keys(weddingData.mapLinks), ["naver", "google"]);
  for (const url of Object.values(weddingData.mapLinks)) {
    assert.match(url, /^https:\/\//);
  }
});

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

check("갤러리 사진 25장이 정의되어 있고 실제 파일이 존재한다", () => {
  assert.equal(weddingData.gallery.length, 25);
  for (const file of weddingData.gallery) {
    const p = path.join(ROOT, "photos", file);
    assert.ok(fs.existsSync(p), `사진 파일 없음: ${file}`);
  }
});

check("표지 사진이 갤러리 목록에 포함된 실제 파일이다", () => {
  const p = path.join(ROOT, "photos", weddingData.coverPhoto);
  assert.ok(fs.existsSync(p), "표지 사진 파일이 존재해야 합니다");
});

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

check("appsScriptUrl과 kakaoJsKey 필드가 문자열로 정의되어 있다 (배포 전에는 빈 문자열 허용)", () => {
  assert.equal(typeof weddingData.appsScriptUrl, "string");
  assert.equal(typeof weddingData.kakaoJsKey, "string");
});

console.log(`\n총 ${passCount}개 검증 통과`);
