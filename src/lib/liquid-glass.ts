/**
 * Tương tác chuột của lớp Liquid Glass: một bộ lắng nghe duy nhất cho mọi phần tử [data-glass].
 * Chỉ ghi biến CSS (--mx --my --spot-o trên <html>; --gx --gy --tx --ty trên phần tử), không đụng state React.
 *
 *  - data-glass     ánh sáng (specular) đi theo con trỏ
 *  - data-magnetic  nút chính và thẻ nổi bật nhích theo con trỏ (±6px)
 *  - data-tilt      thẻ lớn nghiêng nhẹ theo con trỏ
 *  - data-reveal    khối dưới màn hình hiện lên khi cuộn tới (IntersectionObserver)
 */

const MAGNET_PX = 6;
const TILT_DEG = 6;

export function initLiquidGlass(): () => void {
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const cleanups: Array<() => void> = [];

  let raf = 0;
  let last: HTMLElement | null = null;
  let event: PointerEvent | null = null;

  function release(el: HTMLElement | null) {
    if (!el) return;
    el.style.setProperty("--tx", "0px");
    el.style.setProperty("--ty", "0px");
    if (el.hasAttribute("data-tilt")) el.style.transform = "";
  }

  function frame() {
    raf = 0;
    if (!event) return;
    const { clientX, clientY, target } = event;
    root.style.setProperty("--mx", `${clientX}px`);
    root.style.setProperty("--my", `${clientY}px`);
    root.style.setProperty("--spot-o", "1");

    const el = target instanceof Element ? target.closest<HTMLElement>("[data-glass]") : null;
    if (last && last !== el) release(last);
    if (el) {
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      el.style.setProperty("--gx", `${x}px`);
      el.style.setProperty("--gy", `${y}px`);
      if (!reduce && rect.width > 0 && rect.height > 0) {
        const px = x / rect.width - 0.5;
        const py = y / rect.height - 0.5;
        if (el.hasAttribute("data-magnetic")) {
          el.style.setProperty("--tx", `${(px * 2 * MAGNET_PX).toFixed(2)}px`);
          el.style.setProperty("--ty", `${(py * 2 * MAGNET_PX).toFixed(2)}px`);
        }
        if (el.hasAttribute("data-tilt")) {
          el.style.transform = `perspective(800px) rotateX(${(-py * TILT_DEG).toFixed(2)}deg) rotateY(${(px * TILT_DEG).toFixed(2)}deg) scale(var(--s))`;
        }
      }
    }
    last = el;
  }

  if (fine) {
    const onMove = (e: PointerEvent) => {
      event = e;
      raf ||= requestAnimationFrame(frame);
    };
    // Chuột rời cửa sổ: tắt đốm sáng nền và trả phần tử về chỗ cũ.
    const onOut = (e: PointerEvent) => {
      if (e.relatedTarget) return;
      event = null;
      root.style.setProperty("--spot-o", "0");
      release(last);
      last = null;
    };
    addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    cleanups.push(() => {
      removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      if (raf) cancelAnimationFrame(raf);
    });
  }

  if (!reduce && "IntersectionObserver" in window) {
    cleanups.push(observeReveals());
  }

  return () => cleanups.forEach((fn) => fn());
}

/**
 * Chỉ khối đang nằm dưới mép màn hình mới bị ẩn chờ; khối đã thấy thì giữ nguyên.
 * Nội dung được vẽ thêm sau đó (React) cũng được theo dõi qua MutationObserver.
 */
function observeReveals(): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        el.dataset.reveal = "in";
        el.addEventListener("animationend", () => el.removeAttribute("data-reveal"), { once: true });
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );

  function track(el: HTMLElement) {
    // Đã hiện rồi thì thôi; đang chờ (do lần khởi tạo trước, ví dụ StrictMode) thì theo dõi lại.
    if (el.dataset.reveal === "in") return;
    if (!el.dataset.reveal) {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.dataset.reveal = "pending";
    }
    io.observe(el);
  }

  function scan(node: ParentNode) {
    if (node instanceof HTMLElement && node.hasAttribute("data-reveal-on-scroll")) track(node);
    node.querySelectorAll<HTMLElement>("[data-reveal-on-scroll]").forEach(track);
  }

  scan(document);
  const mo = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) scan(node);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  return () => {
    io.disconnect();
    mo.disconnect();
  };
}
