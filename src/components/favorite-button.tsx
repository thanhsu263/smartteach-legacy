"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useFavorites } from "@/components/favorites-provider";
import { HeartIcon } from "@/components/icons";
import styles from "./favorite-button.module.css";

type FavoriteButtonProps = {
  gameId: string;
  title: string;
};

/**
 * Nút yêu thích. Giáo viên đã đăng nhập thì bật tắt được; khách bấm thì hiện lời mời đăng nhập
 * và sau khi đăng nhập quay lại đúng trang game.
 */
export function FavoriteButton({ gameId, title }: FavoriteButtonProps) {
  const { status } = useAuth();
  const favorites = useFavorites();
  const [promptOpen, setPromptOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const messageId = useId();

  const signedIn = status === "signed-in";
  const active = signedIn && favorites.ids.has(gameId);
  const ready = !signedIn || favorites.status === "ready";

  async function onClick() {
    if (!signedIn) {
      setPromptOpen((open) => !open);
      return;
    }
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    const result = await favorites.toggle(gameId);
    setError(result.error);
    setSaving(false);
  }

  const loginHref = `/login?next=${encodeURIComponent(`/games/${gameId}`)}`;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        aria-pressed={active}
        aria-label={`Yêu thích ${title}`}
        aria-describedby={promptOpen || error ? messageId : undefined}
        aria-busy={saving || (signedIn && !ready)}
        onClick={onClick}
      >
        <HeartIcon size={22} filled={active} />
      </button>
      {!signedIn && promptOpen ? (
        <p id={messageId} role="status" className={styles.message}>
          <Link href={loginHref}>Đăng nhập</Link> để lưu game yêu thích.
        </p>
      ) : null}
      {error ? (
        <p id={messageId} role="alert" className={`${styles.message} ${styles.error}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
