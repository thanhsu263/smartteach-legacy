# Hợp đồng thực thi chung

Các tên mới dưới đây là điểm đích cho build, không phải mô tả code đang có. Nền giữ Next/React/Supabase, RPC/RLS và conventions hiện hành; không thêm worker/service riêng. Giới hạn dưới đây là giới hạn kỹ thuật v1 cho kho nhỏ, không phải gói thương mại hoặc lời hứa quota nhà cung cấp.

## 1. Quyền và ranh giới

- Teacher active: dữ liệu thuộc mình. Admin không được quyền đọc exams, imports, quiz drafts, roster/điểm/chat riêng của teacher khác. Service role chỉ trong server/worker, không trả qua bundle/log.
- Free: exam CRUD, nhập theo mẫu, xuất Word/PDF. Premium active: thêm reserve/start/retry AI import và create/publish exam assignment. Kiểm lại ở transaction DB; không tin client, owner_id do client gửi, hoặc cờ premium trong JWT.
- Legacy assignment giữ chính sách Premium hiện có, không nới Free do thêm soạn đề Free. Premium hết hạn vẫn xem/đóng/xuất kết quả, học sinh tiếp tục bài đã phát hành; không cho thêm gọi AI hoặc phát hành mới.
- Tất cả RPC mới dùng require_active_user/require_admin thích hợp, search_path='', grants tối thiểu; RLS mới không mặc định được script guard cũ bảo vệ. Thay thế hàm cũ phải giữ active guard.
- HTTP theo AppError/failure/json trong src/lib/admin/http.ts, error {code,message,requestId}, no-store; mutations kiểm Origin qua APP_BASE_URL. Không dùng helper mutation JSON để nuốt multipart hoặc bỏ qua giới hạn streaming.
- Mã: 400 input, 401 auth, 402 premium, 403 forbidden/origin, 404 không thấy object người khác, 409 revision/state/idempotency conflict, 413 capacity, 429 quota, 503 dependency. Thêm mapping lỗi rõ cho feature mới, không raw provider/SQL errors.

## 2. Routes và RPC mới

| Surface | Giao diện/endpoint mới | Data boundary |
|---|---|---|
| Recovery | /forgot-password, /reset-password; mở rộng /auth/callback | Supabase resetPasswordForEmail/exchangeCodeForSession/updateUser, không admin reset |
| Account | /account/security | RequireUser, reauthenticate/nonce khi policy yêu cầu; không đổi mật khẩu Google |
| Góp ý | /feedback; GET/POST /api/feedback; /admin/feedback; GET/PATCH /api/admin/feedback/[id] và GET /api/admin/feedback | Teacher owner; admin chỉ góp ý được chủ động gửi |
| Đề | /my-exams, /my-exams/new, /my-exams/[id], /my-exams/import | exams owner-only, entry trong TeacherShell |
| Đề API | GET/POST /api/exams; GET/PATCH/DELETE /api/exams/[id] | Cookie auth, revision và requestId; RPC exam_list/detail/save/delete |
| Import mẫu | POST /api/exams/parse (tệp nhỏ bounded) | Owner auth, deterministic, không AI, không lưu tệp lâu dài |
| Xuất đề | GET /api/exams/[id]/export?format=docx|pdf&audience=student|teacher&revision=N | Owner, exact revision; không cache public; Content-Disposition attachment |
| Phát hành online | RPC create_exam_assignment(p_exam,p_revision,p_class,...); mở rộng API/types /assignments | Owner class + Premium, snapshot v2 chụp atomic; publish_assignment kiểm lại |
| AI riêng | GET/POST /api/exam-imports; GET/DELETE /api/exam-imports/[id]; POST .../[id]/complete-upload, /retry, /apply | Reserve upload, poll status, cancel, atomic apply một lần; owner-only |
| Worker AI | POST /api/internal/exams/jobs/run | Bearer secret tương tự worker RAG; awaited bounded step; service-only claim/result |

Các route /account, /feedback, /my-exams phải thêm cả protected-paths.ts và proxy.ts matcher, layout RequireUser + Suspense. Route API và RPC vẫn tự authorize. /forgot-password, /reset-password public entry; trang reset chỉ đổi cho phiên Auth hợp lệ. Không coi tham số next hoặc event UI là bằng chứng được đổi người khác.

CSV dùng DTO/RPC owner-only đang có rồi serialize phía browser; không cần endpoint export dùng service role. Refresh dữ liệu trước xuất, không nhận dữ liệu từ query string. Không thêm quyền admin cho tiện tải CSV.

## 3. Recovery và nháp

Recovery dùng PKCE hiện có: resetPasswordForEmail(email,{redirectTo: canonicalOrigin + "/auth/callback?next=/reset-password"}); callback exchange trên server, redirect nội bộ và đường lỗi recovery có hành động gửi lại. Callback thất bại do hết hạn/đã dùng/mất PKCE verifier không loop. Thông báo gửi giống nhau cho email có/không tài khoản; provider rate-limit có hướng đợi/thử lại, không giả đã gửi khi dependency lỗi. Không log email recovery/token/mật khẩu. Production origin từ cấu hình tin cậy, không Host tùy ý.

Đổi mật khẩu của chính phiên, confirm password, lỗi policy/nonce xử lý được; reauthenticate gửi OTP khi cần rồi updateUser({password,nonce}). Luồng email/password giữ Google login. Với Google-only hướng dẫn quản lý mật khẩu tại Google, không nói thao tác đang đổi mật khẩu Google. Không đổi Auth policy remote tự động.

Nháp local: IndexedDB native với transaction readwrite cho read-check-write; không thêm thư viện hoặc đồng bộ server. Adapter dùng chung dưới src/lib/drafts/ mới; key namespace + schemaVersion + userId + entityKind + entityId. Một bản đang soạn mỗi quiz; payload có target questionId hoặc new, baseline fingerprint, savedAt, writerId, revision, draft đầy đủ. Quiz draft tối đa 128 KiB; exam draft tối đa 256 KiB, tổng namespace 2 MiB. Không tự xóa bản khác khi vượt giới hạn, báo không thể bảo đảm khôi phục. Không TTL tự mất nháp.

Đọc chỉ sau auth xác minh và server owner-load thành công; loading/signed-out không hiển thị dữ liệu cũ. Debounce 400ms, flush khi blur/pagehide/visibilitychange, không dựa riêng beforeunload. Chỉ dirty mới ghi; chỉ dọn sau save thành công đúng revision đã gửi, không xóa thay đổi gõ tiếp trong lúc save. Baseline server thay đổi: yêu cầu chọn khôi phục sau đối chiếu, tuyệt đối không auto save. entity bị xóa: báo rõ và cho bỏ nháp, không phục hồi vào quiz khác.

Đa tab: so revision+writer rồi put trong cùng transaction IndexedDB readwrite để tránh hai tab cùng ghi đè; BroadcastChannel báo invalidation/conflict (focus luôn đọc lại khi thiếu channel) và ngừng autosave cục bộ của tab cũ. Không âm thầm last-write-wins. Storage bị chặn/quota/corrupt version: báo lỗi, vẫn giữ state đang soạn và luồng save server. Cảnh báo rời form có dirty; hủy chuyển không mất state. Chủ động logout tập trung: hỏi nếu namespace có nháp, chỉ dọn của account đó sau SDK success, clear trong các tab account đó; lỗi/cancel giữ. Phiên hết hạn ẩn/khóa đọc và ghi nhưng giữ để đúng account xác minh lại. Dữ liệu trình duyệt không tự mã hóa hoặc bảo mật khỏi người có quyền trên thiết bị.

## 4. CSV và góp ý

CSV UTF-8 BOM + CRLF; escape mọi ô theo RFC4180. Ô text untrusted bắt đầu (kể cả leading whitespace/control) bằng =,+,-,@ hoặc tab/CR phải neutralize bằng apostrophe; số typed hợp lệ xuất như số, không nhận công thức. Ngày ISO8601 có timezone; filename sanitize, không secrets. Data null xuất trống.

Live: session_id, quiz_title, created_at, ended_at, question_total, nickname, rank, status(active/left/removed), score, answered, correct; giữ điểm game, không tự coi là điểm thi. Assignment: assignment_id,title,class_name,student_name,status,started_at,submitted_at,correct,total,score_points,max_points; legacy score_points/max_points để trống, giữ thêm legacy_score nếu cần tương thích. Không token/PIN/credential, không export JSON raw snapshot/answer key.

feedback mới: id,owner_id,request_id,kind(bug|suggestion),body,status(new|in_progress|resolved),created_at,updated_at,version,context_path nullable. Unique(owner_id,request_id), hash payload phát hiện retry ID khác nội dung. Body 10–2000 ký tự, context_path chỉ pathname whitelist nội bộ, không query/hash; loại bỏ control bất hợp lệ, render text. 5 gửi/10 phút, 20/ngày/account theo giờ VN, atomic DB; page 20 max50. Không upload/screenshot/chat attach. Teacher chỉ read own và create; admin read submitted feedback và update status với version; audit chỉ feedback ID/from/to, không body.

## 5. Dữ liệu đề kiểm tra mới

public.exams: id,owner_id,title,description,document jsonb,revision,created_at,updated_at; RLS owner active, không policy admin read. document schemaVersion=1 gồm durationMinutes và sections[{id,title,questions:[{id,kind,prompt,options,accepted_answers,ignore_diacritics,pointUnits}]}]. Không lưu question time_limit_seconds của game như thời lượng thi.

Giới hạn: 50 đề/account, 50 câu/đề, 10 phần, title100, description1000, tên phần100; prompt500, option150, 2–6 options, accepted answers≤10×100 theo quiz; duration 1–180 phút; pointUnits integer 1–10000 (1 đơn vị =0,01 điểm), tổng ≤500000 (5000 điểm). Form mặc định 45 phút, 1 điểm/câu nhưng giáo viên chỉnh được; không ép tổng10. Payload ≤256 KiB. Đề nháp cho phép prompt rỗng, đáp án rỗng và pointUnits=null; không vượt bounds; publish/export hoàn chỉnh dùng validator bắt lỗi theo section/question/field. Không export bản đề “hoàn chỉnh” có lỗi chấm mà không cảnh báo.

CRUD theo RPC owner + revision expected; create requestId để retry không tạo đề trùng. Revision conflict không overwrite. DB validate cùng luật client, fixtures dùng chung. UI lưu vào tài khoản bằng hành động Lưu; nháp local có nhãn riêng. Delete confirm owner; snapshot đã giao không bị cascade khi xóa đề nguồn.

## 6. Nhập mẫu và xuất

Parser đề mới dưới src/lib/exams/import/; không thay contract quiz import hiện có. Chuẩn hóa về document với issue {severity,locator:{sheet?,row?,page?,paragraph?,question?},field?,code,message}. Không cắt câu/hàng âm thầm. Input có phần không nhận dạng được phải là blocker có vị trí; chỉ cảnh báo khi thay đổi vô hại (trim khoảng trắng) và đếm minh bạch.

Mẫu v1:
- XLSX/CSV một câu/hàng; cột: section,kind,prompt,option_a..option_f,correct,accepted_answers,ignore_diacritics,points. kind single/true_false/multi/short_text; correct là A..F, multi phân tách dấu |; true_false dùng A=Đúng B=Sai. accepted_answers là JSON array chuỗi trong ô để không mơ hồ ký tự phân cách; points số thập phân tối đa2 chữ số, chấp nhận dấu phẩy kiểu VN khi ô đã quote. Thiếu section gom “Phần 1”. Title/thời lượng nhập trong màn xem trước, không suy từ thời gian từng câu.
- DOCX/PDF xuất mẫu văn bản một cột, không bảng nhiều cột: SMARTTEACH-EXAM:1; mỗi khối bắt đầu PHẦN: tên rồi CÂU: số; các dòng LOẠI:, ĐIỂM:, NỘI DUNG:, A:..F:, ĐÁP ÁN:, CHẤP NHẬN: (JSON array cho short_text), BỎ DẤU: true|false. Nội dung tiếp dòng dùng ký hiệu | ở đầu; mỗi trường chỉ xuất hiện một lần. In hướng dẫn và ví dụ trong mẫu; parser nhận wrap do PDF layout nhưng không đoán bố cục tự do. Header/footer mẫu được nhận diện chính xác. Đáp án không có → issue review, không suy đáp án.
- Có fixture tải được cho cả4 định dạng và golden document. Tệp mẫu chứa câu Đúng/Sai và short_text, tiếng Việt, multiline, lựa chọn đếnF và points thập phân. Legacy aliases ở quiz không tự trở thành chuẩn đề.

Tệp≤2 MiB tất cả formats để bounded Next request; PDF≤30 trang, DOCX expansion≤30 MiB, XLSX≤30 MiB expanded,≤2000 ZIP entries,≤500 rows; text≤100000 ký tự. Từ chối nhiều sheet có nội dung không được chọn rõ, macro/encrypted/scan/no-text; không fetch external relationships/URLs, không render HTML Mammoth. Với file có ảnh/công thức hoặc content không đọc được, báo nằm ngoài phạm vi và block chấp nhận đầy đủ, không âm thầm bỏ. PDF đọc theo batches≤5 trang, không ghép hoàn tất khi thiếu batch; có deadline và destroy tài nguyên. Giới hạn được ép ở server trước cấp phát lớn; client chỉ hỗ trợ UX. File gốc không lưu sau parse mẫu.

Đầu ra cùng model print owner-authorized, A4, header tên đề/thời lượng/tổng điểm, phần/câu/điểm, options, khoảng trống short text, page numbers. DOCX dùng docx (Packer); PDF dùng pdfkit và TTF có giấy phép/OFL kèm repo, embedded font hỗ trợ tiếng Việt; không lấy WOFF2 làm font PDF. Cả hai không giữ layout nguồn. Audience student bỏ toàn bộ đáp án/chấm, không chỉ hide CSS; teacher có answer key riêng, không mã truy cập/roster. Đề vượt layout/page budget báo lỗi, không truncate. Pin version/lockfile sau production compatibility probe; không thêm Puppeteer/LibreOffice vào runtime web.

## 7. Kiểm tra online: mở rộng assignments, không fork hệ thống học sinh

Additive: assignments.exam_id nullable (ON DELETE SET NULL), snapshot_version default1, duration_seconds nullable; quiz_id có thể null ở v2. Không rewrite quiz_snapshot cũ; v2 snapshot có cùng questions flattened + section metadata + pointUnits + duration. V2 lấy từ revision exam hợp lệ của owner khi tạo assignment, giữ invariant snapshot bất biến từ creation như legacy; giáo viên muốn nội dung khác tạo bản giao mới, chỉnh đề nguồn không chấm lại.

assignment_attempts thêm deadline_at nullable, earned_point_units/max_point_units nullable, finalized_at/reason nếu cần; score integer cũ vẫn mang nghĩa legacy số câu đúng, không đổi kiểu/ý nghĩa ngầm. DTO thêm scorePoints/maxPoints cho v2, UI/CSV không hiển thị score cũ như điểm có trọng số. Correct/total là count riêng.

Đồng hồ: deadline_at=min(started_at+duration_seconds,due_at nếu có); started_at cố định lần bắt đầu đầu tiên. Token_expires_at là hạn xác thực receipt, KHÔNG deadline. Exchange lại/rotate token không reset started/deadline; có receipt sau nộp theo chính sách cũ. Sau hạn không được save kể cả Cron chưa chạy. Clock server quyết định; UI hiển thị deadline-serverNow và đồng bộ lại sau focus/network.

Finalizer DB idempotent duy nhất dùng cho submit thủ công, expiry, close bài. Chấm tất cả answer cuối đã commit trước deadline; unanswered=0. all-or-nothing cho multi, true_false/single exact choice; short_text dùng normalization hiện có private.normalize_answer/is_answer_correct, NFC/case/whitespace và tùy chọn bỏ dấu, không AI/fuzzy/partial credit. Cộng integer pointUnits, chia100 ở DTO, không float drift.

Cron SQL mỗi phút chốt tối đa100 attempt đến hạn với SKIP LOCKED và heartbeat, không phụ thuộc tab/HTTP; state/save/submit cũng finalize quá hạn trước trả kết quả. Trạng thái hiển thị có thể chậm≤1 phút khi không traffic, nhưng quyền sửa hết ngay tại deadline. Chốt khi close cả những lượt đang làm, không tạo điểm0 cho học sinh chưa bắt đầu. Không đổi after_close thành immediate chỉ vì hết giờ cá nhân; giữ rule reveal của assignment (đóng bài mới reveal nếu after_close). Legacy v1 giữ hành vi cũ, không tự finalize theo logic duration mới.

Lock order nhất quán assignment→attempt→answers ở hàm thay đổi liên quan; điều kiện deadline recheck trong transaction, race save/submit/close/retry chỉ một kết quả. Token/session/credential rotation/reset/revoke giữ semantics cũ; teacher reset tạo lượt mới theo hành vi existing, không kéo dài lượt cũ. Snapshot key không đưa vào student DTO/DOM/network trước hoặc sau deadline trái reveal policy.

## 8. AI import riêng

Nền Supabase Cron→Next batch hiện có; tách bảng/bucket exam-imports khỏi rag-documents/sources/chunks/vectors. Chỉ tái sử dụng extract functions/gateway, không đưa tệp vào corpus chung hoặc admin document list.

Private tables/jobs: owner_id,request_id,hash,format,bytes,path,status,stage,cursor,lease_token,lease_until,attempt_count,not_before,model/settings_version,result/issues,created/expiry; owner DTO không có credentials/lease/service details. Unique owner/request + unique applied_exam_id. States reserved→queued→extracting→generating→needs_review→applied; waiting_quota,failed,cancelled,expired rõ. API apply(expectedRevision/requestId) tạo đúng1 exam draft và trả cùng ID khi retry; không auto publish.

Reserve Premium active + readiness encryption/AI/worker heartbeat; signed upload đúng path size/MIME, upsert false, private read không cấp admin. Complete-upload verify magic/hash/size và enqueue atomic; stale reservation dọn. Có progress/cancel/delete/result review, poll dừng khi terminal/unmount. Cancel/revoke owner hoặc delete fenced worker không finalize lại.

Limits pilot:1 active AI job/account;3 accepted AI jobs/ngày account (Asia/Ho_Chi_Minh), tối đa2 provider attempts toàn job kể cả failover/reclaim, không reset bằng retry;≤2 MiB,30 trang,100000 text chars toàn tệp. Batches trích xuất ≤5 trang; model stage input≤12000 chars, output≤8192 tokens và≤50 câu; tổng text quá12000 giữ lỗi rõ yêu cầu tách file trước gọi AI (không cắt). Guard output validate JSON schema + domain rules + finishReason/truncation; không tự repair bằng gọi thêm không giới hạn. Reuse model admin allowlist/current gateway, không đổi embedding hoặc bật billing. Kiểm Premium/active khi reserve, complete/retry, và trước từng provider attempt; expiry dừng gọi thêm nhưng owner vẫn xem draft/result đã có.

Mỗi worker step reserve một attempt bền vững trong DB rồi gọi withGemini với budget.remaining=1; vì thế một step tối đa một outbound call. Failover/retry là step tiếp theo trong tổng budget hai attempt của job; không reset budget bằng HTTP retry. Crash sau reserve vẫn tính attempt để không chi vô hạn. waiting_quota dùng not_before, tối đa24h rồi failed với hướng thử ngày khác; transient retry chỉ khi budget còn. Một HTTP step max30s, một generate call/step với timeout12s hiện hành; không làm extraction+generate nhiều phase chung timeout. Quota RPM/TPM/RPD chung project/model không đổi key để vượt quota. Reserve upper bound input/output tokens theo gateway, đối chiếu model runtime để không underestimate. Structured schema chỉ format, không đảm bảo đúng nội dung.

AI chỉ trích những gì có trong nguồn; không tools, external URL, retrieval hoặc instructions trong file. Câu có locator + trích đoạn provenance cho prompt/options/answer; thiếu đáp án null, flag cần bổ sung. Với đáp án trích ra, hiển thị nguồn để teacher xác nhận; không dùng AI làm khóa chấm thật trước review. Giữ coverage báo phần không đọc được/không hỗ trợ; không nói nhận đủ khi chỉ kiểm được format. Teacher là bước quyết định đối với tệp tự do.

Cleanup staging raw/text/result sau24h hoặc sau apply/cancel (xóa Storage retry idempotent); UI báo hạn giữ, owner có xóa ngay. Đề đã xác nhận lưu trong exams không bị cleanup job. Metadata lỗi không nội dung giữ tối đa7ngày; audit không body. Cron cleanup/worker có preflight heartbeat riêng; job còn trong DB khi tắt Next, tiếp tục khi worker trở lại trong hạn. Không mô tả queued là đã xử lý.

## 9. UI/Figma, accessibility

Tham chiếu file 4EEncl4e3CIzdTFNAMm0ry page34:4060. Đã đọc metadata33 frame và context/ảnh6 frame; chưa chứng minh prototype.
- Login34:4649; Editor36:39819, SaveError36:40301.
- Import36:60368→36:60509, lỗi36:60928. Giữ 3 bước chọn→kiểm→xác nhận; mở rộng4format,4kind,points/sections và mode Premium.
- Các màn mới recovery/account/feedback/exam/export/student exam chưa có frame riêng: dùng components/Button/WorkspaceFeedback/RequireUser/TeacherShell và tokens hiện có, không vẽ lại thương hiệu.
- Desktop≥960: form editor list/main/settings; tablet720–959 giữ sidebar hẹp có nhãn, chuyển editor main + tabs Questions/Settings, không ép rail88px từ mockup; mobile<720 navigation dialog hiện có, editor1cột; tables scroll trong vùng có tên và focus. 375/768/1280 không overflow viewport.
- Trạng thái mọi surface: auth-loading, loading, empty, pending, success, validation error, dependency/network error, not-found/forbidden, conflict; Free upgrade disabled có giải thích, không chặn xem nội dung đã lưu.
- Nháp “Đã lưu trên trình duyệt này” khác “Đã lưu vào tài khoản”. Restore/discard có thời điểm, save thất bại giữ nội dung. Import preview có totals/issues/row-or-page locator, chỉnh bằng keyboard, confirm chỉ khi hợp lệ hoặc lưu nháp có đánh dấu.
- Focus chuyển tới lỗi/heading sau navigation đúng chỗ, label/error descriptions, aria-live status, Escape/focus return cho dialog, reorder bằng nút bàn phím. WCAGAA, reduced motion, touch không lệ thuộc hover; không thêm hiệu ứng landing vào form.
- Phải review screenshot browser với những node có mẫu và ghi rõ khác biệt chức năng chủ ý; không lấy Figma fixed4answers,20s/1000points hoặc “auto saved” làm quy tắc nghiệp vụ.

## 10. Nguồn kỹ thuật đối chiếu ngày16/11/2026

Các nguồn xác minh khả năng API, không đảm bảo môi trường đã được cấu hình:
- [Supabase resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail): PKCE recovery.
- [updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser), [reauthenticate](https://supabase.com/docs/reference/javascript/auth-reauthenticate): password/nonce.
- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [rate limits](https://supabase.com/docs/guides/auth/rate-limits): kiểm template, allowlist và khả năng gửi thật; built-in SMTP hạn chế.
- [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html): generic response, one-use/expiry, chống enumeration.
- [docx Packer](https://docx.js.org/api/classes/index.Packer.html): OOXML Buffer xuất DOCX.
- [PDFKit text/fonts](https://pdfkit.org/docs/text.html), [getting started](https://pdfkit.org/docs/getting_started.html): wrap và font nhúng; build vẫn cần probe tiếng Việt/phân trang.
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [tokens](https://ai.google.dev/gemini-api/docs/tokens): bounded structured extraction, domain validation vẫn bắt buộc. Dùng generateContent của SDK repo nếu tương thích; không đổi provider API chỉ vì docs ví dụ mới dùng Interactions.
- [IndexedDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction): dùng transaction readwrite cho cập nhật nháp, không xem BroadcastChannel là khóa.
- [Supabase Cron](https://supabase.com/docs/guides/cron), [Vercel limits](https://vercel.com/docs/functions/limitations): persistent batch và kiểm host budget thật. Input2MiB nhỏ hơn payload limit được tài liệu hiện hành nêu; không suy ra mọi function đủ CPU/memory.
