export type SupabaseConfig = { url: string; key: string };

/**
 * Địa chỉ và khoá công khai (anon) của dự án Supabase. Trả về null khi chưa cấu hình,
 * để ứng dụng vẫn chạy được ở chế độ khách (kho game và tiện ích không cần đăng nhập).
 * Biến `NEXT_PUBLIC_*` phải được tham chiếu trực tiếp để Next.js thay giá trị lúc build.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}
