# Website trình chiếu lịch sử: Đông Nam Á trước làn sóng thực dân và con đường của Xiêm

## A. Tổng quan
Lịch sử 11, 18 scene, HTML/CSS/JS thuần, không build. Chạy được ngay khi **chưa có** ảnh/video/model: thiếu file thì dùng nền dự phòng, không hiện lỗi lên màn hình trình chiếu. Appwrite là tùy chọn (chỉ đồng bộ số trang). Không nhạc nền, không Remote/Audience (để giai đoạn sau).

Hiệu ứng: nền tối vào trước, tiêu đề vào theo nhịp (opening/ending có khoảng dừng), chuyển chương bằng wipe kinh tuyến/vĩ tuyến xen kẽ, timeline hiện theo mốc, chú giải bản đồ hiện theo lớp, chân dung có spotlight. `prefers-reduced-motion` và nút "Hiệu ứng nhẹ" tắt grain, wipe, animation, video nền và model 3D.

## B. Cấu trúc: đúng 4 file + tài nguyên ở thư mục gốc
```
index.html  style.css  app.js  README.md      <- 4 file code (Appwrite cấu hình trên Console, không có file SQL)
opening_army.mp4 ... portrait_rama_iv.png ... rama_iv.glb     <- media, đặt cùng thư mục, KHÔNG tạo thư mục con
```
Tên file media phân biệt chữ hoa/thường trên GitHub Pages: dùng đúng chữ thường như bảng dưới.

## C. Tạo project Appwrite (tùy chọn)
1. Vào cloud.appwrite.io, đăng nhập, **Create project**. Chép **Project ID** (Settings) và **API Endpoint** (dạng `https://<vùng>.cloud.appwrite.io/v1` hoặc `https://cloud.appwrite.io/v1`).
2. **Add platform > Web**, nhập **hostname** (chỉ tên miền, không có `https://` hay đường dẫn): `localhost` để thử trên máy, và `TENBAN.github.io` khi lên GitHub Pages. Thiếu bước này trình duyệt báo lỗi origin/CORS.
3. Tự host Appwrite thì dùng endpoint máy chủ của bạn (`https://domain/v1`).

## D. Tạo database, table, row (thay cho database.sql)
Appwrite không dùng SQL; làm trên Console, khoảng 5 phút:
1. **Databases > Create database** (ví dụ `slides`). Chép **Database ID**.
2. Trong database: **Create table**, đặt Table ID là `presentation_state`. Chép **Table ID**.
3. Tab **Settings** của table: bật **Row security**. Để trống mục quyền cấp table.
4. Tab **Columns** (chờ cột ở trạng thái *Available*):

| Column | Loại | Required | Ràng buộc |
|---|---|---|---|
| `page` | Integer | Có | Min `0`, Max `17` (scene tính từ 0) |
| `controller_id` | String | Không | Size `32` |

5. Tab **Rows > Create row**: Row ID **`state`** (phải đúng), `page` = `0`. Ở mục **Permissions** của row thêm role **Any** với quyền **Read** và **Update**. **Không** thêm Create/Delete.

Kết quả: mọi người xem được trang hiện tại, cập nhật được đúng một hàng, chỉ trong khoảng 0–17; không ai tạo/xóa hàng được. Realtime của Appwrite tự bật, không cần cấu hình thêm.

## E. Cấu hình `app.js`
Mở `app.js`, sửa đầu file:
```js
const CONFIG={ appwriteEndpoint:"https://cloud.appwrite.io/v1", appwriteProject:"<Project ID>",
  appwriteDatabase:"<Database ID>", appwriteTable:"presentation_state", appwriteRow:"state",
  pushLocal:false, useModels:true };
```
- Để `pushLocal:false` trong mã. Máy chiếu và máy xem mở địa chỉ bình thường: tự nhảy theo trang trong Appwrite.
- **Máy điều khiển:** mở cùng địa chỉ kèm `?control=1` (ví dụ `https://TENBAN.github.io/TEN-REPO/?control=1`). Máy này là nguồn đúng: khi kết nối sẽ gửi trang hiện tại lên và gửi mỗi khi bạn chuyển slide. Chỉ nên có **một** máy điều khiển. Đặt `pushLocal:true` trong mã sẽ biến mọi máy thành máy điều khiển, đừng làm vậy khi triển khai.
- Chỉ đồng bộ số trang. Không đồng bộ thời điểm video, tiến độ animation, toàn màn hình, menu. Không có vòng lặp cập nhật (tin do chính máy gửi bị bỏ qua, tin nhận về không ghi ngược, không ghi lặp cùng một trang, các lần chuyển nhanh gộp thành một lần ghi). Kết nối realtime được ngắt khi đóng trang.
- Mất mạng giữa buổi: trình chiếu local vẫn chạy; debug hiện `disconnected`; khi có mạng lại tự kết nối và kéo trang hiện tại.
- SDK: `appwrite@21.2.1` qua jsDelivr (đã khóa phiên bản). Nâng phiên bản chỉ sau khi thử lại cả hai máy.

**Giới hạn bảo mật (đọc kỹ):** Project ID, Database ID, Table ID nằm trong mã nguồn nên ai cũng đọc được; dữ liệu chỉ được bảo vệ bằng quyền của hàng. Quyền Update cho role **Any** nghĩa là bất kỳ ai biết các ID đều đổi được số trang (chỉ giới hạn ở một hàng, khoảng 0–17 và độ dài id do ràng buộc cột). Hợp với bài trình chiếu ở trường, không hợp dữ liệu quan trọng. Không đặt API key (khóa server) vào `app.js` dưới mọi hình thức. Muốn chặt hơn: đăng nhập máy điều khiển bằng Appwrite Auth rồi đổi quyền Update của hàng từ **Any** sang **User** đúng tài khoản đó (bản này chưa có màn hình đăng nhập); máy xem chỉ cần Read **Any**.

## F. Triển khai GitHub Pages
Đẩy 4 file + media lên repository, **Settings > Pages**, chọn nhánh và thư mục gốc (`/`). Mọi đường dẫn tương đối (`BASE_PATH` trong `app.js`) nên chạy được dưới `https://user.github.io/TEN-REPO/`. Chạy thử trên máy: `python3 -m http.server` trong thư mục này rồi mở `http://localhost:8000`. Không dùng `file://` (video, model 3D, Appwrite cần http/https).

## G. Cách thêm video
1. Tạo clip theo mục I, xuất MP4 (H.264), đổi đúng tên ở bảng H.
2. Bỏ file vào thư mục gốc cạnh `index.html`, đẩy lên GitHub. Không sửa code.
3. Poster (khung hình đầu, tùy chọn): `<tên video>_poster.jpg` (nhận cả `.png/.jpeg/.webp`). Poster hiện trong lúc chờ tải.
4. Hành vi: clip chỉ tải khi vào scene (`preload=none`), luôn muted, không loop, tự dừng và giải phóng khi rời scene hoặc khi tab bị ẩn. Nút **Bỏ qua video ›** (phím **K**): ở scene 02 và 09 sang scene kế; ở 01 và 18 nhảy tới khung cuối. Scene 02 và 09 tự sang slide kế sau khi video kết thúc (không tự sang nếu video thiếu/lỗi). Autoplay bị chặn hoặc bật giảm chuyển động: hiện nút **▶ Phát video**. Video thiếu/lỗi giải mã: dùng nền dự phòng (hoàng hôn ở scene 01, quả cầu + lưới kinh vĩ tuyến ở scene 02/09, tối giản ở scene 18).
5. `colonial_invasion.mp4` (scene 05) và `siam_reform.mp4` (scene 12) chạy một lần làm nền mờ phía sau nội dung, tắt ở chế độ nhẹ/giảm chuyển động.

## H. Bảng video
Mọi video đều **tùy chọn** (website chạy đủ khi thiếu); cột Required ghi mức khuyến nghị. Prompt khởi đầu bằng tiếng Anh, dán thẳng vào công cụ video AI. Nếu nội dung slide đổi, sửa prompt nhưng **giữ nguyên tên file**. Status điền tay: chưa tạo / đã tạo / đã upload / đã test.

| Filename | Scene | Required/Optional | Duration | Aspect ratio | Resolution | AI prompt | Negative prompt | Status |
|---|---|---|---|---|---|---|---|---|
| `opening_army.mp4` | 01 | Recommended | 6–8 s | 16:9 | 1920×1080 (hoặc 1280×720) | Cinematic historical film opening. A 19th-century European colonial expeditionary force in period-accurate uniforms and muskets and early rifles lands from sailing and early steam ships onto a tropical Southeast Asian riverbank at dawn. Solemn, tense, large scale. Slow controlled camera: wide establishing shot pushing gently forward. Low warm sun through haze, desaturated earthy palette, subtle film grain. No graphic violence, no blood. The final frame leaves dark sky and empty space in the upper and left areas for a title. No text, logo, watermark or subtitles. | modern clothing, modern weapons, vehicles, tanks, helicopters, anachronistic ships, text, subtitles, logo, watermark, blood, gore, close-up violence, cartoon style, fast cuts, shaky camera | chưa tạo |
| `intro_southeast_asia.mp4` | 02 | Recommended | 6–8 s | 16:9 | 1920×1080 | Planet Earth seen from space, soft sunlight, the camera slowly rotates and moves closer toward Southeast Asia with smooth continuous motion and no jump cuts. Natural terrain, oceans and cloud cover. The final frame centers mainland and maritime Southeast Asia, viewed from above, suitable for a cut to a historical map. Documentary cinematic style. No modern borders, no labels, no text, no logo, no watermark. | national borders, country outlines, labels, text, logo, watermark, city lights overload, sci-fi effects, lens flare overload, camera jumps, cartoon globe | chưa tạo |
| `intro_siam.mp4` | 09 | Recommended | 6–8 s | 16:9 | 1920×1080 | Planet Earth seen from space, camera rotates smoothly and approaches the Southeast Asian mainland, then continues zooming toward the Gulf of Thailand and the Chao Phraya river basin region. Ends on a top-down regional map-like view with no borders. Natural daylight, documentary cinematic style, smooth motion. No text, logo, watermark. | borders, country outlines, modern labels, text, logo, watermark, sci-fi HUD, camera jumps, fast zoom, cartoon globe | chưa tạo |
| `colonial_invasion.mp4` | 05 (nền mờ) | Optional | 6–8 s | 16:9 | 1280×720 | Documentary-style reconstruction of 19th-century colonial naval and land forces arriving at a Southeast Asian port: sailing ships and early steamships in the harbor, troops forming ranks on the quay, period wooden and brick buildings, hazy tropical air. Slow wide shot with gentle lateral camera movement. Realistic, historically plausible, no graphic violence. No text, logo, watermark. | modern ships, modern uniforms, rifles of the 20th century, gore, blood, explosions, fantasy elements, text, logo, watermark, fast cuts | chưa tạo |
| `siam_reform.mp4` | 12 (nền mờ) | Optional | 6–8 s | 16:9 | 1280×720 | Archival-style transition scene of late 19th-century Siam: a Bangkok street and canal-side market, a newly built administrative building, a schoolroom, and an early railway or telegraph line, all period-appropriate. Slow dolly forward, warm light, an atmosphere of change and reform. Never mix eras in one frame. No text, logo, watermark. | skyscrapers, cars, modern clothing, 20th-century trains, mixed eras, text, subtitles, logo, watermark, cartoon style | chưa tạo |
| `ending_history.mp4` | 18 | Recommended | 6–8 s | 16:9 | 1920×1080 | Cinematic closing shot: an antique map and historical documents on a wooden desk, raking side light, dust in the air. The camera slowly pulls back to reveal a minimal dark space, leaving an empty area in the center or on one side for on-screen text. Calm, reflective mood. No readable text on the documents, no fake symbols, no logo, no watermark. | readable text, fake script, fake seals, modern objects, laptops, logo, watermark, people, fast motion | chưa tạo |

## I. Hướng dẫn sản xuất video (VIDEO PRODUCTION CHECKLIST)
Chung: MP4, H.264, 16:9, 24/25/30 fps (giữ một giá trị cho cả bộ), **không âm thanh** hoặc có nhưng sẽ bị tắt, không nhạc nền, nên ≤ 8 MB mỗi clip (nén 1280×720 nếu nặng). Xuất MP4 từ công cụ AI, kiểm tra không có chữ/logo/watermark và không có trang phục, tàu, vũ khí sai thời đại, rồi **đổi tên đúng bảng H**. Nếu công cụ xuất khác định dạng, dùng `ffmpeg -i in.mov -c:v libx264 -crf 23 -pix_fmt yuv420p -an -movflags +faststart tên.mp4` (`faststart` giúp phát nhanh và tua được).

| Clip | Mục đích | Camera | Ánh sáng/màu | Chuyển động chủ thể | Khung đầu → khung cuối | Continuity |
|---|---|---|---|---|---|---|
| `opening_army` | Mở bài, không khí xâm lược | Wide, push-in chậm | Bình minh ấm, màu trầm | Đội hình đổ bộ, tàu thuyền | Mặt nước/sương → đội hình xa, trời tối trống phía trên để đặt tiêu đề | Thế kỷ XIX, quân phục và súng hỏa mai/trường phổ biến thời đó, không máu |
| `intro_southeast_asia` | Từ không gian tới Đông Nam Á | Xoay + zoom liên tục | Nắng dịu | Trái Đất tự quay | Toàn cầu → Đông Nam Á ở giữa | Không biên giới hiện đại, không nhãn (nhãn do website thêm) |
| `intro_siam` | Từ không gian tới Xiêm | Xoay + zoom sâu hơn | Nắng tự nhiên | Như trên | Toàn cầu → vùng vịnh Thái Lan/Chao Phraya | Không vẽ biên giới (biên giới Xiêm đổi theo năm 1893–1909) |
| `colonial_invasion` | Nền mờ slide mốc xâm lược | Wide, trượt ngang chậm | Mờ sương, tương phản vừa | Tàu vào cảng, đội hình trên bến | Cảng → bến cảng | Thế kỷ XIX, tàu buồm/tàu hơi nước sớm; chỉ là minh họa, không gắn với một sự kiện cụ thể |
| `siam_reform` | Nền mờ slide kinh tế/giao thông | Dolly tiến chậm | Ấm | Phố, kênh, trường học, đường sắt/điện tín | Phố Bangkok → công trình hiện đại hóa | Cuối thế kỷ XIX; không đưa đồ vật sau 1910 |
| `ending_history` | Kết, dư âm, nối với tổng kết | Lùi chậm (pull-back) | Sáng xiên, tối giản | Bụi lơ lửng | Bản đồ cận cảnh → bàn trống rộng | Không chữ đọc được trên tài liệu |

## J. Bảng ảnh / tư liệu (đặt ở thư mục gốc; nhận `.png`, `.jpg`, `.jpeg`, `.webp`, thử theo thứ tự này)
| Tên (không cần đuôi) | Scene | Bắt buộc? | Tỷ lệ / cỡ đề xuất | Cần tìm/tạo | Nguồn, license | Nếu thiếu |
|---|---|---|---|---|---|---|
| `historical_trade_port` | 03 | Tùy chọn | 16:9, 1600×900 | Cảng thương mại châu Á thế kỷ XVI–XIX | Wikimedia Commons, thư viện/bảo tàng số: dùng tranh/ảnh public domain, ghi nguồn | Khung nền sọc |
| `map_colonial_southeast_asia` | 06 | Tùy chọn (nên có) | 5:4, ≥1600×1280 | Bản đồ thuộc địa khoảng 1900–1914, màu khớp chú giải | Tự vẽ hoặc bản đồ public domain; ghi đúng niên đại | Khung nền sọc |
| `historical_documents` | 11 | Tùy chọn | 8:3 hoặc 16:9 | Tư liệu hành chính/công báo Xiêm | Public domain, ghi nguồn | Khung nền sọc |
| `portrait_rama_iv`, `portrait_rama_v` | 10 | Tùy chọn (nên có) | 2:3, ≥660×1040 | Chân dung Mongkut, Chulalongkorn | Ảnh thế kỷ XIX đã public domain, kiểm tra license từng file | Khung tối + spotlight |
| `historical_school_siam` | 13 | Tùy chọn | 3:2, 1040×680 | Trường học/giáo dục Xiêm cuối thế kỷ XIX | Public domain | **Ẩn hẳn** khung ảnh |
| `bowring_treaty_document`, `franco_siamese_crisis_1893`, `anglo_siamese_treaty_1909` | 14 | Tùy chọn | 7:3, 1400×600 | Ảnh trang hiệp ước/tư liệu cùng chủ đề | Lưu trữ quốc gia, Wikimedia Commons | **Ẩn hẳn** ảnh thu nhỏ trên thẻ |
| `<tên video>_poster` | 01, 02, 09, 05, 12, 18 | Tùy chọn | 16:9 | Khung đầu của clip | Cùng nguồn clip | Nền dự phòng |

Chưa gắn vào scene nào (**không cần tạo**): `map_southeast_asia_historical`, `map_siam_territorial_changes`, `map_trade_routes`, `colonial_administration`, `historical_railway_siam`. Một ảnh dùng được cho nhiều chỗ; không tải ảnh không rõ bản quyền.

## K. Bảng mô hình 3D (tùy chọn)
| File | Scene | Quy ước | Fallback |
|---|---|---|---|
| `rama_iv.glb`, `rama_v.glb` | 10 | glTF Binary (.glb), một file, texture nhúng; trục Y hướng lên, mặt nhìn về +Z; đơn vị tùy ý (tự co theo khung); không dùng nén Draco/Meshopt; nên ≤ 10 MB | `portrait_rama_iv/v` |

Chỉ tải Three.js và model khi vào scene 10 và khi file `.glb` tồn tại; lỗi đọc model thì dùng ảnh, không chặn nội dung. Tắt hẳn bằng `useModels:false`.

## L. Cách debug
**Ctrl+Shift+D** mở bảng debug: scene, trạng thái Appwrite (`connected/disconnected` kèm thông báo lỗi nếu có), chế độ nhẹ, reduced motion, đường dẫn gốc, trạng thái từng video và danh sách file thiếu/lỗi. Khi mở debug, ô ảnh thiếu hiện tên file cần đặt.

Phím tắt: →/Space/PageDown tiếp; ←/Backspace/PageUp lùi; Home/End; **F** toàn màn hình; **H** ẩn giao diện; **S** nguồn; **M** mục lục; **K** bỏ qua/phát video; Esc đóng bảng. Phím bị bỏ qua khi đang gõ trong ô nhập. Vuốt ngang trên màn hình cảm ứng.

**Đã kiểm thử tự động (Chromium headless, Playwright):** 18 scene dựng đúng và không tràn khung ở 1920×1080; chạy khi thiếu media; có media giả (video VP8 đặt tên .mp4, ảnh .jpg); bỏ qua/tự chuyển video; chuyển nhanh nhiều slide; video dừng khi rời scene; model lỗi/thiếu; Appwrite chưa cấu hình, thiếu SDK, và logic đồng bộ với SDK giả lập (kênh, kéo trang, nhận sự kiện, chống vòng lặp, ghi gộp, ngắt kết nối, lỗi origin); mục lục, debug, về đầu, kết thúc; chạy dưới đường dẫn con `/REPO/`; reduced motion; chế độ nhẹ; portrait/landscape điện thoại. **Chưa kiểm thử được:** H.264 thật (trình duyệt headless không có codec), **Appwrite thật** (cần project của bạn; lệnh gọi `TablesDB.getRow/updateRow` và `Realtime.subscribe` viết theo tài liệu appwrite.io, chưa chạy với máy chủ thật), model GLB hợp lệ (không có model), Safari/iOS, tab ẩn trên máy thật, máy chiếu thật.

## M. Lỗi thường gặp
| Hiện tượng | Cách xử lý |
|---|---|
| Video không hiện, nền dự phòng | Sai tên/chữ hoa; chưa upload; codec không phải H.264. Xem debug |
| Ảnh hiện khung sọc | Thiếu file hoặc sai tên (xem bảng J); Ctrl+F5 để xóa cache |
| Nút "▶ Phát video" xuất hiện | Trình duyệt chặn autoplay hoặc bật giảm chuyển động: bấm nút |
| Trên GitHub Pages 404 | File ở thư mục con hoặc sai chữ hoa/thường; Pages cần vài phút sau mỗi lần đẩy |
| Appwrite `disconnected (Invalid Origin…)` | Chưa thêm hostname ở **Add platform > Web** (nhớ cả `localhost` và `TENBAN.github.io`) |
| Appwrite `disconnected (… not found)` | Sai Database/Table ID hoặc chưa tạo row có ID `state` |
| Appwrite `disconnected (… not authorized)` | Row chưa có quyền Read/Update cho **Any**, hoặc chưa bật **Row security** |
| Appwrite `disconnected (không tải được Appwrite SDK)` | CDN jsDelivr bị chặn/offline: trình chiếu vẫn chạy local |
| Máy chiếu không đổi trang theo máy điều khiển | Máy điều khiển phải mở địa chỉ có `?control=1` (debug hiện `[điều khiển]`); hai máy cùng một Project/Database/Table ID |
| Chữ nhỏ trên điện thoại | Khung trình chiếu 1920×1080 co theo màn hình: dùng máy tính/máy chiếu |
| Model 3D không lên | Thiếu `.glb`, file quá nặng, nén Draco, WebGL tắt: dùng ảnh chân dung |

## N. License và nguồn tư liệu
- Mã nguồn: của người dùng dự án. Font Cormorant Garamond và Source Sans 3 (Google Fonts, SIL OFL). Appwrite Web SDK 21.2.1 (BSD-3-Clause) và Three.js r128 (MIT), tải từ jsDelivr, chưa gắn SRI.
- Tư liệu: SGK Lịch sử 11 (Kết nối tri thức); Tarling (Cambridge History of Southeast Asia); Wyatt (Thailand: A Short History); Baker và Phongpaichit (A History of Thailand); Thongchai Winichakul (Siam Mapped, 1994); hồ sơ ICJ vụ Đền Preah Vihear (1959–62). Nguồn từng slide xem nút **Nguồn**.
- **Kiểm chứng:** hiệp ước Pháp–Xiêm **13/2/1904** (nhượng đất hữu ngạn Mê Kông đối diện Luang Prabang, và vùng Champasak) và **23/3/1907** (Xiêm nhượng Battambang, Siem Reap, Sisophon; nhận lại Trat và Dan Sai) đã đối chiếu với văn bản trong hồ sơ ICJ; hiệp ước 1893 (tả ngạn Mê Kông) cũng có trong hồ sơ này. Các mốc còn lại (Bowring 1855, Anh–Pháp 1896, Anh–Xiêm 1909, cải cách 1873/1874/1892/1905/1908, đường sắt Bangkok–Khorat 1900, mốc thuộc địa 1511–1898) dựa trên SGK và các sách trên, **chưa tra lại trực tuyến trong bản này**; giáo viên nên đối chiếu một lần với SGK trước khi dùng chính thức. Phân biệt: Xiêm không bị biến thành thuộc địa/bảo hộ; mất lãnh thổ ngoại vi và chịu hạn chế đặc quyền lãnh sự, thuế quan.

## O. Checklist trước giờ thuyết trình
- [ ] Mở trên **máy sẽ dùng**, đúng trình duyệt, qua http(s) (không `file://`); Ctrl+F5.
- [ ] Đi hết 18 scene bằng phím →; kiểm tra video/ảnh đã đặt đúng tên; Ctrl+Shift+D không còn mục thiếu quan trọng.
- [ ] Thử F (toàn màn hình), K (bỏ qua video), Esc; thử chế độ "Hiệu ứng nhẹ" nếu máy yếu.
- [ ] Đặt âm lượng hệ thống bất kỳ: video luôn tắt tiếng.
- [ ] Nếu dùng Appwrite (đã thêm hostname web, row `state` có quyền Any): máy điều khiển mở địa chỉ có `?control=1`, máy chiếu mở địa chỉ thường; thử đổi trang từ máy điều khiển; có kế hoạch dự phòng khi mất mạng (trình chiếu local vẫn chạy).
- [ ] Mở sẵn nút **Nguồn** cho slide cần dẫn nguồn; có bản dự phòng (tải sẵn trang hoặc chạy `python3 -m http.server`).
