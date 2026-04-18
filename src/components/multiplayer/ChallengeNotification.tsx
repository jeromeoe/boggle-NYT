"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TbSwords, TbX } from "react-icons/tb";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@/lib/supabase/client";

interface Invite {
    room_id: string;
    room_code: string;
    challenger_username: string;
    challenger_display_name: string | null;
}

interface Props {
    user: User | null;
    onAccept: (roomCode: string) => void;
}

export function ChallengeNotification({ user, onAccept }: Props) {
    const [invite, setInvite] = useState<Invite | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user) return;

        // Use postgres_changes instead of broadcast — no extra WebSocket channel needed,
        // piggybacks on the existing Supabase Realtime connection.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const channel = (supabase.channel('challenge_invites_listener') as any).on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'challenge_invites',
                filter: `invited_user_id=eq.${user.id}`,
            },
            (payload: { new: { room_id: string; room_code: string; challenger_username: string; challenger_display_name: string | null } }) => {
                const row = payload.new;
                setInvite({
                    room_id: row.room_id,
                    room_code: row.room_code,
                    challenger_username: row.challenger_username,
                    challenger_display_name: row.challenger_display_name,
                });
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setInvite(null), 30_000);
            }
        );

        channel.subscribe();
        channelRef.current = channel;

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            supabase.removeChannel(channel);
        };
    }, [user]);

    const dismiss = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setInvite(null);
    };

    const accept = () => {
        if (!invite) return;
        onAccept(invite.room_code);
        dismiss();
    };

    const challengerName = invite
        ? (invite.challenger_display_name ?? invite.challenger_username)
        : null;

    return (
        <AnimatePresence>
            {invite && (
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.95 }}
                    transition={{ type: "spring", damping: 22, stiffness: 280 }}
                    className="fixed bottom-6 right-6 z-50 w-80 bg-[#1A3C34] text-[#F9F7F1] rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Progress bar — drains over 30s */}
                    <motion.div
                        className="absolute top-0 left-0 h-0.5 bg-[#D4AF37]"
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 30, ease: "linear" }}
                    />

                    <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                                    <TbSwords className="w-5 h-5 text-[#D4AF37]" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold leading-tight">Challenge!</p>
                                    <p className="text-xs text-[#8A9A90] mt-0.5">
                                        <span className="text-[#F9F7F1] font-semibold">{challengerName}</span> wants to play
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={dismiss}
                                className="p-1 rounded-lg hover:bg-white/10 text-[#8A9A90] hover:text-[#F9F7F1] transition-colors flex-shrink-0"
                            >
                                <TbX className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={accept}
                                className="flex-1 py-2 bg-[#D4AF37] hover:bg-[#C5A028] text-[#1A3C34] font-bold text-sm rounded-lg transition-colors"
                            >
                                Accept
                            </button>
                            <button
                                onClick={dismiss}
                                className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-[#F9F7F1] font-semibold text-sm rounded-lg transition-colors"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
