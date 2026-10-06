import { MoggleApp } from "@/components/app/MoggleApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blitz Word Game — 1 Minute",
  description: "Play a fast, free one-minute word-grid game. Find every word you can before the clock expires.",
  alternates: { canonical: "/play/blitz" },
};

export default function BlitzPage() {
  return <MoggleApp initialView="blitz" />;
}
