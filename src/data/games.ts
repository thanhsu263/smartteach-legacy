import type { Game } from "@/lib/catalog";

/** Danh mục game do chủ dự án quản lý. Thêm game mới bằng cách thêm một mục vào đây. */
export const games: readonly Game[] = [
  {
    id: "gargamel-bat-xi-trum",
    title: "Gargamel bắt Xì Trum",
    description:
      "Làng Xì Trum phiên bản lớp học: Gargamel rượt đuổi đàn Xì Trum, mỗi Xì Trum là một bạn trong lớp. Gọi tên ngẫu nhiên, công bằng, có thể không gọi lại người đã gọi.",
    subjects: [],
    grades: [],
    embedUrl: "https://www.quyentran.online/",
    credits:
      "Xì Trum và Gargamel © Peyo / IMPS. Nhạc: Smurfs Epic Run © Ubisoft. Dự án học tập và giải trí nội bộ, phi thương mại, Trường Đại học Sài Gòn.",
    featured: true,
  },
];
