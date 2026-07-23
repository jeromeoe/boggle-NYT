import { MoggleApp } from "@/components/app/MoggleApp";
import { parseSeededChallenge } from "@/lib/boggle/share";

interface Props {
  searchParams: Promise<{ challenge?: string | string[] }>;
}

export default async function PlayPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = Array.isArray(params.challenge) ? params.challenge[0] : params.challenge;
  return <MoggleApp initialView="play" initialChallenge={parseSeededChallenge(token)} />;
}
