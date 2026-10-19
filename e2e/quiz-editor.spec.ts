import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

// Cần stack Supabase cục bộ: `npm run supabase:start` rồi `npm run supabase:env`.
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  "Chưa có Supabase cục bộ (npm run supabase:start && npm run supabase:env)",
);

const password = "e2e-password-123";
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
  expect(summary, `${label}: vi phạm WCAG`).toEqual([]);
}

async function register(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await page.getByLabel("Email").fill(`quiz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@example.test`);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page).toHaveURL(/\/my-classes$/);
}

async function newTeacher(browser: Browser, viewport = { width: 1280, height: 800 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await register(page);
  return { context, page };
}

async function createQuiz(page: Page, title: string) {
  await page.goto("/my-quizzes");
  await page.getByLabel("Tên quiz").filter({ visible: true }).fill(title);
  await page.getByRole("button", { name: "Tạo quiz" }).click();
  await expect(page).toHaveURL(new RegExp(`/my-quizzes/${UUID}$`));
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

async function addSingle(page: Page, prompt: string, options: string[], correct: number) {
  await page.getByRole("button", { name: "Thêm: Trắc nghiệm một đáp án" }).click();
  await page.getByLabel("Câu hỏi", { exact: true }).fill(prompt);
  const letters = ["A", "B", "C", "D"];
  for (const [index, label] of options.entries()) {
    await page.getByLabel(`Lựa chọn ${letters[index]}`, { exact: true }).fill(label);
  }
  await page.getByLabel(`Lựa chọn ${letters[correct]} là đáp án đúng`).check();
  await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
  await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();
}

test.describe("soạn quiz", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("khách vào trang quiz hoặc link chia sẻ thì được chuyển tới đăng nhập", async ({ page }) => {
    const id = "11111111-1111-4111-8111-111111111111";
    await page.goto("/my-quizzes");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy-quizzes$/);
    await page.goto(`/my-quizzes/${id}`);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Fmy-quizzes%2F${id}$`));
    await page.goto(`/shared/quiz/${id}`);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Fshared%2Fquiz%2F${id}$`));
  });

  test("tạo quiz, thêm đủ bốn dạng câu hỏi, sửa, đổi thứ tự và xoá", async ({ page }) => {
    await register(page);
    await page.goto("/my-quizzes");
    await expect(page.getByText("Thầy cô chưa có quiz nào")).toBeVisible();

    // Tên rỗng bị chặn, không tạo quiz.
    await page.getByLabel("Tên quiz").filter({ visible: true }).fill("   ");
    await page.getByRole("button", { name: "Tạo quiz" }).click();
    await expect(page).toHaveURL(/\/my-quizzes$/);
    await expect(page.getByRole("alert").filter({ hasText: "tên quiz" })).toBeVisible();

    await createQuiz(page, "Ôn tập chương 1");
    await expect(page.getByRole("heading", { name: "Cần sửa trước khi chơi" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Quiz chưa có câu hỏi nào." })).toBeVisible();

    // Lưu thiếu nội dung thì báo lỗi ở đúng trường, nội dung đã gõ không mất.
    await page.getByRole("button", { name: "Thêm: Trắc nghiệm một đáp án" }).click();
    await page.getByLabel("Lựa chọn A", { exact: true }).fill("Hà Nội");
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByText("Nhập nội dung câu hỏi.")).toBeVisible();
    await expect(page.getByText("Nhập nội dung lựa chọn.").first()).toBeVisible();
    await expect(page.getByLabel("Lựa chọn A", { exact: true })).toHaveValue("Hà Nội");

    // Một đáp án: chọn đáp án mới thì bỏ đáp án cũ.
    await page.getByLabel("Câu hỏi", { exact: true }).fill("Thủ đô của Việt Nam là gì?");
    await page.getByLabel("Lựa chọn B", { exact: true }).fill("Huế");
    await page.getByLabel("Lựa chọn C", { exact: true }).fill("Đà Nẵng");
    await page.getByLabel("Lựa chọn D", { exact: true }).fill("Cần Thơ");
    await page.getByLabel("Lựa chọn A là đáp án đúng").check();
    await page.getByLabel("Lựa chọn B là đáp án đúng").check();
    await expect(page.getByLabel("Lựa chọn A là đáp án đúng")).not.toBeChecked();
    await page.getByLabel("Lựa chọn A là đáp án đúng").check();
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();

    // Đúng/sai: hai nhãn cố định.
    await page.getByRole("button", { name: "Thêm: Đúng hoặc sai" }).click();
    await page.getByLabel("Câu hỏi", { exact: true }).fill("Trái Đất quay quanh Mặt Trời.");
    await page.getByLabel("Đúng là đáp án đúng").check();
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();

    // Nhiều đáp án đúng.
    await page.getByRole("button", { name: "Thêm: Nhiều đáp án đúng" }).click();
    await page.getByLabel("Câu hỏi", { exact: true }).fill("Số nào là số chẵn?");
    await page.getByLabel("Lựa chọn A", { exact: true }).fill("2");
    await page.getByLabel("Lựa chọn B", { exact: true }).fill("3");
    await page.getByLabel("Lựa chọn C", { exact: true }).fill("4");
    await page.getByLabel("Lựa chọn D", { exact: true }).fill("5");
    await page.getByLabel("Lựa chọn A là đáp án đúng").check();
    await page.getByLabel("Lựa chọn C là đáp án đúng").check();
    await expect(page.getByLabel("Lựa chọn A là đáp án đúng")).toBeChecked();
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();

    // Điền từ ngắn: nhiều đáp án, giữ dấu tiếng Việt.
    await page.getByRole("button", { name: "Thêm: Điền từ ngắn" }).click();
    await page.getByLabel("Câu hỏi", { exact: true }).fill("Thủ đô của Pháp là gì?");
    await page.getByLabel("Đáp án chấp nhận 1", { exact: true }).fill("Paris");
    await page.getByRole("button", { name: "Thêm đáp án" }).click();
    await page.getByLabel("Đáp án chấp nhận 2", { exact: true }).fill("Pa-ri");
    await page.getByLabel("Chấp nhận cả đáp án gõ không dấu").check();
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Câu hỏi (4 / 50)" })).toBeVisible();
    await expect(page.getByText("Quiz đã đủ để chơi: mọi câu hỏi đều hợp lệ.")).toBeVisible();

    // Mở lại câu đã lưu thì thấy đúng nội dung; sửa và lưu.
    await page.getByRole("button", { name: /Câu 4.*Thủ đô của Pháp/ }).click();
    await expect(page.getByLabel("Đáp án chấp nhận 2", { exact: true })).toHaveValue("Pa-ri");
    await expect(page.getByLabel("Chấp nhận cả đáp án gõ không dấu")).toBeChecked();
    await page.getByLabel("Câu hỏi", { exact: true }).fill("Thủ đô nước Pháp là gì?");
    await page.getByRole("button", { name: "Lưu câu hỏi" }).click();
    await expect(page.getByText("Đã lưu câu hỏi.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Câu 4.*Thủ đô nước Pháp/ })).toBeVisible();

    // Đổi thứ tự: câu 4 lên đầu.
    await page.getByRole("button", { name: "Chuyển câu 4 lên trên" }).click();
    await expect(page.getByRole("button", { name: /Câu 3.*Thủ đô nước Pháp/ })).toBeVisible();
    await page.getByRole("button", { name: "Chuyển câu 3 lên trên" }).click();
    await expect(page.getByRole("button", { name: /Câu 2.*Thủ đô nước Pháp/ })).toBeVisible();
    await page.getByRole("button", { name: "Chuyển câu 2 lên trên" }).click();
    await expect(page.getByRole("button", { name: /Câu 1.*Thủ đô nước Pháp/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chuyển câu 1 lên trên" })).toBeDisabled();

    // Thứ tự được lưu lại sau khi tải lại trang.
    await page.reload();
    await expect(page.getByRole("button", { name: /Câu 1.*Thủ đô nước Pháp/ })).toBeVisible();

    // Xoá cần xác nhận; "Giữ lại" thì không xoá.
    await page.getByRole("button", { name: "Xoá câu 1", exact: true }).click();
    await page.getByRole("button", { name: "Giữ lại" }).click();
    await expect(page.getByRole("heading", { name: "Câu hỏi (4 / 50)" })).toBeVisible();
    await page.getByRole("button", { name: "Xoá câu 1", exact: true }).click();
    await page.getByRole("button", { name: "Xoá câu này" }).click();
    await expect(page.getByText("Đã xoá câu 1.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Câu hỏi (3 / 50)" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Thủ đô nước Pháp/ })).toHaveCount(0);
  });

  test("câu thiếu đáp án đúng vẫn lưu được nhưng quiz báo chưa chơi được", async ({ page }) => {
    await register(page);
    await createQuiz(page, "Quiz nháp");
    await page.getByRole("button", { name: "Thêm: Trắc nghiệm một đáp án" }).click();
    await page.getByLabel("Câu hỏi", { exact: true }).fill("Câu chưa chọn đáp án");
    await page.getByLabel("Lựa chọn A", { exact: true }).fill("Một");
    await page.getByLabel("Lựa chọn B", { exact: true }).fill("Hai");
    await page.getByLabel("Lựa chọn C", { exact: true }).fill("Ba");
    await page.getByLabel("Lựa chọn D", { exact: true }).fill("Bốn");
    await expect(page.getByRole("list", { name: "Còn thiếu để chơi được" })).toContainText("Cần chọn đúng một đáp án đúng.");
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cần sửa trước khi chơi" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Câu 1: cần chọn đúng một đáp án đúng." })).toBeVisible();
  });

  test("lưu thất bại vì mất mạng thì giữ nguyên nội dung đang gõ và lưu lại được", async ({ page }) => {
    await register(page);
    await createQuiz(page, "Quiz mất mạng");
    await page.getByRole("button", { name: "Thêm: Điền từ ngắn" }).click();
    await page.getByLabel("Câu hỏi", { exact: true }).fill("Nội dung dài đã gõ");
    await page.getByLabel("Đáp án chấp nhận 1", { exact: true }).fill("đáp án");

    await page.route("**/rest/v1/rpc/save_question", (route) => route.abort("failed"));
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Không kết nối được máy chủ" })).toBeVisible();
    await expect(page.getByLabel("Câu hỏi", { exact: true })).toHaveValue("Nội dung dài đã gõ");
    await expect(page.getByLabel("Đáp án chấp nhận 1", { exact: true })).toHaveValue("đáp án");

    await page.unroute("**/rest/v1/rpc/save_question");
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Câu 1.*Nội dung dài đã gõ/ })).toBeVisible();
  });

  test("danh sách quiz: nhân đôi, đổi tên và xoá có xác nhận", async ({ page }) => {
    await register(page);
    await createQuiz(page, "Quiz gốc");
    await addSingle(page, "Một cộng một bằng mấy?", ["1", "2", "3", "4"], 1);

    await page.getByRole("button", { name: "Đổi tên quiz" }).click();
    await page.getByLabel("Tên quiz").filter({ visible: true }).fill("Quiz đã đổi tên");
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Quiz đã đổi tên" })).toBeVisible();

    await page.goto("/my-quizzes");
    await expect(page.getByText("1 câu hỏi")).toBeVisible();
    await page.getByRole("button", { name: "Nhân đôi quiz Quiz đã đổi tên" }).click();
    await expect(page.getByText("Đã nhân đôi “Quiz đã đổi tên”.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Quiz đã đổi tên (bản sao)" })).toBeVisible();
    await expect(page.getByText("1 câu hỏi")).toHaveCount(2);

    await page.getByRole("button", { name: "Xoá quiz Quiz đã đổi tên (bản sao)" }).click();
    await page.getByRole("button", { name: "Giữ lại" }).click();
    await expect(page.getByRole("link", { name: "Quiz đã đổi tên (bản sao)" })).toBeVisible();
    await page.getByRole("button", { name: "Xoá quiz Quiz đã đổi tên (bản sao)" }).click();
    await page.getByRole("button", { name: "Xoá quiz", exact: true }).click();
    await expect(page.getByRole("link", { name: "Quiz đã đổi tên (bản sao)" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Quiz đã đổi tên", exact: true })).toBeVisible();
  });

  test("quiz của giáo viên khác không mở được; quiz không tồn tại báo không tìm thấy", async ({ browser }) => {
    const owner = await newTeacher(browser);
    await createQuiz(owner.page, "Quiz riêng tư");
    const privateUrl = owner.page.url();

    const other = await newTeacher(browser);
    await other.page.goto(privateUrl);
    await expect(other.page.getByRole("heading", { level: 1, name: "Không tìm thấy quiz này" })).toBeVisible();
    await expect(other.page.getByText("Quiz riêng tư")).toHaveCount(0);

    await other.page.goto("/my-quizzes/khong-phai-uuid");
    await expect(other.page.getByRole("heading", { level: 1, name: "Không tìm thấy quiz này" })).toBeVisible();

    await owner.context.close();
    await other.context.close();
  });

  test("chia sẻ bằng link: đồng nghiệp xem, sao chép; đổi mã và tắt thì link cũ hết hiệu lực", async ({ browser }) => {
    const author = await newTeacher(browser);
    await createQuiz(author.page, "Quiz chia sẻ");
    await addSingle(author.page, "Thủ đô của Việt Nam là gì?", ["Hà Nội", "Huế", "Đà Nẵng", "Cần Thơ"], 0);

    const share = author.page.getByRole("region", { name: "Chia sẻ quiz" });
    await expect(share).toContainText("riêng tư");
    await share.getByRole("button", { name: "Bật chia sẻ" }).click();
    const linkBox = share.getByLabel("Link chia sẻ");
    await expect(linkBox).toHaveValue(new RegExp(`/shared/quiz/${UUID}$`));
    await expect(share).toContainText("cả đáp án đúng");
    const link = await linkBox.inputValue();

    // Đồng nghiệp xem được và thấy đáp án; sao chép về tài khoản của mình.
    const colleague = await newTeacher(browser);
    await colleague.page.goto(link);
    await expect(colleague.page.getByRole("heading", { level: 1, name: "Quiz chia sẻ" })).toBeVisible();
    await expect(colleague.page.getByText("Hà Nội")).toBeVisible();
    await expect(colleague.page.getByText("Đáp án đúng", { exact: true })).toBeVisible();
    await colleague.page.getByRole("button", { name: "Sao chép về tài khoản của tôi" }).click();
    await expect(colleague.page).toHaveURL(new RegExp(`/my-quizzes/${UUID}$`));
    await expect(colleague.page.getByRole("heading", { level: 1, name: "Quiz chia sẻ (bản sao)" })).toBeVisible();
    await expect(colleague.page.getByRole("button", { name: /Câu 1.*Thủ đô của Việt Nam/ })).toBeVisible();
    // Bản sao tách riêng, mặc định không chia sẻ.
    await expect(colleague.page.getByRole("region", { name: "Chia sẻ quiz" })).toContainText("riêng tư");

    // Đổi mã: link cũ hỏng, link mới dùng được.
    await share.getByRole("button", { name: "Đổi mã link" }).click();
    await share.getByRole("button", { name: "Đổi mã", exact: true }).click();
    await expect(share.getByText("Đã đổi mã. Link cũ không còn dùng được.")).toBeVisible();
    const newLink = await linkBox.inputValue();
    expect(newLink).not.toBe(link);

    await colleague.page.goto(link);
    await expect(colleague.page.getByRole("alert").filter({ hasText: "Không tìm thấy quiz này" })).toBeVisible();
    await colleague.page.goto(newLink);
    await expect(colleague.page.getByRole("heading", { level: 1, name: "Quiz chia sẻ" })).toBeVisible();

    // Tắt chia sẻ: link mới cũng hỏng.
    await share.getByRole("button", { name: "Tắt chia sẻ" }).click();
    await share.getByRole("button", { name: "Tắt chia sẻ" }).click();
    await expect(share).toContainText("riêng tư");
    await colleague.page.goto(newLink);
    await expect(colleague.page.getByRole("alert").filter({ hasText: "Không tìm thấy quiz này" })).toBeVisible();

    await author.context.close();
    await colleague.context.close();
  });

  test("chuyển sang câu khác khi còn thay đổi chưa lưu thì hỏi lại, không mất bản nháp", async ({ page }) => {
    await register(page);
    await createQuiz(page, "Quiz bản nháp");
    await addSingle(page, "Câu đã lưu", ["a", "b", "c", "d"], 0);

    // Form sạch (vừa lưu xong) thì chuyển ngay, không hỏi.
    await page.getByRole("button", { name: "Thêm: Đúng hoặc sai" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Câu hỏi mới" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Thay đổi chưa lưu" })).toHaveCount(0);

    await page.getByLabel("Câu hỏi", { exact: true }).fill("Bản nháp đang gõ");
    await page.getByRole("button", { name: /Câu 1.*Câu đã lưu/ }).click();
    const confirm = page.getByRole("group", { name: "Thay đổi chưa lưu" });
    await expect(confirm).toBeVisible();
    // Mặc định focus vào lựa chọn an toàn.
    await expect(confirm.getByRole("button", { name: "Tiếp tục soạn" })).toBeFocused();

    await confirm.getByRole("button", { name: "Tiếp tục soạn" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(page.getByLabel("Câu hỏi", { exact: true })).toHaveValue("Bản nháp đang gõ");

    // Huỷ form mới cũng hỏi lại; bỏ thay đổi thì chuyển đi.
    await page.getByRole("button", { name: "Huỷ" }).click();
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Bỏ thay đổi" }).click();
    await expect(page.getByText("Chọn một câu ở danh sách để sửa, hoặc thêm câu hỏi mới.")).toBeVisible();

    // Sau khi bỏ nháp, mở câu đã lưu thì thấy đúng nội dung và không còn bị hỏi.
    await page.getByRole("button", { name: /Câu 1.*Câu đã lưu/ }).click();
    await expect(page.getByLabel("Câu hỏi", { exact: true })).toHaveValue("Câu đã lưu");
    await page.getByRole("button", { name: "Thêm: Điền từ ngắn" }).click();
    await expect(confirm).toHaveCount(0);
  });

  test("focus không rơi về đầu trang sau khi lưu, xoá dòng hay mở bước xác nhận", async ({ page }) => {
    await register(page);
    await createQuiz(page, "Quiz focus");

    // Lưu câu mới: nút lưu vẫn còn và giữ focus (form không bị dựng lại).
    await page.getByRole("button", { name: "Thêm: Trắc nghiệm một đáp án" }).click();
    await page.getByLabel("Câu hỏi", { exact: true }).fill("Câu để thử focus");
    for (const [letter, label] of [["A", "a"], ["B", "b"], ["C", "c"], ["D", "d"]]) {
      await page.getByLabel(`Lựa chọn ${letter}`, { exact: true }).fill(label);
    }
    // Xoá một lựa chọn thì focus sang ô liền trước.
    await page.getByRole("button", { name: "Xoá lựa chọn D" }).click();
    await expect(page.getByLabel("Lựa chọn C", { exact: true })).toBeFocused();
    await page.getByLabel("Lựa chọn A là đáp án đúng").check();
    await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Lưu câu hỏi" })).toBeFocused();

    // Lưu lần hai vào đúng câu đó, không tạo thêm câu.
    await page.getByLabel("Câu hỏi", { exact: true }).fill("Câu để thử focus (đã sửa)");
    await page.getByRole("button", { name: "Lưu câu hỏi" }).click();
    await expect(page.getByText("Đã lưu câu hỏi.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Câu hỏi (1 / 50)" })).toBeVisible();

    // Xác nhận xoá câu: focus vào "Giữ lại", rồi về nút Xoá; xoá thật thì về tiêu đề danh sách.
    await page.getByRole("button", { name: "Xoá câu 1", exact: true }).click();
    await expect(page.getByRole("button", { name: "Giữ lại" })).toBeFocused();
    await page.getByRole("button", { name: "Giữ lại" }).click();
    await expect(page.getByRole("button", { name: "Xoá câu 1", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Xoá câu 1", exact: true }).click();
    await page.getByRole("button", { name: "Xoá câu này" }).click();
    await expect(page.getByRole("heading", { name: "Câu hỏi (0 / 50)" })).toBeFocused();

    // Bảng chia sẻ: mỗi bước xác nhận đều giữ focus trong bảng.
    const share = page.getByRole("region", { name: "Chia sẻ quiz" });
    await share.getByRole("button", { name: "Bật chia sẻ" }).click();
    await expect(share.getByRole("button", { name: "Đổi mã link" })).toBeFocused();
    await share.getByRole("button", { name: "Đổi mã link" }).click();
    await expect(share.getByRole("button", { name: "Giữ nguyên" })).toBeFocused();
    await share.getByRole("button", { name: "Giữ nguyên" }).click();
    await expect(share.getByRole("button", { name: "Đổi mã link" })).toBeFocused();
    await share.getByRole("button", { name: "Tắt chia sẻ" }).click();
    await share.getByRole("button", { name: "Tắt chia sẻ" }).click();
    await expect(share.getByRole("button", { name: "Bật chia sẻ" })).toBeFocused();

    // Danh sách quiz: xác nhận xoá quiz.
    await page.goto("/my-quizzes");
    await page.getByRole("button", { name: "Xoá quiz Quiz focus" }).click();
    await expect(page.getByRole("button", { name: "Giữ lại" })).toBeFocused();
    await page.getByRole("button", { name: "Giữ lại" }).click();
    await expect(page.getByRole("button", { name: "Xoá quiz Quiz focus" })).toBeFocused();
    await page.getByRole("button", { name: "Xoá quiz Quiz focus" }).click();
    await page.getByRole("button", { name: "Xoá quiz", exact: true }).click();
    await expect(page.getByRole("heading", { name: /^Quiz đã lưu/ })).toBeFocused();
  });

  test("bấm Lên/Xuống liên tiếp khi lần trước chưa xong thì không xếp nhầm câu", async ({ page }) => {
    await register(page);
    await createQuiz(page, "Quiz xếp thứ tự");
    for (const name of ["Một", "Hai", "Ba", "Bốn"]) await addSingle(page, `Câu số ${name}`, ["a", "b", "c", "d"], 0);

    // Kéo dài thời gian lưu để lần bấm thứ hai chắc chắn rơi vào lúc lần đầu chưa xong.
    await page.route("**/rest/v1/rpc/reorder_questions", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.getByRole("button", { name: "Chuyển câu 4 lên trên" }).click();
    await expect(page.getByRole("button", { name: "Chuyển câu 2 lên trên" })).toBeDisabled();
    // Ép bấm vào nút đang khoá: nếu nút không khoá thật thì lần này xếp theo danh sách cũ và ghi đè lần đầu.
    await page.getByRole("button", { name: "Chuyển câu 2 lên trên" }).click({ force: true });

    await expect(page.getByRole("button", { name: /Câu 3.*Câu số Bốn/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Câu 4.*Câu số Ba/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Câu 1.*Câu số Một/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Câu 2.*Câu số Hai/ })).toBeVisible();
    // Xong thì nút mở lại.
    await expect(page.getByRole("button", { name: "Chuyển câu 2 lên trên" })).toBeEnabled();
  });

  test("link chia sẻ không phải mã hợp lệ thì báo không tìm thấy", async ({ page }) => {
    await register(page);
    await page.goto("/shared/quiz/khong-hop-le");
    await expect(page.getByRole("alert").filter({ hasText: "Không tìm thấy quiz này" })).toBeVisible();
  });
});

for (const viewport of [
  { name: "máy tính 1280px", width: 1280, height: 800 },
  { name: "điện thoại 375px", width: 375, height: 812 },
] as const) {
  test.describe(`WCAG AA và bố cục soạn quiz, ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("danh sách, biểu mẫu, chia sẻ và trang xem quiz được chia sẻ", async ({ browser }) => {
      const teacher = await newTeacher(browser, { width: viewport.width, height: viewport.height });
      const { page } = teacher;
      const noHorizontalScroll = async (label: string) => {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${label}: tràn ngang`).toBeLessThanOrEqual(0);
      };

      await page.goto("/my-quizzes");
      await expectNoViolations(page, "danh sách quiz (trống)");
      await noHorizontalScroll("danh sách quiz");

      await createQuiz(page, "Quiz kiểm thử giao diện");
      await expectNoViolations(page, "soạn quiz (chưa có câu hỏi)");

      await page.getByRole("button", { name: "Thêm: Trắc nghiệm một đáp án" }).click();
      await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
      await expect(page.getByText("Nhập nội dung câu hỏi.")).toBeVisible();
      await expectNoViolations(page, "biểu mẫu câu hỏi có lỗi");
      await noHorizontalScroll("biểu mẫu câu hỏi");

      await page.getByRole("button", { name: "Thêm: Điền từ ngắn" }).click();
      await expectNoViolations(page, "biểu mẫu điền từ");

      await page.getByLabel("Câu hỏi", { exact: true }).fill("Một cộng một bằng mấy?");
      await page.getByLabel("Đáp án chấp nhận 1", { exact: true }).fill("hai");
      await page.getByRole("button", { name: "Thêm câu hỏi" }).click();
      await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();
      await expectNoViolations(page, "quiz đã đủ để chơi");
      await noHorizontalScroll("quiz có câu hỏi");

      const share = page.getByRole("region", { name: "Chia sẻ quiz" });
      await share.getByRole("button", { name: "Bật chia sẻ" }).click();
      const link = await share.getByLabel("Link chia sẻ").inputValue();
      await expectNoViolations(page, "đang chia sẻ");
      await share.getByRole("button", { name: "Đổi mã link" }).click();
      await expectNoViolations(page, "xác nhận đổi mã");
      await share.getByRole("button", { name: "Giữ nguyên" }).click();

      await page.getByRole("button", { name: "Xoá câu 1", exact: true }).click();
      await expectNoViolations(page, "xác nhận xoá câu hỏi");
      await page.getByRole("button", { name: "Giữ lại" }).click();

      const colleague = await newTeacher(browser, { width: viewport.width, height: viewport.height });
      await colleague.page.goto(link);
      await expect(colleague.page.getByRole("heading", { level: 1, name: "Quiz kiểm thử giao diện" })).toBeVisible();
      await expectNoViolations(colleague.page, "xem quiz được chia sẻ");
      const overflow = await colleague.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "xem quiz được chia sẻ: tràn ngang").toBeLessThanOrEqual(0);

      await page.goto("/my-quizzes");
      await expect(page.getByText("Đang chia sẻ")).toBeVisible();
      await expectNoViolations(page, "danh sách quiz có quiz");
      await noHorizontalScroll("danh sách quiz có quiz");

      await teacher.context.close();
      await colleague.context.close();
    });
  });
}

test.describe("thanh điều hướng có mục Quiz của tôi", () => {
  for (const width of [768, 1024]) {
    test(`không tràn ngang ở ${width}px`, async ({ browser }) => {
      const teacher = await newTeacher(browser, { width, height: 900 });
      await teacher.page.goto("/my-quizzes");
      const nav = teacher.page.getByRole("navigation", { name: "Điều hướng chính" });
      await expect(nav.getByRole("link", { name: "Quiz của tôi" })).toBeVisible();
      const overflow = await teacher.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await teacher.context.close();
    });
  }
});

test.describe("cấp tiêu đề trang quiz", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("danh sách và trình soạn có đúng một h1 và không nhảy cấp", async ({ page }) => {
    await register(page);
    const levels = async () =>
      page.evaluate(() =>
        [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
          .filter((heading) => heading.checkVisibility())
          .map((heading) => Number(heading.tagName.slice(1))),
      );
    const check = (list: number[], label: string) => {
      expect(list.filter((level) => level === 1), label).toHaveLength(1);
      expect(list[0], label).toBe(1);
      list.forEach((level, index) => {
        if (index > 0) expect(level, `${label}: h${level} sau h${list[index - 1]}`).toBeLessThanOrEqual(list[index - 1] + 1);
      });
    };

    await createQuiz(page, "Quiz tiêu đề");
    await addSingle(page, "Câu một", ["a", "b", "c", "d"], 0);
    await expect(page.getByRole("heading", { level: 1, name: "Quiz tiêu đề" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Câu 1.*Câu một/ })).toBeVisible();
    check(await levels(), "trình soạn quiz");

    await page.goto("/my-quizzes");
    await expect(page.getByRole("link", { name: "Quiz tiêu đề" })).toBeVisible();
    check(await levels(), "danh sách quiz");
  });
});
