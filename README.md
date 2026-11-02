# Trình chiếu lịch sử: Đông Nam Á trước làn sóng thực dân và con đường của Xiêm

Website trình chiếu 16:9 chạy trên GitHub Pages, **đồng bộ mọi thiết bị qua Supabase**. Nội dung lịch sử (18 slide), nguồn tham khảo và bố cục từng loại slide được giữ nguyên từ bản trước; phần thay đổi là lớp đồng bộ, điều khiển, video và chuyển cảnh.

## Các file

| File | Vai trò |
|---|---|
| `index.html` | Khung trang, đúng hai nút `‹` `›` |
| `style.css` | Thiết kế, bố cục, chuyển cảnh |
| `script.js` | Nội dung slide, Supabase, video, chuyển cảnh (thay `app.js` cũ; xóa `app.js`) |
| `supabase.sql` | Bảng, RLS, hàm chuyển slide, Realtime |

## 1. Cấu hình Supabase

1. Tạo project tại supabase.com.
2. Mở `supabase.sql`, **đổi `DOI_MAT_KHAU_NAY`** (mục 5) thành mật khẩu điều khiển dài, khó đoán. Nếu quên đổi, script tự báo lỗi và không chạy.
3. Dán toàn bộ vào **SQL Editor** và chạy. Chạy lại nhiều lần vẫn an toàn và không đưa bài về slide đầu.
4. Vào **Project Settings > API** lấy *Project URL* và *publishable key* (hoặc `anon` key). Điền vào đầu `script.js`:
   ```js
   supabaseUrl:"https://xxxx.supabase.co",
   supabaseKey:"sb_publishable_...",
   ```
   **Không bao giờ** dùng `service_role` key trong file này.
5. Kiểm tra: **Database > Replication** thấy bảng `presentation_state` trong publication `supabase_realtime`.

Khi để trống hai giá trị trên, trang chạy ở chế độ local (chỉ máy đó, dùng để soạn bài).

## 2. Cách hoạt động

- Bảng `presentation_state` có đúng một hàng: `page` (slide hiện tại, từ 0), `rev` (tăng 1 mỗi lần ghi), `updated_at`.
- **Mở/tải lại trang:** trang đọc `page` từ Supabase rồi mới vẽ slide, không nháy về slide đầu. URL không bao giờ đổi, không dùng hash, query, `localStorage` hay `sessionStorage` để quyết định slide.
- **Người điều khiển** bấm `›`/`‹` (hoặc phím mũi tên, Space, PageUp/PageDown, Home, End; vuốt trên cảm ứng): trang gửi hàm `set_presentation_page(đích tuyệt đối, rev đang biết, mật khẩu)`, **chờ server xác nhận**, rồi mọi máy (kể cả máy này) chuyển slide qua cùng một đường nhận. Bấm nhanh thì các lần bấm cộng dồn và chỉ gửi đích cuối.
- **Chống lệch/ghi đè:** mỗi bản cập nhật có `rev`; máy nào nhận bản cũ hoặc trùng đều bỏ qua. Hàm ghi dùng "so sánh rồi ghi": nếu `rev` đã đổi (người khác vừa chuyển), lệnh bị từ chối và trang nhận trạng thái mới.
- **Mất mạng / Realtime rớt:** hiện thông báo nhỏ phía trên, không coi thao tác là thành công. Khi kết nối lại, khi quay lại tab, hoặc khi có mạng lại, trang đọc lại trạng thái chuẩn. Chỉ thử lại (backoff 1 đến 15 giây) khi Realtime đang rớt, không có vòng lặp kiểm tra liên tục.
- **Mật khẩu điều khiển:** lần đầu bấm điều hướng trên một máy, trang hỏi mật khẩu; mật khẩu chỉ nằm trong bộ nhớ của tab (tải lại phải nhập lại). Máy chưa nhập mật khẩu vẫn xem và đồng bộ bình thường; vuốt trên điện thoại người xem không làm gì.

## 3. Video

Video nằm cùng thư mục với `index.html`. Tên file (MP4, H.264/AAC), đổi tên trong `script.js` ở trường `v:` / `bgv:` của từng slide:

| Slide | File | Vai trò |
|---|---|---|
| `opening` | `opening_army.mp4` | Video toàn màn hình |
| `earth-sea` | `intro_southeast_asia.mp4` | Trái Đất tiến về Đông Nam Á, **tự sang slide kế khi hết** |
| `earth-siam` | `intro_siam.mp4` | Tiến về Xiêm, **tự sang slide kế khi hết** |
| `ending` | `ending_history.mp4` | Video nền kết bài |
| `timeline` | `colonial_invasion.mp4` | Video nền mờ (bỏ ở chế độ nhẹ) |
| `economy` | `siam_reform.mp4` | Video nền mờ (bỏ ở chế độ nhẹ) |

Ảnh bìa tùy chọn: `<tên video>_poster.jpg`. Ảnh slide (`.png/.jpg/.jpeg/.webp`): `historical_trade_port`, `map_colonial_southeast_asia`, `historical_documents`, `historical_school_siam`, `bowring_treaty_document`, `franco_siamese_crisis_1893`, `anglo_siamese_treaty_1909`, `portrait_rama_iv`, `portrait_rama_v` (có thể thêm mô hình `rama_iv.glb`, `rama_v.glb`).

**Các file này chưa có trong dự án.** Thiếu file thì slide dùng nền dự phòng điện ảnh, không báo lỗi lên màn hình, không tự sang slide khác; tên file thiếu hiện trong bảng debug (Ctrl+Shift+D).

- Video tự phát khi slide hiện ra, không có nút Play hay thanh điều khiển; rời slide thì dừng và giải phóng.
- Để tắt tự chuyển slide sau video, xóa `auto:1` của slide đó. Chỉ máy đã nhập mật khẩu điều khiển mới tự chuyển, các máy khác chờ Supabase.
- **Autoplay:** video chạy ở chế độ tắt tiếng, trình duyệt thường cho phép. Nếu bị chặn, video thử lại ở lần chạm/bấm phím đầu tiên. Âm thanh: đặt `sound:true` trong `CONFIG`, video chính có tiếng sau cú chạm/phím đầu tiên của người điều khiển; trình duyệt không cho phát tiếng trước đó, và không có cách nào bảo đảm điều này trên mọi thiết bị.
- Giữ video dưới vài chục MB mỗi file (GitHub Pages giới hạn dung lượng site); chỉ video của slide hiện tại được tải.

## 4. Đưa lên GitHub Pages

Đưa `index.html`, `style.css`, `script.js`, các video/ảnh vào cùng thư mục gốc repo (hoặc `/docs`), bật **Settings > Pages**. Mở link trên máy chiếu và các thiết bị khác.

## 5. Kiểm tra đồng bộ (cần Supabase thật)

1. Mở trang ở hai trình duyệt: cùng hiện slide 1, URL không có `#`.
2. Ở trình duyệt A bấm `›`, nhập mật khẩu: cả hai chuyển sang slide 2.
3. Tải lại B: vẫn ở slide 2.
4. Tắt mạng ở A rồi bấm `›`: hiện thông báo, slide không đổi. Bật lại: A tự đọc lại trạng thái.
5. Ctrl+Shift+D hiện bảng debug (trạng thái Supabase, `rev`, lỗi tài nguyên, video).

## 6. Xử lý sự cố

- **Mãi "Đang chuẩn bị…" hoặc báo mất kết nối:** kiểm tra URL/key, đã chạy `supabase.sql`, và Realtime đã bật cho bảng.
- **"Sai mật khẩu điều khiển":** mật khẩu khác với `v_pass` đã chạy. Chạy lại mục 5 của SQL với mật khẩu mới.
- **Thông báo "Slide vừa được đổi từ nơi khác":** hai người cùng điều khiển; bấm lại.
- **Video không tự phát:** bấm hoặc nhấn phím một lần; kiểm tra file tồn tại, đúng tên, là H.264/AAC.
- **Giật:** máy yếu tự giảm hiệu ứng (tắt video nền, parallax); hệ điều hành bật "giảm chuyển động" cũng tắt animation nhưng video chính vẫn phát.

## 7. Giới hạn bảo mật cần biết

- Publishable/anon key nằm trong mã nguồn công khai; ai cũng **đọc** được số trang. Bảng không chứa dữ liệu nhạy cảm.
- Không ai ghi trực tiếp vào bảng được; chỉ hàm RPC ghi, và cần mật khẩu. Hàm chưa giới hạn số lần thử, nên hãy dùng mật khẩu dài; đổi mật khẩu sau buổi trình bày nếu cần.
- Mật khẩu điều khiển đi qua kết nối HTTPS tới Supabase, không lưu trên trình duyệt.

## 8. Những gì đã thay đổi so với bản cũ

Thay Appwrite bằng Supabase; bỏ `?control=1`, `#số-trang`, `localStorage`; bỏ các nút Mục lục, Nguồn, Hiệu ứng nhẹ, Toàn màn hình, Ẩn giao diện, Phát/Bỏ qua video, nút cuối bài, thanh tiến độ và số trang. **Nguồn tham khảo** không mất: hiện thành dòng chân trang mờ ở mỗi slide nội dung. Phím `F` vẫn bật toàn màn hình. Thêm: camera zoom chậm, parallax nhẹ, tiêu đề hé lộ qua mặt nạ, chuyển cảnh mờ + giảm sáng, lưới bản đồ vẽ dần (kết hợp với wipe giữa các chương đã có).

## 9. Phạm vi đã kiểm tra

Đã làm: kiểm tra cú pháp `script.js`; chạy thử logic đồng bộ với Supabase giả (đọc trạng thái khi mở trang, bấm nhanh cộng dồn, bỏ sự kiện cũ/trùng, nhận cập nhật từ máy khác, đặt đích tuyệt đối, chặn vượt slide cuối); rà soát không còn `localStorage`/hash/Appwrite/`service_role`.

**Chưa kiểm tra** (cần bạn làm): chạy `supabase.sql` trên project thật; kết nối Realtime thật; hiển thị và hiệu ứng trên trình duyệt; autoplay video thật (chưa có video); phiên bản `supabase-js@2.45.4` được ghim trong `index.html` (tôi không kiểm tra được trực tuyến, nếu CDN báo 404 thì đổi sang phiên bản 2.x hiện hành).
