import Link from "next/link";
import { CheckIcon, ClockIcon, ExternalLinkIcon, GamepadIcon, LogoMark, PencilIcon, UsersIcon } from "@/components/icons";
import { LandingHeader } from "@/components/landing-header";
import { LandingHeroClassroom } from "@/components/landing-hero-classroom";
import { siteConfig } from "@/config/site";
import { tools } from "@/data/tools";
import styles from "./page.module.css";

const features = [
  { title: "Lớp học gọn gàng", text: "Lưu danh sách học sinh, bốc thăm và chia nhóm trong cùng một nơi.", href: "/my-classes", kind: "class" },
  { title: "Quiz đầy hứng khởi", text: "Soạn câu hỏi, mở phòng bằng PIN và nhận phản hồi tức thì từ cả lớp.", href: "/my-quizzes", kind: "quiz" },
  { title: "Tiện ích thiết thực", text: "Đồng hồ, bảng trắng và các công cụ luôn sẵn sàng khi đứng lớp.", href: "/tools", kind: "tools" },
  { title: "Học mà như chơi", text: "Biến hoạt động ôn tập thành một trải nghiệm chung đầy năng lượng.", href: "/games", kind: "game" },
] as const;

const resources = [
  { subject: "TOÁN HỌC", title: "Chinh phục phân số", meta: "Lớp 6 · 20 câu hỏi", tone: "blue", art: "⅔ + ⅙ = ?" },
  { subject: "TIẾNG ANH", title: "Everyday English", meta: "Lớp 7 · 15 câu hỏi", tone: "yellow", art: "Hello, world!" },
  { subject: "KHOA HỌC", title: "Thế giới vật chất quanh ta", meta: "Lớp 6 · 25 câu hỏi", tone: "purple", art: "H₂O" },
] as const;

const faqs = [
  ["Tôi có thể dùng SmartTeach miễn phí không?", "Có. Thầy cô có thể dùng kho game và tiện ích miễn phí, đồng thời tạo lớp và quiz sau khi đăng nhập."],
  ["Học sinh có cần tạo tài khoản để chơi quiz không?", "Không. Học sinh chỉ cần mã PIN do giáo viên cung cấp để tham gia."],
  ["Tôi có thể sử dụng lại câu hỏi và lớp học không?", "Có. Quiz và danh sách lớp đã lưu có thể được mở lại cho những buổi học tiếp theo."],
  ["SmartTeach có dùng được trên điện thoại không?", "Có. Giao diện hoạt động trên điện thoại, máy tính bảng và máy tính."],
] as const;

function Arrow() { return <span aria-hidden="true">→</span>; }

export default function HomePage() {
  return <div className={styles.landing}>
    <LandingHeader
      brand={<Link href="/" className={styles.brand} aria-label={siteConfig.name}><LogoMark size={36} /><span>{siteConfig.name}</span></Link>}
      account={<div className={styles.accountActions}><Link href="/login">Đăng nhập</Link><Link className={styles.primarySmall} href="/login">Bắt đầu miễn phí</Link></div>}
    />

    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.pill}>✦ Một không gian. Muôn cách học hay.</p>
        <h1>Bật hứng khởi.<span>Mở tri thức.</span></h1>
        <p className={styles.heroLead}>Từ quản lý lớp học, tạo quiz đến trò chơi và tiện ích — biến mỗi tiết học thành một trải nghiệm đáng mong chờ.</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/my-classes">Tạo lớp học miễn phí <Arrow /></Link>
          <a className={styles.secondary} href="#tinh-nang">Khám phá bản demo</a>
        </div>
        <div className={styles.reassurance}>
          <span><CheckIcon size={14} /> Không cần thẻ tín dụng</span>
          <span><CheckIcon size={14} /> Sẵn sàng trong 2 phút</span>
        </div>
      </div>
      <LandingHeroClassroom />
    </section>

    <section className={styles.trust} aria-label="Lợi ích nền tảng"><div><b>Ít thao tác. Nhiều cảm hứng.</b><span>Được tạo ra cho nhịp lớp học.</span></div><div><span className={styles.trustIcon}>▦</span><p><b>4 công cụ, 1 nền tảng</b><span>Mọi thứ cần thiết</span></p></div><div><span className={styles.trustIcon}>A</span><p><b>100% tiếng Việt</b><span>Thân thiện, dễ làm quen</span></p></div><div><span className={styles.trustIcon}>▣</span><p><b>Học ở mọi nơi</b><span>Máy tính, tablet, điện thoại</span></p></div></section>

    <section id="tinh-nang" className={styles.section}><div className={styles.sectionIntro}><p className={styles.label}>ĐẦY HỨNG KHỞI · HỌC CHỦ ĐỘNG</p><h2 tabIndex={-1}>Mọi điều lớp học cần. Trong một nơi.</h2><p>Không cần chuyển qua nhiều ứng dụng. SmartTeach kết nối trọn vẹn hành trình dạy và học.</p></div><div className={styles.featureGrid}>{features.map(item => <article key={item.title} className={styles.featureCard}><div className={styles.preview} data-kind={item.kind}>{item.kind === "class" ? <UsersIcon size={48} /> : item.kind === "quiz" ? <PencilIcon size={48} /> : item.kind === "tools" ? <ClockIcon size={48} /> : <GamepadIcon size={48} />}</div><div className={styles.featureCopy}><h3>{item.title}</h3><p>{item.text}</p>{item.kind === "tools" ? <ul className={styles.toolLinks}>{tools.map(tool => <li key={tool.id}><Link href={tool.href}>{tool.title}</Link></li>)}</ul> : null}<Link href={item.href}>Khám phá <ExternalLinkIcon size={14} /></Link></div></article>)}</div></section>

    <section id="giao-vien" className={`${styles.splitSection} ${styles.softBlue}`}><div className={styles.splitCopy}><p className={styles.label}>KHÔNG GIAN CỦA GIÁO VIÊN</p><h2 tabIndex={-1}>Nắm nhịp cả lớp.<br />Chạm tới từng em.</h2><p>Bắt đầu gọn gàng, tổ chức bài giảng đồng bộ và hiểu lớp đang cần gì tiếp theo.</p><ul><li><CheckIcon size={16} />Giao việc chỉ với vài thao tác</li><li><CheckIcon size={16} />Kết quả và tiến độ rõ ràng</li><li><CheckIcon size={16} />Theo dõi hoạt động trong từng tiết</li></ul><Link href="/my-classes">Khám phá quản lý lớp học <Arrow /></Link></div><div className={styles.dashboard}><aside><b>Lớp học</b><span>Tổng quan</span><span>Học sinh</span><span>Hoạt động</span></aside><div><header><strong>Lớp Toán 6A</strong><button type="button">+ Thêm hoạt động</button></header><div className={styles.metrics}><span><b>32</b>Học sinh</span><span><b>87%</b>Hoàn thành</span><span><b>8,4</b>Điểm trung bình</span></div><h3>Tiến độ gần đây</h3>{["Ôn tập số nguyên", "Quiz phân số", "Đấu trường tri thức"].map((x, i) => <p className={styles.activity} key={x}>{x}<i style={{ width: `${88 - i * 18}%` }} /></p>)}</div></div></section>

    <section id="cach-dung" className={styles.section}><div className={styles.sectionIntro}><p className={styles.label}>BẮT ĐẦU THẬT ĐƠN GIẢN</p><h2 tabIndex={-1}>Từ ý tưởng đến tiết học hay, chỉ 3 bước.</h2></div><ol className={styles.steps}><li><b>01</b><h3>Tạo lớp, mời cả lớp</h3><p>Thêm học sinh hoặc dùng lớp đã lưu.</p></li><li><b>02</b><h3>Chọn bài, thêm chất riêng</h3><p>Tạo quiz, chọn game hoặc tiện ích phù hợp.</p></li><li><b>03</b><h3>Cùng học, thấy tiến bộ</h3><p>Mở hoạt động và quan sát phản hồi tức thì.</p></li></ol></section>

    <section id="hoc-lieu" className={`${styles.section} ${styles.library}`}><div className={styles.libraryHead}><div><p className={styles.label}>KHO HỌC LIỆU ĐÃ DUYỆT</p><h2 tabIndex={-1}>Một ý tưởng hay, ngàn cách bắt đầu.</h2><p>Khám phá quiz đã qua kiểm duyệt, rồi tạo một bản sao riêng cho lớp của thầy cô.</p></div><Link className={styles.secondary} href="/library">Khám phá kho học liệu <Arrow /></Link></div><div className={styles.filters}><span data-active>Đã kiểm duyệt</span><span>Toán học</span><span>Tiếng Anh</span><span>Khoa học</span></div><div className={styles.resourceGrid}>{resources.map(item => <article className={styles.resourceCard} key={item.title}><div className={styles.resourceArt} data-tone={item.tone}><small>{item.subject}</small><strong>{item.art}</strong></div><div><span>{item.meta}</span><h3>{item.title}</h3><Link href="/library" aria-label={`Mở kho học liệu`}><Arrow /></Link></div></article>)}</div></section>

    <section className={styles.gameSection}><div className={styles.gameCopy}><p className={styles.label}>KHI KIẾN THỨC THÀNH CUỘC PHIÊU LƯU</p><h2>Không chỉ đúng đáp án.<span>Cả lớp cùng bật mood!</span></h2><p>Một chút thử thách, một chút thi đua và thật nhiều tiếng cười. Biến quiz quen thuộc thành trò chơi mà học sinh muốn chơi thêm.</p><div className={styles.modeList}><span>Cá nhân</span><span>Đấu đội</span><span>Tự luyện</span></div><Link className={styles.yellowButton} href="/games">Thử một trò chơi <Arrow /></Link></div><div className={styles.podium}><header><b>⚑ Đường đua tri thức</b><span>32 người đang chơi</span></header><p>VÒNG 3 · TĂNG TỐC</p><h3>Ai sẽ về đích đầu tiên?</h3><div>{[["HN", "2"], ["MA", "1"], ["NL", "3"]].map(([name, rank]) => <span key={name} data-rank={rank}><i>{name}</i><b>{rank}</b></span>)}</div></div></section>

    <section className={styles.audience}><div><p className={styles.label}>HAI GÓC NHÌN · MỘT MỤC TIÊU</p><h2>Thầy cô nhẹ việc.<br />Học trò chủ động.</h2><p>Công nghệ không thay thế người thầy. SmartTeach tạo thêm không gian để thầy cô và học sinh kết nối.</p></div><article><PencilIcon size={30} /><small>Dành cho giáo viên</small><h3>Dạy theo cách của bạn</h3><p>Chủ động thiết kế bài học, tái sử dụng học liệu và hiểu rõ năng lực của lớp.</p><b>Bạn dẫn dắt. SmartTeach hỗ trợ.</b></article><article><UsersIcon size={30} /><small>Dành cho học sinh</small><h3>Học theo nhịp của mình</h3><p>Tham gia nhanh, nhận phản hồi rõ ràng và học qua những hoạt động vui.</p><b>Mỗi em đều có cơ hội tiến bộ.</b></article></section>

    <section className={`${styles.section} ${styles.paths}`}><div className={styles.sectionIntro}><p className={styles.label}>SẴN SÀNG ĐỂ BẮT ĐẦU</p><h2>Khởi đầu miễn phí. Lớn lên cùng lớp học.</h2><p>Chọn việc thầy cô muốn làm ngay hôm nay.</p></div><div className={styles.pathGrid}><article><h3>Khởi đầu</h3><strong>0đ</strong><p>Khám phá game và công cụ lớp học.</p><Link className={styles.secondary} href="/tools">Bắt đầu miễn phí</Link><ul><li><CheckIcon size={16} />Tiện ích lớp học</li><li><CheckIcon size={16} />Kho game miễn phí</li></ul></article><article data-featured><span>ĐƯỢC DÙNG NHIỀU</span><h3>Giáo viên</h3><strong>Miễn phí</strong><p>Tạo quiz và lưu lớp để dùng lại.</p><Link className={styles.primary} href="/login">Đăng nhập</Link><ul><li><CheckIcon size={16} />Tạo và quản lý quiz</li><li><CheckIcon size={16} />Lưu danh sách lớp</li></ul></article><article><h3>Vào lớp</h3><strong>Dùng PIN</strong><p>Học sinh tham gia không cần tài khoản.</p><Link className={styles.secondary} href="/play">Nhập mã PIN</Link><ul><li><CheckIcon size={16} />Tham gia nhanh</li><li><CheckIcon size={16} />Phản hồi trực tiếp</li></ul></article></div></section>

    <section className={styles.faq}><div><p className={styles.label}>HỎI · ĐÁP ĐƠN GIẢN</p><h2>Một vài điều<br />bạn có thể muốn biết.</h2><p>Không tìm thấy điều bạn cần? Xem thêm ở trang quyền riêng tư và hướng dẫn.</p><Link href="/privacy">Tìm hiểu quyền riêng tư <Arrow /></Link></div><div>{faqs.map(([q, a], index) => <details key={q} open={index === 0}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>

    <section className={styles.finalCta}><h2>Tiết học tiếp theo,<br />bật cảm hứng mới.</h2><p>Một tài khoản miễn phí. Một lớp học đầy khả năng.</p><div className={styles.actions}><Link className={styles.yellowButton} href="/login">Bắt đầu cùng SmartTeach <Arrow /></Link><Link className={styles.whiteButton} href="/play">Tôi là học sinh · Vào lớp</Link></div><small>Miễn phí để bắt đầu · Không cần thẻ tín dụng</small></section>

    <footer className={styles.footer}><div className={styles.footerBrand}><p><LogoMark size={36} /> <b>{siteConfig.name}</b></p><span>Bật hứng khởi. Mở tri thức.<br />Không gian cho những tiết học hay.</span></div><div><b>Sản phẩm</b><Link href="/my-classes">Quản lý lớp học</Link><Link href="/my-quizzes">Tạo quiz</Link><Link href="/games">Trò chơi học tập</Link></div><div><b>Khám phá</b><Link href="/tools">Tiện ích</Link><a href="#hoc-lieu">Kho học liệu</a><Link href="/privacy">Quyền riêng tư</Link></div><div><b>Tài khoản</b><Link href="/login">Đăng nhập</Link><Link href="/play">Vào lớp bằng PIN</Link></div><p className={styles.copyright}>© {siteConfig.copyrightYear} {siteConfig.name}. Cùng học, cùng tiến bộ.</p></footer>
  </div>;
}
