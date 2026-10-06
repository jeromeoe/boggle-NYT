import { MoggleApp } from "@/components/app/MoggleApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zen Word Game — Play Without a Timer",
  description: "Play a calm, untimed word-grid game for free. Explore the board at your own pace with optional hints.",
  alternates: { canonical: "/play/zen" },
};

export default function ZenPage() {
  return <MoggleApp initialView="zen" />;
}
