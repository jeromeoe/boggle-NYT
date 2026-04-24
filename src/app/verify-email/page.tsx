"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { TbMailCheck, TbMailX, TbLoader2 } from "react-icons/tb";
import NoiseOverlay from "@/components/shared/noise-overlay";

type Status = "loading" | "success" | "error" | "already_verified";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<Status>("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("No verification token found in this link.");
            return;
        }

        fetch("/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setStatus("error");
                    setMessage(data.error);
                } else if (data.message === "Email already verified.") {
                    setStatus("already_verified");
                    setMessage(data.message);
                } else {
                    setStatus("success");
                    setMessage(data.message);
                    setTimeout(() => router.push("/"), 3000);
                }
            })
            .catch(() => {
                setStatus("error");
                setMessage("Network error. Please try again.");
            });
    }, [token, router]);

    return (
        <div className="px-8 py-10 text-center space-y-6">
            {status === "loading" && (
                <>
                    <div className="flex justify-center">
                        <TbLoader2 className="w-12 h-12 text-[#1A3C34] animate-spin" />
                    </div>
                    <p className="text-[#555] text-sm">Verifying your email…</p>
                </>
            )}

            {status === "success" && (
                <>
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center">
                            <TbMailCheck className="w-9 h-9 text-[#2D6A4F]" />
                        </div>
                    </div>
                    <div>
                        <p className="text-lg font-serif font-semibold text-[#1A3C34]">You're verified!</p>
                        <p className="text-sm text-[#555] mt-1 leading-relaxed">
                            Daily Stats are now active — streaks, medals, and personal bests will be saved after every daily challenge.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 justify-center text-xs text-[#888]">
                        <TbLoader2 className="w-3.5 h-3.5 animate-spin" />
                        Redirecting to the game…
                    </div>
                </>
            )}

            {status === "already_verified" && (
                <>
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center">
                            <TbMailCheck className="w-9 h-9 text-[#2D6A4F]" />
                        </div>
                    </div>
                    <div>
                        <p className="text-lg font-serif font-semibold text-[#1A3C34]">Already verified</p>
                        <p className="text-sm text-[#555] mt-1">Your email is confirmed. You're all set.</p>
                    </div>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-[#1A3C34] text-[#F9F7F1] rounded-lg font-semibold text-sm hover:bg-[#142E28] transition-colors"
                    >
                        Go to Game
                    </Link>
                </>
            )}

            {status === "error" && (
                <>
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#9B2226]/10 flex items-center justify-center">
                            <TbMailX className="w-9 h-9 text-[#9B2226]" />
                        </div>
                    </div>
                    <div>
                        <p className="text-lg font-serif font-semibold text-[#1A3C34]">Verification failed</p>
                        <p className="text-sm text-[#9B2226] mt-1">{message}</p>
                    </div>
                    <div className="space-y-2">
                        <Link
                            href="/settings"
                            className="block w-full px-6 py-3 bg-[#1A3C34] text-[#F9F7F1] rounded-lg font-semibold text-sm hover:bg-[#142E28] transition-colors text-center"
                        >
                            Resend from Settings
                        </Link>
                        <Link
                            href="/"
                            className="block w-full text-sm text-[#888] hover:text-[#1A3C34] hover:underline transition-colors py-2"
                        >
                            Back to Game
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen bg-[#F9F7F1] flex items-center justify-center p-4 relative overflow-hidden">
            <NoiseOverlay />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="relative z-10 bg-white rounded-2xl shadow-xl border border-[#E6E4DD] w-full max-w-md overflow-hidden"
            >
                <div className="h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
                <div className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] text-[#F9F7F1] px-8 py-6 text-center">
                    <div className="text-sm font-mono uppercase tracking-widest text-[#D4AF37] mb-1">
                        BOGGLE<span className="text-[#8A9A90]">.WEB</span>
                    </div>
                    <h1 className="text-2xl font-serif font-bold">Email Verification</h1>
                </div>
                <Suspense fallback={
                    <div className="px-8 py-10 text-center">
                        <TbLoader2 className="w-12 h-12 text-[#1A3C34] animate-spin mx-auto" />
                        <p className="text-[#555] text-sm mt-4">Loading…</p>
                    </div>
                }>
                    <VerifyEmailContent />
                </Suspense>
            </motion.div>
        </div>
    );
}
