"use client";

import { useId, useState } from "react";
import { Button } from "@/components/button";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, TreasureIcon } from "@/components/icons";
import { player } from "@/lib/live/rpc";
import { chestTone, describeChange, describeChestKind, TONE_LABEL, type OpenedChest } from "@/lib/live/treasure";
import type { ChestView } from "@/lib/live/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import styles from "./player.module.css";

const TONE_ICON = { up: ArrowUpIcon, down: ArrowDownIcon, same: CheckIcon } as const;

/** Thẻ kết quả của một rương đã mở: tên hiệu ứng, điểm trước và sau, tăng/giảm bằng chữ và biểu tượng. */
export function ChestResult({ chest, note }: { chest: OpenedChest; note?: string }) {
  const tone = chestTone(chest);
  const ToneIcon = TONE_ICON[tone];
  return (
    <div className={styles.chestResult} data-tone={tone}>
      <TreasureIcon size={28} />
      <div>
        <p className={styles.chestLabel}>{chest.label}</p>
        <p className={styles.chestChange}>{describeChange(chest)}</p>
        <p className={styles.chestTone}>
          <ToneIcon size={16} />
          <span>{TONE_LABEL[tone]}</span>
        </p>
        {note ? <p className={styles.hint}>{note}</p> : null}
      </div>
    </div>
  );
}

/**
 * Rương của câu vừa đóng. Chưa mở: ba rương để chọn (lựa chọn chỉ là hình thức, hiệu ứng do máy chủ quyết định nên
 * rương nào cũng như nhau). Đã mở: kết quả. Mở lại là an toàn (máy chủ trả đúng kết quả cũ), nên mất mạng thì bấm thử lại.
 */
export function Chest({ chest, token, onOpened }: { chest: ChestView; token: string; onOpened: () => void }) {
  const headingId = useId();
  const [opened, setOpened] = useState<OpenedChest | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = opened ?? (chest.status === "opened" ? chest : null);
  if (result) {
    return (
      <section className={styles.chestBox} aria-labelledby={headingId}>
        <h2 id={headingId} className={styles.reviewTitle}>
          Kho báu
        </h2>
        <div role="status">
          <ChestResult chest={result} />
        </div>
      </section>
    );
  }

  async function open() {
    const supabase = getBrowserSupabase();
    if (!supabase || pending) return;
    setPending(true);
    setError(null);
    const response = await player.openChest(supabase, token);
    setPending(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if (response.chest.status === "opened") {
      setOpened(response.chest);
      onOpened();
    }
  }

  return (
    <section className={styles.chestBox} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.reviewTitle}>
        Bạn nhận được một rương kho báu!
      </h2>
      <p className={styles.hint}>{describeChestKind(chest.kind)} Chọn một rương để mở.</p>
      <div role="group" aria-label="Chọn một rương" className={styles.chestButtons}>
        {[1, 2, 3].map((n) => (
          <Button key={n} variant="primary" className={styles.chestButton} disabled={pending} onClick={() => void open()}>
            <TreasureIcon size={28} />
            <span>Rương {n}</span>
          </Button>
        ))}
      </div>
      {pending ? (
        <p role="status" className={styles.hint}>
          Đang mở rương…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error} Bạn bấm mở lại nhé.
        </p>
      ) : null}
    </section>
  );
}
