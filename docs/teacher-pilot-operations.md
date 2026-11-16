# SmartTeach — vận hành đợt dùng thử giáo viên

Phạm vi: 2–3 giáo viên, Next.js 16/Node 24 và Supabase hiện có. Đích online dự kiến: https://smartteachvn.vercel.app/. Tài liệu này không xác nhận bản online đã cập nhật. payOS tiếp tục hoãn.

## Tính năng và quyền

| Free | Premium |
|---|---|
| Quiz, trò chơi cơ bản; soạn đề có phần và bốn loại câu; nhập mẫu CSV/XLSX/DOCX/PDF; xuất Word/PDF | Thêm AI nhập đề bố cục tự do và tạo/phát hành kiểm tra online |

Giá giữ 50.000đ/tháng, 500.000đ/năm. Hết Premium vẫn xem/sửa đề cá nhân, đọc/đóng bài đã phát hành và tải kết quả; lượt học sinh đã phát hành tiếp tục theo thời hạn. Admin không có quyền đọc lớp, đề, kết quả hoặc chat riêng của giáo viên khác. Góp ý do giáo viên chủ động gửi được admin xử lý tại `/admin/feedback`.

Đề và quiz là hai nghiệp vụ khác nhau. Đề có thời lượng **toàn bài** 1–180 phút, tối đa 10 phần/50 câu, điểm từng câu 0,01–100; điểm được lưu bằng số nguyên phần trăm để tránh sai số. Bốn loại: một đáp án, Đúng/Sai, nhiều đáp án và trả lời ngắn đối sánh chính xác. Chấm nhiều đáp án theo nguyên tắc đúng toàn bộ; không có chấm tự luận bằng AI.

## Local

1. `npm ci`, `npm run supabase:start`; dùng cấu hình bí mật local hiện có, không chép project production đè local.
2. `npx supabase migration up --local` áp các migration chưa có, không reset DB. Giữ toàn bộ migration nền admin/RAG/membership trước các migration đề.
3. Đặt `APP_BASE_URL` đúng origin và cổng máy chủ. Cấu hình Supabase URL/anon key công khai và service-role **server-only** theo `.env.example`.
4. Recovery dùng SMTP/Mailpit local, không gửi email thật. Mailpit mặc định `http://127.0.0.1:54324`. Liên kết khôi phục phải mở ở trình duyệt vừa yêu cầu do PKCE.
5. AI sử dụng key/model đã kiểm kết nối tại `/admin/ai`, `AI_KEYRING_JSON` đúng phiên bản mã hóa, và `EXAM_IMPORT_WORKER_SECRET` tối thiểu 32 ký tự. Có thể dùng `RAG_WORKER_SECRET` làm fallback; môi trường triển khai nên đặt secret riêng.
6. Chạy `node scripts/configure-exam-cron.mjs`. Script chỉ ghi Vault trong container `supabase_db_smartteach`, từ chối origin ngoài localhost. Biến `APP_BASE_URL` của tiến trình phải đúng cổng đang chạy. Script không đặt lịch RAG hoặc cấu hình remote.
7. `npm run dev`, hoặc `npm run build` rồi `npm run start -- --port 3100` khi `APP_BASE_URL=http://localhost:3100`. Không chạy dev và build đồng thời trên cùng `.next`.

## Scheduler và hàng chờ nhập đề

| Thành phần | Cấu hình/kiểm tra |
|---|---|
| Worker HTTP | `POST /api/internal/exams/jobs/run`; Bearer đúng secret server; giới hạn route 30 giây |
| Vault | `smartteach_exam_worker_url`, `smartteach_exam_worker_secret`; fallback secret RAG nếu chưa đặt riêng |
| URL production | `https://TEN-MIEN/api/internal/exams/jobs/run` |
| URL Docker local | `http://host.docker.internal:CONG/api/internal/exams/jobs/run` |
| Cron nhập đề | `smartteach-exam-import`, mỗi phút; cần `pg_cron`, `pg_net`, Vault và máy chủ web đang chạy |
| Cron chốt bài | `smartteach-exam-finalize`, mỗi phút, SQL trực tiếp; không cần máy chủ web |
| Quan sát | `/admin/operations`: tổng hợp trạng thái và heartbeat, không có nội dung đề hoặc đường tải riêng |

Preflight yêu cầu key healthy, model được hỗ trợ, keyring/secret và heartbeat trong 3 phút. Khi chưa sẵn sàng, API không nhận thêm tệp AI. Hosting protection phải cho scheduler gọi endpoint nhưng vẫn giữ kiểm tra Bearer. Không đưa secret vào URL, log, screenshot hoặc biến `NEXT_PUBLIC_*`.

Job và checkpoint nằm trong Postgres; tệp trong bucket private `exam-imports`, tách khỏi `rag-documents`. Đóng tab hay tắt Next.js không xóa hàng chờ. Bật lại server/scheduler để tiếp tục. Quá hạn, hủy hoặc apply sẽ ẩn nguồn/kết quả và lên lịch dọn Storage. Nếu worker/Storage ngừng hoạt động, việc xóa vật lý bị trì hoãn; quyền xem nguồn vẫn hết hạn sau 24 giờ. Đề đã lưu không bị dọn theo tệp nhập.

Giới hạn: 1 job hoạt động/tài khoản, 3 job/ngày theo giờ Việt Nam, tối đa 2 lượt provider/job qua mọi lần retry/reclaim; mỗi step tối đa 1 lượt. Hạn mức provider chung theo project/model vẫn được áp dụng; không đổi key để vượt quota. Không bật billing tự động.

| Trạng thái | Xử lý |
|---|---|
| `reserved` | Tệp chưa tải đủ; chọn lại cùng tệp/yêu cầu hoặc hủy |
| `queued` | Đã nhận, chờ worker; kiểm heartbeat nếu kéo dài |
| `extracting`, `generating` | Đọc chữ/nhận dạng; không cần giữ tab mở |
| `waiting_quota` | Đợi quota hoặc lỗi dịch vụ tạm thời; worker thử trong giới hạn và hạn lưu tệp |
| `needs_review` | Giáo viên đối chiếu câu, lựa chọn, điểm và đoạn nguồn; xác nhận rồi lưu nháp, chưa phát hành |
| `failed` | Đọc thông báo; lỗi key/model/request cần admin sửa cấu hình, sau đó tạo lượt nhập mới |
| `applied`, `cancelled`, `expired` | Không tự phục hồi từ worker cũ; dọn nguồn có thể tiếp tục khi dịch vụ trở lại |

Nguồn không có đáp án hoặc điểm rõ ràng được để trống để giáo viên bổ sung. Khóa đáp án không gắn được đúng câu cũng bị bỏ. AI có thể nhận thiếu/sai: bắt buộc đối chiếu tệp gốc. Corpus kiểm tra ở `tests/fixtures/exams/ai/`; `golden.json` hiện là kỳ vọng tổng hợp, **chưa được giáo viên nghiệm thu**. Một smoke Gemini thành công không thay thế đánh giá toàn bộ corpus.

## Nhập/xuất và nháp

Mẫu tải ở `/templates/exams/`. Chỉ nhận `.docx`, `.pdf` có chữ chọn được, `.xlsx`, `.csv` UTF-8; tối đa 2 MiB, PDF 30 trang. Không OCR, ảnh/công thức, macro, `.doc/.xls`, giữ bố cục tự do trong nhánh nhập mẫu. Tệp sai cấu trúc phải sửa rồi nhập lại; không thành công bằng cách âm thầm cắt hàng/câu.

Xuất tại đề đã lưu, có bản học sinh và bản đáp án riêng. Lưu thay đổi trước khi tải; API kiểm revision để tránh xuất nhầm. DOCX chỉnh sửa được; PDF nhúng font tiếng Việt có giấy phép. CSV kết quả có UTF-8 BOM, dấu nháy và chống công thức; `correct/total` là số câu, `score_points/max_points` là điểm của đề v2, `legacy_score` giữ riêng cho bài cũ.

Nháp IndexedDB chỉ thuộc trình duyệt/thiết bị đang soạn và được tách theo tài khoản. Không đồng bộ nhiều máy, không TTL tự xóa. Nháp không phải bản đã lưu vào tài khoản. Hai tab xung đột dừng ghi tự động và giữ form để đối chiếu; tải lại để chọn nháp. Có cảnh báo khi đăng xuất, dọn nháp sau SDK thành công. Nếu SDK đã xóa phiên local nhưng thu hồi server thất bại, nháp vẫn giữ và UI hướng đăng nhập lại. Khi browser chặn storage thì không thể bảo đảm recovery/dọn nháp; dùng lưu vào tài khoản và xóa dữ liệu trang trên thiết bị dùng chung khi cần.

## Trước khi cập nhật online

Chỉ thực hiện sau authorization riêng cho đúng target. Checklist này chưa được đánh dấu đạt trên production.

| Gate | Bằng chứng cần ghi |
|---|---|
| Candidate | Nhánh/SHA/diff chính xác đã review, bao gồm thay đổi admin/RAG/membership có sẵn |
| Backup | DB và Storage snapshot, người có quyền restore; giữ keyring tương ứng để giải mã |
| Supabase | Đúng project; migration history, schema/RPC/RLS, private bucket, extension, cron, heartbeat |
| Server env | Tên biến theo `.env.example`, origin canonical, keyring/version; không ghi giá trị vào báo cáo |
| Auth | Site URL/allowlist callback, template PKCE, SMTP gửi được đến 2–3 giáo viên, rate/password/reauth policy |
| Runtime | Node, thời gian function, payload, font/PDF worker trong tracing; tải Word/PDF trên host thật |
| AI | Model/key/project/tier/quota thật; corpus giáo viên kiểm và các ca thiếu đáp án/điểm |
| Smoke online | A/B/admin, Free/Premium/hết hạn, recovery email thật, nhập/xuất, student deadline, CSV, góp ý, AI/Cron |

Thứ tự: backup → migrations bổ sung tương thích → app → kiểm smoke → bật sử dụng. Không `supabase db reset`, không `supabase config push` thiếu đối chiếu, không drop cột/bảng mới để rollback. Khi rollback: chặn nhận job/phát hành mới bằng cấu hình/triển khai đã review; giữ nguồn/đề/kết quả và scheduler chốt bài, phục hồi candidate tương thích schema. Không quay về binary cũ làm mất khả năng đọc dữ liệu v2.

## Kịch bản 2–3 giáo viên

Mỗi giáo viên dùng dữ liệu giả/được phép: đăng nhập → khôi phục/đổi mật khẩu → soạn quiz/đề → reload và khôi phục nháp → nhập một tệp → sửa câu/điểm → xuất Word/PDF → kiểm tra online nếu có Premium → học sinh làm/nộp → CSV → gửi góp ý. Dùng thử ít nhất một điện thoại và tablet 768 px, thử keyboard. Ghi bước vướng và ảnh đã che dữ liệu nhạy cảm qua Góp ý. Admin phân loại Mới/Đang xử lý/Đã xử lý rồi retest.

Cấp Premium dùng thử trên online cần xác nhận riêng cho đúng tài khoản/môi trường. Không kích hoạt payOS hay tự gửi email/tin nhắn mời. Chỉ gọi “pilot đã nghiệm thu” sau smoke online và phản hồi thật.
