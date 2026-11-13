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
   * speed : tốc độ cuộn (pixel / giây)
   * matchSong : true = tự tính tốc độ để cuộn hết phần ảnh vừa đúng hết bài Santa Tell Me */
  autoScroll: { delay: 2500, speed: 42, matchSong: true },

  /* ---------- Ảnh kỷ niệm ----------
   * Đặt ảnh vào assets/photos/ rồi khai báo ở đây, theo thứ tự từ trên xuống.
   * Ảnh sẽ xếp xen kẽ trái - phải. Thiếu ảnh thì hiện khung giữ chỗ.
   * Video: dùng { video: "assets/videos/xx.mp4", poster: "ảnh bìa.jpg", caption: "..." } */
  photos: [
    { src: "assets/photos/01.jpg", caption: "Thỏ iu và bạn Totoro", date: "" },
    { src: "assets/photos/02.jpg", caption: "Cún dạo phố cổ", date: "" },
    { src: "assets/photos/03.jpg", caption: "Tai thỏ cho Thỏ iu", date: "" },
    { src: "assets/photos/04.jpg", caption: "Thơm má một cái nè", date: "" },
    { src: "assets/photos/05.jpg", caption: "Hai đứa mình", date: "" },
    { src: "assets/photos/06.jpg", caption: "Selfie trong gương", date: "" },
    { src: "assets/photos/07.jpg", caption: "Cún ngắm đèn", date: "" },
    { src: "assets/photos/08.jpg", caption: "Thỏ iu bên ô cửa vòm", date: "" },
    { src: "assets/photos/09.jpg", caption: "Thỏ iu cười xinh", date: "" },
    /* video: tự chạy, không tiếng, lặp lại */
    { video: "assets/videos/01.mp4", poster: "assets/videos/01-poster.jpg", caption: "Chuyến xe dạo phố", date: "" },
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

  /* ---------- Lời chạy KHỚP NHẠC (karaoke) ----------
   * Dán lời bài hát dạng LRC (mỗi dòng có mốc thời gian [phút:giây.phần trăm]) vào giữa hai dấu ` `
   * Ví dụ:
   *   lrc: `
   *   [00:12.30] dòng thứ nhất
   *   [00:15.80] dòng thứ hai
   *   `,
   * Khi có `lrc` và có file nhạc music.gallery, lời sẽ chạy đúng theo giây nhạc đang phát,
   * hiện bên cạnh bức ảnh đang ở giữa màn hình (mục `lyrics` phía trên sẽ không dùng nữa).
   * Lời chạy sớm/muộn so với nhạc? Thêm dòng [offset:+300] (lời sớm hơn 0.3 giây) hoặc [offset:-300]. */
  /* Bản dưới đây là ƯỚC LƯỢNG tự động (có thể lệch ~1 giây).
   * Để khớp chính xác: mở tools/canh-loi.html, bật nhạc và chạm đúng lúc mỗi câu bắt đầu,
   * rồi dán kết quả đè lên đoạn này. */
  lrc: `
[offset:0]
[00:11.58] Santa tell me if you're really there
[00:15.18] Don't make me fall in love again
[00:17.58] If he won't be here next year
[00:21.18] Santa tell me if he really cares
[00:24.78] Cause I can give it all away
[00:27.18] if he won't be here next year
[00:31.97] Feeling Christmas all around
[00:34.74] And I'm trying to play it cool
[00:37.51] But it's hard to focus when
[00:40.28] I see him walking 'cross the room
[00:43.35] Let it snow is blasting now
[00:46.12] But I won't get it in the mood
[00:49.19] I'm avoiding every mistletoe
[00:52.88] until I know it's true love
[00:55.95] That he thinks of
[00:57.80] So next Christmas I'm not all alone boy
[01:01.79] Santa tell me if you're really there
[01:05.39] Don't make me fall in love again
[01:07.79] If he won't be here next year
[01:11.39] Santa tell me if he really cares
[01:14.99] Cause I can't give it all away
[01:17.39] if he won't be here next year
[01:22.18] I've been down this road before
[01:25.41] Fell in love on Christmas night
[01:28.35] But I knew you say I woke up
[01:31.58] and you wasn't by my side
[01:34.22] Now I need someone to hold
[01:37.16] Be my fire in the cold
[01:39.80] But it's hard to tell if this is
[01:42.74] just a fling or if it's true love
[01:45.97] That he thinks of
[01:47.73] So next Christmas I'm not all alone boy
[01:51.54] Santa tell me if you're really there
[01:55.14] Don't make me fall in love again
[01:57.54] If he won't be here next year
[02:01.14] Santa tell me if he really cares
[02:04.74] Cause I can't give it all away
[02:07.14] if he won't be here next year
[02:11.93] Oh I wanna have him beside me like
[02:17.69] On the 25th by the fireplace ooh
[02:21.91] But I don't want no broken heart
[02:25.75] This year I got to be smart
[02:29.21] Oh baby
[02:31.13] Santa tell me
[02:33.19] Santa tell me
[02:35.25] Santa tell me if you're really there
[02:39.71] Santa tell me
[02:41.77] Don't make me fall in love again
[02:45.89] If he won't be here next year
[02:49.32] Santa tell me if he really cares
[02:53.45] Cause I can't give it all away
[02:57.57] if he won't be here next year
[03:01.00] Santa tell me if you're really there
[03:04.60] Don't make me fall in love again
[03:07.00] If he won't be here next year
[03:10.60] Santa tell me if he really cares
[03:14.19] Cause I can give it all away
[03:16.59] if he won't be here next year
`,

  /* ---------- Kết thúc trang ---------- */
  ending: {
    title: "Merry Christmas, Thỏ iu",
    message: "Giáng sinh này và thật nhiều Giáng sinh nữa, mình vẫn ở cạnh nhau nhé.",
    sign: "— Cún ♥",
  },
};
