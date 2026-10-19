import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Tắt có chủ đích: khi bật, id game không có trong danh mục trả về HTTP 200 thay vì 404
  // (xem plans/.../implementation-notes.md, phase 2). Khai báo rõ để Next.js không cảnh báo.
  partialPrefetching: false,
};

export default nextConfig;
