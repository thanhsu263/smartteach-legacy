"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Button, ButtonLink } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { host, type LiveResult } from "@/lib/live/rpc";
import {
  buildMatrix,
  correctRate,
  describeAnswer,
  describeCell,
  formatDateTime,
  formatSeconds,
  type HostResults,
} from "@/lib/live/results";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { answerStyle } from "@/components/live/player/answer-styles";
import { formatDelta } from "@/lib/live/treasure";
import styles from "./results.module.css";

type Loaded = { key: string; result: LiveResult<{ results: HostResults }> };

const STATUS_MARK = { correct: "✓", wrong: "✗", none: "–" } as const;

/** Kết quả chi tiết sau buổi chơi: xếp hạng, thống kê từng câu, đáp án từng người; có xoá buổi (xác nhận). */
export function ResultsScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const key = `${userId}:${sessionId}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseId = useId();

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    host.results(supabase, sessionId).then((result) => {
      if (!cancelled) setLoaded({ key: `${userId}:${sessionId}`, result });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, sessionId]);

  const current = loaded && loaded.key === key ? loaded.result : null;

  async function remove() {
    const supabase = getBrowserSupabase();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const result = await host.deleteSession(supabase, sessionId);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    router.push("/my-quizzes");
  }

  if (current === null) {
    return (
      <div className={styles.screen} aria-busy="true">
        <h1 className={styles.title}>Đang tải kết quả…</h1>
      </div>
    );
  }

  if (!current.ok) {
    const notEnded = current.reason === "session_not_ended";
    return (
      <div className={styles.empty}>
        <h1 className={styles.title}>{notEnded ? "Phiên còn đang chạy" : "Không tìm thấy kết quả này"}</h1>
        <p className={current.fatal || notEnded ? styles.hint : styles.error} role={current.fatal || notEnded ? undefined : "alert"}>
          {notEnded ? "Kết quả đầy đủ có sau khi thầy cô kết thúc phiên." : current.message}
        </p>
        {notEnded ? (
          <ButtonLink href={`/host/${sessionId}`} variant="primary">
            Về màn hình điều khiển
          </ButtonLink>
        ) : (
          <ButtonLink href="/my-quizzes" variant="secondary">
            Về Quiz của tôi
          </ButtonLink>
        )}
      </div>
    );
  }

  const results = current.results;
  const matrix = buildMatrix(results);

  return (
    <div className={styles.screen}>
      <header>
        <h1 className={styles.title}>Kết quả: {results.quiz_title}</h1>
        <p className={styles.lead}>
          {formatDateTime(results.created_at)} · {results.player_count} bạn chơi · điểm trung bình {results.average_score}
          {results.speed_bonus ? " · có tính điểm tốc độ" : ""}
        </p>
      </header>

      <section className={styles.section} aria-labelledby={`${baseId}-rank`}>
        <h2 id={`${baseId}-rank`} className={styles.heading}>
          Xếp hạng
        </h2>
        {results.ranking.length === 0 ? (
          <p className={styles.hint}>Phiên này chưa có người chơi nào.</p>
        ) : (
          <div className={styles.tableWrap} role="region" aria-label="Bảng xếp hạng, cuộn ngang nếu cần" tabIndex={0}>
            <table className={styles.table}>
              <caption>Điểm cuối của từng bạn</caption>
              <thead>
                <tr>
                  <th scope="col">Hạng</th>
                  <th scope="col">Biệt danh</th>
                  <th scope="col">Điểm</th>
                  <th scope="col">Đúng / đã trả lời</th>
                  <th scope="col">Thời gian trả lời trung bình</th>
                  {results.treasure_mode ? <th scope="col">Kho báu</th> : null}
                </tr>
              </thead>
              <tbody>
                {results.ranking.map((player) => (
                  <tr key={player.id} className={player.rank === null ? styles.mutedRow : undefined}>
                    <th scope="row" className={styles.num}>
                      {player.rank ?? "-"}
                    </th>
                    <td>
                      {player.nickname}
                      {player.removed ? (player.left ? " (đã rời phòng)" : " (bị loại)") : ""}
                    </td>
                    <td className={styles.num}>{player.score}</td>
                    <td className={styles.num}>
                      {player.correct} / {player.answered}
                    </td>
                    <td className={styles.num}>{formatSeconds(player.avg_response_ms)}</td>
                    {results.treasure_mode ? (
                      <td className={styles.num}>
                        {formatDelta(player.treasure_delta)} ({player.treasure_chests} rương)
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {results.treasure_mode ? (
        <p className={styles.hint}>
          Phiên này bật chế độ kho báu: điểm cuối của mỗi bạn gồm cả thay đổi do rương, nên tổng điểm theo từng câu ở bảng “Theo từng bạn”
          có thể khác điểm cuối.
        </p>
      ) : null}

      <section className={styles.section} aria-labelledby={`${baseId}-questions`}>
        <h2 id={`${baseId}-questions`} className={styles.heading}>
          Theo câu hỏi
        </h2>
        <div className={styles.tableWrap} role="region" aria-label="Thống kê từng câu, cuộn ngang nếu cần" tabIndex={0}>
          <table className={styles.table}>
            <caption>Số bạn đúng, chưa đúng và chưa trả lời ở từng câu</caption>
            <thead>
              <tr>
                <th scope="col">Câu</th>
                <th scope="col">Nội dung</th>
                <th scope="col">Đúng</th>
                <th scope="col">Chưa đúng</th>
                <th scope="col">Chưa trả lời</th>
                <th scope="col">Tỉ lệ đúng</th>
                <th scope="col">Thời gian trung bình</th>
              </tr>
            </thead>
            <tbody>
              {results.questions.map((question) => (
                <tr key={question.index}>
                  <th scope="row" className={styles.num}>
                    {question.index}
                  </th>
                  <td className={styles.prompt}>
                    {question.prompt}
                    {question.kind === "short_text" ? (
                      <p className={styles.hint}>
                        Đáp án chấp nhận: {"accepted_answers" in question.key ? question.key.accepted_answers.join(" / ") : ""}
                      </p>
                    ) : (
                      <details className={styles.details}>
                        <summary>Lượt chọn từng lựa chọn</summary>
                        <ul className={styles.optionList}>
                          {question.options.map((label, i) => {
                            const isCorrect = "correct" in question.key && question.key.correct.includes(i);
                            return (
                              <li key={i}>
                                {answerStyle(i).letter}. {label}: {question.option_counts[i] ?? 0} bạn chọn
                                {isCorrect ? " (đáp án đúng)" : ""}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    )}
                  </td>
                  <td className={styles.num}>{question.correct}</td>
                  <td className={styles.num}>{question.wrong}</td>
                  <td className={styles.num}>{question.unanswered}</td>
                  <td className={styles.num}>{correctRate(question)}</td>
                  <td className={styles.num}>{formatSeconds(question.avg_response_ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby={`${baseId}-players`}>
        <h2 id={`${baseId}-players`} className={styles.heading}>
          Theo từng bạn
        </h2>
        {matrix.length === 0 ? (
          <p className={styles.hint}>Phiên này chưa có người chơi nào.</p>
        ) : (
          <div className={styles.tableWrap} role="region" aria-label="Kết quả từng bạn ở từng câu, cuộn ngang nếu cần" tabIndex={0}>
            <table className={styles.table}>
              <caption>Mỗi ô là kết quả của một bạn ở một câu</caption>
              <thead>
                <tr>
                  <th scope="col">Biệt danh</th>
                  {results.questions.map((question) => (
                    <th key={question.index} scope="col">
                      Câu {question.index}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map(({ player, cells }) => (
                  <tr key={player.id} className={player.rank === null ? styles.mutedRow : undefined}>
                    <th scope="row">{player.nickname}</th>
                    {cells.map((cell, i) => (
                      <td key={i}>
                        <span className={styles.cell} data-status={cell.status}>
                          <span aria-hidden="true">{STATUS_MARK[cell.status]}</span>
                          <span>{describeCell(cell)}</span>
                        </span>
                        {cell.status !== "none" ? (
                          <span className={styles.answerText}>{describeAnswer(results.questions[i]?.options ?? [], cell.answer)}</span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={styles.hint}>Dữ liệu người chơi tự xoá sau 90 ngày. Thầy cô cũng xoá được buổi này ngay bên dưới.</p>

      {confirming ? (
        <div className={styles.confirm} role="group" aria-label="Xác nhận xoá buổi chơi">
          <p>Xoá buổi chơi này cùng điểm và câu trả lời của mọi bạn? Thao tác này không hoàn tác được.</p>
          <div className={styles.actions}>
            <Button variant="secondary" autoFocus onClick={() => setConfirming(false)}>
              Giữ lại
            </Button>
            <Button variant="secondary" disabled={busy} onClick={remove}>
              Xoá buổi này
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            Xoá buổi này
          </Button>
          <Link href="/my-quizzes">Về Quiz của tôi</Link>
        </div>
      )}
      {error ? (
        <p role="alert" className={`${styles.error} animate-fade-up`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
