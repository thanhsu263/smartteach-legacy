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
  // Tắt có chủ đích: khi bật, id game không có trong danh mục trả về HTTP 200 thay vì 404
  // (xem plans/.../implementation-notes.md, phase 2). Khai báo rõ để Next.js không cảnh báo.
  partialPrefetching: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
