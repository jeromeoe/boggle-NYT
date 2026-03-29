"use client";

import { useState } from "react";
import { signIn, signUp, saveUserSession, forgotPassword } from "@/lib/supabase/auth";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "forgot";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: (user: User) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>("signin");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [infoMessage, setInfoMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const resetFields = () => {
        setUsername("");
        setPassword("");
        setEmail("");
        setDisplayName("");
        setError("");
        setInfoMessage("");
    };

    const switchMode = (next: AuthMode) => {
        resetFields();
        setMode(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfoMessage("");
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
                const { user, error } = await signUp(username, password, email || undefined, displayName);
                if (error) throw new Error(error);
                if (user) {
                    saveUserSession(user);
                    onAuthSuccess(user);
                    onClose();
                }
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const TITLES: Record<AuthMode, { heading: string; sub: string }> = {
        signin: { heading: "Welcome Back", sub: "Sign in to track your progress" },
        signup: { heading: "Create Account", sub: "Join the Boggle community" },
        forgot: { heading: "Reset Password", sub: "We'll send a link to your email" },
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#1A3C34]/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative bg-[#F9F7F1] w-full max-w-md rounded-xl shadow-2xl border border-[#E6E4DD] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Gold top accent */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] text-[#F9F7F1] p-6 text-center">
                            <h2 className="text-2xl font-serif font-bold">{TITLES[mode].heading}</h2>
                            <p className="text-sm text-[#8A9A90] mt-1">{TITLES[mode].sub}</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Info (used for forgot password confirmation) */}
                            {infoMessage && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                    {infoMessage}
                                </div>
                            )}

                            {/* Username field */}
                            <div>
                                <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3C34] focus:border-transparent"
                                    placeholder="Enter username"
                                    required
                                    autoComplete="username"
                                />
                            </div>

                            {/* Password — hidden in forgot mode */}
                            {mode !== "forgot" && (
                                <div>
                                    <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                        Password
                                        {mode === "signup" && (
                                            <span className="text-xs text-[#8A8A8A] font-normal ml-2">Minimum 8 characters</span>
                                        )}
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3C34] focus:border-transparent"
                                        placeholder="Enter password"
                                        required
                                        minLength={mode === "signup" ? 8 : undefined}
                                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                                    />
                                </div>
                            )}

                            {/* Signup-only fields */}
                            {mode === "signup" && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3C34] focus:border-transparent"
                                            placeholder="How should we call you?"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                            Email{" "}
                                            <span className="text-xs text-[#8A8A8A] font-normal">
                                                (Optional — required for password reset)
                                            </span>
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3C34] focus:border-transparent"
                                            placeholder="your@email.com"
                                            autoComplete="email"
                                        />
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
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
