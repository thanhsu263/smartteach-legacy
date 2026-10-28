import { defineConfig, devices } from "@playwright/test";

// Đọc .env.local (nếu có) để các test đăng nhập biết đã có Supabase cục bộ; Next.js tự đọc tệp này khi build.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Không có .env.local: các test cần Supabase sẽ tự bỏ qua.
}

const port = 3100;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices["Desktop Chrome"],
    // Lớp Liquid Glass có animation vào trang và hiệu ứng theo chuột; test chạy với giảm chuyển động
    // để axe không đo tương phản giữa chừng khi một khối còn đang mờ dần và các nút đứng yên khi bấm.
    // Đường có chuyển động được kiểm riêng trong e2e/liquid-glass.spec.ts.
    reducedMotion: "reduce",
  },
  webServer: {
    // Chạy bản build thật: không dùng chung thư mục .next với `next dev`, và kiểm thử đúng thứ sẽ triển khai.
    command: `npm run build && npm run start -- --port ${port}`,
    url: `http://localhost:${port}`,
    // Ngoài CI cho phép tái dùng server đang chạy để chạy lại nhanh; ở CI luôn dựng bản build mới,
    // để test không chạy nhầm trên một server cũ rồi báo đạt giả.
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
