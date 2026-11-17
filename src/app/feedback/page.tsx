import type { Metadata } from "next";
import { FeedbackManager } from "@/components/feedback/feedback-manager";
export const metadata: Metadata = { title: "Góp ý", robots: { index: false } };
export default function FeedbackPage() { return <FeedbackManager />; }
