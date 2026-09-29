"use client";

import { useEffect, useState } from "react";
import { signIn, signUp, saveUserSession, forgotPassword } from "@/lib/supabase/auth";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@/lib/supabase/client";
import { TbEye, TbEyeOff, TbMailCheck, TbX } from "react-icons/tb";
import { Engraving } from "@/components/shared/Engraving";

type AuthMode = "signin" | "signup" | "forgot" | "verify_pending";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: (user: User) => void;
    initialMode?: "signin" | "signup";
    initialInfoMessage?: string;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = "signin", initialInfoMessage = "" }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [infoMessage, setInfoMessage] = useState(initialInfoMessage);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [pendingUser, setPendingUser] = useState<User | null>(null);
    const [resendCooldown, setResendCooldown] = useState(false);

    const resetFields = () => {
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setEmail("");
        setDisplayName("");
        setError("");
        setInfoMessage("");
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    useEffect(() => {
        setInfoMessage(initialInfoMessage);
    }, [initialInfoMessage]);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [isOpen, onClose]);

    const switchMode = (next: AuthMode) => {
        resetFields();
        setMode(next);
    };

    const handleResendVerification = async () => {
        if (resendCooldown) return;
        setResendCooldown(true);
        setError("");
        try {
            const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) setError(data.error ?? 'Failed to resend.');
            else setInfoMessage('Verification email resent!');
        } catch {
            setError('Network error. Please try again.');
        }
        setTimeout(() => setResendCooldown(false), 120_000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfoMessage("");

        if (mode === "signup" && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            if (mode === "forgot") {
                const result = await forgotPassword(username);
                setInfoMessage(result.message);
                return;
            }

            if (mode === "signin") {
                const { user, error } = await signIn(username, password);
                if (error) throw new Error(error);
                if (user) {
                    saveUserSession(user);
                    onAuthSuccess(user);
                    onClose();
                }
            } else {
                const { user, error } = await signUp(username, password, email, displayName);
                if (error) throw new Error(error);
                if (user) {
                    saveUserSession(user);
                    setPendingUser(user);
                    setMode("verify_pending");
                }
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const TITLES: Record<AuthMode, { heading: string; sub: string }> = {
        signin:         { heading: "Welcome Back",    sub: "Sign in to track your progress" },
        signup:         { heading: "Create Account",  sub: "Email required for stats & recovery" },
        forgot:         { heading: "Reset Password",  sub: "We'll send a link to your email" },
        verify_pending: { heading: "Check Your Inbox", sub: "" },
    };

    const inputClass = "w-full rounded-lg border border-cream-divider bg-parchment-raised px-4 py-2.5 text-soft-black placeholder:text-muted-stone focus:border-transparent focus:outline-none focus:ring-2 focus:ring-baize";

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-baize-deep/75"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="auth-dialog-title"
                        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-y-auto rounded-[18px] border border-cream-divider bg-parchment-raised text-soft-black shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Gold top accent */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />

                        {/* Header */}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close account dialog"
                            className="absolute right-3 top-3 z-10 rounded-[8px] border-none bg-white/10 p-2 text-cream-ink transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass"
                        >
                            <TbX className="h-5 w-5" />
                        </button>

                        <div className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] p-6 text-center text-cream-ink">
                            <Engraving src="/marks/emblem.svg" className="mx-auto mb-3 h-16 w-16" style={{ color: "#D4AF37" }} />
                            <h2 id="auth-dialog-title" className="font-serif text-2xl font-bold">{TITLES[mode].heading}</h2>
                            {TITLES[mode].sub && (
                                <p className="mt-1 text-sm text-cream-ink/70">{TITLES[mode].sub}</p>
                            )}
                        </div>

                        {/* Verify-pending state */}
                        {mode === "verify_pending" ? (
                            <div className="p-8 text-center space-y-5">
                                <div className="flex justify-center">
                                    <div className="w-16 h-16 rounded-full bg-[#1A3C34]/10 flex items-center justify-center">
                                        <TbMailCheck className="w-8 h-8 text-[#1A3C34]" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm leading-relaxed text-muted-ink">
                                        We sent a verification link to{" "}
                                        <strong className="text-[#1A3C34]">{pendingUser?.email ?? email}</strong>.
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-ink">
                                        Click the link to unlock <strong>Daily Stats</strong> — streaks, medals, and personal bests.
                                        You can still play without verifying.
                                    </p>
                                </div>
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-left">
                                        {error}
                                    </div>
                                )}
                                {infoMessage && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-left">
                                        {infoMessage}
                                    </div>
                                )}
                                <div className="space-y-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { if (pendingUser) { onAuthSuccess(pendingUser); onClose(); } }}
                                        className="w-full rounded-lg bg-baize py-3 font-semibold text-cream-ink shadow-md transition-all hover:brightness-110"
                                    >
                                        Continue to Game
                                    </button>
                                    <button
                                        onClick={handleResendVerification}
                                        disabled={resendCooldown}
                                        className="w-full py-2.5 text-sm text-ink-accent transition-colors hover:underline disabled:opacity-40 disabled:no-underline"
                                    >
                                        {resendCooldown ? "Email sent — check your inbox" : "Resend verification email"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Main form */
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                        {error}
                                    </div>
                                )}

                                {infoMessage && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                        {infoMessage}
                                    </div>
                                )}

                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className={inputClass}
                                        placeholder="Enter username"
                                        required
                                        autoComplete="username"
                                    />
                                </div>

                                {/* Password */}
                                {mode !== "forgot" && (
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                            Password
                                            {mode === "signup" && (
                                                <span className="ml-2 text-xs font-normal text-muted-ink">Minimum 8 characters</span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className={`${inputClass} pr-11`}
                                                placeholder="Enter password"
                                                required
                                                minLength={mode === "signup" ? 8 : undefined}
                                                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-ink transition-colors hover:text-ink-accent"
                                                tabIndex={-1}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <TbEyeOff className="w-5 h-5" /> : <TbEye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Confirm Password — signup only */}
                                {mode === "signup" && (
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={`${inputClass} pr-11 ${confirmPassword && confirmPassword !== password ? "border-red-400 focus:ring-red-400" : confirmPassword && confirmPassword === password ? "border-felt-green focus:ring-felt-green" : ""}`}
                                                placeholder="Re-enter password"
                                                required
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-ink transition-colors hover:text-ink-accent"
                                                tabIndex={-1}
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                            >
                                                {showConfirmPassword ? <TbEyeOff className="w-5 h-5" /> : <TbEye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {confirmPassword && confirmPassword !== password && (
                                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                                        )}
                                    </div>
                                )}

                                {/* Signup-only fields */}
                                {mode === "signup" && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                                Display Name{" "}
                                                <span className="text-xs font-normal text-muted-ink">(optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                className={inputClass}
                                                placeholder="How should we call you?"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className={inputClass}
                                                placeholder="your@email.com"
                                                required
                                                autoComplete="email"
                                            />
                                            <p className="mt-1 text-xs text-muted-ink">
                                                Required for password recovery and Daily Stats.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading || (mode === "forgot" && !!infoMessage)}
                                    className="w-full py-3 bg-[#1A3C34] hover:bg-[#142E28] text-[#F9F7F1] font-semibold rounded-lg transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                                >
                                    {loading
                                        ? "Loading..."
                                        : mode === "signin"
                                            ? "Sign In"
                                            : mode === "signup"
                                                ? "Create Account"
                                                : infoMessage
                                                    ? "Email Sent"
                                                    : "Send Reset Link"}
                                </button>

                                {/* Mode switchers */}
                                <div className="text-center pt-1 space-y-2">
                                    {mode === "signin" && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => switchMode("forgot")}
                                                className="block w-full text-sm text-[#888] hover:text-[#1A3C34] hover:underline transition-colors"
                                            >
                                                Forgot username or password?
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => switchMode("signup")}
                                                className="block w-full text-sm text-[#1A3C34] hover:underline"
                                            >
                                                {`Don't have an account? Sign up`}
                                            </button>
                                        </>
                                    )}
                                    {mode === "signup" && (
                                        <button
                                            type="button"
                                            onClick={() => switchMode("signin")}
                                            className="text-sm text-[#1A3C34] hover:underline"
                                        >
                                            Already have an account? Sign in
                                        </button>
                                    )}
                                    {mode === "forgot" && (
                                        <button
                                            type="button"
                                            onClick={() => switchMode("signin")}
                                            className="text-sm text-[#1A3C34] hover:underline"
                                        >
                                            Back to Sign In
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
