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

### Sửa sau review phase 5

Review (`hs-code-review`, commit `6f53614`) không có Critical hay High. Đã xử lý:

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Medium: "Rời phòng" để lại người chơi ma, giữ chỗ và biệt danh | Hàm mới `leave_session(token)` (sửa tại chỗ migration phase 3 vì chưa áp lên dự án thật): ở phòng chờ thì xoá dòng; đã bắt đầu thì đánh dấu `removed` kèm `left_at` (cột mới) để không còn tính vào xếp hạng, vẫn giữ lịch sử; người bị giáo viên loại gọi thì không làm gì và biệt danh vẫn bị giữ (chỉ người tự rời mới được dùng lại tên). `host_state` thêm cờ `left` cho phase 6. Giao diện quên mã trước rồi mới báo máy chủ (tránh nhá "mã hết hiệu lực"). | 5 test DB mới (xoá dòng, trả chỗ khi đầy 50, rời giữa chừng, người bị loại, mã sai) và 1 e2e "vào lại bằng tên cũ, không người ma"; phá thử (không xoá dòng, không ghi `left_at`, giao diện không báo máy chủ) đều làm test hỏng |
| Low: tải lại giữa câu không thấy mình đã chọn gì | `player_state` trả thêm `your_answer` (đáp án của chính mình, null nếu chưa gửi, không kèm khoá); `Question` khôi phục ô đã chọn hoặc chữ đã gõ | Test DB (chỉ của mình, người khác thấy null, không có khoá), 2 e2e (một đáp án và điền từ); phá thử hai chỗ đều hỏng |
| Verification Gap | e2e cho trình duyệt chặn lưu trữ (cảnh báo hiện ra, tải lại thì phải nhập lại PIN) và cho `prefers-reduced-motion` (thanh đếm giờ và ô đáp án không còn chuyển tiếp; Chromium báo `1e-05s`) | Đạt |

Kết quả: typecheck, lint, 202 unit, 115 test DB (hai lần liên tiếp, gồm Realtime thật), 151 e2e (hai lần liên tiếp) đạt.

Còn mở: **chưa chạy WebKit/Safari iOS** (Playwright cần tải thêm trình duyệt WebKit, cần bạn đồng ý) và điện thoại thật (giờ máy chủ, bàn phím ảo che ô nhập).

## Phase 6 - Màn hình giáo viên

Kết quả kiểm tra (chưa commit): typecheck, lint đạt; **206 unit**; 115 test DB (hai lần liên tiếp); **167 e2e** (hai lần liên tiếp, gồm 17 test mới: `e2e/host.spec.ts` 9, `e2e/live.spec.ts` 1 nhiều trình duyệt, `e2e/host-a11y.spec.ts` 6 và 1 tiêu đề `/host`).

### Đã làm

- **Tuyến và bảo vệ:** `/host` thêm vào `PROTECTED_PREFIXES`, matcher của `proxy.ts`, `src/app/host/layout.tsx` (`RequireUser`) và `src/app/host/[id]/page.tsx`. Người không phải chủ phiên hoặc id sai dạng thấy "Không tìm thấy phiên chơi này" (`host.state` báo hỏng hẳn với `session_not_found`, `not_authenticated` và id sai dạng); khách bị chuyển tới đăng nhập.
- **6.1** `StartSession` ("Chơi ngay") ở danh sách quiz và trình soạn: chặn quiz còn lỗi và nêu từng lý do kèm liên kết "Sửa quiz"; tuỳ chọn điểm tốc độ (mặc định bật); nếu đang có phiên chưa kết thúc thì hiện "Tiếp tục phiên đang chạy" hoặc "Kết thúc phiên cũ" (có xác nhận); tạo phiên rồi chuyển tới `/host/[id]`.
- **6.2** `HostScreen` trong khung `ToolStage` (toàn màn hình vào và thoát được): phòng chờ (PIN cỡ lớn, địa chỉ `/play`, nút sao chép link, danh sách người chơi, khoá phòng, loại có xác nhận), đang hỏi (đề cỡ lớn, đếm giờ theo giờ máy chủ, số đã trả lời, KHÔNG có khoá đáp án vì màn này được chiếu), hiện đáp án (đáp án đúng, số lượt chọn từng lựa chọn, thống kê, top 5), kết thúc (bục top 3). Space cho thao tác chính (không ghi đè Space trên nút hay ô nhập). Hết giờ thì tự đóng câu một lần. Hỏi `host_state` mỗi 1,5 giây ở phòng chờ và đang hỏi.
- **6.3** Tải lại giữa phiên phục hồi đúng trạng thái; kết thúc phiên có xác nhận (mặc định focus "Giữ phiên"); phiên đã kết thúc hoặc hết hạn hiện kết quả, không còn nút điều khiển.
- **6.4** `e2e/live.spec.ts`: một giáo viên và bốn điện thoại (ngữ cảnh riêng): ba bạn vào, khoá phòng khiến bạn thứ tư bị từ chối, loại một bạn, đủ bốn dạng câu, hạng cuối khớp điểm tính tay (3000 và 2000), một bạn tải lại giữa chừng; chạy hai lần liên tiếp đều đạt.
- axe WCAG A/AA, không tràn ngang, cấp tiêu đề đúng ở 1280px và 375px cho: bảng bắt đầu phiên (quiz lỗi, sẵn sàng, đã có phiên, xác nhận kết thúc phiên cũ), phòng chờ (trống, có người, khoá, xác nhận loại), đang hỏi, hiện đáp án, xác nhận kết thúc, mất kết nối, kết thúc, không tìm thấy.

### Lỗi bắt được khi làm

- **Tin báo "đã kết thúc" không bao giờ tới học sinh:** lõi đồng bộ của giáo viên nhả kênh Realtime ngay khi thấy phiên đã kết thúc (phase 4), rồi `notify` thấy không có kênh và bỏ qua. Học sinh chỉ biết kết thúc nhờ polling (tới 10 giây). Test nhiều trình duyệt phát hiện. Đã sửa: `createSessionChannel.notify` dùng kênh tạm (gửi qua REST, rồi bỏ) khi kênh đã được nhả; test đơn vị và e2e đều hỏng khi phá thử bản sửa.
- `host.state` với id sai dạng trước đó quay mãi ở "Đang tải": nay báo hỏng hẳn.

### Quyết định và lệch so với plan

- **Hỏi `host_state` mỗi 1,5 giây** (`hostPollMs`), kể cả khi kênh Realtime sống, vì màn của giáo viên cần số người vào và số đã trả lời mới theo nhịp cố định (plan ghi 1-2 giây); hiện đáp án 3 giây, kết thúc thì ngừng.
- **`e2e/host-a11y.spec.ts` riêng** thay vì bổ sung `e2e/a11y-auth.spec.ts` (các test này cần Realtime và phiên chơi).
- Người chơi tự rời (`left`) và người bị loại không hiện trong danh sách phòng chờ và không tính vào "đã trả lời / tổng".
- Kết quả chi tiết sau buổi, xuất báo cáo và xoá dữ liệu sau 90 ngày là phase 7.
- **Chưa kiểm tra:** máy chiếu thật và độ đọc từ cuối lớp (chữ PIN và đề dùng `clamp` theo chiều rộng, chưa đo ngoài đời); điện thoại thật.

### Sửa sau review phase 6

Review (`hs-code-review`, commit `edf3fc2`) không có Critical hay High. Đã xử lý cả bốn mục:

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Medium: nhấn Space lại ngay sau khi câu mới mở sẽ đóng luôn câu đó (thăm dò: câu 2 chuyển sang `reveal` sau 1,5 giây) | Bỏ qua Space trong 1,2 giây sau mỗi lần đổi pha (`SPACE_COOLDOWN_MS`); các e2e có người thật chờ qua khoảng này trước khi nhấn | e2e mới: nhấn lặp sau 500ms không đóng câu, sau khoảng chờ thì Space dùng lại được; phá thử (bỏ khoảng chờ) thì hỏng |
| Low: tự đóng khi hết giờ dựa vào đồng hồ ước lượng của trình duyệt, lỗi thì im lặng không thử lại | Hàm mới `host_close_if_expired` (sửa tại chỗ migration phase 3): chỉ đóng nếu giờ **máy chủ** đã qua hạn, trả true/false. Màn hình thử lại mỗi giây tới khi đóng được và báo lỗi khi mất mạng | 2 test DB (chưa tới hạn thì không đóng, qua hạn thì đóng và chấm điểm một lần, người khác 404, khách 401); e2e: lỗi mạng khi tự đóng thì báo rồi tự đóng được sau khi có mạng; phá thử (bỏ kiểm tra giờ) thì hỏng |
| Low: "Kết thúc phiên cũ" từ danh sách quiz không phát tin báo | `endSessionAndNotify` (`src/lib/live/notify.ts`) kết thúc rồi báo `{ seq }` qua kênh tạm | e2e: điện thoại ở phòng chờ thấy "Kết thúc!" trong 4 giây (polling là 10 giây); phá thử thì hỏng |
| Verification Gap | Các test trên | Đạt |

Kết quả: typecheck, lint, 206 unit, 117 test DB (hai lần liên tiếp), 170 e2e (hai lần liên tiếp) đạt.

Còn mở: máy chiếu thật và độ đọc từ cuối lớp, WebKit và điện thoại thật.

## Phase 7 - Kết quả, lưu trữ và quyền riêng tư

Kết quả kiểm tra (chưa commit): typecheck, lint đạt; **210 unit**; **128 test DB** (11 mới trong `tests/db/live-retention.test.ts`, hai lần liên tiếp); **175 e2e** (hai lần liên tiếp, gồm `e2e/results.spec.ts` 4 và test mới của trang Quyền riêng tư).

### Đã làm

- **Migration `20261023090000_results_retention.sql`:** `host_results` (chỉ chủ phiên, chỉ khi phiên đã kết thúc: xếp hạng, thống kê từng câu, số lượt chọn, thời gian trả lời trung bình, đáp án từng người), `session_history` (các buổi đã chơi của một quiz hoặc tất cả, mới nhất trước), `delete_session` (chỉ phiên đã kết thúc; người chơi và câu trả lời xoá theo), `private.purge_old_sessions(ngày, chủ, giới hạn)` (không mở cho API) và lập lịch `pg_cron` mỗi ngày **có điều kiện**. Bản mới của `create_session` được dựng từ chính bản ở migration phase 3 và gọi thêm xoá cơ hội (của chính giáo viên, và một mẻ tối đa 50 phiên của người khác).
- **Giao diện:** `/host/[id]/results` (xếp hạng, theo câu hỏi có xem lượt chọn từng lựa chọn, theo từng bạn với ô Đúng/Sai/Bỏ trống có chữ chứ không chỉ màu; xoá buổi có xác nhận); mục "Các buổi đã chơi" trong trình soạn quiz; liên kết "Xem kết quả chi tiết" ở màn kết thúc. Bảng rộng cuộn ngang trong khung riêng focus được, nên trang không tràn ở 375px.
- **Quyền riêng tư:** thêm mục "Quiz chơi trực tiếp" (dữ liệu lưu, mục đích, ai xem, 90 ngày, không cần tài khoản, mã tham gia trong bộ nhớ tạm của tab, băm có muối địa chỉ IP 10 phút), sửa câu "Tên học sinh" (trước đây nói không lưu điểm số, giờ chỉ nói về danh sách lớp), bổ sung mục giáo viên có tài khoản và mục xoá dữ liệu. `privacyReviewed` vẫn `false`, biểu ngữ bản nháp còn nguyên.
- README: mục lưu trữ dữ liệu quiz và hệ quả khi chưa bật `pg_cron`.

### Kiểm chứng

- Phá thử bốn chỗ làm test hỏng: xoá phiên bất kể tuổi, bỏ kiểm tra chủ phiên của `host_results`, cho `delete_session` xoá cả phiên đang chạy, bỏ xoá cơ hội khỏi `create_session`.
- Khối lập lịch chạy được ở ba trường hợp: bình thường, không có `pg_cron`, và lập lịch lỗi (test đọc khối `$cron$` từ chính tệp migration rồi sửa để mô phỏng). Trên stack cục bộ `pg_cron` bật được và công việc đã được lập lịch.
- Số liệu khớp điểm tính tay: Lan 3000, Huy 2000, điểm trung bình 2500, thống kê từng câu và lượt chọn từng lựa chọn đúng.

### Quyết định và lệch so với plan

- Trang kết quả đặt ở `/host/[id]/results` (dưới khu `/host` đã bảo vệ), không tạo tuyến mới trong `/my-quizzes`.
- `host_results` chỉ trả khi phiên đã kết thúc (phiên đang chạy trả `session_not_ended`, HTTP 409), để điểm của câu đang mở chưa chấm không gây hiểu nhầm.
- Xoá quiz không xoá các buổi đã chơi (`quiz_id` đặt null), nên trang Quyền riêng tư nói rõ điều này; các buổi đó vẫn theo hạn 90 ngày hoặc giáo viên tự xoá. Từ danh sách của quiz đã xoá thì không còn lối vào, nhưng `session_history` không lọc theo quiz vẫn liệt kê được (chưa có trang riêng cho tất cả các buổi).
- **Nội dung Quyền riêng tư không phải tư vấn pháp lý:** chủ dự án phải rà theo quy định hiện hành về dữ liệu của trẻ em rồi đặt `privacyReviewed: true` và điền `contactEmail`.
- **Chưa kiểm tra:** `pg_cron` trên dự án Supabase thật (task 8.3); nút xuất báo cáo Excel (ngoài phạm vi giai đoạn này).

### Sửa sau review phase 7

Review (`hs-code-review`, commit `31a7213`) không có Critical hay High. Đã xử lý cả năm mục:

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Medium: trang Quyền riêng tư hứa 90 ngày và 10 phút vô điều kiện, nhưng cơ chế xoá chỉ chạy khi có `pg_cron` hoặc giáo viên tạo phiên | Thêm đường dọn thứ ba không phụ thuộc giáo viên: `join_session` (bản mới ở migration phase 7) xoá một mẻ nhỏ (tối đa 5) phiên quá 90 ngày mỗi khi có học sinh vào phòng **thành công**, kiểm tra tồn tại qua chỉ mục mới theo `created_at`. Sửa trang cho đúng cơ chế: "giữ tối đa khoảng 90 ngày... xoá theo lịch hằng ngày và mỗi khi có người tạo hoặc vào một buổi chơi"; lần nhập sai PIN "dọn khi đã quá 10 phút, vào lần ứng dụng được dùng kế tiếp hoặc theo lịch dọn hằng ngày". README nêu rõ: chưa bật `pg_cron` và không ai dùng thì trang sẽ không đúng, nên 8.3 phải bật `pg_cron` trước khi chủ dự án đặt `privacyReviewed`. | Test DB: vào hỏng PIN không xoá, vào thành công thì xoá phiên quá 90 ngày của người khác; phá thử (bỏ lời gọi dọn) làm test hỏng; e2e nội dung trang |
| Medium: buổi của quiz đã xoá không còn lối xem hay xoá | Trang mới `/host` ("Các buổi đã chơi") liệt kê mọi buổi, ghi "(quiz đã xoá)", xoá có xác nhận, nối từ trang Quiz của tôi; `SessionHistory` dùng chung cho trình soạn (theo quiz) và trang này | e2e: xoá quiz rồi vẫn xem và xoá được buổi của nó; DB: buổi `quiz_id = null` có trong danh sách chung |
| Low: kết quả không hiện đáp án từng bạn | Mỗi ô của bảng "Theo từng bạn" thêm dòng "Chọn B. Huế", "Chọn A. 2, C. 4" (theo thứ tự lựa chọn) hoặc "Gõ: ma" | Test đơn vị `describeAnswer`; e2e kiểm tra từng ô |
| Low: README thiếu múi giờ, danh sách cắt ở 50 | README ghi 3:17 UTC (10:17 giờ Việt Nam). `session_history` nhận `p_limit` (1-100) và `p_offset`; giao diện có "Xem thêm" (20 dòng mỗi trang) | Test DB phân trang và ranh giới; phá thử (bỏ qua offset) làm test hỏng; e2e 21 buổi qua hai trang |
| Verification Gap | e2e xoá buổi ngay trong danh sách của quiz (xác nhận, trả focus), DB: phiên quá hạn 4 giờ chưa đánh dấu kết thúc vẫn xem và xoá được | Đạt |

Kết quả: typecheck, lint, 211 unit, 132 test DB (hai lần liên tiếp), 177 e2e (hai lần liên tiếp) đạt.

Còn mở: `pg_cron` trên Supabase thật (8.3); nội dung Quyền riêng tư vẫn là bản nháp chờ chủ dự án duyệt.

## Phase 8 - Thử tải, triển khai và nghiệm thu (phần làm được ở máy)

Trạng thái: 8.1 và 8.2 xong ở máy phát triển. **8.3 và 8.4 chưa làm**: đều ghi vào dịch vụ thật hoặc cần thiết bị thật, chờ chủ dự án làm hoặc xác nhận từng bước. Hướng dẫn nằm ở mục "Quiz chơi trực tiếp" của `README.md`.

### 8.1 Thử tải

- `tests/load/live-load.test.ts`, chạy bằng `npm run test:load` (cấu hình `vitest.load.config.mts`, không nằm trong `npm test`). **Lệch so với plan:** viết bằng TypeScript chạy qua Vitest thay vì `.mjs`, để dùng thẳng `createLiveSync`, `createSessionChannel` và các hàm `host.*`/`player.*` của ứng dụng (alias `@/`), nên nhịp hỏi, độ trễ tin báo và số yêu cầu giống thật.
- Mỗi người chơi là một client Supabase riêng (một WebSocket). Đo: kết nối, tin Realtime mỗi giây (gửi + nhận), yêu cầu HTTP mỗi giây và theo hàm, lỗi, độ trễ từ lúc giáo viên mở câu tới lúc người chơi thấy đề, người chơi thấy đủ mọi câu.
- Số đo (2026-10-19, máy Windows, Supabase cục bộ có tenant 200 kết nối / 100 tin giây / 100 lượt tham gia giây):

| Cấu hình | Kết nối | Tin cao nhất/giây | HTTP cao nhất/giây | Lỗi | Thấy đủ 5 câu | Độ trễ trung vị / p95 |
|---|---|---|---|---|---|---|
| 1 x 40 | 41 | 41 | 85 | 0 | 40/40 | 48 / 67 ms |
| 4 x 40 (đổi pha cùng giây) | 164 | 164 | 328 | 0 | 160/160 | 48 / 77 ms |
| 6 x 32 | 198 | 198 | 397 | 53* | 192/192 | 46 / 78 ms |
| 5 x 40 (vượt trần) | 205 | 123 | 250 | 5* | 200/200 | 47 / 86 ms (lớn nhất 2,0 s) |

\* `UND_ERR_SOCKET` do cổng Docker Desktop của máy thử reset kết nối mới khi hơn ~170 máy khách cùng bắn hàng trăm yêu cầu/giây; Kong và PostgREST không ghi lỗi, `Connection: close` không làm hết. Kịch bản gửi lại một lần như trình duyệt, và chỉ khẳng định "không lỗi / thấy đủ câu" khi tổng kết nối ≤ 170 (`VERIFIED_SOCKETS`).

- Kết luận: một lớp 40 người đỉnh 41 tin/giây, trung bình khoảng 12; trần 200 kết nối cho khoảng 4 lớp 40 hoặc 6 lớp 32; ở 205 kết nối đúng 5 kết nối cuối không có kênh nhưng vẫn chơi trọn bằng polling. Yêu cầu HTTP trung bình khoảng 28/giây cho một lớp, `player_state` p95 dưới 70 ms.
- **Chưa rõ, cần đo trên dự án thật:** Supabase đếm "100 tin/giây" theo tin gửi hay cả tin nhận. Bốn lớp đổi pha cùng giây cộng dồn 164 tin nhận; stack cục bộ (cùng giới hạn) vẫn chuyển hết. Nếu dự án thật chặn thì học sinh nhận đề nhờ polling, chậm tới 10 giây khi kênh vẫn sống. Kiểm bằng hai lớp cùng bấm một lúc ở 8.4.
- Không tách được nguyên nhân khi 160 học sinh của 4 lớp vào phòng trong đúng một giây (kênh không đủ sống sau 20 giây): trần 100 lượt tham gia/giây hay giới hạn máy thử. Một lớp 40 vào cùng giây vẫn đạt; lớp học thật vào rải ra nên số liệu dùng vào phòng rải 3 giây.
- Sửa nhỏ phát hiện khi đo: báo "đã kết thúc" qua kênh tạm (`src/lib/live/channel.ts`) dùng `httpSend` thay vì để `send()` tự rơi về REST và in cảnh báo "sẽ bị loại bỏ" của thư viện. Test đơn vị cập nhật.

### 8.2 Kiểm thử và rà soát cuối

- `npm run typecheck`, `lint`, 211 test đơn vị, 132 test DB, 177 e2e (hai lần liên tiếp) đạt, `npm audit --omit=dev` 0 lỗ hổng.
- `npm run scan:bundle` (mới, `scripts/scan-bundle.mjs`): quét 337 tệp trong `.next/static` và trang dựng sẵn, không có khoá `service_role`/`sb_secret_`, chuỗi kết nối Postgres, Google client secret hay JWT khác vai trò `anon`. Phá thử: cài khoá giả vào `.next/static` thì kịch bản thoát mã 1; gỡ ra thì thoát mã 0.
- Đáp án đúng không lộ trước khi câu đóng được kiểm ở tầng dữ liệu (`FORBIDDEN_KEYS` trong `tests/db/live.test.ts`), vì đáp án nằm trong Postgres chứ không trong gói trình duyệt.
- **Chưa làm:** chạy `hs-code-review` cho cả giai đoạn (đề nghị làm trước khi triển khai); trang `/privacy` vẫn là bản nháp.

### 8.3 và 8.4: chờ chủ dự án

Danh sách bước và cách kiểm tra (áp migration bằng `supabase db push`, `unaccent`, bật `pg_cron`, Realtime kênh công khai, vị trí phần tử `x-forwarded-for`, nghiệm thu thiết bị thật) nằm ở README. Cần ghi xác nhận từng mục vào đây khi làm xong.
