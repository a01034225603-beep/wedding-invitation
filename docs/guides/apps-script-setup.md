# Google Apps Script 배포 가이드 (RSVP · 방명록 백엔드)

이 문서는 청첩장의 RSVP(참석의사)와 방명록이 실제로 구글 시트에 저장되도록, Google Apps Script를 웹 앱으로 배포하는 절차입니다. 전부 사용자님의 구글 계정에서 직접 진행하시면 됩니다.

## 진행 상황

- [x] Step 1. 구글 시트 생성 완료
  - 시트 URL: `https://docs.google.com/spreadsheets/d/1cC9_w7dZGtv8I_1GQTWWcpKrsGM5q8pUbI0DX4s6Zug/edit`
  - 시트 ID: `1cC9_w7dZGtv8I_1GQTWWcpKrsGM5q8pUbI0DX4s6Zug`
  - 탭 2개(`RSVP응답`, `방명록`) 생성 완료
- [ ] Step 2. Apps Script 편집기에 코드 붙여넣기
- [ ] Step 3. 웹 앱으로 배포
- [ ] Step 4. 배포 URL을 청첩장 데이터에 반영

---

## Step 2. Apps Script 편집기에 코드 붙여넣기

1. 구글 시트 화면에서 상단 메뉴 **확장 프로그램(Extensions) → Apps Script** 클릭
2. 새 탭에 코드 편집기가 열림. 기본으로 있는 `Code.gs` 파일 내용(`function myFunction() {}` 같은 것)을 전부 지우기
3. 아래 코드를 통째로 복사해서 붙여넣기

```js
// Google Apps Script 백엔드 (RSVP + 방명록)
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
  const rows = sheet.getDataRange().getValues();

  const entries = rows
    .slice(1)
    .filter((row) => row[1])
    .map((row) => ({ name: row[1], message: row[2] }))
    .reverse();

  return ContentService
    .createTextOutput(JSON.stringify({ entries: entries }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. 왼쪽 상단 프로젝트 이름("제목 없는 프로젝트")은 바꿔도 되고 안 바꿔도 무방
5. 상단 **저장(디스크 아이콘)** 클릭

---

## Step 3. 웹 앱으로 배포

1. 편집기 오른쪽 상단 **배포(Deploy) → 새 배포(New deployment)** 클릭
2. "배포 유형 선택" 톱니바퀴 아이콘 클릭 → **웹 앱(Web app)** 선택
3. 설정값:
   - **실행 사용자(Execute as)**: 나(본인 계정)
   - **액세스 권한이 있는 사용자(Who has access)**: **전체 사용자(Anyone)** ← 이게 중요합니다. 이걸로 해야 청첩장 페이지에서 로그인 없이 접수/조회가 가능합니다
4. **배포(Deploy)** 클릭
5. 처음 배포하면 권한 승인 화면이 뜹니다 — 본인 구글 계정으로 "승인(Authorize access)" → "고급(Advanced)" → "(프로젝트명)(안전하지 않음)으로 이동" 같은 경고가 뜰 수 있는데, 본인이 만든 스크립트이므로 정상입니다. 계속 진행해서 승인
6. 배포가 완료되면 **웹 앱 URL**이 표시됩니다. `https://script.google.com/macros/s/....../exec` 형태의 URL입니다. 이 URL을 복사

---

## Step 4. 배포 URL을 청첩장에 반영

배포된 URL을 저에게 알려주시면, `js/data.js`의 `appsScriptUrl` 값에 반영해드리고 실제로 RSVP/방명록 제출이 시트에 잘 기록되는지 같이 테스트하겠습니다.

## 참고

- 스크립트 코드를 수정한 뒤에는 **배포 → 배포 관리(Manage deployments) → 편집(연필 아이콘) → 새 버전(New version) → 배포**를 다시 해야 변경사항이 반영됩니다. "저장"만으로는 이미 배포된 웹 앱에 반영되지 않습니다.
- 시트의 `RSVP응답`/`방명록` 탭에 실제로 행이 추가되는지 확인하면서 진행하면 됩니다.
