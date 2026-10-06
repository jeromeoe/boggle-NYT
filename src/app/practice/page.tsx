import { MoggleApp } from "@/components/app/MoggleApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Word-Grid Practice",
  description: "Practice word finding with short letter-grid puzzles. Play free in your browser with no account required.",
  alternates: { canonical: "/practice" },
};

export default function PracticePage() {
  return <MoggleApp initialView="practice" />;
}
