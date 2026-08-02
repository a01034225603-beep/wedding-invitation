// js/utils.js 순수 함수 단위 테스트 (Node 내장 assert만 사용, DOM 불필요)
// 실행: node test/utils.test.mjs
import assert from "node:assert/strict";
import { calcScrollProgress, buildTypingFrames } from "../js/utils.js";

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

console.log(`\n총 ${passCount}개 검증 통과`);
