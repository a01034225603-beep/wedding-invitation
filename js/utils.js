export function calcScrollProgress(scrollTop, scrollHeight, clientHeight) {
  const scrollable = scrollHeight - clientHeight;
  if (scrollable <= 0) return 0;
  const ratio = (scrollTop / scrollable) * 100;
  return Math.min(100, Math.max(0, ratio));
}

export function buildTypingFrames(text) {
  const frames = [];
  for (let i = 1; i <= text.length; i++) {
    frames.push(text.slice(0, i));
  }
  return frames;
}

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
