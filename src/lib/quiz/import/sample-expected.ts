import type { QuestionInput } from "@/lib/quiz/types";

/** Bộ câu mà tệp mẫu CSV, tệp mẫu .xlsx và văn bản dán ví dụ đều phải cho ra (dùng trong các test tương đương). */
export const SAMPLE_QUESTIONS: QuestionInput[] = [
  {
    kind: "single",
    prompt: "Thủ đô của Việt Nam là gì?",
    time_limit_seconds: 20,
    accepted_answers: [],
    ignore_diacritics: false,
    options: [
      { label: "Hà Nội", is_correct: true },
      { label: "Huế", is_correct: false },
      { label: "Đà Nẵng", is_correct: false },
      { label: "Cần Thơ", is_correct: false },
    ],
  },
  {
    kind: "true_false",
    prompt: "Mặt Trời quay quanh Trái Đất.",
    time_limit_seconds: 10,
    accepted_answers: [],
    ignore_diacritics: false,
    options: [
      { label: "Đúng", is_correct: false },
      { label: "Sai", is_correct: true },
    ],
  },
  {
    kind: "multi",
    prompt: "Những số nào là số chẵn?",
    time_limit_seconds: 30,
    accepted_answers: [],
    ignore_diacritics: false,
    options: [
      { label: "2", is_correct: true },
      { label: "3", is_correct: false },
      { label: "4", is_correct: true },
      { label: "5", is_correct: false },
    ],
  },
  {
    kind: "short_text",
    prompt: "Con vật kêu meo meo là gì?",
    time_limit_seconds: 20,
    accepted_answers: ["con mèo", "mèo"],
    ignore_diacritics: true,
    options: [],
  },
];
