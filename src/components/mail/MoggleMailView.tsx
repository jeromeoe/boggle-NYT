"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDictionary } from "@/hooks/useDictionary";
import { findAllWords } from "@/lib/boggle/solver";
import { generateBoard } from "@/lib/boggle/dice";
import { calculateTotalScore, calculateScore, calculatePenalty } from "@/lib/boggle/scoring";
import { findCandidateTrail } from "@/lib/boggle/pathFinder";
import { getPathfinderEnabled } from "@/lib/preferences";
import { Board } from "@/components/game/Board";
import { Timer } from "@/components/game/Timer";
import { WordInput } from "@/components/game/WordInput";
import { FoundWordsList } from "@/components/game/FoundWordsList";
import type { User } from "@/lib/supabase/client";
import {
    TbMail, TbMailOpened, TbSend, TbArrowLeft,
    TbRefresh, TbX, TbSwords,
    TbInbox, TbLoader2,
} from "react-icons/tb";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MailUser {
    id: string;
    username: string;
    display_name: string | null;
}

interface MailItem {
    id: string;
    sender_id: string;
    recipient_id: string;
    parent_id: string | null;
    board_letters: string[][];
    board_type: "closed" | "open" | "random";
    time_seconds: number;
    sender_gross: number;
    sender_penalty: number;
    sender_net: number;
    sender_words: string[];
    sender_penalty_words: string[];
    recipient_board_letters: string[][] | null;
    recipient_gross: number | null;
    recipient_penalty: number | null;
    recipient_net: number | null;
    recipient_words: string[] | null;
    recipient_penalty_words: string[] | null;
    recipient_played_at: string | null;
    created_at: string;
    sender: MailUser;
    recipient: MailUser;
}

interface Friend {
    friendship_id: string;
    user_id: string;
    username: string;
    display_name: string | null;
    rating: number;
    is_online: boolean;
}

interface GameResult {
    gross: number;
    penalty: number;
    net: number;
    words: string[];
    penaltyWords: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function fmtTime(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const AV_COLORS = ["#1A3C34", "#2D6A4F", "#9B2226", "#5C4033", "#6B4F9E", "#1A5B8A", "#7A3F00"];
function avatarColor(str: string) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return AV_COLORS[h % AV_COLORS.length];
}

function Avatar({ name, userId, size = 32 }: { name: string; userId: string; size?: number }) {
    return (
        <div
            style={{ background: avatarColor(userId), width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, color: "#EDE8DF", fontFamily: "var(--font-geist-sans)" }}
        >
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

function getPartner(mail: MailItem, myId: string): MailUser {
    return mail.sender_id === myId ? mail.recipient : mail.sender;
}

function isRecipient(mail: MailItem, myId: string): boolean {
    return mail.recipient_id === myId;
}

function recipientPlayed(mail: MailItem): boolean {
    return !!mail.recipient_played_at;
}

function senderScoreHidden(mail: MailItem, myId: string): boolean {
    return mail.board_type === "closed" && !recipientPlayed(mail) && isRecipient(mail, myId);
}

function getBoardForPlay(mail: MailItem): string[][] {
    if (mail.board_type === "random" && mail.recipient_board_letters) {
        return mail.recipient_board_letters;
    }
    return mail.board_letters;
}

function groupConversations(mails: MailItem[], myId: string): Map<string, MailItem[]> {
    const map = new Map<string, MailItem[]>();
    for (const mail of mails) {
        const partnerId = mail.sender_id === myId ? mail.recipient_id : mail.sender_id;
        if (!map.has(partnerId)) map.set(partnerId, []);
        map.get(partnerId)!.push(mail);
    }
    return map;
}

function countUnread(mails: MailItem[], myId: string): number {
    return mails.filter(m => m.recipient_id === myId && !m.recipient_played_at).length;
}

// ── Mini game hook ─────────────────────────────────────────────────────────────

function useMailGame(board: string[][] | null, timeSeconds: number, serverStartedAt?: string | null) {
    const { trie, dictionaryLoaded } = useDictionary();
    const [allPossibleWords, setAllPossibleWords] = useState<Set<string>>(new Set());
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [penalizedWords, setPenalizedWords] = useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(timeSeconds);
    const [isActive, setIsActive] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    useEffect(() => {
        if (trie && dictionaryLoaded && board) {
            const possible = findAllWords(board, trie);
            setAllPossibleWords(possible);
            setStatusMessage(`${possible.size} words available`);
        }
    }, [trie, dictionaryLoaded, board]);

    useEffect(() => {
        if (!isActive || timeLeft <= 0) return;
        const t = setInterval(() => setTimeLeft(p => {
            if (p <= 1) { setIsActive(false); setIsDone(true); return 0; }
            return p - 1;
        }), 1000);
        return () => clearInterval(t);
    }, [isActive, timeLeft]);

    const start = useCallback(() => {
        // Compute elapsed time from server-anchored start timestamp.
        // This means a refresh gives the player less time, never a fresh start.
        let adjustedTime = timeSeconds;
        if (serverStartedAt) {
            const elapsed = Math.floor((Date.now() - new Date(serverStartedAt).getTime()) / 1000);
            adjustedTime = Math.max(0, timeSeconds - elapsed);
        }
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(adjustedTime);
        if (adjustedTime <= 0) {
            setIsActive(false);
            setIsDone(true);
        } else {
            setIsActive(true);
            setIsDone(false);
        }
    }, [timeSeconds, serverStartedAt]);

    const endEarly = useCallback(() => {
        setIsActive(false);
        setIsDone(true);
    }, []);

    const submitWord = useCallback((word: string) => {
        const w = word.trim().toUpperCase();
        if (w.length < 3) return "too_short";
        if (foundWords.includes(w) || penalizedWords.includes(w)) return "duplicate";
        if (allPossibleWords.has(w)) {
            setFoundWords(p => [...p, w]);
            setStatusMessage(`✓ ${w} +${calculateScore(w)}`);
            return "valid";
        } else {
            setPenalizedWords(p => [...p, w]);
            setStatusMessage(`✗ ${w} ${calculatePenalty(w)}`);
            return "invalid";
        }
    }, [allPossibleWords, foundWords, penalizedWords]);

    const scores = calculateTotalScore(foundWords, penalizedWords);

    const reset = useCallback(() => {
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(timeSeconds);
        setIsActive(false);
        setIsDone(false);
    }, [timeSeconds]);

    return {
        dictionaryLoaded, allPossibleWords, foundWords, penalizedWords,
        timeLeft, isActive, isDone, scores, statusMessage,
        start, endEarly, reset, submitWord,
    };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 20, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(237,232,223,0.45)", marginTop: 2 }}>{label}</div>
        </div>
    );
}

function BoardTypeBadge({ type }: { type: string }) {
    const config = {
        closed: { label: "Closed", color: "#6B4F9E", bg: "rgba(107,79,158,0.15)" },
        open: { label: "Open", color: "#2D6A4F", bg: "rgba(45,106,79,0.15)" },
        random: { label: "Random", color: "#1A5B8A", bg: "rgba(26,91,138,0.15)" },
    }[type] ?? { label: type, color: "#888", bg: "rgba(136,136,136,0.1)" };

    return (
        <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", background: config.bg, color: config.color, padding: "2px 7px", borderRadius: 5 }}>
            {config.label}
        </span>
    );
}

// ── Game Player (uses real board + pathfinder) ─────────────────────────────────

function MailGamePlayer({
    board, timeSeconds, serverStartedAt, onComplete, onCancel,
}: {
    board: string[][];
    timeSeconds: number;
    serverStartedAt: string | null;
    onComplete: (result: GameResult) => void;
    onCancel: () => void;
}) {
    const [currInput, setCurrInput] = useState("");
    const [pfEnabled, setPfEnabled] = useState(true);
    const {
        dictionaryLoaded, foundWords, penalizedWords,
        timeLeft, isActive, isDone, scores, statusMessage,
        start, endEarly, submitWord,
    } = useMailGame(board, timeSeconds, serverStartedAt);

    useEffect(() => {
        setPfEnabled(getPathfinderEnabled());
    }, []);

    const candidateTrail = useMemo(
        () => (pfEnabled && isActive && currInput && board.length > 0
            ? findCandidateTrail(currInput, board)
            : undefined),
        [currInput, board, isActive, pfEnabled]
    );

    useEffect(() => {
        if (dictionaryLoaded) start();
    }, [dictionaryLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isDone) return;
        const t = setTimeout(() => {
            onComplete({
                gross: scores.gross,
                penalty: scores.penalty,
                net: scores.net,
                words: foundWords,
                penaltyWords: penalizedWords,
            });
        }, 400);
        return () => clearTimeout(t);
    }, [isDone]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = () => {
        if (!currInput.trim()) return;
        submitWord(currInput);
        setCurrInput("");
    };

    if (!dictionaryLoaded) {
        return (
            <div className="flex items-center justify-center min-h-64 gap-3">
                <TbLoader2 className="animate-spin text-[#8A8A8A] w-5 h-5" />
                <span className="font-mono text-sm text-[#8A8A8A]">Loading dictionary…</span>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Score hero + Timer row */}
            <div className="grid grid-cols-[1fr_auto] gap-4 mb-6">
                <div className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] rounded-2xl p-5 shadow-xl border border-[#D4AF37]/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-mono uppercase tracking-widest text-[#8A9A90] mb-1">Net Score</div>
                            <motion.div
                                className="text-6xl font-serif font-bold text-[#F9F7F1]"
                                key={scores.net}
                                initial={{ scale: 1.15, color: "#D4AF37" }}
                                animate={{ scale: 1, color: "#F9F7F1" }}
                                transition={{ duration: 0.25 }}
                            >
                                {scores.net}
                            </motion.div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-right mr-2">
                            <div>
                                <div className="text-xl font-mono font-bold text-green-300">{scores.gross}</div>
                                <div className="text-[9px] uppercase tracking-widest text-[#8A9A90]">Gross</div>
                            </div>
                            <div>
                                <div className="text-xl font-mono font-bold text-red-300">{Math.abs(scores.penalty)}</div>
                                <div className="text-[9px] uppercase tracking-widest text-[#8A9A90]">Penalty</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-md border border-[#E6E4DD] flex flex-col items-center justify-center gap-2 min-w-[96px]">
                    <Timer timeLeft={timeLeft} gameActive={isActive} />
                    {isActive && (
                        <button
                            onClick={endEarly}
                            className="text-xs text-[#8A8A8A] hover:text-[#1A3C34] font-mono transition-colors mt-1"
                        >
                            End early
                        </button>
                    )}
                </div>
            </div>

            {/* Board */}
            <div className="flex justify-center mb-6">
                <Board
                    board={board}
                    onTileClick={(l) => { if (isActive) setCurrInput(p => p + l); }}
                    disabled={!isActive}
                    candidateTrail={candidateTrail}
                />
            </div>

            {/* Word input */}
            <div className="flex justify-center mb-2">
                <WordInput
                    currInput={currInput}
                    setCurrInput={setCurrInput}
                    onSubmit={handleSubmit}
                    gameActive={isActive}
                    statusMessage={statusMessage}
                />
            </div>

            {/* Word list */}
            <div className="flex justify-center mb-4">
                <FoundWordsList foundWords={foundWords} penalizedWords={penalizedWords} />
            </div>

            {/* Cancel */}
            <div className="flex justify-center mt-2">
                <button
                    onClick={onCancel}
                    className="text-sm text-[#8A8A8A] hover:text-[#1A3C34] font-sans transition-colors py-1 px-4"
                >
                    Cancel game
                </button>
            </div>
        </div>
    );
}

// ── Compose Settings ───────────────────────────────────────────────────────────

function ComposeSettings({
    friend,
    onStart,
    onBack,
}: {
    friend: Friend;
    onStart: (boardType: "closed" | "open" | "random", timeSeconds: number) => void;
    onBack: () => void;
    defaultParentId?: string | null;
}) {
    const [boardType, setBoardType] = useState<"closed" | "open" | "random">("closed");
    const [timeSeconds, setTimeSeconds] = useState(180);

    const boardOptions: { value: "closed" | "open" | "random"; label: string; desc: string }[] = [
        { value: "closed", label: "Closed", desc: "Same board · scores hidden until both play" },
        { value: "open", label: "Open", desc: "Same board · scores always visible" },
        { value: "random", label: "Random", desc: "Different boards · pure skill matchup" },
    ];

    const timeOptions = [
        { value: 60, label: "1 min" },
        { value: 180, label: "3 min" },
        { value: 300, label: "5 min" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#8A8A8A", fontFamily: "var(--font-geist-sans)", fontSize: 13, padding: 0, alignSelf: "flex-start" }}>
                <TbArrowLeft style={{ width: 16, height: 16 }} /> Back
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={friend.display_name ?? friend.username} userId={friend.user_id} size={40} />
                <div>
                    <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>{friend.display_name ?? friend.username}</div>
                    <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#8A8A8A" }}>@{friend.username} · {friend.rating} ELO</div>
                </div>
            </div>

            <div>
                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.18em", color: "#8A8A8A", marginBottom: 10 }}>Board Type</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {boardOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setBoardType(opt.value)}
                            style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "12px 16px", borderRadius: 12, border: "2px solid",
                                borderColor: boardType === opt.value ? "#1A3C34" : "#E6E4DD",
                                background: boardType === opt.value ? "rgba(26,60,52,0.04)" : "#fff",
                                cursor: "pointer", textAlign: "left",
                            }}
                        >
                            <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: boardType === opt.value ? "#1A3C34" : "#C0C0C0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {boardType === opt.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1A3C34" }} />}
                            </div>
                            <div>
                                <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{opt.label}</div>
                                <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 11, color: "#8A8A8A", marginTop: 1 }}>{opt.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.18em", color: "#8A8A8A", marginBottom: 10 }}>Time Limit</div>
                <div style={{ display: "flex", gap: 8 }}>
                    {timeOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setTimeSeconds(opt.value)}
                            style={{
                                flex: 1, padding: "10px 8px", borderRadius: 10,
                                border: "2px solid", borderColor: timeSeconds === opt.value ? "#1A3C34" : "#E6E4DD",
                                background: timeSeconds === opt.value ? "#1A3C34" : "#fff",
                                color: timeSeconds === opt.value ? "#EDE8DF" : "#1A1A1A",
                                fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={() => onStart(boardType, timeSeconds)}
                style={{ padding: "13px 24px", background: "#1A3C34", color: "#EDE8DF", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
                <TbSwords style={{ width: 18, height: 18 }} />
                Play &amp; Send
            </button>
        </div>
    );
}

// ── Mail card in thread ────────────────────────────────────────────────────────

function MailCard({
    mail, myId, onPlay, onReply,
}: {
    mail: MailItem;
    myId: string;
    onPlay: (mail: MailItem) => void;
    onReply: (mail: MailItem) => void;
}) {
    const iAmSender = mail.sender_id === myId;
    const partner = getPartner(mail, myId);
    const played = recipientPlayed(mail);
    const hideMyScore = senderScoreHidden(mail, myId);
    const canPlay = !iAmSender && !played;

    const myScore = iAmSender ? mail.sender_net : mail.recipient_net;
    const theirHidden = !iAmSender && hideMyScore ? false : (iAmSender && !played);

    const winner = played
        ? (mail.sender_net > (mail.recipient_net ?? 0) ? mail.sender_id : (mail.sender_net < (mail.recipient_net ?? 0) ? mail.recipient_id : null))
        : null;
    const iWon = winner === myId;

    return (
        <div style={{
            background: "#fff", border: "1px solid #E6E4DD", borderRadius: 16,
            padding: 18, boxShadow: "0 2px 8px -2px rgba(26,25,21,0.07)",
            borderLeft: iAmSender ? "3px solid #1A3C34" : "3px solid #D4AF37",
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={iAmSender ? "You" : (partner.display_name ?? partner.username)} userId={iAmSender ? myId : partner.id} size={28} />
                    <div>
                        <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, fontWeight: 700, color: "#1A1A1A" }}>
                            {iAmSender ? "You challenged" : `${partner.display_name ?? partner.username} challenged you`}
                        </div>
                        <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#8A8A8A" }}>{timeAgo(mail.created_at)} · {fmtTime(mail.time_seconds)}</div>
                    </div>
                </div>
                <BoardTypeBadge type={mail.board_type} />
            </div>

            <div style={{ background: "linear-gradient(135deg, #1A3C34 0%, #0F2016 100%)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(237,232,223,0.45)", marginBottom: 4 }}>You</div>
                    <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 32, fontWeight: 700, color: iWon ? "#D4AF37" : "#EDE8DF", lineHeight: 1 }}>
                        {iAmSender ? mail.sender_net : (hideMyScore ? "—" : (myScore ?? "—"))}
                    </div>
                    {iAmSender && <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, color: "rgba(237,232,223,0.4)", marginTop: 3 }}>{mail.sender_words.length} words</div>}
                    {!iAmSender && played && <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, color: "rgba(237,232,223,0.4)", marginTop: 3 }}>{mail.recipient_words?.length ?? 0} words</div>}
                </div>

                <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 14, color: "rgba(237,232,223,0.35)", fontWeight: 700 }}>vs</div>

                <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(237,232,223,0.45)", marginBottom: 4 }}>
                        {partner.display_name ?? partner.username}
                    </div>
                    <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 32, fontWeight: 700, color: !iWon && winner ? "#D4AF37" : "#EDE8DF", lineHeight: 1 }}>
                        {theirHidden ? "?" : (iAmSender ? (mail.recipient_net ?? "—") : mail.sender_net)}
                    </div>
                    {iAmSender && played && <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, color: "rgba(237,232,223,0.4)", marginTop: 3 }}>{mail.recipient_words?.length ?? 0} words</div>}
                    {!iAmSender && <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, color: "rgba(237,232,223,0.4)", marginTop: 3 }}>{mail.sender_words.length} words</div>}
                </div>
            </div>

            {played && winner && (
                <div style={{
                    background: iWon ? "rgba(212,175,55,0.12)" : "rgba(230,57,70,0.08)",
                    border: `1px solid ${iWon ? "rgba(212,175,55,0.3)" : "rgba(230,57,70,0.2)"}`,
                    borderRadius: 8, padding: "6px 12px", marginBottom: 12, textAlign: "center",
                    fontFamily: "var(--font-geist-sans)", fontSize: 12, fontWeight: 700,
                    color: iWon ? "#A0832E" : "#C0393F",
                }}>
                    {iWon ? "🏆 You won!" : "You lost this round"}
                </div>
            )}
            {played && !winner && (
                <div style={{ background: "rgba(26,60,52,0.06)", borderRadius: 8, padding: "6px 12px", marginBottom: 12, textAlign: "center", fontFamily: "var(--font-geist-sans)", fontSize: 12, fontWeight: 700, color: "#1A3C34" }}>
                    It&apos;s a tie!
                </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
                {canPlay && (
                    <button
                        onClick={() => onPlay(mail)}
                        style={{ flex: 1, padding: "9px 14px", background: "#1A3C34", color: "#EDE8DF", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                        <TbSwords style={{ width: 15, height: 15 }} /> Play Game
                    </button>
                )}
                {played && (
                    <button
                        onClick={() => onReply(mail)}
                        style={{ flex: canPlay ? 0 : 1, padding: "9px 14px", background: canPlay ? "transparent" : "#D4AF37", color: canPlay ? "#1A3C34" : "#111F1C", border: canPlay ? "1px solid #E6E4DD" : "none", borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                        <TbRefresh style={{ width: 14, height: 14 }} /> Rematch
                    </button>
                )}
                {!canPlay && !played && iAmSender && (
                    <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#8A8A8A", alignSelf: "center" }}>
                        Waiting for {partner.display_name ?? partner.username}…
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Conversation list item ─────────────────────────────────────────────────────

function ConversationRow({
    partner, latestMail, unread, isActive, onClick,
}: {
    partner: MailUser;
    latestMail: MailItem;
    unread: number;
    isActive: boolean;
    onClick: () => void;
}) {
    const name = partner.display_name ?? partner.username;
    return (
        <button
            onClick={onClick}
            style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", border: "none", width: "100%", textAlign: "left",
                background: isActive ? "rgba(26,60,52,0.06)" : "transparent",
                cursor: "pointer", borderLeft: isActive ? "3px solid #1A3C34" : "3px solid transparent",
                transition: "all 150ms",
            }}
            className="hover:bg-[rgba(26,60,52,0.04)]"
        >
            <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar name={name} userId={partner.id} size={36} />
                {unread > 0 && (
                    <div style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#E63946", border: "2px solid #F9F7F1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 8, fontWeight: 700, color: "#fff" }}>{unread}</span>
                    </div>
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: unread > 0 ? 700 : 600, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, color: "#8A8A8A", flexShrink: 0, marginLeft: 6 }}>{timeAgo(latestMail.created_at)}</span>
                </div>
                <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 11, color: "#8A8A8A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                    {unread > 0 ? `${unread} game${unread > 1 ? "s" : ""} waiting to play` : `${latestMail.sender_net} vs ${latestMail.recipient_net ?? "?"}`}
                </div>
            </div>
        </button>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Stage =
    | { type: "inbox" }
    | { type: "thread"; partnerId: string; partnerInfo: MailUser }
    | { type: "pick-friend" }
    | { type: "compose-settings"; friend: Friend; parentId?: string | null }
    | { type: "game"; board: string[][]; timeSeconds: number; boardType: "closed" | "open" | "random"; recipientId: string; parentId?: string | null }
    | { type: "game-sent"; result: GameResult; recipientId: string; board: string[][]; boardType: "closed" | "open" | "random"; timeSeconds: number; recipientBoard: string[][] | null; parentId: string | null }
    | { type: "play-game"; mail: MailItem; serverStartedAt: string }
    | { type: "play-sent"; mail: MailItem; result: GameResult };

export function MoggleMailView({ user, friends, onClose }: {
    user: User;
    friends: Friend[];
    onClose?: () => void;
}) {
    const [stage, setStage] = useState<Stage>({ type: "inbox" });
    const [mails, setMails] = useState<MailItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");

    const fetchMails = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/mail");
            if (res.ok) setMails((await res.json()).mails ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMails(); }, [fetchMails]);

    // Auto-send after sender finishes their game
    useEffect(() => {
        if (stage.type !== "game-sent") return;
        let cancelled = false;
        setSending(true);
        setSendError("");

        (async () => {
            try {
                const res = await fetch("/api/mail", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        recipient_id: stage.recipientId,
                        board_letters: stage.board,
                        board_type: stage.boardType,
                        time_seconds: stage.timeSeconds,
                        sender_gross: stage.result.gross,
                        sender_penalty: stage.result.penalty,
                        sender_net: stage.result.net,
                        sender_words: stage.result.words,
                        sender_penalty_words: stage.result.penaltyWords,
                        recipient_board_letters: stage.recipientBoard,
                        parent_id: stage.parentId,
                    }),
                });
                if (cancelled) return;
                if (res.ok) {
                    await fetchMails();
                    if (!cancelled) setStage({ type: "inbox" });
                } else {
                    const d = await res.json();
                    if (!cancelled) setSendError(d.error ?? "Failed to send");
                }
            } catch (e: unknown) {
                if (!cancelled) setSendError(e instanceof Error ? e.message : "Failed to send");
            } finally {
                if (!cancelled) setSending(false);
            }
        })();

        return () => { cancelled = true; };
    }, [stage, fetchMails]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-submit after recipient finishes their game
    useEffect(() => {
        if (stage.type !== "play-sent") return;
        let cancelled = false;
        setSending(true);
        setSendError("");

        (async () => {
            try {
                const res = await fetch(`/api/mail/${stage.mail.id}/play`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        gross: stage.result.gross,
                        penalty: stage.result.penalty,
                        net: stage.result.net,
                        words: stage.result.words,
                        penalty_words: stage.result.penaltyWords,
                    }),
                });
                if (cancelled) return;
                if (res.ok) {
                    const updated = await res.json();
                    setMails(prev => prev.map(m => m.id === updated.mail.id ? updated.mail : m));
                    const partner = getPartner(stage.mail, user.id);
                    if (!cancelled) setStage({ type: "thread", partnerId: partner.id, partnerInfo: partner });
                } else {
                    if (!cancelled) setSendError("Failed to submit result");
                }
            } catch (e: unknown) {
                if (!cancelled) setSendError(e instanceof Error ? e.message : "Failed to submit");
            } finally {
                if (!cancelled) setSending(false);
            }
        })();

        return () => { cancelled = true; };
    }, [stage, user.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const conversations = groupConversations(mails, user.id);
    const totalUnread = countUnread(mails, user.id);

    const convList = Array.from(conversations.entries())
        .map(([partnerId, pMails]) => {
            const sorted = [...pMails].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const latest = sorted[0];
            const partner = getPartner(latest, user.id);
            const unread = pMails.filter(m => m.recipient_id === user.id && !m.recipient_played_at).length;
            return { partnerId, partner, mails: sorted, latest, unread };
        })
        .sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());

    const handleComposeFriend = (friend: Friend, parentId?: string | null) => {
        setStage({ type: "compose-settings", friend, parentId });
    };

    const handleStartGame = (boardType: "closed" | "open" | "random", timeSeconds: number, friend: Friend, parentId?: string | null) => {
        const senderBoard = generateBoard();
        setStage({ type: "game", board: senderBoard, timeSeconds, boardType, recipientId: friend.user_id, parentId: parentId ?? null });
    };

    const handleGameComplete = useCallback((result: GameResult) => {
        setStage(prev => {
            if (prev.type !== "game") return prev;
            const recipientBoard = prev.boardType === "random" ? generateBoard() : null;
            return {
                type: "game-sent",
                result,
                recipientId: prev.recipientId,
                board: prev.board,
                boardType: prev.boardType,
                timeSeconds: prev.timeSeconds,
                recipientBoard,
                parentId: prev.parentId ?? null,
            };
        });
    }, []);

    const handlePlayComplete = useCallback((result: GameResult) => {
        setStage(prev => {
            if (prev.type !== "play-game") return prev;
            return { type: "play-sent", mail: prev.mail, result };
        });
    }, []);

    const handlePlayMail = async (mail: MailItem) => {
        setSending(true);
        try {
            const res = await fetch(`/api/mail/${mail.id}/start`, { method: "POST" });
            if (!res.ok) return;
            const { started_at } = await res.json();
            setStage({ type: "play-game", mail, serverStartedAt: started_at });
        } finally {
            setSending(false);
        }
    };

    const handleReplyToMail = (mail: MailItem) => {
        const partner = getPartner(mail, user.id);
        const friend = friends.find(f => f.user_id === partner.id);
        if (friend) {
            setStage({ type: "compose-settings", friend, parentId: mail.id });
        }
    };

    // ── Render ──

    const renderLeft = () => (
        <div style={{ width: 260, borderRight: "1px solid rgba(26,25,21,0.09)", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(26,25,21,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TbMail style={{ width: 18, height: 18, color: "#1A3C34" }} />
                    <span style={{ fontFamily: "var(--font-fraunces)", fontSize: 16, fontWeight: 700, color: "#1A3C34" }}>Moggle Mail</span>
                    {totalUnread > 0 && (
                        <span style={{ background: "#E63946", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700 }}>{totalUnread}</span>
                    )}
                </div>
                {onClose && (
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A8A", padding: 4 }}>
                        <TbX style={{ width: 16, height: 16 }} />
                    </button>
                )}
            </div>

            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(26,25,21,0.07)" }}>
                <button
                    onClick={() => setStage({ type: "pick-friend" })}
                    style={{ width: "100%", padding: "9px 14px", background: "#1A3C34", color: "#EDE8DF", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                >
                    <TbSend style={{ width: 15, height: 15 }} /> New Mail
                </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
                {loading ? (
                    <div style={{ padding: 24, textAlign: "center", fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#8A8A8A" }}>Loading…</div>
                ) : convList.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center" }}>
                        <TbInbox style={{ width: 32, height: 32, color: "#C0C0C0", margin: "0 auto 8px" }} />
                        <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, color: "#8A8A8A" }}>No mail yet</div>
                        <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 11, color: "#B0B0B0", marginTop: 4 }}>Challenge a friend to get started</div>
                    </div>
                ) : (
                    convList.map(({ partnerId, partner, latest, unread }) => (
                        <ConversationRow
                            key={partnerId}
                            partner={partner}
                            latestMail={latest}
                            unread={unread}
                            isActive={stage.type === "thread" && stage.partnerId === partnerId}
                            onClick={() => setStage({ type: "thread", partnerId, partnerInfo: partner })}
                        />
                    ))
                )}
            </div>
        </div>
    );

    const renderRight = () => {
        // Thread view
        if (stage.type === "thread") {
            const threadMails = conversations.get(stage.partnerId) ?? [];
            const sorted = [...threadMails].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const replyFriend = friends.find(f => f.user_id === stage.partnerId);

            return (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(26,25,21,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => setStage({ type: "inbox" })} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8A8A", padding: 4, display: "flex" }}>
                                <TbArrowLeft style={{ width: 18, height: 18 }} />
                            </button>
                            <Avatar name={stage.partnerInfo.display_name ?? stage.partnerInfo.username} userId={stage.partnerId} size={32} />
                            <div>
                                <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{stage.partnerInfo.display_name ?? stage.partnerInfo.username}</div>
                                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#8A8A8A" }}>@{stage.partnerInfo.username}</div>
                            </div>
                        </div>
                        {replyFriend && (
                            <button
                                onClick={() => handleComposeFriend(replyFriend)}
                                style={{ padding: "7px 14px", background: "#1A3C34", color: "#EDE8DF", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-geist-sans)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
                            >
                                <TbSend style={{ width: 14, height: 14 }} /> Challenge
                            </button>
                        )}
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                        {sorted.map(mail => (
                            <MailCard
                                key={mail.id}
                                mail={mail}
                                myId={user.id}
                                onPlay={handlePlayMail}
                                onReply={handleReplyToMail}
                            />
                        ))}
                    </div>
                </div>
            );
        }

        // Friend picker
        if (stage.type === "pick-friend") {
            return (
                <div style={{ flex: 1, padding: 28 }}>
                    <button onClick={() => setStage({ type: "inbox" })} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#8A8A8A", fontFamily: "var(--font-geist-sans)", fontSize: 13, padding: 0, marginBottom: 20 }}>
                        <TbArrowLeft style={{ width: 16, height: 16 }} /> Back
                    </button>
                    <h3 style={{ fontFamily: "var(--font-fraunces)", fontSize: 20, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>Send Moggle Mail</h3>
                    <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, color: "#8A8A8A", marginBottom: 20 }}>Pick a friend to challenge</p>
                    {friends.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 32, color: "#8A8A8A", fontFamily: "var(--font-geist-sans)", fontSize: 13 }}>
                            Add friends first to send mail
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {friends.map(f => (
                                <button
                                    key={f.user_id}
                                    onClick={() => handleComposeFriend(f)}
                                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", border: "1px solid #E6E4DD", borderRadius: 12, cursor: "pointer", textAlign: "left" }}
                                    className="hover:border-[#1A3C34] transition-colors"
                                >
                                    <div style={{ position: "relative" }}>
                                        <Avatar name={f.display_name ?? f.username} userId={f.user_id} size={36} />
                                        <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", border: "2px solid #fff", background: f.is_online ? "#2D6A4F" : "#C0C0C0" }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{f.display_name ?? f.username}</div>
                                        <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#8A8A8A" }}>@{f.username} · {f.rating} ELO</div>
                                    </div>
                                    <TbSend style={{ width: 15, height: 15, color: "#C0C0C0" }} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // Compose settings
        if (stage.type === "compose-settings") {
            return (
                <div style={{ flex: 1, padding: 28, maxWidth: 480 }}>
                    <ComposeSettings
                        friend={stage.friend}
                        onBack={() => setStage({ type: "inbox" })}
                        onStart={(boardType, timeSeconds) => handleStartGame(boardType, timeSeconds, stage.friend, stage.parentId)}
                        defaultParentId={stage.parentId}
                    />
                </div>
            );
        }

        // Sender's game — plays before the mail is sent
        if (stage.type === "game") {
            return (
                <div style={{ flex: 1, padding: "20px 28px", overflow: "auto" }}>
                    <div style={{ marginBottom: 16, fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "#8A8A8A" }}>
                        Play your game — your result is sent automatically when time&apos;s up
                    </div>
                    <MailGamePlayer
                        board={stage.board}
                        timeSeconds={stage.timeSeconds}
                        serverStartedAt={null}
                        onComplete={handleGameComplete}
                        onCancel={() => setStage({ type: "inbox" })}
                    />
                </div>
            );
        }

        // Auto-sending the mail — shows score while API call runs
        if (stage.type === "game-sent") {
            return (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, padding: 28 }}>
                    <div style={{ background: "linear-gradient(135deg, #1A3C34, #0F2016)", borderRadius: 20, padding: "32px 40px", textAlign: "center", border: "1px solid rgba(212,175,55,0.2)", minWidth: 220 }}>
                        <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(237,232,223,0.45)", marginBottom: 8 }}>Your Score</div>
                        <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 72, fontWeight: 700, color: "#EDE8DF", lineHeight: 1, marginBottom: 20 }}>{stage.result.net}</div>
                        <div style={{ display: "flex", gap: 28, justifyContent: "center" }}>
                            <ScorePill label="Gross" value={stage.result.gross} color="#86EFAC" />
                            <ScorePill label="Penalty" value={stage.result.penalty} color="#FCA5A5" />
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 20, fontWeight: 700, color: "#EDE8DF" }}>{stage.result.words.length}</div>
                                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(237,232,223,0.45)", marginTop: 2 }}>Words</div>
                            </div>
                        </div>
                    </div>
                    {sendError ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ color: "#E63946", fontFamily: "var(--font-geist-sans)", fontSize: 13, marginBottom: 12 }}>{sendError}</div>
                            <button
                                onClick={() => setSendError("")}
                                style={{ padding: "9px 20px", background: "#1A3C34", color: "#EDE8DF", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 600 }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-geist-sans)", fontSize: 14, color: "#8A8A8A" }}>
                            <TbLoader2 className="animate-spin" style={{ width: 18, height: 18 }} />
                            Sending to friend…
                        </div>
                    )}
                </div>
            );
        }

        // Recipient's game
        if (stage.type === "play-game") {
            const board = getBoardForPlay(stage.mail);
            return (
                <div style={{ flex: 1, padding: "20px 28px", overflow: "auto" }}>
                    <div style={{ marginBottom: 16, fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "#8A8A8A" }}>
                        Playing challenge from {stage.mail.sender.display_name ?? stage.mail.sender.username}
                    </div>
                    <MailGamePlayer
                        board={board}
                        timeSeconds={stage.mail.time_seconds}
                        serverStartedAt={stage.serverStartedAt}
                        onComplete={handlePlayComplete}
                        onCancel={() => {
                            const partner = getPartner(stage.mail, user.id);
                            setStage({ type: "thread", partnerId: partner.id, partnerInfo: partner });
                        }}
                    />
                </div>
            );
        }

        // Auto-submitting recipient's result — shows score comparison while API call runs
        if (stage.type === "play-sent") {
            const mail = stage.mail;
            const partner = getPartner(mail, user.id);
            const myNet = stage.result.net;
            const theirNet = mail.sender_net;
            const winner = myNet > theirNet ? "me" : myNet < theirNet ? "them" : "tie";

            return (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, padding: 28 }}>
                    <div style={{ background: "linear-gradient(135deg, #1A3C34 0%, #0F2016 100%)", borderRadius: 20, padding: "24px 32px", width: "100%", maxWidth: 360, border: "1px solid rgba(212,175,55,0.2)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(237,232,223,0.45)", marginBottom: 6 }}>You</div>
                                <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 48, fontWeight: 700, color: winner === "me" ? "#D4AF37" : "#EDE8DF", lineHeight: 1 }}>{myNet}</div>
                                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, color: "rgba(237,232,223,0.4)", marginTop: 4 }}>{stage.result.words.length} words</div>
                            </div>
                            <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 18, color: "rgba(237,232,223,0.3)", fontWeight: 700 }}>vs</div>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(237,232,223,0.45)", marginBottom: 6 }}>{partner.display_name ?? partner.username}</div>
                                <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 48, fontWeight: 700, color: winner === "them" ? "#D4AF37" : "#EDE8DF", lineHeight: 1 }}>{theirNet}</div>
                                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, color: "rgba(237,232,223,0.4)", marginTop: 4 }}>{mail.sender_words.length} words</div>
                            </div>
                        </div>
                    </div>
                    <div style={{
                        background: winner === "me" ? "rgba(212,175,55,0.12)" : winner === "them" ? "rgba(230,57,70,0.08)" : "rgba(26,60,52,0.06)",
                        border: `1px solid ${winner === "me" ? "rgba(212,175,55,0.3)" : winner === "them" ? "rgba(230,57,70,0.2)" : "rgba(26,60,52,0.12)"}`,
                        borderRadius: 10, padding: "10px 20px", textAlign: "center",
                        fontFamily: "var(--font-geist-sans)", fontSize: 15, fontWeight: 700,
                        color: winner === "me" ? "#A0832E" : winner === "them" ? "#C0393F" : "#1A3C34",
                    }}>
                        {winner === "me" ? "🏆 You won!" : winner === "them" ? "Better luck next time!" : "It's a tie!"}
                    </div>
                    {sendError ? (
                        <div style={{ color: "#E63946", fontFamily: "var(--font-geist-sans)", fontSize: 13 }}>{sendError}</div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-geist-sans)", fontSize: 14, color: "#8A8A8A" }}>
                            <TbLoader2 className="animate-spin" style={{ width: 18, height: 18 }} />
                            Saving result…
                        </div>
                    )}
                </div>
            );
        }

        // Inbox / default
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#8A8A8A" }}>
                <TbMailOpened style={{ width: 48, height: 48, opacity: 0.3 }} />
                <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14 }}>Select a conversation</div>
                <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, opacity: 0.7 }}>or send a New Mail to start playing</div>
            </div>
        );
    };

    return (
        <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#F9F7F1" }}>
            {renderLeft()}
            <div style={{ flex: 1, overflow: "auto", display: "flex" }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={stage.type}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                        style={{ flex: 1, display: "flex" }}
                    >
                        {renderRight()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
