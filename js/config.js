/* =====================================================================
 *  CẤU HÌNH THIỆP GIÁNG SINH
 *  Mọi nội dung có thể thay đổi đều nằm trong file này.
 * ===================================================================== */
window.CARD_CONFIG = {
  /* ---------- Người gửi / người nhận ---------- */
  to: "Thỏ iu",
  from: "Cún",

  /* Dòng chữ ở màn hình hộp quà. {to} và {from} sẽ được thay tự động. */
  intro: "Gửi đến {to} của {from}",

  /* ---------- Lời chúc (khung bên phải cây thông) ----------
   * Viết bình thường, xuống dòng bằng Enter. Chữ sẽ hiện ra dần đều.
   * TODO: thay đoạn bên dưới bằng lời chúc thật. */
  wish: `Gửi Thỏ iu của Cún,

[ Lời chúc Giáng sinh sẽ được Cún bổ sung ở đây... ]

Merry Christmas! ♥`,

  /* Tốc độ gõ chữ (mili-giây cho mỗi ký tự). Số càng lớn chữ hiện càng chậm. */
  typingSpeed: 60,

  /* Chữ chạy dưới gốc cây thông + dòng nhỏ bên dưới */
  treeMessage: "MERRY CHRISTMAS",
  treeSubtitle: "for Thỏ iu · from Cún",

  /* ---------- Nhạc ----------
   * Đặt file mp3 vào thư mục assets/music/ với đúng tên bên dưới.
   * main    : phát khi mở hộp quà (Jingle Bell Rock)
   * gallery : phát khi cuộn xuống phần ảnh kỷ niệm (Santa Tell Me).
   *           Để "" nếu muốn giữ nguyên một bài suốt trang. */
  music: {
    main: "assets/music/jingle-bell-rock.mp3",
    gallery: "assets/music/santa-tell-me.mp3",
    volume: 0.8,
  },

  /* ---------- Tự động cuộn xuống phần ảnh ----------
   * delay : chờ bao lâu (ms) sau khi lời chúc hiện xong
   * speed : tốc độ cuộn (pixel / giây) */
  autoScroll: { delay: 2500, speed: 42 },

  /* ---------- Ảnh kỷ niệm ----------
   * Đặt ảnh vào assets/photos/ rồi khai báo ở đây, theo thứ tự từ trên xuống.
   * Ảnh sẽ xếp xen kẽ trái - phải. Thiếu ảnh thì hiện khung giữ chỗ. */
  photos: [
    { src: "assets/photos/01.jpg", caption: "Thỏ iu và bạn Totoro", date: "" },
    { src: "assets/photos/02.jpg", caption: "Cún dạo phố cổ", date: "" },
    { src: "assets/photos/03.jpg", caption: "Tai thỏ cho Thỏ iu", date: "" },
    { src: "assets/photos/04.jpg", caption: "Thơm má một cái nè", date: "" },
    { src: "assets/photos/05.jpg", caption: "Hai đứa mình", date: "" },
  ],

  /* ---------- Lời bài hát "Santa Tell Me" ----------
   * Dán lời bài hát vào đây, MỖI DÒNG LÀ MỘT CHUỖI, ví dụ:
   *   lyrics: [
   *     "dòng thứ nhất",
   *     "dòng thứ hai",
   *   ],
   * Các dòng sẽ được chia đều cho từng ảnh và chạy bên cạnh ảnh.
   * Để trống thì mỗi ảnh hiện dòng giữ chỗ. */
  lyrics: [],

  /* Số dòng lời bài hát cho mỗi ảnh. 0 = tự chia đều. */
  linesPerPhoto: 0,

  /* ---------- Kết thúc trang ---------- */
  ending: {
    title: "Merry Christmas, Thỏ iu",
    message: "Giáng sinh này và thật nhiều Giáng sinh nữa, mình vẫn ở cạnh nhau nhé.",
    sign: "— Cún ♥",
  },
};
