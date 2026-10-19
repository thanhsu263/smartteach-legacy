# Ghi chú triển khai - Giai đoạn 2 (quiz chơi trực tiếp)

## Phase 1 - Dữ liệu quiz và RLS

Kết quả kiểm tra (chưa commit, working tree còn thay đổi so với `75dcce7`/`1ba2622`):

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck`, `npm run lint` | Đạt |
| `npm test` (Vitest) | 95/95 đạt: thêm test lời nhắn lỗi quiz và test hằng số khớp migration |
| `npm run test:db` (Postgres thật của Supabase cục bộ) | 60/60 đạt: 22 test cũ và 38 test mới trong `tests/db/quiz.test.ts` |
| `npm run test:e2e` | 115/115 đạt (kiểm tra hồi quy, chưa có giao diện mới) |
| Cài mới từ đầu | `supabase db reset` áp đủ ba migration và test vẫn đạt |

Test DB mới chạy trước khi có migration và thất bại cả 38 test, rồi đạt sau khi áp migration.

### Đã kiểm tra bảo vệ có tác dụng (phá thử rồi khôi phục)

| Phá thử | Kết quả |
|---|---|
| Mở chính sách đọc `questions` cho mọi người | 1 test hỏng |
| Tắt trigger giới hạn số câu | 1 test hỏng |
| Cho phép đổi `quiz_id` của câu hỏi (tắt trigger bất biến) | 1 test hỏng |
| Cấp quyền `EXECUTE` của `get_shared_quiz` cho khách | **Lần đầu test vẫn đạt** vì hàm tự chặn bằng `not_authenticated` (mã cũng là `42501`). Đã siết test: bắt buộc thông báo `permission denied` (chặn ở quyền chứ không chờ kiểm tra bên trong hàm); lần chạy lại thì test hỏng đúng như mong đợi |

### Quyết định và lệch so với plan

- **Tên file migration:** `supabase/migrations/20261021090000_quizzes.sql` (tiền tố thời gian của CLI).
- **Plan ghi "không dùng `security definer` ở phase này", nhưng ba hàm phải dùng:** `get_shared_quiz`, `clone_shared_quiz` và `duplicate_quiz`, vì chia sẻ cần đọc quiz của người khác. Kiểm soát: chỉ người đã đăng nhập (thu hồi quyền của `public` và `anon`, và hàm tự kiểm tra `auth.uid()`), chỉ theo mã chia sẻ hoặc quiz của chính mình, `search_path` rỗng, hàm sao chép thật (`private.copy_quiz`) nằm ở schema `private` mà API không mở ra. Các hàm còn lại (`save_question`, `reorder_questions`, `delete_question`, `set_quiz_sharing`, `quiz_problems`) chạy với quyền người gọi nên RLS vẫn áp dụng.
- **Thêm hai hàm so với danh sách task:** `delete_question` (dồn vị trí sau khi xoá, đúng mô tả 1.3) và `duplicate_quiz` (giao diện danh sách quiz ở phase 2 cần "nhân đôi").
- **`quiz_problems` báo `quiz_not_found` cho quiz không tồn tại hoặc của người khác**, thay vì trả danh sách rỗng, để phía gọi (phase 3 `create_session`) không nhầm "không thấy" thành "hợp lệ".
- **Lựa chọn chỉ lưu cho các dạng có lựa chọn:** `save_question` với `short_text` bỏ qua `options` gửi kèm.
- **Bảng ca kiểm tra dùng chung:** `tests/fixtures/quiz-validation-cases.json` (15 ca cho `quiz_problems`); phase 2 sẽ cho `validate.ts` đọc cùng tệp để hai bên không lệch nhau.
- **`tests/db/helpers.ts`** gom cách dựng người dùng thử cho các test mới; `tests/db/rls.test.ts` cũ được giữ nguyên (còn bản sao riêng).
- **Hằng số TypeScript** (`src/lib/quiz/limits.ts`) có test đọc thẳng file migration để bảo đảm các số khớp nhau.
- **Mới chỉ áp migration lên stack cục bộ.** Áp lên dự án Supabase thật là việc của phase 8 và cần xác nhận.

### Chưa làm trong phase này (đúng phạm vi)

Giao diện soạn quiz (phase 2), bảng và hàm chơi trực tiếp (phase 3).

## Phase 2 - Soạn quiz và chia sẻ

Kết quả kiểm tra (chưa commit):

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck`, `npm run lint` | Đạt, không còn cảnh báo |
| `npm test` (Vitest) | 127/127 đạt: thêm test `protected-paths`, `validate` (đọc chung bảng ca với test DB) và `api` |
| `npm run test:db` | 60/60 đạt (không đổi) |
| `npm run test:e2e` | 128/128 đạt, chạy hai lần liên tiếp đều đạt: 115 cũ và 13 mới trong `e2e/quiz-editor.spec.ts` |

Phạm vi e2e mới: khách bị chuyển tới đăng nhập (cả link chia sẻ); đủ bốn dạng câu hỏi, sửa, đổi thứ tự (lưu lại sau khi tải lại), xoá có xác nhận; lỗi từng trường và cảnh báo "còn thiếu để chơi được"; mất mạng khi lưu giữ nguyên nội dung đang gõ; nhân đôi, đổi tên, xoá quiz; giáo viên khác không mở được quiz riêng tư; hai giáo viên chia sẻ, sao chép, đổi mã, tắt chia sẻ; axe WCAG A/AA tại 1280px và 375px (mười trạng thái); không tràn ngang; thanh điều hướng ở 768px và 1024px; cấp tiêu đề.

### Quyết định và lệch so với plan

- **Số thứ tự câu hiển thị theo vị trí trong danh sách (`index + 1`), không dùng cột `position`** vì `position` trong cơ sở dữ liệu bắt đầu từ 0 (còn `quiz_problems.question_position` bắt đầu từ 1). Lần đầu giao diện hiện "Câu 0"; e2e bắt được.
- **Nút Lên/Xuống bị khoá trong lúc đang sắp xếp** tới khi danh sách mới tải xong. Trước đó hai lần bấm liên tiếp có thể xếp nhầm câu vì lần bấm thứ hai dùng danh sách cũ.
- **Nút xác nhận xoá câu** có nhãn truy cập chứa đúng chữ hiển thị ("Xoá câu này, câu n"); nhãn cũ lệch chữ hiển thị bị axe (`label-content-name-mismatch`) báo.
- **Bảo vệ trang dùng chung:** `src/lib/auth/protected-paths.ts` (so khớp theo đoạn đường dẫn, có test) cho proxy và `src/components/require-user.tsx` cho ba layout `/my-classes`, `/my-quizzes`, `/shared`. Tệp `src/app/my-classes/require-user.tsx` cũ đã được thay.
- **Trang `/shared/quiz/[token]` nằm dưới `/shared`** (bắt đăng nhập, noindex) để quiz chia sẻ không lộ cho khách; token không phải UUID báo "Không tìm thấy" mà không gọi máy chủ.
- **Chưa làm đúng phạm vi:** nút chơi (phase 6), hàm chơi trực tiếp (phase 3). Migration vẫn chỉ áp lên stack cục bộ.

### Sửa sau review phase 1 và 2

Ba mục của review (không có lỗi Critical, High hay Medium) đã xử lý:

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Mất bản nháp khi chuyển câu | `QuestionForm` báo `onDirtyChange`; `QuizEditor.switchTo` hỏi lại bằng nhóm "Thay đổi chưa lưu" (mặc định focus vào "Tiếp tục soạn") khi chọn câu khác, bấm "Thêm: …" hoặc "Huỷ" lúc còn thay đổi chưa lưu | e2e mới; phá thử (bỏ kiểm tra `dirty`) thì test hỏng |
| Mất focus sau khi lưu và khi mở bước xác nhận | Hook `useFocusRequest`; form giữ nguyên sau lần lưu đầu (`Mode` có `nonce` và `id` gắn thêm, không dựng lại form); xác nhận xoá câu, xoá quiz, đổi mã, tắt chia sẻ focus vào lựa chọn an toàn và trả focus về nút gốc khi huỷ; xoá dòng thì focus về tiêu đề danh sách; xoá lựa chọn hoặc đáp án thì focus ô liền trước | e2e mới kiểm tra `toBeFocused` ở từng bước |
| Khoá Lên/Xuống chưa có test | e2e kéo dài `reorder_questions` 800ms rồi ép bấm nút đang khoá | Phá thử (bỏ `moving`) thì test hỏng |

Phát hiện thêm khi làm: nút "Lưu câu hỏi" bị `disabled` trong lúc lưu nên Chrome bỏ focus của nó; sau khi lưu xong form tự trả focus về nút.

Kết quả: typecheck, lint, 127 unit, 60 DB, 131 e2e đạt (hai lần liên tiếp).

Chưa sửa (ngoài phạm vi phase này): ba mục xác nhận tại chỗ của giai đoạn 1 (`classes-manager`, `class-editor`) vẫn có cùng kiểu mất focus.

## Phase 3 - Máy chủ chơi trực tiếp

Kết quả kiểm tra (chưa commit): typecheck, lint đạt; 127 unit; **97 test DB** (60 cũ và 37 mới trong `tests/db/live.test.ts`); 131 e2e (hồi quy). `supabase db reset` áp đủ bốn migration từ đầu.

### Đã phá thử để chắc test thật sự bắt lỗi (3.6)

Mỗi lần đổi một chỗ trong cơ sở dữ liệu cục bộ, chạy test liên quan, rồi khôi phục:

| Phá thử | Kết quả |
|---|---|
| Cấp `select` bảng `participants` cho `anon` | Test "khách không đọc, ghi, sửa, xoá" hỏng |
| Cho `question_public` trả thêm trường `key` | Test "khi câu đang mở không có khoá đáp án" hỏng |
| Bỏ điều kiện hạn chót trong `submit_answer` | Test hạn chót (chờ 2,3 giây thật) hỏng |
| `client_ip` tin phần tử đầu của `x-forwarded-for` | Hai test chặn IP hỏng |
| Nhiều đáp án cho phép chọn thừa | Test chấm điểm hỏng |

### Quyết định và lệch so với plan

- **Migration:** `supabase/migrations/20261022090000_live_sessions.sql`. Bật `unaccent` trong schema `extensions`; gọi bản hai đối số `extensions.unaccent('extensions.unaccent'::regdictionary, …)` vì `search_path` rỗng làm bản một đối số không tìm thấy từ điển.
- **`join_session` trả mã kết quả** (`ok`, `invalid_pin`, `too_many_attempts`, `session_started`, `room_locked`, `invalid_nickname`, `nickname_taken`, `room_full`) thay vì exception, vì exception hoàn tác cả giao dịch nên lần nhập sai PIN sẽ không được ghi lại. Các hàm còn lại báo lỗi bằng exception có thông báo cố định (`invalid_token`, `answer_closed`, `already_answered`, `invalid_answer`, `participant_removed`, `invalid_transition`, `session_ended`, `session_not_found`, `quiz_not_playable`, `session_already_active`, …).
- **Quyền theo cột:** giáo viên chỉ `select` được các cột an toàn của `live_sessions` (không có `quiz_snapshot`) và `participants` (không có `token`). Hệ quả: máy khách phải liệt kê cột, `select("*")` bị từ chối (`42501`). Ghi chú này cần cho phase 6.
- **`host_state` không kèm khoá đáp án khi câu đang mở**, vì màn hình này được chiếu cho cả lớp; khoá và phân bố chỉ có sau khi đóng câu.
- **Giới hạn người chơi:** tối đa 50 người đang ở lại và 100 dòng mỗi phiên (người bị loại vẫn giữ dòng và biệt danh, nên không nhồi vô hạn); trigger ép cả khi chèn thẳng bằng `service_role`.
- **Chấm điểm lúc đóng câu** (`host_close_question`), không phải lúc nộp, nên điểm và đúng/sai không lộ trước. `host_end_session` giữa câu cũng chấm câu đang mở.
- **Khoá phiên:** `submit_answer` và `join_session` khoá chia sẻ dòng phiên, các hàm `host_*` khoá độc quyền, nên không có câu trả lời lọt vào giữa lúc đóng câu và chấm điểm.
- **Phiên quá hạn** coi như đã kết thúc ở mọi hàm mà không cần ghi; `create_session` dọn các phiên quá hạn để trả PIN và chỗ "một phiên mỗi giáo viên".
- **Câu trả lời điền từ:** tab hoặc xuống dòng một mình (không có ký tự nhìn thấy) bị từ chối. Lần chạy đầu test bắt được lỗi: `btrim` chỉ cắt dấu cách nên "   \t " lọt qua; đã sửa bằng kiểm tra `~ '\S'`. Biệt danh có tab hoặc xuống dòng bên trong được gộp thành một dấu cách.
- **Chặn đoán PIN:** chỉ tin phần tử **cuối** của `x-forwarded-for`. Trên stack cục bộ đã kiểm chứng giá trị tự đặt không né được. Số tầng proxy trên Supabase thật chưa biết nên **phải kiểm tra ở task 8.3** (nếu có thêm tầng sau, phần tử cuối có thể là địa chỉ proxy chứ không phải của học sinh, khi đó cả lớp chung một giới hạn).
- **Test dùng `docker exec … psql`** (`psql()` trong `tests/db/live-helpers.ts`) để giả lập địa chỉ IP khác và gọi hàm `private`; vì vậy test cần Docker và container `supabase_db_smartteach`. Các test đoán PIN xoá `join_attempts` sau khi chạy để không chặn các test khác cùng IP cục bộ.
- **Chưa làm đúng phạm vi:** giao diện, Realtime, xoá dữ liệu sau 90 ngày (phase 7), hàm xem kết quả sau buổi (phase 7). Migration mới chỉ áp lên stack cục bộ; áp lên dự án thật và kiểm tra `unaccent` có sẵn là việc của 8.3.

### Việc tiếp theo

Phase 3 là ranh giới bảo mật duy nhất của phần học sinh: **chạy `hs-code-review` riêng cho phase 3 trước khi làm phase 4.**

### Sửa sau review phase 3

Review (hs-code-review, commit `8750516`) không có Critical hay High. Đã xử lý bốn mục; mục thứ năm chờ chủ dự án quyết:

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Medium: từ chối nghiệp vụ trả HTTP 500 (SQLSTATE `55000` và `P0002`) | Đổi sang `PT404` (không tìm thấy) và `PT409` (sai trạng thái) trong cả migration phase 1 và phase 3, nên PostgREST trả 404 và 409. Thông báo không đổi nên giao diện không phải sửa. Migration chưa áp lên dự án thật nên sửa tại chỗ. | Test mới gọi bằng `fetch` kiểm tra mã HTTP của 11 tình huống; phá thử (trả `answer_closed` về `55000`) thì test hỏng |
| Low: xếp hạng vượt top 5 và top 3 khi đồng hạng | `private.leaderboard` lọc theo `row_number()` (hoà thì theo thứ tự vào phòng), vẫn giữ `rank` đồng hạng | Test 12 người cùng 0 điểm: đúng 5 dòng và 3 dòng khi kết thúc; phá thử thì test hỏng |
| Low: IP băm không muối, dọn bản ghi không đảm bảo | Băm HMAC-SHA256 với muối ngẫu nhiên sinh lúc áp migration (`private.secrets`, không đọc được qua API); chỉ giữ 10 phút (đúng cửa sổ chặn) và dọn ở **mọi** lần gọi `join_session` và `create_session`. Vẫn còn một bản ghi có thể nằm lại nếu không ai vào phòng nữa, nên task 7.2 vẫn phải có `pg_cron` dọn định kỳ. | Test băm khác SHA-256 trơn, muối không đọc được, bản ghi cũ bị dọn bởi lần vào thành công; phá thử hai chỗ đều làm test hỏng |
| Verification Gap: chạy đua nộp và đóng câu, số liệu phân bố | Test xác định: giữ khoá độc quyền dòng phiên bằng `psql` giống giáo viên đang đóng câu, nộp đáp án phải chờ rồi bị từ chối; test ngẫu nhiên 40 người, 10 vòng nộp song song với đóng câu; test giá trị phân bố, số đã trả lời (không tính người bị loại), câu nhiều đáp án | Phá thử (bỏ `for share`): test xác định hỏng 2/2 lần; test ngẫu nhiên chỉ bắt được thỉnh thoảng nên là lớp phụ |

**Chưa xử lý, cần chủ dự án quyết (review mục Medium thứ hai):** một học sinh gõ sai PIN 30 lần là khoá cả lớp cùng IP trong 10 phút (kể cả PIN đúng). Phương án: nâng ngưỡng, thêm nút "mở lại" cho giáo viên, hoặc giới hạn theo PIN; cần đo `x-forwarded-for` trên Supabase thật (task 8.3) trước khi chọn.

Kết quả: typecheck, lint, 127 unit, 103 test DB (hai lần liên tiếp), 131 e2e đạt.

## Phase 4 - Đồng bộ thời gian thực

Kết quả kiểm tra (chưa commit): typecheck, lint đạt; **172 unit** (45 mới trong `src/lib/live`); **110 test DB** (103 cũ và 7 mới trong `tests/db/live-realtime.test.ts`, chạy với Realtime thật); 131 e2e (hồi quy).

### Đã làm

- **4.1** `[realtime] enabled = true`; đã dừng rồi khởi động lại stack cục bộ và tải image `supabase/realtime:v2.143.4` (có sự đồng ý của chủ dự án). README có ghi chú.
- **4.2** `src/lib/live/rpc.ts` (nhóm `host.*`, `player.*`, `hostFetcher`, `playerFetcher`) và `errors.ts`: lỗi nghiệp vụ và mã kết quả vào phòng đổi sang tiếng Việt, không lộ thông báo kỹ thuật; mã tham gia sai dạng bị chặn ngay ở máy khách.
- **4.3** `sync.ts` + `clock.ts`: `createLiveSync` không phụ thuộc React. Tin báo chỉ gây một lần hỏi, bỏ tin cũ hoặc trùng `seq`, các lần hỏi do tin báo cách nhau tối thiểu 500ms (tin giả dồn dập không biến thành bão yêu cầu). Hỏi định kỳ 3 giây khi chưa có kênh; kênh sống thì 10 giây làm dự phòng; reveal 5 giây; ended/removed ngừng hỏi và nhả kênh; lỗi liên tiếp giãn dần tới 30 giây; trạng thái `live | polling | offline`. Độ lệch đồng hồ lấy mẫu có độ trễ thấp nhất.
- **4.4** `use-live-state.ts` (`useHostLive`, `usePlayerLive`) và `storage.ts` (mã tham gia trong `sessionStorage`, bắt lỗi khi bị chặn, bỏ mã không phải UUID).
- **4.5** `channel.ts`: kênh `session:<id>`, tin chỉ mang `{ seq }`; `runHostAction` hỏi lại trạng thái rồi báo seq mới, gửi thất bại không làm hỏng thao tác.
- **4.6** Test với ba người chơi thật: tin báo tới cả ba mà polling bị đặt rất thưa (chứng minh đường tin báo); mã sai bị báo `fatal`; 200 tin giả không đổi được trạng thái và số lần hỏi bị chặn theo khoảng chờ; đóng socket của một người chơi thì người đó vẫn theo kịp bằng polling; chen tin báo và polling không để trạng thái cũ ghi đè; kết thúc phiên thì ngừng hỏi.

### Phá thử

| Phá thử | Kết quả |
|---|---|
| `notify` không gửi gì | Bốn test tích hợp hỏng |
| Kênh chết vẫn hỏi thưa (bỏ nhánh polling dày) | Ba test hỏng |

### Quyết định và lệch so với plan

- **`player_state` trả thêm `session_id`** (sửa tại chỗ migration phase 3 vì chưa áp lên dự án thật). Học sinh chỉ có mã tham gia, mà tên kênh cần id phiên; id chỉ trả cho người giữ mã tham gia nên đúng với rủi ro đã ghi ở plan ("UUID chỉ trả về sau khi vào phòng"). Vì vậy `createLiveSync` nhận `channelFor(state)` (đăng ký kênh sau lần hỏi đầu) thay vì một nguồn kênh cố định.
- **Lõi đồng bộ khởi động lại được** (`stop()` rồi `start()`), vì React StrictMode và chế độ ẩn/hiện trang của Next.js 16 làm hook chạy lại hiệu ứng. Kết quả của vòng đời cũ bị bỏ.
- **Vitest DB thêm alias `@/`** (`resolve.tsconfigPaths`) để test tích hợp dùng thẳng mã trong `src/lib/live`.
- **Một lần chập chờn:** trong một lần chạy trọn bộ DB đầu tiên, hai test Realtime hỏng và lần sau thì đạt (kênh báo SUBSCRIBED nhưng máy chủ Realtime nguội có thể chưa định tuyến tin ngay). Đã thêm bước khởi động (gửi tin tới khi ai cũng nhận được) và đổi ngưỡng đếm lần hỏi theo thời gian thực thay vì số cố định; sau đó 7 lần chạy liên tiếp đều đạt. Nếu còn thấy hỏng ngẫu nhiên thì đây là chỗ cần nhìn đầu tiên. Trò chơi thật không bị ảnh hưởng vì polling bù tin báo bị lỡ.
- **Chưa làm đúng phạm vi:** giao diện (phase 5, 6). Cấu hình Realtime trên dự án Supabase thật và đo số kết nối là việc của 8.1 và 8.3.

### Sửa sau review phase 4

Review (`hs-code-review`, commit `0a3b3ab`) không có Critical hay High. Đã xử lý cả ba mục:

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Medium: `refresh()` trả về ngay khi đang có lần hỏi bay nên `runHostAction` báo seq cũ, người chơi bỏ qua tin đó và phải chờ polling (tới 10 giây) | `refresh()` giờ chờ lần hỏi **bắt đầu sau lệnh gọi** hoàn tất (hàng đợi người chờ, nhiều lệnh dồn dùng chung một lần hỏi; `stop()` gỡ hết người đang chờ) | Test dùng máy chủ giả chậm và `runHostAction` với lõi thật: tin báo mang seq 2; phá thử (trả về ngay) thì 2 test hỏng |
| Low: không hỏi lại khi tab hiện lại, có mạng lại; `fatal` không nhả kênh Realtime | Mới `wake.ts` (`visibilitychange` khi hiện, `online`, `pageshow`, `focus`, gộp trong 500ms) gắn trong `useLiveSync`; lỗi `fatal` gọi `dropChannel()` | Test sự kiện bằng đích giả; phá thử bỏ `dropChannel` thì test hỏng |
| Verification Gap: định dạng giờ Postgres trên Safari | `parseServerTime` cắt phần thập phân về 3 chữ số, nhận dạng có dấu cách và múi giờ viết tắt; `sync.ts` dùng hàm này. Chưa kiểm chứng trên Safari thật. | Test kiểm chứng chuỗi đưa cho `Date.parse` (V8 vốn nhận 6 chữ số nên chỉ so khớp đầu vào mới bắt được); phá thử thì hỏng |

Kết quả: typecheck, lint, 183 unit, 110 test DB (ba lần liên tiếp, gồm Realtime thật), 131 e2e đạt.

Còn mở: kiểm tra giờ trên Safari iOS thật khi làm màn hình học sinh (phase 5) và số kết nối Realtime thật (task 8.1).

## Phase 5 - Màn hình học sinh

Kết quả kiểm tra (chưa commit): typecheck, lint đạt; **202 unit** (11 test mới cho 6 ô đáp án và tương phản); 110 test DB; **147 e2e** (hai lần liên tiếp, gồm 15 test mới ở 375px: `e2e/play.spec.ts` và `e2e/play-a11y.spec.ts`).

### Đã làm

- **5.1** Sáu cặp (chữ A-F, hình, màu) trong `DESIGN.md` và `globals.css` (`--color-tile-a..f`), `src/components/live/player/answer-styles.ts`. Hình: lục giác, ngôi sao, dấu cộng, ngũ giác, bán nguyệt, giọt nước (không dùng bộ của Kahoot). Chữ trắng trên mọi ô đạt từ 5.35:1 tới 7.21:1; ô so với nền trang từ 5.03:1. Đang chọn có vòng Mực cách ô bởi khe nền trang cộng dấu tích. Test: tương phản, độ khác nhau của chữ/hình/màu, DESIGN.md khớp globals.css.
- **5.2** `/play?pin=`: `JoinForm`, `Lobby`, tải lại vào lại đúng người chơi (mã tham gia trong `sessionStorage`, bắt lỗi khi bị chặn), thông báo bị loại, mã hết hiệu lực quay về nhập PIN kèm lời nhắn.
- **5.3** `Question` (đếm giờ theo giờ máy chủ, một đáp án/đúng sai chạm là gửi, nhiều đáp án chọn rồi Gửi, điền từ), `Result` (đúng/sai bằng chữ và biểu tượng, điểm câu, tổng điểm, hạng, đáp án đúng, top), `Final`, `StatusBanner`. Gửi lỗi giữ nguyên lựa chọn và chữ đã gõ; "đã trả lời rồi" từ máy chủ được coi là đã gửi.
- **5.4** axe WCAG A/AA, không tràn ngang, cấp tiêu đề cho mọi trạng thái ở 375px: nhập PIN (kể cả lỗi), phòng chờ, từng dạng câu, đã chọn, đã gửi, kết quả đúng và sai, điền từ, kết thúc, hết giờ, chưa trả lời, mất kết nối, bị loại; thêm điều hướng bàn phím.

### Phá thử

| Phá thử | Kết quả |
|---|---|
| Không khoá ô sau khi gửi | Hai test e2e hỏng |
| Coi "đã trả lời rồi" là lỗi | Test gửi lại sau khi mất phản hồi hỏng |

### Quyết định và lệch so với plan

- **Một form hai ô (PIN và biệt danh)** thay vì hai bước: `join_session` cần cả hai và máy chủ không có cách kiểm tra PIN riêng mà không tạo người chơi.
- **`e2e/play-a11y.spec.ts` riêng** thay vì bổ sung `e2e/a11y.spec.ts` (các test này cần Supabase cục bộ còn `a11y.spec.ts` thì không).
- **Giáo viên mô phỏng** (`e2e/helpers/live.ts`) gọi các hàm `host_*` rồi báo `{ seq }` qua REST của Realtime, nên e2e cũng kiểm tra luôn đường tin báo.
- **Tên truy cập của ô đáp án** là "A 2" (chữ cái rồi nội dung); thử dùng "A: 2" bằng một đoạn ẩn thì trình đọc ghép thành "A:2". Dấu cách nay là ký tự thật giữa hai thành phần.
- **Trang `/play` có `h1` ngay cả trước khi hydrate** (dựng sẵn "Đang tải…") vì `?pin=` chỉ đọc được ở trình duyệt nên phần chính nằm trong Suspense; kiểm tra cấp tiêu đề bắt được lỗi này.
- **Hỗ trợ trình đọc màn hình:** màn có `role="status"` cho đổi trạng thái (vùng ẩn đọc "Câu n trên N...", "Bạn trả lời đúng..."), và đưa focus về đầu màn hình khi sang pha hoặc câu mới (nút vừa bấm bị gỡ).
- **Chưa kiểm tra:** Safari iOS và điện thoại thật (giờ máy chủ, bàn phím ảo che ô nhập); số kết nối Realtime thật (task 8.1). Chưa có bộ lọc biệt danh (giáo viên loại người chơi ở phase 6).
