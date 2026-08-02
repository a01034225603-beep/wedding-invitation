// 실제 청첩장 데이터 (모청 사진 폴더 기반, 가짜 데이터 없음)
export const weddingData = {
  groom: {
    name: "김재원",
    givenName: "재원",
    phone: "010-7333-5603",
    father: { name: "김옥현", phone: "010-5611-5603" },
    mother: { name: "차소영", phone: "010-4654-5603" },
  },
  bride: {
    name: "이예지",
    givenName: "예지",
    phone: "010-2446-0253",
    father: { name: "이충원", phone: "010-3766-3348" },
    mother: { name: "김숙영", phone: "010-3203-0253" },
  },

  dateTimeISO: "2026-10-17T17:20:00+09:00",
  dateDisplay: "2026. 10. 17. (토) 오후 5시 20분",

  venue: {
    name: "까사그랑데",
    address: "서울 광진구 자양동 2-2",
  },

  directions: {
    transit: "지하철 2호선, 7호선 건대입구역 5번 출구 바로 앞",
    parking: "건물 내 B1~B5 주차 가능",
  },

  mapLinks: {
    kakao: "https://place.map.kakao.com/67986660",
    naver: "https://naver.me/GhbuXbYP",
    google: "https://maps.app.goo.gl/P7jsqGvjJuDqkLb48",
  },

  greeting: [
    "서로의 일상에 작은 기쁨이 되어",
    "함께 걸어가고 싶은 두 사람이",
    "평생을 약속하며 한 걸음을 내딛고자 합니다.",
    "부디 함께하시어 자리를 빛내 주시면 감사하겠습니다.",
  ],

  accountsIntro:
    "직접 축하 전하지 못하는 분들을 위해 안내드립니다. 너그러운 마음으로 양해 부탁드립니다.",

  accounts: [
    { role: "신랑", holder: "김재원", bank: "신한", number: "110-393-403899" },
    { role: "신부", holder: "이예지", bank: "신한", number: "110-031-619449" },
  ],

  coverPhoto: "001.jpg",

  gallery: [
    "001.jpg", "002.jpg", "003.jpg", "004.jpg", "005.jpg", "006.jpg", "007.jpg",
    "008.jpg", "009.jpg", "010.jpg", "011.jpg", "012.jpg", "013.jpg", "014.jpg",
    "015.jpg", "016.jpg", "017.jpg", "018.jpg", "019.jpg", "020.jpg", "021.jpg",
    "022.jpg", "023.jpg", "024.jpg", "025.jpg", "026.jpg", "027.jpg", "028.jpg",
  ],
};
