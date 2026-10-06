import { MoggleApp } from "@/components/app/MoggleApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Word-Grid Challenge",
  description: "Play today’s free word-grid challenge. Everyone gets the same board—find the most words before time runs out.",
  alternates: { canonical: "/play/daily" },
};

export default function DailyPlayPage() {
  return <MoggleApp initialView="daily" />;
}
