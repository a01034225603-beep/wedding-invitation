// Google Apps Script 백엔드 (RSVP + 방명록)
// 사용법: script.google.com에서 새 프로젝트 생성 후 이 코드를 Code.gs에 붙여넣고,
// 아래 SHEET_ID를 실제 Google Sheet ID로 교체한 다음 웹 앱으로 배포한다.
// (배포 절차는 별도 안내 문서 참고)

const SHEET_ID = "1cC9_w7dZGtv8I_1GQTWWcpKrsGM5q8pUbI0DX4s6Zug";
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
