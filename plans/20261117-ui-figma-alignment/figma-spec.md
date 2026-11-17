# Figma spec dùng cho đợt 17/11

Nguồn: file `4EEncl4e3CIzdTFNAMm0ry` (SmartTeach), trang `00 — SmartTeach Foundations` (27:2) và `01 — Teacher Desktop` (34:4060).
Ảnh chụp frame không lấy được trong phiên này (pane trình duyệt bị ẩn, screenshot hết thời gian), nên spec dưới đây dựa trên kiểm kê node ở `plans/reports/figma-2026-11-16-ui-unification.json` và phương án Q1 đã duyệt. Chỗ nào là suy luận thì ghi rõ.

## Token component (áp cho mọi trang trừ landing)

| Token | Giá trị app | Giá trị landing (giữ nguyên) | Nguồn |
|---|---|---|---|
| `--control-h` | 48px | 44px | Button 27:18800, Input 27:18926 |
| `--control-h-sm` | 40px (44px khi màn < 720) | — | Button size S; giữ vùng chạm 44 trên mobile |
| `--icon-control` | 44px | 44px | Icon Button 27:18825 |
| `--radius-control` | `--radius-sm` (8px) | 12px | Button/Input |
| `--control-shadow` | none | inset highlight + bóng nhẹ | Q1: control phẳng |
| `--card-shadow` | 0 1px 2px ink/4% | inset highlight | Card 27:19241 |

Landing được giữ nhờ `:root:has([data-landing])` đè lại giá trị cũ (`src/styles/tokens.css`).

## Component

| Component | Node | Hiện thực |
|---|---|---|
| Button | 27:18800 | `src/components/button.tsx`. Biến thể primary (đặc), secondary (viền), ghost (trong suốt, chữ màu nhấn), danger (đỏ đặc, chữ trắng). Cỡ md 48 / sm 40 |
| Icon Button | 27:18825 | `Button` icon-only, 44×44 |
| Input/Select/Textarea | 27:18926, 27:19021, 27:18968 | Control native, style chung ở `src/styles/glass.css`, cao `--control-h`, bo 8 |
| Card | 27:19241 | `Card` trong `src/components/ui/ui.tsx`: nền trắng đặc, viền nhạt, bo 12 (lg: 16, đệm 24) |
| Empty State | 27:19465 | `EmptyState`: icon tròn 56px, tiêu đề, mô tả, hành động |
| Skeleton | 27:19478 | `Skeleton` (shimmer, tắt khi giảm chuyển động) |
| Progress | 27:19506 | `ProgressMeter` dùng `<progress>` gốc, cao 8 |
| Drawer | 27:19402 | Drawer admin là `<dialog>` navy 304px |
| Modal / Toast / Tooltip | 27:19321, 27:19438, 27:19264 | Làm ở P7 (overlay), giữ glass `data-surface="float"` |
| Tabs / Chip / Search | 27:18889, 27:18843, 27:19095 | Dùng ở P3–P5 khi trang cần |

## Shell

- ST/Shell 34:3800/3894/4120: sidebar trái, topbar cao 72 (64 trên mobile) dính đầu trang, vùng nội dung tối đa 75rem.
- Admin (không có trong Figma, Q4): cùng cấu trúc, sidebar navy `--color-ink` (#142B50), mục hiện tại nền primary chữ trắng, vòng focus vàng.
- Breakpoint: ≥ 960 sidebar 248 (thu gọn 80), 720–959 sidebar 208 giữ nhãn, < 720 drawer.
