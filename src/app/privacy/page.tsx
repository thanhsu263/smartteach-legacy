import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Quyền riêng tư",
  description: "SmartTeach lưu những dữ liệu nào, để làm gì, ở đâu và cách xoá.",
};

export default function PrivacyPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header>
        <h1 className={styles.title}>Quyền riêng tư</h1>
        <p className={styles.lead}>
          {siteConfig.name} lưu rất ít dữ liệu. Trang này nói rõ lưu gì, để làm gì, ở đâu và thầy cô xoá thế nào.
        </p>
      </header>

      {siteConfig.privacyReviewed ? null : (
        <p role="note" className={styles.draft}>
          Bản nháp, chưa được chủ dự án duyệt. Nội dung dưới đây mô tả cách ứng dụng đang hoạt động, chưa phải văn bản pháp lý.
        </p>
      )}

      <section aria-labelledby="who" className={styles.section}>
        <h2 id="who" className={styles.heading}>
          Học sinh và khách
        </h2>
        <p>
          Học sinh không cần tài khoản. Khi dùng kho game và các tiện ích (đồng hồ, bốc thăm, chia nhóm, bảng trắng) mà chưa
          đăng nhập, {siteConfig.name} không lưu gì lên máy chủ: tên thầy cô nhập vào ô danh sách và nét vẽ trên bảng
          trắng chỉ nằm trong trình duyệt, mất khi tải lại trang.
        </p>
      </section>

      <section aria-labelledby="teacher" className={styles.section}>
        <h2 id="teacher" className={styles.heading}>
          Giáo viên có tài khoản
        </h2>
        <p>Khi thầy cô đăng ký hoặc đăng nhập, ứng dụng lưu:</p>
        <ul className={styles.list}>
          <li>
            <strong>Email</strong> (và mã định danh tài khoản nếu thầy cô đăng nhập bằng Google), để nhận ra tài khoản.
          </li>
          <li>
            <strong>Tên các lớp</strong> và <strong>tên học sinh</strong> trong từng lớp mà thầy cô tự nhập, để dùng lại cho bốc thăm
            và chia nhóm.
          </li>
          <li>
            <strong>Các game thầy cô đánh dấu yêu thích.</strong>
          </li>
        </ul>
        <p>
          Chỉ tài khoản đã tạo ra dữ liệu mới xem và sửa được dữ liệu đó. Cơ sở dữ liệu có quy tắc riêng chặn tài khoản khác đọc hay
          sửa, không chỉ ẩn trên giao diện.
        </p>
      </section>

      <section aria-labelledby="students" className={styles.section}>
        <h2 id="students" className={styles.heading}>
          Tên học sinh
        </h2>
        <p>
          Với học sinh, ứng dụng chỉ lưu tên mà thầy cô gõ vào, không lưu ngày sinh, ảnh, điểm số hay thông tin nào khác. Thầy cô nên chỉ
          nhập những gì cần để gọi tên trong lớp (ví dụ tên gọi hoặc số thứ tự nếu không muốn dùng họ tên đầy đủ), và nên cân nhắc
          việc cho phép lưu tên học sinh theo quy định của trường.
        </p>
      </section>

      <section aria-labelledby="where" className={styles.section}>
        <h2 id="where" className={styles.heading}>
          Dữ liệu được lưu ở đâu
        </h2>
        <p>
          Dữ liệu tài khoản nằm trong cơ sở dữ liệu của dịch vụ Supabase mà dự án này sử dụng, và trang web được phục vụ qua dịch vụ
          lưu trữ web của dự án. Máy chủ có thể ghi nhật ký kỹ thuật thông thường (địa chỉ truy cập, thời điểm) để vận hành và chống lạm dụng.
        </p>
      </section>

      <section aria-labelledby="cookies" className={styles.section}>
        <h2 id="cookies" className={styles.heading}>
          Cookie và theo dõi
        </h2>
        <p>
          {siteConfig.name} chỉ dùng cookie phiên đăng nhập cần thiết để giữ thầy cô đăng nhập. Ứng dụng không có quảng cáo và không dùng
          công cụ theo dõi hay phân tích hành vi.
        </p>
      </section>

      <section aria-labelledby="game" className={styles.section}>
        <h2 id="game" className={styles.heading}>
          Game do bên khác cung cấp
        </h2>
        <p>
          Một số game được nhúng từ trang của bên khác (ví dụ quyentran.online). Trang đó có cách lưu dữ liệu riêng trên trình duyệt (như
          danh sách lớp thầy cô nhập trong game). {siteConfig.name} không gửi danh sách lớp đã lưu của thầy cô sang các game đó.
        </p>
      </section>

      <section aria-labelledby="delete" className={styles.section}>
        <h2 id="delete" className={styles.heading}>
          Xoá dữ liệu
        </h2>
        <p>
          Thầy cô xoá được từng học sinh, từng lớp và bỏ yêu thích ngay trong ứng dụng, ở mục Lớp của tôi. Khi xoá lớp thì danh sách học
          sinh của lớp cũng bị xoá.
        </p>
        <p>
          {siteConfig.contactEmail ? (
            <>
              Muốn xoá toàn bộ tài khoản, thầy cô gửi yêu cầu tới{" "}
              <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
            </>
          ) : (
            "Hiện chưa có chức năng tự xoá tài khoản trong ứng dụng; địa chỉ liên hệ để yêu cầu xoá tài khoản sẽ được cập nhật ở đây."
          )}
        </p>
      </section>

      <p className={styles.updated}>Cập nhật lần cuối: 19/10/2026.</p>
    </div>
  );
}
