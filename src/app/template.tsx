/** Mỗi lần chuyển trang template được dựng lại, nên nội dung trượt vào nhẹ (xem .page-enter trong styles/glass.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
