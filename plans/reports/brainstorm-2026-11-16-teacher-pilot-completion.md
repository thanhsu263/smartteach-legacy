---
title: Hoàn thiện SmartTeach cho đợt giáo viên dùng thử
date: 2026-11-16
status: decided
---

# Hoàn thiện SmartTeach cho nhóm giáo viên dùng thử

## Intent / Problem

SmartTeach đã có luồng tài khoản giáo viên, quản lý lớp, soạn và chơi quiz, bài giao online, kho học liệu, quản trị và RAG trong code local. Người dùng muốn bổ sung những tính năng còn thiếu để 2–3 giáo viên dùng thử thực tế. Website https://smartteachvn.vercel.app/ đã được triển khai nhưng theo chủ dự án đang ở phiên bản cũ.

Các quyết định được người dùng xác nhận trong hội thoại:

1. Mục tiêu tiếp theo là nhóm nhỏ giáo viên dùng thử, dự án cá nhân, chưa ấn định ngày hoàn thành.
2. Ưu tiên bổ sung tính năng còn thiếu; đồng ý cả bốn tính năng: quên/đổi mật khẩu, khôi phục nháp quiz, xuất kết quả CSV và gửi góp ý cho quản trị viên.
3. Thử trên website online hiện có, không chỉ demo trên localhost.
4. Nháp lưu trên trình duyệt đang soạn, tách theo tài khoản và quiz; không đồng bộ sang máy khác.
5. Sau khi làm rõ luồng Bài đã giao hiện tại, người dùng yêu cầu bổ sung soạn đề kiểm tra và kiểm tra online thành hạng mục thứ năm. Bốn tính năng trên vẫn giữ nguyên.
6. Người dùng chọn trắc nghiệm và trả lời ngắn chấm tự động, soạn trực tiếp hoặc nhập Word/PDF/Excel/CSV, làm bài online và xuất nội dung đề Word/PDF. Chỉ hỗ trợ văn bản có thể chọn/copy, không OCR, không hình/công thức ở bản đầu. Nội dung được chuẩn hóa thành câu hỏi chỉnh sửa được và xuất theo mẫu chung.
7. Người dùng chốt Free nhập đề theo cấu trúc chuẩn; Premium có thêm AI trích xuất đề bố cục tự do. Đã xác nhận thêm: Free được soạn đề, nhập theo mẫu và xuất Word/PDF; kiểm tra online tiếp tục thuộc Premium. Không đổi giá gói hoặc kích hoạt payOS.
8. Người dùng bổ sung screen flow thiết kế bằng Figma AI tại file `4EEncl4e3CIzdTFNAMm0ry`, node `34:4060` làm ngữ cảnh thiết kế. Đã đọc cấu trúc và các màn hình trọng tâm qua Figma ngày 16/11/2026; đối chiếu chi tiết ở mục tham chiếu Figma dưới đây.

## Desired Outcome

Giáo viên dùng tài khoản của mình trên bản online để khôi phục quyền đăng nhập, tiếp tục nội dung chưa lưu sau khi tải lại trang, soạn/nhập/xuất đề kiểm tra, tổ chức kiểm tra theo quyền gói, tải kết quả và gửi phản hồi cho chủ dự án. Chủ dự án đọc và xử lý được các góp ý chủ động gửi mà không có quyền đọc thêm dữ liệu riêng của giáo viên.

Một vòng dùng thử thành công gồm đăng nhập → soạn/nhập đề và kiểm tra nội dung → xuất đề hoặc phát hành kiểm tra online → làm bài → xem và xuất kết quả → gửi góp ý. Quiz trực tiếp hiện có vẫn là luồng cần giữ tương thích. Đánh giá bằng hành vi và phản hồi thực tế, không bằng số màn hình hoặc số hiệu ứng được bổ sung.

## Constraints

- Giữ Next.js/React/Supabase và các quy ước auth, RLS, error handling, token và giao diện hiện có; không thêm app hoặc framework thứ hai.
- Nhóm thử 2–3 giáo viên; không xây tổ chức nhiều trường, tài khoản học sinh hoặc hạ tầng riêng chỉ cho đợt này.
- Giữ cơ chế học sinh vào quiz bằng PIN và bài giao bằng quyền truy cập riêng. CSV không chứa PIN, token, mã truy cập học sinh, mật khẩu hoặc secret.
- Admin vẫn không được đọc lớp, quiz riêng, điểm hoặc chat riêng của giáo viên khác. Góp ý do giáo viên chủ động gửi là nội dung chia sẻ riêng cho quy trình hỗ trợ.
- Nháp nằm trên thiết bị hiện tại. Tách theo user, quiz và nhận diện câu đang sửa/câu mới; không lẫn nội dung khi đổi tài khoản, câu hỏi hoặc quiz. V1 giữ một bản nội dung đang soạn cho mỗi quiz, theo hành vi chỉ mở một form hiện có.
- Tiếp tục dùng visual system trong PRODUCT.md và DESIGN.md; các form phải rõ trên điện thoại, tablet và laptop, dùng được bằng bàn phím.
- payOS tiếp tục hoãn; giá Premium tháng/năm giữ nguyên. Chia quyền của hạng mục đề kiểm tra theo bảng đã chốt bên dưới, không biến việc soạn quiz Free thành trả phí. Luồng kiểm tra/bài giao online vẫn cần Premium để tạo/phát hành theo chính sách hiện có; quyền xem/đóng và học sinh tiếp tục bài đã phát hành khi hết hạn phải giữ tương thích.
- Tệp nhập đề là dữ liệu riêng của giáo viên, không trở thành nguồn RAG dùng chung. Chỉ gửi nội dung sang Gemini khi giáo viên chọn luồng AI và được thông báo rõ; không tự chuyển Free sang AI khi parser theo mẫu không đọc được tệp.
- Giữ dữ liệu online đang có. Không reset database, sao chép dữ liệu local đè lên online hoặc tự suy tài khoản admin local đã có quyền trên production.
- Quyết định này cho phép lập kế hoạch; không tự cấp quyền production, đặt secret, gửi email thật, áp migration remote, deploy hoặc push.

## Non-goals

Đợt này không bổ sung AI tự sinh câu hỏi từ chủ đề, tự suy đáp án để làm khóa chấm, đồng bộ nháp nhiều máy, ngân hàng câu hỏi/thư mục/tag, tự luận chấm tay, báo cáo tiến bộ nhiều buổi hoặc xuất hàng loạt dữ liệu trường. Không OCR, không hỗ trợ hình ảnh/công thức hoặc phục dựng bố cục đề gốc; Word/PDF đầu vào cần có chữ. Không thiết kế lại hero hoặc thay hiệu ứng toàn website. Không tạo hệ thống email hỗ trợ, chat trực tiếp với admin hoặc nhận ảnh đính kèm trong góp ý. AI trích xuất đề có sẵn là tính năng Premium đã chốt, khác với tự sinh đề mới.

## Domain Context

### Bằng chứng từ repository

| Khu vực | Hiện trạng đã đọc | Hệ quả |
| --- | --- | --- |
| `src/components/login-form.tsx` | Có đăng nhập/đăng ký email và Google; chưa có luồng quên mật khẩu trong form | Bổ sung entry point và trạng thái khôi phục, giữ luồng đăng nhập hiện tại |
| `src/app/auth/callback/route.ts`, `src/lib/auth/safe-next.ts` | Đổi auth code thành session, giới hạn redirect nội bộ | Recovery phải phân biệt đúng mục đích và xử lý link lỗi; không tạo open redirect |
| `src/components/auth-provider.tsx` | Auth context có user, trạng thái phiên và đăng xuất | Cần dùng user thật để chọn/dọn nháp, không đọc nháp khi auth chưa xác định |
| `src/components/quiz/quiz-editor.tsx`, `question-form.tsx` | Đang giữ draft trong React state và hỏi trước khi chuyển câu nếu dirty | Khôi phục bổ sung persistence cho nội dung chưa lưu, không thay hành vi lưu quiz thật |
| `src/lib/live/results.ts`, `components/live/results/` | Có kết quả buổi quiz cho chủ phiên sau khi kết thúc, ranking và thống kê | Tái sử dụng dữ liệu đã được phân quyền để xuất một buổi; không cần gộp nhận diện qua các buổi |
| `src/lib/assignments/types.ts`, `components/assignments/assignment-detail.tsx` | Có roster, trạng thái lượt, điểm/câu đúng/tổng và thời điểm nộp | Có đủ cơ sở cho CSV tổng hợp một bài giao; phải phân biệt chưa nộp với điểm 0 |
| `src/lib/quiz/import/`, `components/quiz/import-quiz.tsx` | Có parser .xlsx/CSV/văn bản, cấu trúc cột, lỗi theo dòng và xem trước | Tái sử dụng phần phù hợp; cần bổ sung cấu trúc đề/phần/điểm, không giả rằng đã nhập được Word/PDF |
| `src/lib/rag/extract.ts`, `src/lib/ai/` | Có đọc chữ DOCX/PDF và gateway Gemini với quota; tài liệu RAG hiện do admin nạp | Có nền kỹ thuật để khảo sát, nhưng đề riêng của giáo viên cần luồng owner-only, review, giới hạn và quyền Premium riêng |
| `src/components/admin/admin-shell.tsx`, `src/lib/admin/http.ts` | Có shell và guard admin riêng | Góp ý có nơi quản lý trong admin, không mở quyền đọc các bảng private hiện có |
| `docs/admin-rag-operations.md`, plan admin/RAG | Bản local vừa có cấu hình AI, worker và migration mới; local khác production | Nâng bản online phải kiểm tra cả chênh lệch phiên bản nền, không chỉ năm hạng mục mới |

PRODUCT.md và một số đoạn README còn mô tả quiz/bài giao là tính năng tương lai. Khi lập kế hoạch, code và các quyết định mới là bằng chứng hiện trạng; không suy tính năng chưa có chỉ từ mô tả cũ. Nếu cần cập nhật tài liệu sản phẩm, trình thay đổi riêng, không viết lại trong brainstorm này.

### Website đích

Đã đọc HTTP công khai ngày 16/11/2026: trang chủ và `/login` đều trả 200, tiêu đề tương ứng SmartTeach và Đăng nhập. Đây chỉ là kiểm tra khả năng truy cập, chưa xác minh build đang chạy, Supabase project, schema, SMTP, auth redirects hoặc dữ liệu người dùng trên production. Không đăng nhập vào website online trong bước brainstorm.

### Hướng UX và trạng thái

Giữ thương hiệu sáng, xanh dương/vàng và thành phần form/button/feedback hiện có. Giáo viên thao tác trên điện thoại khi chuẩn bị bài hoặc laptop lúc dạy; ưu tiên thao tác trực tiếp và thông báo trạng thái rõ. Các bổ sung nằm trong màn hình chức năng, không mở một hướng thiết kế hình ảnh mới.

- Tài khoản: từ Đăng nhập đi vào Quên mật khẩu; trang đặt lại mật khẩu xử lý link hợp lệ/hết hạn/đã dùng; đổi mật khẩu từ khu vực tài khoản. Có loading, lỗi có thể xử lý, thành công và hướng quay về đăng nhập. Với Google, hướng dẫn đúng phương thức truy cập và cấu hình Auth thực tế, không hứa tự đổi mật khẩu tài khoản Google.
- Nháp quiz: báo có bản nháp kèm thời điểm; giáo viên chọn Khôi phục hoặc Bỏ nháp. Hiển thị trạng thái lưu cục bộ và lỗi storage nếu có. Không tự ghi đè câu hỏi đã lưu khi phát hiện draft.
- CSV: nút ở kết quả của một buổi quiz hoặc chi tiết một bài giao. Có trạng thái không có dữ liệu, đang tạo, lỗi và hoàn tất tải. Chỉ xuất dữ liệu đúng phạm vi người đang đăng nhập được xem.
- Góp ý: form ngắn gồm loại phản hồi và nội dung; xác nhận đã gửi và theo dõi trạng thái của chính mình. Admin có danh sách, chi tiết, lọc trạng thái và thao tác chuyển Mới → Đang xử lý → Đã xử lý. Hệ thống chỉ gửi nội dung giáo viên chủ động nhập và metadata tối thiểu, không tự đính kèm chat, quiz, điểm hoặc query string chứa token.
- Đề kiểm tra: màn hình soạn cấu trúc đề/phần/câu/điểm/thời lượng; nhập theo mẫu hoặc chọn AI khi đủ quyền. Sau nhận dạng luôn có màn hình xem lại để sửa; hiển thị số câu, chỗ thiếu đáp án, điểm chưa hợp lệ và phần không đọc được. Xuất đề theo mẫu thống nhất; bản học sinh không có đáp án, bản đáp án dành riêng giáo viên. Hành động Phát hành kiểm tra online là bước riêng sau khi đề hợp lệ, có kiểm tra Premium rõ ràng.

Labels, focus, thứ tự Tab, thông báo lỗi/status và trạng thái disabled phải có ý nghĩa. Tôn trọng reduced motion; không làm form phụ thuộc hover hoặc hiệu ứng xuất hiện mới thao tác được.

### Screen flow Figma do người dùng bổ sung

Nguồn: [SmartTeach — Teacher Desktop](https://www.figma.com/design/4EEncl4e3CIzdTFNAMm0ry/SmartTeach?node-id=34-4060). Đây là page `01 — Teacher Desktop`; trong page có cả biến thể mobile/tablet. Danh mục node lưu tại [figma-2026-11-16-smartteach-teacher-flow.json](./figma-2026-11-16-smartteach-teacher-flow.json).

Đã đọc metadata toàn page với **33 frame cấp cao** (bao gồm màn hình, trạng thái và các nhóm component), đồng thời đọc design context và ảnh của sáu frame dưới đây. Không gọi 33 frame là 33 tính năng; chưa kiểm toàn bộ prototype connections hoặc thao tác tương tác như một app đang chạy. Toàn file hiện có ba page: Landing page, SmartTeach Foundations và Teacher Desktop. Không chỉnh sửa thiết kế Figma trong tác vụ này.

| Nội dung đã đọc trực tiếp | Node | Áp dụng cho đợt dùng thử |
| --- | --- | --- |
| `ST/Auth/Login/Desktop` | `34:4649` | Bố cục xác thực, lỗi đăng nhập, link Quên mật khẩu và focus; link không có nghĩa luồng reset đã được thiết kế/triển khai đầy đủ |
| `ST/Quiz/Import/Upload` | `36:60368` | Bước chọn tệp, kéo thả/nút chọn, tải mẫu và hướng dẫn bàn phím |
| `ST/Quiz/Import/Preview` | `36:60509` | Xem trước, sửa ô, chọn đáp án, phân trang, cảnh báo đã xử lý và xác nhận nhập |
| `ST/Quiz/Import/Error` | `36:60928` | Báo lỗi theo dòng/cột, số câu cần sửa, cách sửa, đổi tệp và thử lại |
| `ST/Quiz/Editor/Desktop` | `36:39819` | Danh sách câu bên trái, vùng soạn chính, cài đặt câu bên phải, Preview và mở phiên |
| `ST/Quiz/Editor/Desktop/SaveError` | `36:40301` | Lỗi lưu giữ nội dung, nút thử lại và trạng thái chưa được mở phiên |

Các frame còn lại có trong inventory gồm shell mở/thu gọn, đăng nhập mobile, danh sách/chi tiết lớp, đổi tên/xóa học sinh, danh sách quiz và empty/loading/state examples, editor desktop đang lưu, editor tablet/mobile với các tab câu hỏi/cài đặt, kho tiện ích desktop/mobile và bốn trạng thái đồng hồ. Dùng metadata để tìm node; khi triển khai một màn hình phải lấy context/ảnh của chính node đó, không suy pixel hoặc nội dung chi tiết từ tên frame.

Những điểm tham chiếu được giữ:

- Flow nhập ba bước **Chọn tệp → Kiểm tra câu hỏi → Xác nhận nhập**, có xem trước và xác nhận thành công thực; minh họa toast trong Figma không phải một thao tác đã chạy.
- Editor có vùng danh sách/câu hỏi/cài đặt rõ ràng; có biến thể 375px, 768px và desktop, các trạng thái Saving/SaveError, focus và bàn phím.
- Màu, chữ Be Vietnam Pro và token trong context khớp hướng DESIGN.md hiện tại; tận dụng component/token trong repo khi triển khai. Không đưa mã React/Tailwind mẫu hoặc URL asset tạm vào app như code sản phẩm.

Những khác biệt cần điều chỉnh theo quyết định đã chốt:

1. **Định dạng và loại câu:** mẫu import Figma chỉ nêu .csv/.xlsx, cột `question`, `answer_1..answer_4`, `correct_answer` và một đáp án đúng. Bản cần xây có .docx/.pdf/.xlsx/.csv, nhiều dạng trắc nghiệm/trả lời ngắn và điểm/phần. Dùng lại cách trình bày từng bước, mở rộng trường và kiểm tra; không giới hạn lại thành bốn lựa chọn hoặc loại bỏ Word/PDF vì mẫu cũ.
2. **Nháp và trạng thái đã lưu:** editor Figma ghi mọi thay đổi tự lưu và có nhãn Đã lưu. Phạm vi đã chốt là nháp cục bộ theo tài khoản/quiz, việc lưu nội dung chính thức theo luồng có xác nhận hiện có. UI phải phân biệt Lưu nháp trên máy này với Đã lưu lên tài khoản; không tự biến yêu cầu thành đồng bộ/auto-publish server. Lỗi lưu giữ nội dung và cho thử lại.
3. **Thời gian và điểm:** editor minh họa 20 giây/câu và 1.000 điểm theo quiz trò chơi. Kiểm tra online mới có thời lượng toàn bài và điểm mỗi câu; không sao chép đơn vị điểm/thời gian của game sang bài kiểm tra. Quiz trực tiếp vẫn giữ hành vi cũ.
4. **Điều hướng và quyền:** shell mẫu có Lớp học, Quiz của tôi, Trò chơi, Tiện ích; có search/chuông và bản rail thu gọn. Cần bổ sung vị trí hợp lý cho đề kiểm tra/tài khoản/góp ý theo phạm vi, giữ các quyết định responsive đã được người dùng chốt trước đó. Search/chuông ở mockup không tự trở thành tính năng phải xây trong đợt này.
5. **Free/Premium:** flow mẫu chưa thể hiện ranh giới gói mới. Màn hình/API vẫn áp dụng bảng quyền trong brief: Free soạn/nhập theo mẫu/xuất đề; Premium thêm AI nhập tự do và kiểm tra online.
6. **Các màn hình cần bổ sung:** trong page này chưa có frame riêng cho yêu cầu/đặt lại/đổi mật khẩu, khôi phục nháp, xuất kết quả CSV, góp ý/admin xử lý, soạn đề kiểm tra đầy đủ, import Word/PDF/AI, xuất Word/PDF hoặc làm bài kiểm tra mới. hs-plan phải bao phủ các bước này theo brief và visual system, không coi link hoặc icon là thiết kế đầy đủ.

Thứ tự đối chiếu: quyết định chức năng và quyền đã xác nhận trong hội thoại → bằng chứng code và ràng buộc dữ liệu → tham chiếu flow/bố cục Figma. Nếu phát hiện khác biệt làm đổi sản phẩm/quyền, nêu rõ để chốt; không tự thêm hoặc bỏ tính năng từ nội dung Figma AI. Context thiết kế đã được đọc; không có quyết định sản phẩm mới cần hỏi chỉ vì người dùng bổ sung link tham chiếu.

## Options Considered

| Cách lưu nháp | Giả định | Khi không đáp ứng | Đánh đổi |
| --- | --- | --- | --- |
| Trình duyệt theo tài khoản/quiz — người dùng chọn | Mục tiêu chính là chống mất nội dung khi tải lại/đóng nhầm trên máy đang soạn | Đổi máy, xóa dữ liệu trình duyệt hoặc storage bị chặn | Ít phụ thuộc, không cần sync server, phải nói rõ phạm vi lưu và xử lý máy dùng chung |
| Đồng bộ nháp theo tài khoản | Cần tiếp tục soạn trên nhiều máy | Offline chưa đồng bộ hoặc hai máy ghi đồng thời | Cần persistence/RLS và giải quyết xung đột nhiều thiết bị; ngoài phạm vi đợt này |

## Decision

Thực hiện năm hạng mục đã xác nhận. Bốn hạng mục ban đầu giữ nguyên: tài khoản, nháp cục bộ, CSV kết quả và góp ý trong ứng dụng. CSV v1 là bản tổng hợp theo người chơi/học sinh cho một buổi hoặc một bài giao, không thêm XLSX hoặc báo cáo nhiều buổi. Khôi phục nháp được áp dụng phù hợp cho form soạn đề mới, vẫn chỉ trên trình duyệt hiện tại.

### Soạn đề kiểm tra và kiểm tra online

Mở rộng dựa trên cơ chế lớp, snapshot, mã truy cập và lượt làm của Bài đã giao. Bổ sung trải nghiệm soạn đề riêng với các phần, câu hỏi, điểm từng câu và thời lượng toàn bài; tổng điểm tính theo cấu hình giáo viên. Chấm tự động bằng đáp án đã được giáo viên xác nhận; trả lời ngắn dùng các đáp án chấp nhận và quy tắc chuẩn hóa rõ ràng, không chấm ngữ nghĩa tự luận bằng AI.

| Khả năng | Free | Premium |
| --- | --- | --- |
| Soạn đề trực tiếp, sửa cấu trúc/câu hỏi/đáp án/điểm | Có | Có |
| Nhập .docx/.pdf/.xlsx/.csv theo mẫu cấu trúc chuẩn | Có | Có |
| AI trích xuất đề bố cục tự do từ tệp có chữ | Không | Có |
| Xuất nội dung đề Word/PDF theo mẫu chung | Có | Có |
| Tạo/phát hành kiểm tra online | Không | Có |

Chỉ nhận .docx, .pdf có chữ, .xlsx và .csv ở bản đầu. .doc/.xls cũ cần chuyển sang định dạng hiện hành. Mẫu nhập chuẩn phải có tệp ví dụ và hướng dẫn cụ thể cho từng nhóm định dạng, bao gồm cách biểu diễn phần/câu/lựa chọn/đáp án/điểm. Free vẫn hỗ trợ Word/PDF khi đúng mẫu; không được thay yêu cầu đã chốt thành chỉ nhập Excel/CSV.

Hai luồng nhập cùng kết thúc bằng: tệp → đọc/nhận dạng → xem trước và đánh dấu chỗ thiếu/sai → giáo viên sửa câu, đáp án, điểm → lưu nháp đề. Thiếu đáp án cần bổ sung trước khi phát hành; AI không tự đoán đáp án chưa có trong nguồn. Bản nhập chưa kiểm tra không tự trở thành đề đã phát hành hoặc tài liệu RAG.

Đầu ra là câu hỏi có cấu trúc chỉnh sửa được và Word/PDF theo mẫu chung, không giữ bố cục nguồn. Xuất nội dung đề Word/PDF khác với xuất kết quả CSV. File đề cho học sinh không chứa khóa đáp án, điểm học sinh, mã truy cập hay dữ liệu riêng của buổi kiểm tra.

Kiểm tra online có thời lượng toàn bài, mốc mở/hạn nộp, lưu câu trả lời, nộp và chốt khi hết thời gian. Thời hạn và quyền sửa phải do server quyết định, không chỉ đồng hồ trình duyệt. Điểm/câu hỏi được chụp theo phiên bản lúc phát hành; sửa đề nguồn không thay nội dung hoặc chấm lại bài đã giao. Giữ tương thích với bài giao cũ và chính sách công bố kết quả hiện có.

AI dùng gateway/cấu hình nhà cung cấp hiện có, có kiểm tra Premium ở server và giới hạn riêng cho nạp đề. Không đồng nhất một tệp với một lượt chat hoặc hứa số lần nhập không giới hạn. Không tự tăng quota, đổi project hoặc bật dịch vụ trả phí. Quy trình nhận dạng tệp dài cần chịu được đóng tab/tải lại và hiển thị rõ đang chờ, đang xử lý, cần sửa, sẵn sàng hoặc lỗi; giới hạn tệp, số câu và ngân sách được hs-plan khảo sát và ghi rõ trước build.

Các chi tiết nhỏ dùng quy ước hiện có và được cụ thể hóa trong hs-plan. Việc cập nhật website đích cần một bước kiểm tra readiness và nghiệm thu riêng; yêu cầu dùng thử online không được coi là đã cho phép xóa, reset hoặc ghi đè môi trường thật.

## Reasoning

Nhóm nhỏ cần tự sử dụng và phản hồi được. Bốn tính năng đầu giải quyết mất quyền truy cập, mất nội dung đang soạn, khả năng lấy kết quả ra dùng và kênh báo vấn đề. Hạng mục đề kiểm tra phục vụ nhu cầu soạn và sử dụng đề thực tế; Free có lối nhập theo mẫu không phụ thuộc AI, Premium thêm AI đọc bố cục tự do và kiểm tra online. Dùng lại các luồng phù hợp giúp nghiệm thu độc lập và giữ dữ liệu hiện có. Không mở rộng sang quản lý nhiều trường, OCR hoặc AI tự tạo nội dung khi chưa có nhu cầu đã chốt.

## Acceptance Criteria

### Khôi phục và đổi mật khẩu

1. Giáo viên yêu cầu email khôi phục từ giao diện, nhận email trong môi trường nghiệm thu và đặt được mật khẩu mới qua link hợp lệ. Đăng nhập được bằng mật khẩu mới; mật khẩu cũ không còn đăng nhập được.
2. Người đã đăng nhập có entry point đổi mật khẩu với xác minh theo yêu cầu Supabase Auth; người không có quyền không được đổi mật khẩu tài khoản khác.
3. Link hết hạn, sai hoặc dùng lại được xử lý bằng thông báo và đường tiếp tục; không rơi vào vòng lặp callback. Yêu cầu gửi email không tiết lộ một địa chỉ có tồn tại trong hệ thống hay không.
4. Link online trỏ đúng origin `https://smartteachvn.vercel.app`, không về localhost; query `next` không cho chuyển tới origin bên ngoài. Không đưa token/mật khẩu vào log hoặc RAG.

### Nháp quiz trên trình duyệt

5. Với câu mới và câu đang sửa thuộc cả bốn loại hiện có, tải lại trang/đóng rồi mở lại trên cùng trình duyệt vẫn phát hiện bản nháp chưa lưu để khôi phục. Nội dung, đáp án và thời gian không lẫn giữa câu hoặc quiz.
6. Giáo viên có thể xem thời điểm nháp, chọn Khôi phục hoặc Bỏ nháp. Lưu câu thành công dọn đúng nháp; lưu thất bại giữ nội dung để thử lại. Có cảnh báo phù hợp khi rời trang với thay đổi chưa lưu.
7. Nháp tài khoản A không xuất hiện cho B. Khi chủ động đăng xuất mà còn nháp, nhắc rõ đăng xuất sẽ dọn nháp trên máy này, cho phép quay lại; sau đăng xuất thành công dọn vùng nháp của tài khoản đó. Phiên tự hết hạn không được hiểu thành người dùng đồng ý bỏ nháp: ngừng đọc/hiển thị cho đến khi xác minh lại đúng tài khoản. Không hứa bảo mật thiết bị chỉ bằng tên key localStorage.
8. Nháp cũ khác bản server hoặc có thay đổi từ tab khác không âm thầm ghi đè nội dung mới. Khi storage không khả dụng/hết chỗ, báo đúng và vẫn cho soạn/lưu theo luồng hiện có. Không hứa đồng bộ sang máy khác hoặc còn nháp sau khi xóa dữ liệu trình duyệt.

### CSV kết quả

9. Chủ phiên tải được CSV tổng hợp từ kết quả buổi quiz kết thúc; có thông tin nhận diện buổi, biệt danh, thứ hạng/trạng thái và số liệu điểm/câu trả lời phù hợp dữ liệu hiện có.
10. Chủ bài giao tải được CSV theo danh sách học sinh, trạng thái làm bài, câu đúng/tổng/điểm khi có và thời điểm nộp. Chưa bắt đầu/đang làm không bị ghi thành điểm 0 giả.
11. Excel đọc đúng tiếng Việt; dấu phẩy, dấu ngoặc kép và xuống dòng trong nội dung không làm lệch cột. Trường văn bản do người dùng nhập được xử lý để không chạy công thức CSV.
12. Người khác, kể cả admin không phải chủ dữ liệu, không được đọc hoặc xuất kết quả riêng. Không thêm token truy cập hoặc secret vào file. Đổi giới hạn retention hiện có không thuộc tính năng xuất.

### Góp ý cho quản trị viên

13. Giáo viên đang hoạt động gửi được báo lỗi/đề xuất từ khu vực giáo viên, nhận xác nhận thực và xem trạng thái góp ý của mình. Gửi lỗi mạng có thể thử lại mà không báo thành công giả hoặc nhân bản do double click.
14. Admin đọc được nội dung góp ý đã được chủ động gửi, lọc và cập nhật ba trạng thái xử lý. Giáo viên không xem được góp ý của người khác; việc hỗ trợ không mở thêm quyền đọc quiz/lớp/chat riêng.
15. Nội dung có giới hạn, kiểm tra đầu vào và bảo vệ lạm dụng phù hợp nhóm thử; hiển thị dưới dạng an toàn. Không tự thu transcript, mật khẩu, API key, mã truy cập học sinh hoặc URL có token.

### Toàn đợt dùng thử

16. Năm hạng mục dùng được bằng bàn phím và trên điện thoại/tablet/laptop theo design system hiện có. Thử bằng ít nhất hai tài khoản để xác minh tách dữ liệu.
17. Regression không làm hỏng đăng nhập Google/email, lưu quiz, chơi PIN, bài giao cũ và quyền thành viên ngoài phần mở rộng đã chốt. Chỉ có evidence cho feature mới không đủ chứng minh các module local khác đã triển khai online.
18. Trước cập nhật online, đối chiếu schema/build/config hiện tại, có backup/recovery phù hợp, kiểm email gửi tới nhóm thử và callback canonical. Không reset dữ liệu thật. Sau phát hành có smoke test chính website đích, không dùng kết quả localhost thay thế.
19. 2–3 giáo viên thử các luồng bằng dữ liệu được phép sử dụng; ghi lại bước vướng và góp ý. Chưa đặt thời hạn cố định hoặc tiêu chí số người dùng lớn cho dự án cá nhân.

### Soạn đề nhập tệp và kiểm tra online

20. Giáo viên Free soạn được đề, chia phần, thêm/sửa câu trắc nghiệm/trả lời ngắn, đáp án và điểm; đặt thời lượng và xem tổng điểm. Nháp chưa đầy đủ lưu được, nhưng không được phát hành với đáp án/điểm/cấu trúc không hợp lệ. Các dạng trắc nghiệm hiện có được tái sử dụng với luật chấm rõ ràng.
21. Có mẫu và tệp kiểm chứng cho cả .docx/.pdf có chữ/.xlsx/.csv. Free nhập đúng mẫu thành câu hỏi chỉnh sửa được, giữ tiếng Việt và đáp án. Tệp không đúng mẫu báo vị trí hoặc phần cần sửa, không âm thầm bỏ câu hoặc tự gọi AI.
22. Premium dùng AI nhập đề bố cục tự do trong cùng phạm vi tệp có chữ. Có thông báo nội dung được gửi tới nhà cung cấp và bước người dùng chủ động bắt đầu. Giáo viên xem/sửa kết quả trước khi lưu hoặc phát hành; thiếu đáp án được đánh dấu thay vì AI tự suy khóa chấm. Nguồn/tài liệu không được phép chia sẻ không được ngầm đưa vào RAG.
23. Chặn AI import và tạo/phát hành kiểm tra online của Free ở cả UI, API và quyền dữ liệu/RPC, không chỉ ẩn nút. Hết Premium không hủy quyền học sinh đang làm bài đã phát hành hoặc cấm giáo viên đọc kết quả theo chính sách hiện có; không được tự gọi thêm AI khi không còn quyền hợp lệ.
24. Tệp scan, không có chữ, chứa nội dung ngoài phạm vi hoặc vượt giới hạn có thông báo rõ. Giới hạn tài nguyên được cưỡng chế trước cấp phát lớn hoặc gọi AI; không hứa đọc hình/công thức. Lỗi quota/timeout/đọc tệp không tạo thông báo thành công hoặc bản đề thiếu nội dung nhưng tưởng hoàn chỉnh.
25. Word xuất ra chỉnh sửa được; PDF có chữ tiếng Việt đọc/chọn được, có phân trang hợp lý. Cả hai phản ánh cùng phiên bản cấu trúc đề, phần/câu/điểm/thời lượng đã chọn. Bản học sinh không có đáp án; bản đáp án riêng chỉ giáo viên có quyền tải. Không cam kết giống bố cục tệp nhập.
26. Premium phát hành kiểm tra cho lớp và cấp mã riêng theo luồng đang có. Học sinh làm được trên điện thoại/laptop, lưu câu trả lời và tiếp tục trong thời gian cho phép; tải lại trang hoặc chỉnh đồng hồ máy không làm tăng thời gian. Server chốt hết giờ/hạn nộp và không nhận sửa sau khi nộp hoặc bị chốt.
27. Chấm tự động chính xác theo snapshot, đáp án chấp nhận và điểm mỗi câu. Hiển thị tách số câu đúng/tổng câu với điểm theo trọng số. Gửi/nộp lặp không nhân đôi lượt hoặc điểm; giữ quy tắc công bố đáp án/điểm đã chọn. Không sửa điểm các bài giao cũ do cập nhật cấu trúc đề mới.
28. CSV của kiểm tra mới xuất đúng điểm/trạng thái nộp của snapshot, không mặc định điểm bằng số câu đúng. Không lộ dữ liệu giữa giáo viên, file nhập riêng, khóa đáp án, mã truy cập hoặc nội dung đề riêng qua nguồn RAG, admin hay log.
29. Tác vụ AI nhập đề không bị mất chỉ vì đóng tab; trạng thái và cách xử lý lỗi có thể xem lại. Retry có giới hạn, không âm thầm gọi lại vô hạn hoặc tạo nhiều bản đề. Bộ dữ liệu nghiệm thu gồm đề theo mẫu và đề tự do có đáp án thật do giáo viên kiểm tra; không lấy kết quả mock làm bằng chứng độ chính xác nhận dạng thật.
30. Khi lập kế hoạch/triển khai có ánh xạ màn hình mới với node Figma liên quan hoặc ghi rõ màn hình chưa có mẫu; nghiệm thu flow nhập/xem trước/lỗi và các kích thước tương ứng. Không dùng mẫu Figma cũ để vô hiệu hóa Word/PDF, loại câu, nháp cục bộ hoặc quyền Free/Premium đã chốt; trạng thái lưu phải phản ánh đúng nơi dữ liệu đã được lưu.

## Open Questions / Risks

Không còn câu hỏi sản phẩm chặn lập kế hoạch: năm hạng mục, nhóm dùng thử, website, nháp cục bộ, loại câu, tập định dạng có chữ, nhận dạng theo mẫu/AI, đầu ra chuẩn hóa và ranh giới Free/Premium đã được chốt. Các điểm sau là phụ thuộc và kiểm tra kỹ thuật/vận hành, không được đánh dấu sẵn sàng nếu chưa có evidence:

- Website hiện triển khai từ nhánh/build nào, dùng Supabase project nào và migration nào đã áp chưa được xác minh. Không mặc định dữ liệu/cấu hình giống local hoặc dùng tài khoản local để thao tác production.
- SMTP, template mail và allowlist redirect của Supabase online chưa được kiểm tra. Phải xác nhận khả năng gửi recovery tới đúng 2–3 giáo viên trước dùng thử; nhà cung cấp và secret mail được cấu hình qua quy trình vận hành nếu môi trường chưa có.
- Local đã có thay đổi quản trị/RAG/membership và migration mới ngoài phạm vi đợt dùng thử. Candidate nâng online phải được đối chiếu và review đầy đủ, không gom mọi thay đổi chưa kiểm vào một lần deploy.
- Nháp local phụ thuộc trình duyệt và dung lượng; plan cần xác định giới hạn payload theo các loại câu hiện có, cách thực hiện chính sách dọn đã chọn và chống ghi đè giữa tab theo AC 5–8. Không tự thêm cơ chế hết hạn âm thầm làm mất nháp.
- CSV rời ứng dụng trở thành dữ liệu do giáo viên giữ trên thiết bị; ứng dụng không thể thu hồi file đã tải. Thông tin nhạy cảm chỉ xuất khi thuộc quyền giáo viên.
- Supabase Auth policy và tài nguyên môi trường online có thể khác local. hs-plan cần đối chiếu tài liệu Next.js cài trong repo và tài liệu Supabase chính thức khi cụ thể hóa recovery, không suy API từ trí nhớ.
- Parser theo mẫu cần được thiết kế và nghiệm thu trên cả bốn định dạng; PDF có chữ vẫn có thể sai thứ tự đọc. hs-plan phải chỉ rõ cách báo chỗ không nhận dạng được và bộ tệp kiểm chứng, không suy bộ trích xuất chữ là parser đề hoàn chỉnh.
- Import AI cần quota/ngân sách/giới hạn đầu ra và tác vụ nền phù hợp giới hạn hosting; chi tiết này chưa tồn tại chỉ vì đã kết nối Gemini thành công. Các lựa chọn thư viện xuất DOCX/PDF và phiên bản API cần khảo sát nguồn chính thức trong hs-plan. Không thay embedding model của RAG để triển khai nhận dạng đề.
- Cần cập nhật nội dung gói thành viên, CTA, hướng dẫn và tài liệu RAG liên quan để phản ánh Free soạn/nhập mẫu/xuất đề, Premium thêm online/AI. Chỉ cập nhật khi hành vi thực sự đã triển khai; chưa mô tả là tính năng đang có trong bản online cũ.
- Chưa triển khai code năm hạng mục, chưa gửi email thử hoặc cập nhật website trong brainstorm này. Bước tiếp theo là hs-plan, sau đó mới hs-build và nghiệm thu/ship theo phạm vi được cho phép.
