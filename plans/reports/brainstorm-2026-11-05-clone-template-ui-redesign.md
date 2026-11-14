---
title: Vận dụng cloneTemplate cho toàn bộ UI SmartTeach
date: 2026-11-05
status: decided
---

# Vận dụng cloneTemplate cho toàn bộ UI SmartTeach

## Intent / Problem

UI SmartTeach đã có đầy đủ luồng nghiệp vụ nhưng ngôn ngữ thị giác chưa tận dụng được chiều sâu, khả năng trình diễn sản phẩm và phản hồi tương tác của `cloneTemplate`. Người dùng muốn thiết kế lại toàn bộ hệ thống, đặc biệt đưa cụm sheet xếp lớp trong landing page mẫu thành một trải nghiệm quiz có thể tương tác bằng chuột, nhưng không thay đổi logic nghiệp vụ hoặc stack hiện tại.

Đối tượng chính vẫn là giáo viên phổ thông Việt Nam, thường thao tác nhanh trên laptop giữa tiết học, chiếu lên màn hình trong ánh sáng ban ngày hoặc chuẩn bị bài trên điện thoại.

## Desired Outcome

- SmartTeach có một ngôn ngữ giao diện thống nhất lấy tối đa cấu trúc, chiều sâu, panel xếp lớp, bố cục kể chuyện và phản hồi tương tác từ `cloneTemplate`.
- Landing page trình diễn trực quan toàn bộ vòng đời quiz qua ba sheet `Soạn quiz / Chơi trực tiếp / Kết quả` thay vì hình minh hoạ tĩnh hiện tại.
- Trình soạn quiz thật có bố cục product-first rõ ràng: điều hướng câu hỏi, form soạn và xem trước; các trang quản lý dùng chung hệ panel, list/table, segmented control và drawer có chủ đích.
- Hiệu ứng không cản việc dạy, không làm thay đổi dữ liệu, routing, API, state nghiệp vụ hoặc khả năng truy cập.

## Constraints

- Giữ Next.js 16 App Router, React 19, TypeScript, CSS Modules và hệ token hiện tại; không đưa Tailwind, Shadcn, TanStack Router, Blink SDK hoặc dữ liệu CRM từ template vào dự án.
- Đọc hướng dẫn Next.js liên quan trong `node_modules/next/dist/docs/` trước khi viết code.
- Giữ nhận diện SmartTeach: xanh dương `#1D4FD7` / `#153BA8`, vàng `#FFC72C` chỉ cho CTA chính, bề mặt trắng và nền trung tính sáng.
- Không đổi logic nghiệp vụ, schema, API, routing, state hoặc tên props.
- WCAG AA, điều hướng bàn phím, focus rõ, vùng chạm tối thiểu 44px, `prefers-reduced-motion`, không phụ thuộc hover và không tràn ngang từ 360px.
- Màn hình host/player, bảng trắng, game và vùng chiếu lên lớp phải ưu tiên nền đặc, chữ lớn, tương phản cao; không dùng tilt, blur nặng hoặc chuyển động trang trí.
- Demo quiz trên landing chỉ dùng state cục bộ và dữ liệu mẫu, không ghi Supabase và không tạo một trình soạn nghiệp vụ thứ hai.
- Bộ kiểm thử hiện hữu phải tiếp tục đạt, đặc biệt axe WCAG AA và kiểm tra overflow ở 375px.

## Non-goals

- Không sao chép nguyên màu xanh lá–lime, thương hiệu Orbit, nội dung CRM hoặc câu chữ của template.
- Không chuyển dự án sang Vite, Tailwind, Shadcn hay cài toàn bộ dependency của template.
- Không thêm tính năng quiz, loại câu hỏi, báo cáo hoặc quyền người dùng mới trong đợt redesign.
- Không dùng animation cuộn phức tạp, choreography khi tải trang, cursor tùy biến hoặc hiệu ứng làm lệch mục tiêu bấm.
- Không biến mọi nội dung thành card kính hoặc áp dụng 3D cho mọi trang.

## Domain Context

### Feature Summary

Đây là redesign production-ready cho toàn bộ UI SmartTeach. Landing page đóng vai trò trình diễn sản phẩm; các khu quản lý quiz, lớp học, game và công cụ vẫn là product UI quen thuộc, nhanh và đáng tin.

### Primary User Action

Giáo viên phải hiểu ngay SmartTeach hỗ trợ chu trình `soạn → chơi → xem kết quả` và có thể bắt đầu hoặc tiếp tục một quiz trong tối đa hai lần bấm.

### Design Direction

- **Color strategy:** Committed ở hero và dải CTA; Restrained trong các màn hình làm việc.
- **Scene sentence:** Một giáo viên đang mở laptop trên bàn giáo viên giữa lớp học sáng ban ngày, cần chuẩn bị hoặc khởi chạy hoạt động trong vài giây mà vẫn nhìn rõ khi chiếu lên bảng.
- **Anchor references:** cụm sheet 3D và demo UI thật của `cloneTemplate`; hệ phân cấp product-first của bản thử B; screen flow ba bước của bản thử C; token và nguyên tắc SmartTeach trong `DESIGN.md`.
- **Hướng đã duyệt:** kết hợp A + B + C. Hero và tương tác chuột theo A; trình soạn quiz theo B; phần giải thích luồng bên dưới theo C.

### Layout Strategy

1. **Landing hero:** nội dung và CTA ở trái, cụm ba sheet quiz ở phải trên desktop. Sheet trước chứa UI thật; hai sheet sau tạo chiều sâu và hé lộ bước kế tiếp.
2. **Quiz Sheets:** tab `SOẠN QUIZ`, `CHƠI TRỰC TIẾP`, `KẾT QUẢ` đổi sheet trước. Sheet soạn có câu hỏi và A–D; sheet live có PIN và số người tham gia; sheet kết quả có phân bố đáp án và bảng xếp hạng rút gọn.
3. **Story section:** ba bước nối tiếp theo chiều ngang trên desktop và dọc trên mobile, dùng một UI excerpt lớn thay vì lưới card giống nhau.
4. **Teacher workspace:** trình soạn quiz thật dùng ba vùng thích ứng: danh sách câu, form soạn, xem trước. Ở tablet/mobile, chuyển thành điều hướng tuần tự hoặc panel trượt thay vì ép ba cột.
5. **Các trang quản lý:** dùng header công việc rõ, toolbar/segmented control, list hoặc table có mật độ phù hợp, panel chi tiết theo ngữ cảnh. Không mặc định dùng sidebar toàn hệ thống nếu nó làm tăng số lần bấm.
6. **Màn hình lớp học:** giữ full-bleed, nền gần đặc và loại bỏ lớp trang trí không phục vụ trạng thái.

### Key States

- Landing demo: mặc định, đổi tab, chọn đáp án, hover/focus/press, sheet đang chuyển, reduced motion và mobile không tilt.
- Quiz editor: loading skeleton, quiz rỗng, đang chọn câu, câu mới, đang sửa, chưa lưu, đang lưu, lưu thành công, lỗi, xác nhận xoá và đạt giới hạn câu hỏi.
- Live quiz: chờ học sinh, đang hỏi, đã trả lời, hiện đáp án, kết thúc và mất kết nối.
- Results: có dữ liệu, chưa có phiên chơi, tải thêm, lỗi và quiz đã bị xoá nhưng lịch sử còn giữ.
- Danh sách/quản lý: loading, empty state có hướng dẫn, lỗi có bước tiếp theo, disabled và thao tác thành công.

### Interaction Model

- Cụm Quiz Sheets dùng `requestAnimationFrame` và CSS transform cho parallax rất nhẹ trên thiết bị `pointer: fine`; trở về vị trí nghỉ khi rời chuột.
- Đổi tab đưa sheet tương ứng ra trước bằng transform/opacity và giữ focus/ARIA đúng; không tự xoay vòng khiến người dùng mất kiểm soát.
- Người dùng có thể chọn một đáp án mẫu hoặc chuyển bước trong demo, nhưng mọi dữ liệu được reset khi rời trang và không gọi API.
- Hover chỉ nâng hoặc đổi viền nhẹ; press cho phản hồi tức thời. Bàn phím và cảm ứng nhận phản hồi tương đương mà không cần hiệu ứng con trỏ.
- Trình soạn thật giữ toàn bộ hành vi hiện tại; redesign chỉ thay đổi bố cục trình bày và cách bộc lộ thao tác.
- Drawer/sheet xuất phát từ ngữ cảnh kích hoạt, đóng bằng nút, Esc hoặc scrim và trả focus về phần tử mở.

### Content Requirements

- Copy ngắn, gọi người dùng là “Thầy cô”, không dùng giọng quảng cáo SaaS.
- Demo dùng câu hỏi tiếng Việt thực tế, bốn lựa chọn ngắn và dữ liệu lớp học giả lập rõ là minh hoạ.
- CTA chính duy nhất trong hero dẫn tới `/my-quizzes`; CTA phụ có thể dẫn tới kho game hoặc cuộn tới phần giải thích quy trình.
- Không dùng logo, thương hiệu hoặc nội dung CRM từ template.
- Icon dùng SVG/component hiện hữu; không dùng emoji làm điều khiển.

### Responsive and Accessibility

- Desktop: ba sheet có perspective và cho phép parallax nhẹ.
- Tablet: giảm góc nghiêng, giảm độ lệch sheet và ưu tiên sheet trước.
- Mobile: chỉ sheet trước hiển thị đầy đủ; tab có thể cuộn hoặc chia đều nhưng không tràn; tắt tilt và parallax.
- Text và điều khiển vẫn đạt WCAG AA trên mọi lớp; không đặt chữ phụ mờ trên nền xanh hoặc panel trong.
- `prefers-reduced-motion` thay chuyển động 3D bằng crossfade gần như tức thời; nội dung mặc định luôn nhìn thấy khi JS chưa chạy.

### Recommended Implementation References

- `hs-frontend-development/references/interaction-design.md`
- `hs-frontend-development/references/motion.md`
- `hs-frontend-development/references/responsive.md`
- `hs-frontend-development/references/space.md`
- `hs-frontend-development/references/color.md`
- Hướng dẫn App Router, CSS và client components tương ứng trong `node_modules/next/dist/docs/`.

## Options Considered

| Option | Key assumption | Failure condition | Trade-offs |
|---|---|---|---|
| Sao chép nguyên template | Stack và ngôn ngữ CRM phù hợp SmartTeach | Tăng dependency, phá CSS Modules và mất nhận diện sản phẩm | Nhanh về bề ngoài nhưng rủi ro kỹ thuật, UX và bảo trì cao |
| Chỉ thay hero | Cảm giác chưa hoàn thiện chỉ nằm ở landing | Các màn hình làm việc tiếp tục lệch ngôn ngữ và không tận dụng template | Phạm vi nhỏ nhưng không đạt yêu cầu redesign toàn hệ thống |
| Dịch hệ thiết kế và interaction sang SmartTeach | Giá trị của template nằm ở cấu trúc, chiều sâu và demo thật chứ không ở stack | Thất bại nếu hiệu ứng bị áp dụng đồng loạt hoặc form demo lẫn với dữ liệu thật | Tốn công hơn nhưng giữ stack, thương hiệu, accessibility và nghiệp vụ; **được chọn** |

## Decision

Áp dụng hướng kết hợp A + B + C bằng cách dịch ngôn ngữ của `cloneTemplate` sang hệ thống SmartTeach, không sao chép implementation. Landing dùng hero xanh đậm với Quiz Sheets tương tác; trình soạn thật theo bố cục product-first; phần nội dung tiếp theo kể screen flow ba bước. Các primitive hữu ích của template—panel xếp lớp, segmented control, list/table dày thông tin, sheet chi tiết và phản hồi hover/press—được chuẩn hoá trong token/CSS Modules để dùng xuyên suốt sản phẩm.

## Reasoning

Hướng này đáp ứng mong muốn “vận dụng tối đa template” ở những giá trị người dùng thực sự nhìn và cảm nhận, đồng thời tránh nhập một stack UI thứ hai. Nó tạo điểm nhận diện mạnh ngay trên landing nhưng vẫn giữ các màn hình phục vụ giảng dạy ổn định, quen thuộc và đọc tốt khi chiếu. Demo cục bộ giúp người dùng hiểu sản phẩm bằng thao tác thật mà không nhân đôi logic lưu quiz.

## Acceptance Criteria

- Landing có cụm Quiz Sheets ba trạng thái thật, đổi tab và phản hồi chuột trên desktop; dùng được bằng bàn phím và cảm ứng.
- Demo cho phép ít nhất chọn đáp án và chuyển giữa ba bước nhưng không gọi Supabase hoặc thay đổi dữ liệu người dùng.
- Trình soạn quiz thật phản ánh bố cục product-first đã duyệt mà không thay đổi hành vi lưu, sửa, xoá, sắp xếp hoặc cảnh báo chưa lưu.
- Các trang quản lý chính dùng chung token, panel, toolbar, segmented control, list/table và drawer; không còn cảm giác các màn hình thuộc những hệ thiết kế khác nhau.
- Host/player, bảng trắng và khung game không bị tilt, blur nặng hoặc animation trang trí.
- Không thêm Tailwind, Shadcn, TanStack Router, GSAP hoặc dependency template khi chưa chứng minh nhu cầu không thể giải quyết bằng stack hiện tại.
- Không tràn ngang ở 375px; focus-visible rõ; tương phản đạt WCAG AA; reduced motion hoạt động.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:db`, `npm run test:e2e` hai lần và `npm run scan:bundle` đều đạt trước khi phát hành.

## Open Questions / Risks

- Cụm sheet có thể quá nặng nếu render toàn bộ UI chi tiết trên mobile; kế hoạch cần xác định phiên bản rút gọn và ngân sách DOM/paint.
- Parallax phải được giới hạn góc, vùng kích hoạt và tần suất cập nhật để không gây say chuyển động hoặc làm Playwright click chập chờn.
- Bố cục ba vùng của editor cần giữ thứ tự đọc và focus hợp lý khi chuyển sang một cột.
- Việc áp dụng “tối đa” phải được đánh giá theo tính nhất quán và hiệu quả thao tác, không theo số lượng hiệu ứng hoặc số card được chuyển đổi.
