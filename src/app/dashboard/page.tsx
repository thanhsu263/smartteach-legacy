import type { Metadata } from "next";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";

export const metadata: Metadata = { title: "Tổng quan" };

export default function DashboardPage() {
  return <TeacherDashboard />;
}
