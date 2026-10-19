import { defineConfig } from "vitest/config";

// Kiểm thử cơ sở dữ liệu: cần stack Supabase cục bộ (`npm run supabase:start`).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    // Các tệp dùng chung một cơ sở dữ liệu nên chạy lần lượt.
    fileParallelism: false,
  },
});
