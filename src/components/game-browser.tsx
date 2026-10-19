"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { GameCard } from "@/components/game-card";
import {
  GRADES,
  SUBJECTS,
  filterGames,
  type Game,
  type GradeId,
  type SubjectId,
} from "@/lib/catalog";
import styles from "./game-browser.module.css";

export function GameBrowser({ games }: { games: readonly Game[] }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<SubjectId | "">("");
  const [grade, setGrade] = useState<GradeId | "">("");

  if (games.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Kho game đang được chuẩn bị</p>
        <p className={styles.emptyText}>Chưa có trò chơi nào. Thầy cô quay lại sau nhé.</p>
      </div>
    );
  }

  const results = filterGames(games, { query, subject, grade });
  const filtering = query.trim() !== "" || subject !== "" || grade !== "";

  function reset() {
    setQuery("");
    setSubject("");
    setGrade("");
  }

  return (
    <div className={styles.browser}>
      <form
        className={styles.filters}
        role="search"
        aria-label="Lọc trò chơi"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className={styles.field}>
          <label htmlFor="game-query">Tìm trò chơi</label>
          <input
            id="game-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập tên trò chơi"
            autoComplete="off"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="game-subject">Môn học</label>
          <select
            id="game-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value as SubjectId | "")}
          >
            <option value="">Tất cả môn</option>
            {SUBJECTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="game-grade">Lớp</label>
          <select
            id="game-grade"
            value={grade}
            onChange={(event) => setGrade(event.target.value as GradeId | "")}
          >
            <option value="">Tất cả lớp</option>
            {GRADES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {filtering ? (
          <Button variant="secondary" onClick={reset} className={styles.reset}>
            Xoá bộ lọc
          </Button>
        ) : null}
      </form>

      <p className={styles.count} role="status">
        {results.length === 0 ? "Không có trò chơi nào" : `Có ${results.length} trò chơi`}
      </p>

      {results.length > 0 ? (
        <ul className={styles.grid}>
          {results.map((game) => (
            <li key={game.id}>
              <GameCard game={game} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Không có trò chơi nào khớp</p>
          <p className={styles.emptyText}>
            Thử bỏ bớt điều kiện lọc hoặc tìm bằng từ khoá khác.
          </p>
          <Button variant="secondary" onClick={reset}>
            Xoá bộ lọc
          </Button>
        </div>
      )}
    </div>
  );
}
