export type ToolId = "countdown" | "draw" | "groups" | "whiteboard";

export type Tool = {
  id: ToolId;
  title: string;
  description: string;
  href: string;
};

/** Danh sách tiện ích lớp học; thứ tự này cũng là thứ tự hiển thị. */
export const tools: readonly Tool[] = [
  {
    id: "countdown",
    title: "Đồng hồ đếm ngược",
    description: "Chữ lớn đọc được từ cuối lớp, có âm báo khi hết giờ.",
    href: "/tools/countdown",
  },
  {
    id: "draw",
    title: "Bốc thăm tên",
    description: "Gọi ngẫu nhiên một bạn, không bốc lại người đã gọi.",
    href: "/tools/draw",
  },
  {
    id: "groups",
    title: "Chia nhóm",
    description: "Chia đều theo số nhóm hoặc số người mỗi nhóm.",
    href: "/tools/groups",
  },
  {
    id: "whiteboard",
    title: "Bảng trắng",
    description: "Viết và vẽ nhanh trên màn chiếu, xoá một chạm.",
    href: "/tools/whiteboard",
  },
];

export function findTool(id: ToolId): Tool {
  const tool = tools.find((item) => item.id === id);
  if (!tool) throw new Error(`Không có tiện ích ${id}`);
  return tool;
}
