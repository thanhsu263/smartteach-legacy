"use client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/button";
export function SignOutAccount() {
  const { signOut } = useAuth();
  return <Button onClick={() => void signOut()}>Đăng xuất</Button>;
}
