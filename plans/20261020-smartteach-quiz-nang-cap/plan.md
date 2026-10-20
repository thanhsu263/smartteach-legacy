Mode: local
Status: active

# Kế hoạch: nâng cấp quiz trực tiếp (QR, tự động qua câu, kho báu, import từ file)

Nguồn hướng đi: [brainstorm-2026-10-20-quiz-nang-cap.md](../reports/brainstorm-2026-10-20-quiz-nang-cap.md). Nền: giai đoạn 2 (quiz chơi trực tiếp) đã xong và **đã chạy trên Supabase thật** nên mọi thay đổi cơ sở dữ liệu là **migration mới**, không sửa các file `20261021`-`20261023` đã áp.

## Outcome

Phòng chờ có mã QR; giáo viên bật "Tự động" thì buổi chơi tự chuyển câu theo giờ máy chủ; chế độ giải trí "Kho báu" (tắt mặc định) đổi chuỗi 3 đúng/3 sai lấy rương làm đổi điểm của chính học sinh; giáo viên nhập quiz từ file Excel/CSV hoặc dán văn bản theo cú pháp.

## Scope

Trong phạm vi: bốn hạng mục trên, test, tài liệu, cập nhật trang Quyền riêng tư, chạy lại thử tải.

Ngoài phạm vi (theo brief): đề thi online, nhập Word/PDF, hiệu ứng lên điểm bạn khác, cho vào muộn, tăng giới hạn 50 người, tự đóng câu khi mọi người đã trả lời, avatar/nhạc/ảnh/AI, xuất báo cáo Excel.

## Nghiên cứu thư viện (có nguồn, 2026-10-20)

Số liệu từ npm registry (`npm view`, ngày 2026-10-20) và tài liệu của chính các thư viện.

**QR - chọn `qrcode-generator@2.0.4`** (MIT, **không phụ thuộc gói nào**, có kiểu TypeScript, bản công bố 2025-08). Dùng ở trình duyệt: `qrcode(0, 'M')`, `addData`, `make`, rồi dựng SVG bằng React từ `getModuleCount()` và `isDark(row, col)` (không dùng `createSvgTag` để khỏi phải `dangerouslySetInnerHTML`). Nguồn: [README qrcode-generator](https://unpkg.com/qrcode-generator@2.0.4/README.md) (API `qrcode(typeNumber, level)`, `addData`, `make`, `isDark`, `getModuleCount`, `typeNumber` 0 là tự dò).

| Ứng viên | Kết luận |
|---|---|
| `qrcode` 1.5.4 | Loại: kéo `yargs`, `pngjs`, `dijkstrajs` (có phần dành cho CLI/Node), nhiều thứ không cần |
| `uqr` 0.1.3 | Dự phòng: MIT, không phụ thuộc, nhỏ (77 kB), thuật toán của Nayuki, nhưng **chưa 1.0** và commit cuối khoảng một năm trước ([github.com/unjs/uqr](https://github.com/unjs/uqr)) |
| `qrcode-svg` 1.1.0 | Loại: không cập nhật từ 2022 |
| Dịch vụ ảnh QR bên ngoài | Loại: lộ PIN ra máy chủ khác |

Công cụ kiểm thử: `jsqr@1.4.0` (Apache-2.0, **chỉ devDependency**) giải mã QR từ bộ đệm điểm ảnh để chứng minh mã quét ra đúng địa chỉ.

**Đọc `.xlsx` - chọn `read-excel-file@9.3.12`** (MIT, bản công bố 2026-10-07; phụ thuộc `saxen`, `fflate`, `worker-f`, `unzipper-esm`). Dùng `import { readSheet } from 'read-excel-file/browser'` với `File`/`Blob`/`ArrayBuffer`, chỉ `.xlsx` (`.xls` ném `XLS_FILE_NOT_SUPPORTED`), đọc sheet đầu mặc định. Nguồn: [README read-excel-file 9.3.10](https://unpkg.com/read-excel-file@9.3.10/README.md). Lưu ý của README: phân tích XML chạy đồng bộ, file rất lớn có thể làm đứng trang, và API **đổi giữa các bản chính (7, 8, 9)** nên phải ghim đúng phiên bản.

| Ứng viên | Kết luận |
|---|---|
| `xlsx` (SheetJS) trên npm | **Loại.** Bản trên registry kẹt ở 0.18.5; các bản vá (0.19.3 sửa prototype pollution, 0.20.2 sửa ReDoS) chỉ phát hành từ `cdn.sheetjs.com` chứ không có trên npm. Nguồn: [tài liệu cài đặt SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/nodejs), [Snyk xlsx](https://security.snyk.io/package/npm/xlsx/0.17.0). Cài từ tarball ngoài registry làm nguồn gói không còn qua `npm audit` thông thường |
| `exceljs` 4.4.0 | Loại: 21 MB giải nén, nhiều phụ thuộc Node, cập nhật cuối 2024-12 |
| `papaparse` 5.7.0 (CSV) | Không cần: CSV của mẫu đơn giản, tự viết bộ đọc RFC 4180 nhỏ có test (xử lý BOM, dấu `;` của Excel tiếng Việt, ngoặc kép, xuống dòng trong ô) tránh thêm gói |

Cổng quyết định ở phase 5: nếu `read-excel-file` không bundle/chạy được trong Next 16 (Turbopack) hoặc làm phình gói quá mức, quay lại brainstorm để bỏ `.xlsx` (chỉ CSV và dán văn bản) thay vì tự đổi thư viện.

## Quyết định mặc định của kế hoạch (đảo ngược được, cần chủ dự án xác nhận)

Brief để mở các chi tiết sau; kế hoạch đặt giá trị khởi đầu và test bảo vệ chúng:

1. **Thời điểm mở rương:** rương mở được ở pha hiện đáp án; **rương chưa mở sẽ tự mở khi câu kế được mở** (và trước xếp hạng cuối). Lý do: điểm không đổi giữa chừng khi câu đang mở, xếp hạng mỗi pha ổn định. (Brief nói "mở được ở màn hình hiện đáp án" và "tự mở khi kết thúc"; kế hoạch thêm mốc "khi mở câu kế" để không dồn rương.)
2. **Chuỗi:** 3 câu đúng liền nhau cho rương "thắng"; 3 câu sai **hoặc bỏ trống** liền nhau cho rương "an ủi" (đúng theo brief); nhận rương thì chuỗi tương ứng về 0; một câu đúng làm chuỗi sai về 0 và ngược lại.
3. **Hiệu ứng và trọng số khởi đầu:** rương thắng - `+500` (25), `+1000` (20), `x2` (15), `x1,5` (10), `-300` (15), `÷2` (15); rương an ủi - `+500` (40), `+1000` (35), `x2` (25). Trần tăng một lần `+2000`, điểm không xuống dưới 0, làm tròn về số nguyên. Không có hiệu ứng lên người khác.
4. **Tự động:** thời gian hiện đáp án chọn `5`, `8` hoặc `12` giây (mặc định 8); bật kho báu thì tối thiểu 8 giây (máy chủ ép); Tiếp tục sau Tạm dừng cho thêm 3 giây rồi mới sang câu kế.
5. **Bật tuỳ chọn khi bắt đầu phiên:** hai công tắc "Tự động qua câu" và "Chế độ giải trí: kho báu" nằm ở bảng bắt đầu phiên, mặc định tắt, chụp vào phiên lúc tạo (không đổi giữa chừng).
6. **Import giới hạn:** tối đa 50 câu mỗi quiz (giới hạn sẵn có), tệp tối đa 1 MB, chỉ `.csv` và `.xlsx`; tiêu đề quiz lấy từ tên tệp, sửa được.

## Phases

| Phase | Name | Depends on | Status |
|---|---|---|---|
| 1 | [Mã QR ở phòng chờ](./phase-01-ma-qr.md) | không | Done (chờ review) |
| 2 | [Tự động qua câu](./phase-02-tu-dong-qua-cau.md) | không | Done (chờ review) |
| 3 | [Kho báu: máy chủ](./phase-03-kho-bau-may-chu.md) | 2 | Done (chờ review) |
| 4 | [Kho báu: giao diện](./phase-04-kho-bau-giao-dien.md) | 3 | Done (chờ review) |
| 5 | [Import: bộ đọc tệp và văn bản](./phase-05-import-bo-doc.md) | không | Pending |
| 6 | [Import: máy chủ và giao diện](./phase-06-import-giao-dien.md) | 5 | Pending |
| 7 | [Hoàn thiện, thử tải và phát hành](./phase-07-hoan-thien-phat-hanh.md) | 1-6 | Pending |

Thứ tự khuyến nghị cho một người làm: 1, 2, 3, 4, 5, 6, 7. Chuỗi 1, (2-3-4) và (5-6) **không dùng chung tệp** nên có thể chạy song song nếu cần; riêng phase 2, 3 cùng sửa các hàm Postgres của phiên nên phải tuần tự, và mỗi lần `create or replace` một hàm phải lấy **định nghĩa mới nhất** từ migration gần nhất (xem Risks).

Migration dự kiến (tên theo thứ tự thời gian, mỗi cái mới): `20261024090000_auto_advance.sql` (phase 2), `20261025090000_treasure.sql` (phase 3), `20261026090000_import_quiz.sql` (phase 6).

## Acceptance map

| Tiêu chí của brief | Task | Kiểm tra |
|---|---|---|
| QR quét ra `<origin>/play?pin=<PIN>`, `/play` điền sẵn PIN | 1.1, 1.2 | Test đơn vị giải mã bằng `jsqr`; e2e kiểm thuộc tính và luồng `/play?pin=` |
| QR đạt axe 1280 và 375, đủ tương phản | 1.2, 1.3 | `host-a11y.spec.ts`; nghiệm thu thủ công trên máy chiếu (7.5) |
| Tự động: hết giờ → hiện đáp án đúng N giây (giờ máy chủ) → câu kế; câu cuối → bục | 2.1-2.4 | Test DB đổi `reveal_ends_at`; e2e hai trình duyệt |
| Tạm dừng/Tiếp tục; Space vẫn dùng; không mở sớm, không mở hai lần, không chạy khi tắt | 2.1, 2.2, 2.4 | Test DB; e2e |
| Kho báu: đúng một rương theo chuỗi, không trùng, chuỗi đặt lại | 3.2, 3.3 | Test DB (ngưỡng, bỏ trống, gọi lặp) |
| `open_chest` idempotent, chỉ chủ rương, hiệu ứng trong danh sách, điểm ≥ 0, trần tăng | 3.4 | Test DB và `psql` hàng trăm lần mở |
| Rương còn lại tự mở trước xếp hạng cuối; kết quả khớp điểm cuối | 3.5, 3.6 | Test DB; e2e kết quả |
| Giao diện rương dùng được bằng bàn phím, kết quả có chữ, `prefers-reduced-motion`, axe | 4.1-4.4 | e2e + axe 1280/375 |
| Chế độ giải trí tắt thì hành vi cũ | 3.7, 4.5 | Bộ test hiện có chạy nguyên + test hồi quy |
| Import: file mẫu tải được; tệp đúng tạo quiz; tệp lỗi báo đúng dòng và không tạo gì; vượt 50 câu bị từ chối; dán văn bản cho cùng kết quả; đủ 4 dạng | 5.1-5.6, 6.1-6.4 | Test đơn vị, test DB (nguyên tử), e2e tải tệp CSV/xlsx và dán |
| Không có khoá bí mật/IP mới trong gói; test cũ vẫn đạt; tài liệu và trang Quyền riêng tư cập nhật | 7.1-7.4 | `scan:bundle`, bộ test đầy đủ, `e2e/privacy.spec.ts` |

## Safety

- Kế hoạch **không** tự thực hiện việc ghi ra ngoài. Áp migration lên Supabase thật (`npx supabase db push`, dry-run trước, đúng ba migration mới), `git push` và triển khai Vercel đều nằm ở task 7.6 và cần chủ dự án xác nhận từng bước vào lúc thực hiện.
- Thêm gói npm (`qrcode-generator`, `read-excel-file`, `jsqr`) là thay đổi `package.json`/lockfile cục bộ; ghim phiên bản chính xác (không dùng `^`).

## Risks

- **Sao chép định nghĩa hàm cũ** khi `create or replace` các hàm dài (`host_state`, `player_state`, `host_results`, `score_question`, `open_next`, `create_session`): phase 3 phải lấy bản đã sửa ở phase 2, không phải bản gốc phase 3 của giai đoạn 2. Giảm thiểu: mỗi migration ghi rõ "dựa trên định nghĩa trong <file>"; toàn bộ test hiện có (kể cả `FORBIDDEN_KEYS` chống lộ khoá đáp án) chạy lại sau từng migration; phá thử đổi một hàm để thấy test bắt.
- **Kho báu làm điểm mất ý nghĩa** nếu hiệu ứng quá lớn: trần +2000 và trọng số là giá trị khởi đầu, chỉnh bằng một hằng số trong hàm; nghiệm thu với lớp thật.
- **Học sinh bỏ trống nhiều câu nhận rương an ủi** (đúng theo brief). Chấp nhận; nếu thấy lệch có thể giới hạn chỉ tính chuỗi thua cho người đã trả lời ít nhất một câu.
- **Giáo viên đóng tab giữa phiên tự động** thì phiên đứng chờ (như hiện nay với đóng câu).
- **Tải Realtime/DB:** thêm vài tin và yêu cầu mỗi lần mở rương; chạy lại `npm run test:load` có bật tự động và kho báu (7.3).
- **Thư viện `.xlsx`:** xem cổng quyết định ở phase 5.
