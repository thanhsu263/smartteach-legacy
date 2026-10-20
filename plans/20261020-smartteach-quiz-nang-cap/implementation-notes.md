# Ghi chú triển khai: nâng cấp quiz

## Phase 1 - Mã QR ở phòng chờ

- Cài `qrcode-generator@2.0.4` (dependency) và `jsqr@1.4.0` (devDependency), ghim đúng phiên bản. Lockfile thêm đúng hai gói; `npm audit --omit=dev` vẫn 0 lỗ hổng (cảnh báo `braces` ở `npm audit` đầy đủ có sẵn từ trước, đến từ `eslint-config-next`, chỉ ở công cụ phát triển).
- `src/lib/qr/matrix.ts`: `buildQrMatrix` (mức M, tự chọn phiên bản), `matrixToPath` (gộp các mô-đun tối liền nhau thành đoạn), `qrSize`. `src/components/qr-code.tsx`: SVG dựng từ ma trận trong React (không có `dangerouslySetInnerHTML`), `role="img"` với `<title>` và `<desc>` ghi địa chỉ, nền `#fff` và mô-đun `#000` cố định (QR cần tối trên sáng; ứng dụng hiện chưa có giao diện tối nên đây là bảo đảm cho tương lai, không phải điều đã kiểm trong giao diện tối).
- `HostLobby` hiện QR cạnh PIN trên màn rộng (từ 900px), xếp dọc trên điện thoại; chỉ vẽ khi biết `origin`.
- Kích thước: chunk chứa thư viện QR khoảng 35 kB (khoảng 12 kB nén gzip), chỉ tải ở khu vực `/host` (không vào trang công khai).
- Đã đạt (không cần Docker): `typecheck`, `lint`, 216 test đơn vị (thêm 5 test QR, trong đó giải mã bằng `jsqr` ra đúng địa chỉ cho địa chỉ ngắn/dài/chuỗi 300 ký tự), `npm run build`, `scan:bundle` sạch.
- e2e `e2e/host.spec.ts` thêm test "mã QR": hình có tên truy cập "Mã QR vào phòng", `data-value` và `<desc>` khớp `<origin>/play?pin=<PIN>` của phiên, màu `#fff`/`#000` cố định, **vẽ chính SVG đang hiển thị ra điểm ảnh rồi giải mã bằng `jsqr` ra đúng địa chỉ**, và mở địa chỉ đó trên điện thoại 375px thì ô PIN đã điền sẵn.
- axe: `host-a11y.spec.ts` (đã có kiểm phòng chờ) đạt ở 1280px và 375px với QR hiển thị, không tràn ngang. Ảnh chụp phòng chờ ở 1280x720 và 375x812: PIN và QR cùng thấy, QR xếp dọc dưới PIN trên điện thoại.
- Phá thử: đảo `isDark` làm cả test đơn vị và e2e giải mã hỏng; dịch lệch đường vẽ làm test đơn vị hỏng (e2e vẫn quét được vì vùng yên tĩnh rộng nên dịch cả mã một mô-đun không làm hỏng việc giải mã; đó là hành vi đúng). Đã khôi phục.
- Kết quả cuối: typecheck, lint, 216 unit, 178 e2e đạt (Docker Desktop đã bật lại). Nghiệm thu thủ công trên máy chiếu thật để ở task 7.7.


### Sửa sau review phase 1

Review không có Critical hay High; ba mục Low đã sửa, mục còn lại chờ máy chiếu thật.

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Low: tên truy cập của QR gồm cả mô tả (địa chỉ và PIN) vì `aria-labelledby` trỏ cả `<title>` và `<desc>` | `aria-labelledby` chỉ trỏ `<title>`; `<desc>` chuyển sang `aria-describedby` | e2e dùng `toHaveAccessibleName("Mã QR vào phòng")` (khớp đúng) và `toHaveAccessibleDescription`; phá thử trả `aria-labelledby` về cũ thì test hỏng đúng với tên dài |
| Low: `width` của QR bị hai file CSS module cùng đặt, thắng thua phụ thuộc thứ tự import | `QrCode` luôn rộng 100% khung chứa; khung `.qrFrame` trong lobby quyết định cỡ (cùng giá trị như trước) | e2e và axe phòng chờ ở 1280px và 375px vẫn đạt |
| Low: test và notes ghi "kể cả giao diện tối" nhưng ứng dụng chưa có giao diện tối nên chỉ kiểm thuộc tính tĩnh | Bỏ `emulateMedia` giả; lời ghi nói rõ màu cố định là bảo đảm cho tương lai | - |
| Cần kiểm chứng (7.7): QR rộng 300px ở 1920x1080 (trần `20rem`) có thể nhỏ trên máy chiếu | Chưa sửa; nâng trần lên khoảng `28rem` nếu quét từ xa khó | Nghiệm thu máy chiếu thật |

Kết quả: typecheck, lint, 19 test e2e `host` và `host-a11y` đạt.

## Phase 2 - Tự động qua câu

- Migration `supabase/migrations/20261024090000_auto_advance.sql` (sinh bằng script từ định nghĩa mới nhất trong `20261022` và `20261023` để không chép nhầm bản cũ): cột `auto_advance`, `reveal_seconds` (5, 8, 12), `paused`, `reveal_ends_at` (cấp `select` theo cột cho `authenticated`); `create_session` đổi chữ ký thành `(p_quiz_id, p_speed_bonus, p_options jsonb)` (xoá bản cũ; gọi kiểu cũ không có `p_options` vẫn chạy nhờ giá trị mặc định; giá trị sai kiểu hoặc ngoài tập thì `PT400 invalid_options`); `host_close_question` và `host_close_if_expired` đặt `reveal_ends_at`; `private.open_next` xoá nó; `private.advance_from_reveal` dùng chung cho `host_next` và `host_advance_if_due`; `host_set_paused`; `host_state`/`player_state` thêm trường tự động. Hàm mới cấp `execute` cho `authenticated`, thu hồi của `public` và `anon`.
- Client: `host.create(supabase, quizId, { speedBonus, autoAdvance, revealSeconds })` (chỉ gửi tuỳ chọn khi bật), `host.advanceIfDue`, `host.setPaused`; `StartSession` có công tắc "Tự động qua câu" và nhóm chọn 5/8/12 giây; `AutoAdvanceBar` (đếm ngược theo giờ máy chủ, Tạm dừng/Tiếp tục, nhắc máy chủ mỗi giây khi quá hạn, chỉ báo `seq` cho người chơi khi thật sự chuyển); điện thoại học sinh thấy "Câu tiếp theo bắt đầu sau N giây" hoặc "Thầy cô đang tạm dừng", văn bản đọc màn hình cố định không đổi mỗi giây.
- Quyết định nhỏ: dải tự động hiện ở cả pha câu hỏi và hiện đáp án để giáo viên tạm dừng trước khi hết giờ; câu cuối thì chữ là "Hiện kết quả cuối sau N giây".
- Kiểm chứng: `tests/db/live-auto.test.ts` 13 test (cấu hình, 9 giá trị sai bị từ chối HTTP 400, giờ máy chủ, không mở sớm, đúng một lần kể cả 6 lời gọi song song, không chạy khi tắt hoặc tạm dừng hoặc ngoài pha reveal, câu cuối sang `ended`, tạm dừng/tiếp tục và ân hạn 3 giây, quyền). `e2e/auto-advance.spec.ts` 6 test (bảng bắt đầu, chạy tự động hai câu tới bục vinh danh không ai bấm, không sang trước 5 giây, Tạm dừng/Tiếp tục, bấm tay vẫn dùng được, axe 1280/375 cho bảng bắt đầu và dải ở các pha).
- Phá thử trên cơ sở dữ liệu cục bộ (bảy thay đổi hàm, khôi phục sau mỗi lần): bỏ kiểm tra giờ, tạm dừng, bật tự động, pha `reveal`, ân hạn 3 giây, chặn khi tắt tự động, xoá `reveal_ends_at` ở `open_next` đều làm test hỏng; riêng "bỏ kiểm tra pha reveal" lúc đầu **không** bị bắt nên đã thêm bước giờ chốt sót ở pha hỏi vào test. Phá thử phía client: dải không nhắc máy chủ thì e2e hỏng.
- Kết quả: typecheck, lint, 217 unit, 143 test DB, 184 e2e (hai lần liên tiếp), `scan:bundle` sạch, thử tải 1x40 vẫn 41 tin/giây và không lỗi. Thử tải với tự động bật để ở task 7.3.

### Sửa sau review phase 2

Review (`a5ea6e8`) không có Critical hay High.

| Mục | Xử lý | Kiểm chứng |
|---|---|---|
| Verification Gap (Low): vòng thử lại của dải tự động khi lời nhắc `host_advance_if_due` thất bại chưa có test | Thêm e2e: chặn lời gọi bằng `route.abort`, kỳ vọng báo "Mất kết nối", màn hình đứng nguyên ở câu 1 và điện thoại chưa sang câu 2; bỏ chặn thì lần thử kế tiếp sang câu 2 và lời báo lỗi biến mất | Phá thử: bỏ lần hẹn thử lại thì test hỏng (hết 10 giây không sang được) |
| Chữ hướng dẫn ở bảng bắt đầu phiên | Đổi thành "giữ màn hình điều khiển luôn hiển thị, không thu nhỏ hay che" (trước là "cần để màn hình điều khiển mở suốt buổi"); task 7.2 yêu cầu README nêu cùng ý và lý do (tab ẩn thì trình duyệt giảm tần suất hẹn giờ) | `auto-advance.spec.ts` vẫn tìm theo nhãn "Tự động qua câu" |
| **Medium (chưa sửa, xử lý sau khi thử lớp thật): tự động qua câu và đóng câu hết giờ phụ thuộc tab giáo viên đang hiển thị** | Chrome giảm tần suất hẹn giờ của tab ẩn (khoảng mỗi giây, và sau khoảng 5 phút ẩn chỉ khoảng mỗi phút) nên câu kế có thể mở trễ tới ~1 phút nếu giáo viên che cửa sổ điều khiển. Chưa tái hiện trên Chrome thật. Task 7.7 thêm phép thử bật tự động rồi chuyển sang cửa sổ khác 6-7 phút. Nếu thấy trễ: thêm hàm anon (dùng mã tham gia, máy chủ vẫn tự kiểm giờ và điều kiện nên không thêm quyền) cho điện thoại học sinh nhắc mở câu kế và đóng câu hết giờ, kèm test DB và e2e | Chờ nghiệm thu |

## Phase 3 - Kho báu: máy chủ

- Migration `supabase/migrations/20261025090000_treasure.sql` (sinh bằng script từ định nghĩa mới nhất của từng hàm: `score_question` và `host_end_session` từ `20261022`, `host_results` từ `20261023`, `open_next`, `advance_from_reveal`, `create_session`, `host_state`, `player_state` từ `20261024`).
  - Cột `live_sessions.treasure_mode`, `participants.win_streak/lose_streak` (không cấp cho `authenticated`), bảng `treasure_chests` (RLS bật, `revoke all` với `anon` và `authenticated`, `unique (participant_id, position)`, ràng buộc rương đã mở phải đủ trường).
  - Hàm: `private.apply_effect` (không âm, trần +2000, phép lạ giữ nguyên điểm), `private.pick_effect` (trọng số theo `plan.md`, comfort không giảm điểm), `private.chest_json` (rương chưa mở chỉ lộ loại), `private.open_chest_row` (khoá hàng rương rồi hàng người chơi), `private.settle_chests`, `private.update_streaks` (ngưỡng 3, bỏ trống tính vào chuỗi thua, người bị loại/rời phòng bỏ qua), `public.open_chest(p_token)` (chỉ ở pha reveal, idempotent, `PT409 chest_not_ready`, `PT404 no_chest`, mã sai `PT404`, bị loại `PT409`).
  - `score_question` gọi `update_streaks` khi bật chế độ; `open_next`, `advance_from_reveal` (nhánh kết thúc) và `host_end_session` gọi `settle_chests`; `create_session` nhận `treasure_mode` (bật cả tự động thì hiện đáp án tối thiểu 8 giây, máy chủ ép); `host_state` thêm `treasure_mode` và `treasure_feed`; `player_state` thêm `streak` và `chest`; `host_results` thêm `treasure_mode`, `treasure_delta`, `treasure_chests`. Mọi hàm kho báu và mọi trường kho báu đều vắng mặt khi tắt chế độ.
- Quyết định nhỏ: không tăng `seq` khi mở rương (tránh tranh chấp hàng phiên khi nhiều bạn mở cùng lúc; màn hình giáo viên đã hỏi định kỳ và nhận bản mới cùng `seq`); rương chọn bằng "đầu mối" của chính học sinh chỉ là hình thức, máy chủ quyết định hiệu ứng.
- Phát hiện nhờ test: `LEAST` của Postgres bỏ qua NULL nên chia cho 0 từng thành "+2000"; đã `coalesce` trước khi áp trần (không xảy ra với hiệu ứng thật nhưng là phòng thủ).
- Client: `ChestView`, `TreasureFeedItem`, trường mới ở `HostState`/`PlayerState`/`HostResults`, `player.openChest` (kèm lời nhắn lỗi tiếng Việt). Giao diện để phase 4.
- Kiểm chứng: `tests/db/live-treasure.test.ts` 17 test: ngưỡng chuỗi với 6 kiểu chơi cùng lúc (đủ 3, bị cắt, bỏ trống, hỗn hợp), rương thứ nhất tự mở khi sang câu kế, tắt chế độ thì không có gì, người bị loại không tính và ràng buộc duy nhất, mở rương (chưa tới pha, không có rương, hiệu ứng không lộ trước khi mở, điểm sau khớp, gọi lại cùng kết quả, 6 lời gọi song song chỉ mở một lần), `apply_effect` ở các biên, phân phối `pick_effect` 4000 lần theo trọng số, 12 lần mở thật, chốt rương lúc sang câu kế/kết thúc/kết thúc giữa lúc đang hỏi, trang kết quả và xoá buổi xoá rương, cấu hình, quyền (bảng, cột, hàm nội bộ, giáo viên khác), không lộ khoá đáp án.
- Phá thử 14 thay đổi hàm (bỏ chặn không âm, bỏ trần, bỏ coalesce, ngưỡng 2, bỏ trống không tính, không đặt lại chuỗi, comfort có phép trừ, bỏ kiểm tra pha reveal, bỏ kiểm tra bị loại, lộ hiệu ứng khi chưa mở, bỏ chốt rương ở ba nơi, bỏ gọi `update_streaks`): **mọi thay đổi đều bị test bắt** (khôi phục sau mỗi lần).
- Kết quả: typecheck, lint, 218 unit, 160 test DB, 185 e2e (hai lần liên tiếp), `scan:bundle` sạch. Các test cũ của giai đoạn 2 và phase 2 vẫn đạt nguyên vẹn (hồi quy khi tắt chế độ).

### Sửa sau review phase 3

Review (`eba9833`) không có Critical hay High. Hai mục Medium và một Verification Gap đã sửa **trong chính migration `20261025090000_treasure.sql`** (chưa áp lên dự án thật, nên sửa tại chỗ được; đã `supabase db reset` cục bộ).

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Medium: deadlock giữa học sinh mở rương (khoá người chơi rồi rương) và giáo viên chốt rương (khoá rương rồi người chơi) | `private.open_chest_row` khoá người chơi trước rồi rương (đọc chủ rương không khoá, khoá người chơi, rồi khoá rương). Cả `open_chest` và `settle_chests` cùng thứ tự | Trước khi sửa: thăm dò hai phiên `psql` đồng thời cho `deadlock detected`. Sau khi sửa: test `khoá cùng thứ tự` (học sinh giữ khoá người chơi 1,5 giây, giáo viên chốt rương) cho cả hai giao dịch thành công, rương mở đúng một lần; phá thử trả về thứ tự cũ thì test hỏng |
| Medium: học sinh không biết rương tự mở cho mình | Cột `treasure_chests.auto_opened` (máy chủ tự mở = true); `chest_json` có `auto`; `player_state`: pha hỏi trả `last_chest` (rương câu liền trước nếu **tự mở**), pha kết thúc trả `treasure { opened, delta }` và `last_chest` (rương cuối tự mở nếu có); tắt chế độ thì không có trường nào | 3 test mới (`last_chest` khớp điểm và không nhắc lại ở câu sau, tổng kết cuối và người không có rương, tắt chế độ); 5 phá thử (cờ auto, bỏ `last_chest`, delta 0, nhắc cả rương tự bấm, thứ tự khoá) đều bị bắt |
| Verification Gap: chưa có test giáo viên chuyển pha cùng lúc học sinh mở rương | Test qua API thật: `host_next` cùng 6 lời gọi `open_chest` của 3 bạn, lặp 6 lần, không lời gọi nào lỗi (ngoài `chest_not_ready` hợp lệ khi giáo viên thắng cuộc đua) | Đạt |

Client: `ChestView` có `auto`, `PlayerState` có `last_chest` và `treasure`. Phase 4 hiển thị: banner "Rương câu trước tự mở: ..." ở pha hỏi và dòng tổng kết ở màn kết thúc.

Kết quả: typecheck, lint, 218 unit, 165 test DB, 185 e2e (hai lần liên tiếp) đạt.

## Phase 4 - Kho báu: giao diện

- Bảng bắt đầu phiên (`start-session.tsx`): công tắc "Chế độ giải trí: kho báu" (mặc định tắt) kèm mô tả; bật cùng "Tự động qua câu" thì lựa chọn 5 giây bị vô hiệu với lý do và tự chọn 8 giây (khớp việc máy chủ ép tối thiểu 8 giây). `SessionOptions.treasureMode` gửi `treasure_mode: true`.
- Học sinh: `StreakChip` ("Chuỗi đúng 2/3", "Chuỗi chưa đúng 2/3", có chữ và biểu tượng); `Chest` ở màn hiện đáp án (ba nút "Rương 1/2/3" dùng được bằng bàn phím, lựa chọn chỉ là hình thức; kết quả có nhãn hiệu ứng, "3000 thành 4000 điểm", "Điểm tăng/giảm/giữ nguyên" kèm mũi tên, vùng `role="status"`; lỗi mạng thì báo và bấm lại được vì mở lại idempotent; mở xong làm mới trạng thái ngay); thông báo "Rương câu trước đã tự mở cho bạn." ở câu kế (dùng `last_chest`); tổng kết kho báu ở màn kết thúc (`treasure`, `last_chest`). Hoạt hình `chestPop` chỉ đổi kích thước (không đổi độ mờ để chữ luôn đủ tương phản) và chỉ chạy khi `prefers-reduced-motion: no-preference`.
- Giáo viên: khung "Kho báu" ở màn hiện đáp án liệt kê các rương vừa mở (`aria-live="polite"`); trang kết quả có cột "Kho báu" (`+700 điểm (1 rương)`) và ghi chú tổng điểm theo câu có thể khác điểm cuối khi bật chế độ.
- Phát hiện khi chụp màn hình: sau khi mở rương, tổng điểm đã đổi nhưng bảng xếp hạng ngay trên điện thoại vẫn hiện điểm cũ vì khoá tải lại chỉ theo `seq` (mở rương không đổi `seq`). Đã khoá theo cả điểm (`seq-score`); e2e kiểm bảng xếp hạng khớp điểm mới và phá thử bỏ phần điểm thì test hỏng. Phát hiện khác: hoạt hình đầu tiên đổi cả độ mờ làm axe báo `color-contrast` ở khung rương đang chạy; đã bỏ phần độ mờ.
- Kiểm chứng: `e2e/treasure.spec.ts` 7 test (3 đúng cho rương thắng và 3 sai cho rương an ủi, mở bằng Enter, điểm khớp học sinh/bảng xếp hạng/giáo viên ngay sau khi mở, tải lại vẫn thấy kết quả, bảng tin; rương chưa mở tự mở và được báo, tổng kết kết thúc và cột ở trang kết quả; tắt chế độ thì không có gì; bảng bắt đầu; reduced motion; axe 1280/375 qua rương chưa mở, đã mở, thông báo tự mở, bảng tin, màn kết thúc, trang kết quả). Phá thử phía client: bỏ lời gọi làm mới sau khi mở rương làm test hỏng (điểm cũ sau 4 giây), bỏ phần điểm trong khoá bảng xếp hạng làm test hỏng. Test đơn vị `treasure.test.ts` (tăng/giảm/giữ nguyên, định dạng, lời giải thích loại rương) và `player.openChest`.
- Không cần token màu mới (dùng lại token có sẵn); `DESIGN.md` không đổi.
- Kết quả: typecheck, lint, 221 unit, 165 test DB, 192 e2e (hai lần liên tiếp), `scan:bundle` sạch.

### Sửa sau review phase 4

Review (`1368f3e`) không có Critical hay High; bốn mục đã sửa.

| Mục | Cách sửa | Kiểm chứng |
|---|---|---|
| Medium (trợ năng): trình đọc màn hình không được báo về rương | Tách `announcement` thành `src/lib/live/announce.ts` (`playerAnnouncement`) và đưa rương vào vùng đọc cố định của màn học sinh: rương chưa mở ("Bạn nhận được một rương kho báu. Chọn một rương để mở."), rương đã mở ("Rương: Nhân đôi điểm, 3000 thành 6000 điểm."), rương tự mở ở câu kế, tổng kết kho báu ở màn kết thúc | `announce.test.ts` 4 test; e2e kiểm nội dung vùng đọc cố định ở cả ba thời điểm; phá thử bỏ nhánh rương chưa mở thì test đơn vị hỏng. Hệ quả cho test: vùng đọc cố định là `role="status"` nên các bộ chọn trạng thái trong e2e phải giới hạn trong vùng "Kho báu" (đã đổi) |
| Verification Gap (Low): mở rương mất mạng thử lại chưa có test | e2e mới: chặn `open_chest` bằng `route.abort`, kỳ vọng báo "Bạn bấm mở lại nhé" và vẫn đủ ba rương, điểm chưa đổi; bỏ chặn rồi bấm lại ra đúng một kết quả, điểm đổi đúng một lần, tải lại vẫn cùng kết quả | Phá thử bỏ `setError` thì test hỏng |
| Low: `STREAK_TARGET = 3` viết cứng ở giao diện, canh bằng chú thích | Hàm `private.streak_target()` là nguồn duy nhất, dùng cho `update_streaks` và trả về trong `player_state.streak.target`; giao diện (`StreakChip`, `describeChestKind`) dùng `target`, bỏ hằng số; sửa tại chỗ migration 20261025 (chưa áp lên dự án thật) | Test DB kiểm `streak.target` và `private.streak_target() = 3`; test đơn vị `describeChestKind("win", 4)` ra "4 câu" |
| Low (nhỏ): `aria-disabled` thừa trên `<label>` ở bảng bắt đầu phiên | Bỏ (radio đã có `disabled`) | e2e bảng bắt đầu vẫn đạt |

Kết quả: typecheck, lint, 225 unit, 165 test DB, 193 e2e (hai lần liên tiếp), `scan:bundle` sạch.
