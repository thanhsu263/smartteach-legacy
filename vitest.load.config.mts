import { defineConfig } from "vitest/config";

// Thử tải: cần stack Supabase cục bộ (`npm run supabase:start`). Không nằm trong `npm test`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/load/**/*.test.ts"],
    fileParallelism: false,
  },
});
