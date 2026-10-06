import { MoggleApp } from "@/components/app/MoggleApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rapid Word Game — 3 Minutes",
  description: "Play a free three-minute word-grid game online. Build words, score points, and improve your speed.",
  alternates: { canonical: "/play/rapid" },
};

export default function RapidPage() {
  return <MoggleApp initialView="rapid" />;
}
