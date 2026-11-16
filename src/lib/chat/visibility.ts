export function chatAllowed(pathname: string) {
  return ![
    "/admin",
    "/login",
    "/play",
    "/learn",
    "/host",
    "/account-disabled",
  ].some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}
export function contextPage(pathname: string) {
  const map = [
    ["/dashboard", "dashboard"],
    ["/my-quizzes", "quizzes"],
    ["/my-classes", "classes"],
    ["/library", "library"],
    ["/assignments", "assignments"],
    ["/games", "games"],
    ["/tools", "tools"],
  ] as const;
  return (
    map.find(
      ([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"),
    )?.[1] ?? "home"
  );
}
