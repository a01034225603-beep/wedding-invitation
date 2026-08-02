// js/utils.js 순수 함수 단위 테스트 (Node 내장 assert만 사용, DOM 불필요)
// 실행: node test/utils.test.mjs
import assert from "node:assert/strict";
import {
  calcScrollProgress,
  buildTypingFrames,
  validateRsvpInput,
  buildRsvpPayload,
} from "../js/utils.js";

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

console.log(`\n총 ${passCount}개 검증 통과`);
