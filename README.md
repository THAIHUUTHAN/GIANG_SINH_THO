# 🎄 Thiệp Giáng sinh — gửi Thỏ iu của Cún

Website thiệp Giáng sinh phong cách "code / ASCII": cây thông vẽ bằng ký tự, tự xoay, có đèn nhấp nháy.
Trang chỉ dùng HTML, CSS và JavaScript thuần, không cần cài đặt hay build.

## Trải nghiệm

1. **Màn hình hộp quà** — hộp quà ASCII nhún nhảy, kèm dòng chữ *"Gửi đến Thỏ iu của Cún"*.
2. **Bấm vào hộp quà** — nắp bật lên, pháo giấy bung ra, nhạc *Jingle Bell Rock* bắt đầu phát.
   - **2/3 bên trái:** cây thông chạy bằng code (`christmas_tree.js`, running · fps, khung code chạy từng dòng).
   - **1/3 bên phải:** lời chúc hiện ra dần đều theo kiểu gõ chữ.
   - Trên điện thoại hai khung xếp chồng: cây ở trên, lời chúc ở dưới.
3. **Lời chúc hiện xong** — trang tự cuộn chậm xuống phần **ảnh kỷ niệm**. Ảnh xếp xen kẽ trái/phải, lời bài hát *Santa Tell Me* chạy ở phía bên kia ảnh. Nếu có file nhạc thứ hai, nhạc sẽ chuyển dần sang bài này.
4. **Cuối trang** — trái tim ASCII, lời nhắn kết và nút xem lại.

Khi người xem tự chạm hoặc cuộn, trang tạm dừng tự cuộn và chạy tiếp sau 6 giây. Nút `♪ nhạc` ở góc phải dùng để bật/tắt nhạc.

## Chỉnh nội dung — chỉ cần sửa `js/config.js`

| Mục | Ý nghĩa |
|---|---|
| `to`, `from`, `intro` | Tên người nhận/gửi, dòng chữ ở màn hình hộp quà |
| `wish` | **Lời chúc** (viết bình thường, xuống dòng bằng Enter) |
| `typingSpeed` | Tốc độ gõ chữ (ms/ký tự) |
| `music.main` / `music.gallery` | Đường dẫn file nhạc |
| `photos` | Danh sách ảnh: `src`, `caption`, `date` |
| `lyrics` | **Lời bài hát** — mỗi dòng là một chuỗi |
| `autoScroll` | Thời gian chờ và tốc độ tự cuộn |
| `ending` | Lời nhắn cuối trang |

## Thêm ảnh và nhạc

```
assets/
├── music/
│   ├── jingle-bell-rock.mp3   ← nhạc khi mở quà
│   └── santa-tell-me.mp3      ← nhạc phần ảnh (không bắt buộc)
└── photos/
    ├── 01.jpg
    ├── 02.jpg
    └── ...
```

- Ảnh nên nén còn khoảng ≤ 500 KB mỗi ảnh (rộng khoảng 1200px) để trang tải nhanh trên điện thoại.
- Kho này **không kèm** file nhạc và lời bài hát vì có bản quyền. Bạn tự thêm file mp3 và dán lời vào `config.js` để dùng cá nhân.

## Lời chạy khớp nhạc (karaoke)

Dán lời bài hát dạng **LRC** vào mục `lrc` trong `js/config.js`. Mỗi dòng LRC có mốc thời gian, ví dụ `[01:02.50] lời bài hát`.
Khi có `lrc` và file `santa-tell-me.mp3`, lời sẽ chạy đúng theo giây nhạc đang phát, hiện bên cạnh bức ảnh đang ở giữa màn hình.
Dòng đang hát sáng dần theo nhạc, kèm dòng trước và dòng sau.

- **Canh lời chính xác:** mở `tools/canh-loi.html` (chạy server như phần bên dưới, rồi vào http://localhost:8000/tools/canh-loi.html). Bấm *Bắt đầu gõ nhịp*, chạm nút đỏ hoặc phím Space đúng lúc mỗi câu bắt đầu, nghe thử, chỉnh từng câu bằng nút −/+ 0,1 giây, rồi *Sao chép LRC* và dán đè lên mục `lrc`.
- Nếu lời chạy sớm hoặc muộn so với nhạc, thêm dòng `[offset:+300]` (lời hiện sớm hơn 0,3 giây) hoặc `[offset:-300]` (lời hiện muộn hơn 0,3 giây).
- Với `autoScroll.matchSong: true`, trang tự tính tốc độ cuộn để cuộn hết phần ảnh vừa đúng lúc bài hát kết thúc.

## Chạy thử trên máy

```bash
python3 -m http.server 8000
```

Sau đó mở http://localhost:8000. Nên chạy bằng server như trên thay vì mở file trực tiếp, để nhạc và ảnh tải đúng.

## Đưa lên mạng (GitHub Pages)

Vào **Settings → Pages** của repo, chọn branch chứa code và thư mục `/ (root)` rồi lưu.
Sau khoảng 1 phút, trang sẽ có địa chỉ dạng `https://<tên-github>.github.io/<tên-repo>/` để gửi cho Thỏ.

## Cấu trúc code

| File | Nội dung |
|---|---|
| `index.html` | Khung trang |
| `css/style.css` | Giao diện (tông đêm Giáng sinh, terminal) |
| `js/config.js` | Toàn bộ nội dung có thể chỉnh sửa |
| `js/tree.js` | Bộ vẽ cây thông ASCII: hình nón 3D xoay, chiếu lên lưới ký tự |
| `js/sky.js` | Nền trời sao và tuyết rơi |
| `js/main.js` | Luồng chính: hộp quà, nhạc, lời chúc, tự cuộn, ảnh, lời bài hát |
