import { describe, expect, it } from "vitest";
import { isProtectedPath } from "@/lib/auth/protected-paths";

describe("isProtectedPath", () => {
  it("nhận các khu vực của giáo viên và mọi trang con", () => {
    for (const path of ["/dashboard", "/dashboard/activity", "/assignments", "/assignments/abc", "/my-classes", "/my-classes/abc", "/my-quizzes", "/my-quizzes/abc/edit", "/shared/quiz/token", "/host", "/host/abc"]) {
      expect(isProtectedPath(path), path).toBe(true);
    }
  });

  it("không nhận trang công khai hay tên chỉ giống tiền tố", () => {
    for (const path of ["/", "/games", "/tools/draw", "/learn", "/learn/ABCDEFGHIJ", "/login", "/privacy", "/dashboardx", "/assignments-old", "/my-classesx", "/my-quizzes-old", "/sharedfoo", "/play", "/hostile", "/host-x"]) {
      expect(isProtectedPath(path), path).toBe(false);
    }
  });
});
