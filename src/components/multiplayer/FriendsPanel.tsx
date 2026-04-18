"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TbUserPlus, TbCheck, TbX, TbUserCircle, TbSwords, TbLoader2 } from "react-icons/tb";
import type { User } from "@/lib/supabase/client";

interface Friend {
    friendship_id: string;
    user_id: string;
    username: string;
    display_name: string | null;
    rating: number;
    is_online: boolean;
    last_seen_at: string | null;
}

interface PendingRequest {
    id: string;
    requester: { id: string; username: string; display_name: string | null };
}

interface FriendsPanelProps {
    user: User | null;
    onSignInClick: () => void;
    onChallenge?: (friendUserId: string, displayName: string | null, username: string) => Promise<void>;
}

export function FriendsPanel({ user, onSignInClick, onChallenge }: FriendsPanelProps) {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [pending, setPending] = useState<PendingRequest[]>([]);
    const [addUsername, setAddUsername] = useState("");
    const [addState, setAddState] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [addMsg, setAddMsg] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [challengingId, setChallengingId] = useState<string | null>(null);

    const fetchFriends = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [friendsRes, pendingRes] = await Promise.all([
                fetch("/api/friends"),
                fetch("/api/friends/pending"),
            ]);
            if (friendsRes.ok) setFriends((await friendsRes.json()).friends ?? []);
            if (pendingRes.ok) setPending((await pendingRes.json()).requests ?? []);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    // Presence heartbeat every 60s
    useEffect(() => {
        if (!user) return;
        const ping = () => fetch("/api/friends/presence", { method: "POST" });
        ping();
        const interval = setInterval(ping, 60_000);
        return () => clearInterval(interval);
    }, [user]);

    const handleAddFriend = async () => {
        if (!addUsername.trim()) return;
        setAddState("loading");
        const res = await fetch("/api/friends", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: addUsername.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
            setAddState("success");
            setAddMsg(data.message);
            setAddUsername("");
            setTimeout(() => { setAddState("idle"); setShowAdd(false); }, 2000);
        } else {
            setAddState("error");
            setAddMsg(data.error);
            setTimeout(() => setAddState("idle"), 3000);
        }
    };

    const handleRespond = async (friendship_id: string, action: "accept" | "decline") => {
        await fetch("/api/friends/respond", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ friendship_id, action }),
        });
        fetchFriends();
    };

    const handleChallenge = async (f: Friend) => {
        if (!onChallenge || challengingId) return;
        setChallengingId(f.user_id);
        try {
            await onChallenge(f.user_id, f.display_name, f.username);
        } finally {
            setChallengingId(null);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-10 text-center px-4">
                <TbUserCircle className="w-12 h-12 text-[#8A9A90]" />
                <p className="text-sm text-[#8A9A90]">Sign in to see your friends and challenge them to a game.</p>
                <button
                    onClick={onSignInClick}
                    className="px-5 py-2 bg-[#1A3C34] text-[#F9F7F1] rounded-lg text-sm font-semibold hover:bg-[#142E28] transition-colors"
                >
                    Sign In
                </button>
            </div>
        );
    }

    const online = friends.filter(f => f.is_online);
    const offline = friends.filter(f => !f.is_online);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6E4DD]">
                <div>
                    <span className="text-sm font-bold text-[#1A3C34]">Friends</span>
                    {friends.length > 0 && (
                        <span className="ml-2 text-xs text-[#8A9A90]">
                            {online.length} online
                        </span>
                    )}
                </div>
                <button
                    onClick={() => { setShowAdd(v => !v); setAddState("idle"); setAddMsg(""); }}
                    className="p-1.5 rounded-lg hover:bg-[#E6E4DD] text-[#1A3C34] transition-colors"
                    title="Add friend"
                >
                    <TbUserPlus className="w-4 h-4" />
                </button>
            </div>

            {/* Add friend input */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b border-[#E6E4DD]"
                    >
                        <div className="px-4 py-3 flex flex-col gap-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={addUsername}
                                    onChange={e => setAddUsername(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleAddFriend()}
                                    placeholder="Username"
                                    className="flex-1 px-3 py-1.5 text-sm bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3C34]"
                                />
                                <button
                                    onClick={handleAddFriend}
                                    disabled={addState === "loading"}
                                    className="px-3 py-1.5 bg-[#1A3C34] text-[#F9F7F1] rounded-lg text-sm font-semibold hover:bg-[#142E28] disabled:opacity-50 transition-colors"
                                >
                                    {addState === "loading" ? "..." : "Add"}
                                </button>
                            </div>
                            {addMsg && (
                                <p className={`text-xs ${addState === "success" ? "text-green-600" : "text-red-500"}`}>
                                    {addMsg}
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pending requests */}
            {pending.length > 0 && (
                <div className="border-b border-[#E6E4DD]">
                    <p className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-[#8A9A90]">Requests</p>
                    {pending.map(req => (
                        <div key={req.id} className="flex items-center justify-between px-4 py-2">
                            <div>
                                <p className="text-sm font-semibold text-[#1A3C34]">{req.requester.display_name ?? req.requester.username}</p>
                                <p className="text-xs text-[#8A9A90]">@{req.requester.username}</p>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleRespond(req.id, "accept")}
                                    className="p-1.5 rounded-lg bg-[#2D6A4F]/10 text-[#2D6A4F] hover:bg-[#2D6A4F]/20 transition-colors"
                                >
                                    <TbCheck className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleRespond(req.id, "decline")}
                                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                >
                                    <TbX className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Friends list */}
            <div className="flex-1 overflow-y-auto">
                {loading && friends.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="text-xs text-[#8A9A90] animate-pulse">Loading...</div>
                    </div>
                ) : friends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
                        <p className="text-sm text-[#8A9A90]">No friends yet.</p>
                        <p className="text-xs text-[#B0B0B0]">Add a friend by username to challenge them.</p>
                    </div>
                ) : (
                    <>
                        {online.length > 0 && (
                            <>
                                <p className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-[#8A9A90]">Online</p>
                                {online.map(f => (
                                    <FriendRow
                                        key={f.user_id}
                                        friend={f}
                                        onChallenge={onChallenge ? () => handleChallenge(f) : undefined}
                                        isChallenging={challengingId === f.user_id}
                                    />
                                ))}
                            </>
                        )}
                        {offline.length > 0 && (
                            <>
                                <p className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-[#8A9A90]">Offline</p>
                                {offline.map(f => (
                                    <FriendRow
                                        key={f.user_id}
                                        friend={f}
                                        onChallenge={onChallenge ? () => handleChallenge(f) : undefined}
                                        isChallenging={challengingId === f.user_id}
                                    />
                                ))}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function FriendRow({ friend, onChallenge, isChallenging }: {
    friend: Friend;
    onChallenge?: () => void;
    isChallenging?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0EEE8] transition-colors"
        >
            {/* Avatar + online dot */}
            <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#1A3C34] flex items-center justify-center text-[#F9F7F1] text-sm font-bold">
                    {(friend.display_name ?? friend.username)[0].toUpperCase()}
                </div>
                <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#F9F7F1] ${friend.is_online ? "bg-[#2D6A4F]" : "bg-[#C0C0C0]"}`}
                />
            </div>

            {/* Name + username + ELO */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#1A3C34] truncate">
                        {friend.display_name ?? friend.username}
                    </p>
                    <span className="text-xs font-mono text-[#D4AF37] font-bold flex-shrink-0">
                        {friend.rating}
                    </span>
                </div>
                <p className="text-xs text-[#8A9A90] truncate">@{friend.username}</p>
            </div>

            {/* Challenge button — visible on hover */}
            {onChallenge && (
                <button
                    onClick={onChallenge}
                    disabled={isChallenging}
                    title="Quick challenge"
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg bg-[#1A3C34] text-[#F9F7F1] hover:bg-[#D4AF37] hover:text-[#1A3C34] transition-all disabled:opacity-50"
                >
                    {isChallenging
                        ? <TbLoader2 className="w-3.5 h-3.5 animate-spin" />
                        : <TbSwords className="w-3.5 h-3.5" />
                    }
                </button>
            )}
        </motion.div>
    );
}
