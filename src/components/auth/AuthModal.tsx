"use client";

import { useState } from "react";
import { signIn, signUp, saveUserSession } from "@/lib/supabase/auth";
import { motion, AnimatePresence } from "framer-motion";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: (user: any) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
                        className="relative bg-[#F9F7F1] w-full max-w-md rounded-xl shadow-2xl border border-[#E6E4DD] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-[#1A3C34] text-[#F9F7F1] p-6 text-center">
                            <h2 className="text-2xl font-serif font-bold">
                                {mode === "signin" ? "Welcome Back" : "Create Account"}
                            </h2>
                            <p className="text-sm text-[#8A9A90] mt-1">
                                {mode === "signin" ? "Sign in to track your progress" : "Join the Boggle community"}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

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
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3C34] focus:border-transparent"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>

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
                                            Email <span className="text-xs text-[#8A8A8A]">(Optional - for password reset)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3C34] focus:border-transparent"
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-[#1A3C34] hover:bg-[#142E28] text-[#F9F7F1] font-semibold rounded-lg transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                            >
                                {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Create Account"}
                            </button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                                    className="text-sm text-[#1A3C34] hover:underline"
                                >
                                    {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
