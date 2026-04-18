"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function ResetPasswordForm() {
    const params = useSearchParams();
    const router = useRouter();
    const token = params.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) setMessage('Invalid reset link. Please request a new one.');
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            setMessage('Passwords do not match.');
            return;
        }

        setStatus('loading');
        setMessage('');

        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword: password }),
        });

        const data = await res.json();

        if (res.ok) {
            setStatus('success');
            setMessage('Password reset successfully! Redirecting...');
            setTimeout(() => router.push('/'), 2500);
        } else {
            setStatus('error');
            setMessage(data.error || 'Something went wrong. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#F9F7F1] flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-[#E6E4DD] overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] p-6 text-center relative">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
                    <div className="text-xl font-serif font-bold text-[#F9F7F1] tracking-tighter mb-1">
                        MOGGLE<span className="text-[#D4AF37]">.ORG</span>
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-[#F9F7F1]">Set New Password</h1>
                </div>

                <div className="p-6">
                    {status === 'success' ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-[#1A3C34] font-semibold text-lg">{message}</p>
                        </div>
                    ) : !token ? (
                        <div className="text-center py-8 space-y-4">
                            <p className="text-red-600">{message}</p>
                            <Link href="/" className="text-sm text-[#1A3C34] hover:underline">
                                Back to Home
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${status === 'error'
                                    ? 'bg-red-50 border border-red-200 text-red-700'
                                    : 'bg-blue-50 border border-blue-200 text-blue-700'
                                    }`}>
                                    {message}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3C34] focus:border-transparent"
                                    placeholder="Minimum 8 characters"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#1A3C34] mb-1.5">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-[#E6E4DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3C34] focus:border-transparent"
                                    placeholder="Repeat your password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-3 bg-[#1A3C34] hover:bg-[#142E28] text-[#F9F7F1] font-semibold rounded-lg transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                            >
                                {status === 'loading' ? 'Saving...' : 'Reset Password'}
                            </button>

                            <div className="text-center pt-1">
                                <Link href="/" className="text-sm text-[#666] hover:text-[#1A3C34] hover:underline">
                                    Back to Home
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
