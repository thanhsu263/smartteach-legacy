import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Không cho trang nào của hub bị nhúng vào trang khác (chống clickjacking, nhất là trang đăng nhập).
  // Việc hub nhúng game bằng iframe không bị ảnh hưởng. CSP đầy đủ cho script sẽ làm ở phase 5.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ["pdfjs-dist", "mammoth", "@napi-rs/canvas", "pdfkit"],
  outputFileTracingIncludes: {
    "/api/exams/parse": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "./node_modules/@napi-rs/canvas*/**/*"],
    "/api/internal/exams/jobs/run": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "./node_modules/@napi-rs/canvas*/**/*"],
    "/api/exams/*/export": ["./src/assets/fonts/*.ttf", "./node_modules/pdfkit/js/data/**/*"],
    "/api/internal/rag/jobs/run": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "./node_modules/@napi-rs/canvas*/**/*"],
  },
  // Tắt có chủ đích: khi bật, id game không có trong danh mục trả về HTTP 200 thay vì 404
  // (xem plans/.../implementation-notes.md, phase 2). Khai báo rõ để Next.js không cảnh báo.
  partialPrefetching: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
