import { MoggleApp } from "@/components/app/MoggleApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Online Daily Word Game",
  description: "Play a free daily word-grid game in your browser. Find words, beat the clock, and return for a new board every day.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <MoggleApp initialView="dashboard" />;
}
