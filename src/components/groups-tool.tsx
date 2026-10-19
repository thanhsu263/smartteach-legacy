"use client";

import { useId, useState } from "react";
import { Button } from "@/components/button";
import { NameListInput } from "@/components/name-list-input";
import { SavedClassPicker } from "@/components/saved-class-picker";
import { ToolStage } from "@/components/tool-stage";
import { parseNames } from "@/lib/utilities/draw";
import { splitIntoGroups, type SplitError, type SplitMode } from "@/lib/utilities/groups";
import styles from "./groups-tool.module.css";

const ERROR_TEXT: Record<SplitError, string> = {
  "no-names": "Thầy cô nhập danh sách tên trước nhé.",
  "invalid-number": "Nhập một số nguyên từ 1 trở lên.",
  "too-many-groups": "Số nhóm nhiều hơn số người. Thầy cô giảm số nhóm xuống nhé.",
};

export function GroupsTool() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<SplitMode>("groups");
  const [valueText, setValueText] = useState("4");
  const [groups, setGroups] = useState<string[][] | null>(null);
  const [error, setError] = useState<SplitError | null>(null);
  const numberId = useId();
  const errorId = useId();

  function split() {
    const result = splitIntoGroups(parseNames(text), mode, Number(valueText));
    if (result.ok) {
      setGroups(result.groups);
      setError(null);
    } else {
      setGroups(null);
      setError(result.error);
    }
  }

  const total = groups?.reduce((sum, group) => sum + group.length, 0) ?? 0;

  return (
    <ToolStage label="Chia nhóm">
      <div className={styles.tool}>
        <div className={styles.form}>
          <SavedClassPicker onPick={(picked) => setText(picked.join("\n"))} />
          <NameListInput value={text} onChange={setText} />

          <fieldset className={styles.mode}>
            <legend>Cách chia</legend>
            <label>
              <input
                type="radio"
                name="split-mode"
                checked={mode === "groups"}
                onChange={() => setMode("groups")}
              />
              Theo số nhóm
            </label>
            <label>
              <input
                type="radio"
                name="split-mode"
                checked={mode === "size"}
                onChange={() => setMode("size")}
              />
              Theo số người mỗi nhóm
            </label>
          </fieldset>

          <div className={styles.number}>
            <label htmlFor={numberId}>{mode === "groups" ? "Số nhóm" : "Số người mỗi nhóm"}</label>
            <input
              id={numberId}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={valueText}
              onChange={(event) => setValueText(event.target.value)}
              aria-invalid={error === "invalid-number" || error === "too-many-groups"}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          {error ? (
            <p id={errorId} role="alert" className={styles.error}>
              {ERROR_TEXT[error]}
            </p>
          ) : null}

          <Button variant="primary" onClick={split}>
            {groups ? "Chia lại" : "Chia nhóm"}
          </Button>
        </div>

        {groups ? (
          <div className={styles.results}>
            <p role="status" className={styles.summary}>
              Đã chia {total} bạn thành {groups.length} nhóm
            </p>
            <ul className={styles.grid}>
              {groups.map((group, index) => (
                <li key={index} className={styles.group}>
                  <h2 className={styles.groupTitle}>
                    Nhóm {index + 1} <span>({group.length} bạn)</span>
                  </h2>
                  <ul className={styles.members}>
                    {group.map((name, position) => (
                      <li key={`${position}-${name}`}>{name}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </ToolStage>
  );
}
