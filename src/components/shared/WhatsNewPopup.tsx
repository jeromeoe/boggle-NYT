"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TbSparkles, TbX, TbArrowRight } from "react-icons/tb";
import { CURRENT_UPDATE, UPDATE_SEEN_KEY } from "@/lib/updates";

/**
 * Shows a one-time "What's new" modal when CURRENT_UPDATE.id differs from
 * the value stored under UPDATE_SEEN_KEY in localStorage.
 *
 * Mount this once near the top of the app tree. It's self-contained: it
 * decides whether to render itself and writes the seen-flag on dismiss.
 *
 * Deliberate choices:
 *   - Waits 600ms before showing so it doesn't fight page load for attention.
 *   - Uses localStorage, not a DB: simpler for 20 users, and a new table
 *     just to store a dismissed flag isn't worth the schema round trip.
 *     Tradeoff: clearing browser storage re-shows the popup.
 *   - Respects the "boggle.pref.reducedMotion" setting indirectly via the
 *     global data-reduced-motion rule in globals.css.
 */
export function WhatsNewPopup() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        try {
            const seen = localStorage.getItem(UPDATE_SEEN_KEY);
            if (seen === CURRENT_UPDATE.id) return;
            const t = setTimeout(() => setOpen(true), 600);
            return () => clearTimeout(t);
        } catch {
            // localStorage unavailable — stay quiet rather than nagging.
        }
    }, []);

    const dismiss = () => {
        try {
            localStorage.setItem(UPDATE_SEEN_KEY, CURRENT_UPDATE.id);
        } catch {
            // ignore
        }
        setOpen(false);
    };

    const formattedDate = new Date(CURRENT_UPDATE.date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={dismiss}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="whats-new-headline"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{
                            type: "spring",
                            damping: 24,
                            stiffness: 260,
                            mass: 0.9,
                        }}
                        className="relative w-full max-w-md bg-white border border-[#E6E4DD] rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Gold accent bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#C5A028] to-[#D4AF37]" />

                        {/* Close */}
                        <button
                            onClick={dismiss}
                            className="absolute top-3 right-3 p-1.5 rounded-full text-[#8A8A8A] hover:text-[#1A3C34] hover:bg-[#E6E4DD] transition-colors"
                            aria-label="Close"
                        >
                            <TbX className="w-4 h-4" />
                        </button>

                        <div className="p-6 md:p-7">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40">
                                    <TbSparkles className="w-3.5 h-3.5 text-[#C5A028]" />
                                </div>
                                <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8A8A]">
                                    What&apos;s new &middot; {formattedDate}
                                </div>
                            </div>

                            <h2
                                id="whats-new-headline"
                                className="text-2xl md:text-3xl font-serif font-bold text-[#1A3C34] leading-tight mt-2"
                            >
                                {CURRENT_UPDATE.headline}
                            </h2>

                            {/* Notes */}
                            <ul className="mt-5 space-y-4">
                                {CURRENT_UPDATE.notes.map((note, i) => (
                                    <motion.li
                                        key={note.title}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}
                                        className="flex gap-3"
                                    >
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-[#1A3C34]">
                                                {note.title}
                                            </div>
                                            <p className="text-xs text-[#666] mt-0.5 leading-relaxed">
                                                {note.description}
                                            </p>
                                        </div>
                                    </motion.li>
                                ))}
                            </ul>

                            {/* Action */}
                            <button
                                onClick={dismiss}
                                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#1A3C34] hover:bg-[#142E28] text-[#F9F7F1] rounded-lg font-semibold text-sm transition-colors group"
                            >
                                Oaky
                                <TbArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
