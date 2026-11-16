"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ButtonAnchor, ButtonLink } from "@/components/button";
import { CheckIcon } from "@/components/icons";
import { formatMembershipPrice, getPremiumPlan, premiumPlans, type PremiumPlanId } from "@/lib/membership/plans";
import type { Membership, OrderView } from "@/lib/membership/types";
import styles from "./membership.module.css";

type Snapshot = { membership: Membership; order: OrderView | null };

async function requestJson(url: string, body?: object, signal?: AbortSignal) {
  const response = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal } : { cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Chưa thể cập nhật thông tin. Vui lòng thử lại.");
  return data;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

export function MembershipCheckout() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("order");
  const payment = params.get("payment");
  const [plan, setPlan] = useState<PremiumPlanId>(() => getPremiumPlan(params.get("plan"))?.id ?? "premium_monthly");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const autoChecked = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    async function load() {
      try {
        const data: Snapshot = await requestJson(`/api/membership${orderId ? `?order=${encodeURIComponent(orderId)}` : ""}`, undefined, controller.signal);
        if (controller.signal.aborted) return;
        setSnapshot(data);
        if (data.order?.status === "paid") setError(null);
        if (data.order?.status === "pending" && polls++ < 40) timer = setTimeout(load, 3000);
      } catch (issue) {
        if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "Chưa thể tải thông tin thành viên.");
      }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [orderId, refresh]);

  useEffect(() => {
    if (!orderId || !["return", "cancel"].includes(payment ?? "") || autoChecked.current === orderId) return;
    autoChecked.current = orderId;
    let mounted = true;
    void requestJson("/api/membership/check", { order: orderId }).then(() => {
      if (mounted) setRefresh(value => value + 1);
    }).catch(issue => { if (mounted) setError(issue instanceof Error ? issue.message : "Chưa thể kiểm tra thanh toán."); });
    return () => { mounted = false; };
  }, [orderId, payment]);

  async function startCheckout() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result: { id: string; checkoutUrl: string | null } = await requestJson("/api/membership/checkout", { plan });
      if (result.checkoutUrl) {
        const url = new URL(result.checkoutUrl);
        if (url.origin !== "https://pay.payos.vn" || url.username || url.password) throw new Error("Liên kết thanh toán chưa hợp lệ.");
        window.location.assign(url.href);
      } else router.replace(`/membership?order=${encodeURIComponent(result.id)}&plan=${plan}`);
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Chưa thể tạo thanh toán."); }
    finally { setBusy(false); }
  }

  async function checkPayment() {
    if (!orderId || checking) return;
    setChecking(true); setError(null);
    try { await requestJson("/api/membership/check", { order: orderId }); setRefresh(value => value + 1); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Chưa thể kiểm tra thanh toán."); }
    finally { setChecking(false); }
  }

  const selected = premiumPlans[plan];
  const order = snapshot?.order;
  return <div className={styles.page}>
    <header className={styles.intro}><p>THÀNH VIÊN SMARTTEACH</p><h1>Thêm lựa chọn cho mỗi tiết học.</h1><span>Quiz và trò chơi cơ bản luôn miễn phí. Premium mở khóa soạn và giao đề online.</span></header>
    <section className={styles.status} aria-label="Gói hiện tại" data-surface="panel">
      <div><h2>Gói hiện tại: {snapshot ? snapshot.membership.active ? "Premium" : "Free" : "Đang tải…"}</h2>
        {snapshot?.membership.premiumUntil && <p>{snapshot.membership.active ? "Có hiệu lực đến" : "Premium đã hết hạn ngày"} {dateLabel(snapshot.membership.premiumUntil)}.</p>}
        {snapshot?.membership.active && <p>Khi mua thêm, thời hạn được cộng vào ngày hết hạn hiện có.</p>}
      </div>
      <ButtonLink href={snapshot?.membership.active ? "/assignments/new" : "/my-quizzes"}>{snapshot?.membership.active ? "Soạn đề online" : "Tiếp tục dùng Free"}</ButtonLink>
    </section>

    {order && <section className={styles.order} data-surface="panel" aria-labelledby="membership-order-title">
      <h2 id="membership-order-title">{order.status === "paid" ? "Thanh toán đã được xác nhận" : order.status === "cancelled" ? "Đơn thanh toán đã hủy" : order.status === "expired" ? "Liên kết thanh toán đã hết hạn" : "Đang chờ thanh toán"}</h2>
      <p>{premiumPlans[order.plan].title} · {formatMembershipPrice(order.amount)}</p>
      <p role="status">{order.status === "paid" ? "Thông tin thành viên đã được cập nhật theo giao dịch của thầy cô." : order.status === "pending" ? "Quyền Premium sẽ được cập nhật sau khi hệ thống xác nhận thanh toán." : "Thầy cô có thể chọn gói bên dưới để tạo thanh toán mới."}</p>
      {order.status === "pending" && <div className={styles.actions}>
        {order.checkoutUrl?.startsWith("https://pay.payos.vn/") && <ButtonAnchor href={order.checkoutUrl} variant="primary">Tiếp tục thanh toán</ButtonAnchor>}
        <Button disabled={checking} onClick={() => void checkPayment()}>{checking ? "Đang kiểm tra…" : "Kiểm tra thanh toán"}</Button>
      </div>}
    </section>}

    <section className={styles.purchase} data-surface="panel" aria-labelledby="membership-plan-title">
      <h2 id="membership-plan-title">{snapshot?.membership.active ? "Gia hạn Premium" : "Chọn Premium"}</h2>
      <fieldset className={styles.plans}><legend className="visually-hidden">Thời hạn Premium</legend>
        {Object.values(premiumPlans).map(item => <label key={item.id} data-selected={plan === item.id || undefined}>
          <input type="radio" name="premium-plan" value={item.id} checked={plan === item.id} onChange={() => setPlan(item.id)} disabled={busy} />
          <span><b>{item.title}</b><strong>{formatMembershipPrice(item.amount)} <small>/{item.period}</small></strong>{item.months === 12 && <em>Tiết kiệm 100.000đ so với mua 12 tháng riêng lẻ</em>}</span>
        </label>)}
      </fieldset>
      <ul className={styles.benefits}><li><CheckIcon size={18} />Tất cả quyền lợi Free</li><li><CheckIcon size={18} />Soạn, phát hành và giao đề online</li><li><CheckIcon size={18} />Theo dõi tiến độ và kết quả bài giao</li></ul>
      <p>Hai gói có cùng tính năng. Thanh toán một lần qua payOS, không tự động gia hạn. Hết hạn vẫn giữ dữ liệu và kết quả cũ.</p>
      {error && <div role="alert" className={styles.error}><p>{error}</p><div className={styles.actions}><Button onClick={() => { setError(null); setRefresh(value => value + 1); }}>Tải lại thông tin</Button>{orderId && <ButtonLink href="/membership">Chọn lại gói</ButtonLink>}</div></div>}
      <Button variant="primary" disabled={busy || checking || !snapshot} onClick={() => void startCheckout()}>{busy ? "Đang tạo thanh toán…" : `${snapshot?.membership.active ? "Gia hạn" : "Thanh toán"} ${formatMembershipPrice(selected.amount)} qua payOS`}</Button>
    </section>
  </div>;
}
