import { describe, expect, it } from "vitest";
import { isProtectedPath } from "@/lib/auth/protected-paths";

describe("isProtectedPath", () => {
  it("nhận các khu vực của giáo viên và mọi trang con", () => {
    for (const path of ["/my-classes", "/my-classes/abc", "/my-quizzes", "/my-quizzes/abc/edit", "/shared/quiz/token"]) {
      expect(isProtectedPath(path), path).toBe(true);
    }
  });

  it("không nhận trang công khai hay tên chỉ giống tiền tố", () => {
    for (const path of ["/", "/games", "/tools/draw", "/login", "/privacy", "/my-classesx", "/my-quizzes-old", "/sharedfoo", "/play"]) {
      expect(isProtectedPath(path), path).toBe(false);
    }
  });
});
