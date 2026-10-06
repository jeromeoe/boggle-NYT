import { MoggleApp } from "@/components/app/MoggleApp";
import { parseSeededChallenge } from "@/lib/boggle/share";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play a Free Word-Grid Game",
  description: "Start a free word-grid round in your browser. Choose an open, closed, random, or custom board.",
  alternates: { canonical: "/play" },
};

interface Props {
  searchParams: Promise<{ challenge?: string | string[] }>;
}

export default async function PlayPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = Array.isArray(params.challenge) ? params.challenge[0] : params.challenge;
  return <MoggleApp initialView="play" initialChallenge={parseSeededChallenge(token)} />;
}
