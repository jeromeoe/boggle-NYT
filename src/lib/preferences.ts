/**
 * User preferences stored in localStorage.
 *
 * Theme and reduced-motion also apply at the DOM level via data attributes
 * on <html>. An inline script in layout.tsx reads these keys before first
 * paint to prevent a flash of the wrong theme.
 */

export const PREF_KEYS = {
    theme: "boggle.pref.theme",
    pathfinderEnabled: "boggle.pref.pathfinderEnabled",
    reducedMotion: "boggle.pref.reducedMotion",
} as const;

export type ThemeMode = "light" | "dark" | "system";

function isBrowser(): boolean {
    return typeof window !== "undefined";
}

/** ---------- Theme ---------- */

export function getStoredTheme(): ThemeMode {
    if (!isBrowser()) return "system";
    const v = localStorage.getItem(PREF_KEYS.theme);
    if (v === "light" || v === "dark" || v === "system") return v;
    return "system";
}

export function applyTheme(mode: ThemeMode): void {
    if (!isBrowser()) return;
    const root = document.documentElement;
    if (mode === "dark") {
        root.setAttribute("data-theme", "dark");
    } else if (mode === "light") {
        root.setAttribute("data-theme", "light");
    } else {
        // system
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) root.setAttribute("data-theme", "dark");
        else root.removeAttribute("data-theme");
    }
}

export function setTheme(mode: ThemeMode): void {
    if (!isBrowser()) return;
    localStorage.setItem(PREF_KEYS.theme, mode);
    applyTheme(mode);
}

/** ---------- Pathfinder ---------- */

export function getPathfinderEnabled(): boolean {
    if (!isBrowser()) return true;
    const v = localStorage.getItem(PREF_KEYS.pathfinderEnabled);
    if (v === null) return true; // default on
    return v === "true";
}

export function setPathfinderEnabled(enabled: boolean): void {
    if (!isBrowser()) return;
    localStorage.setItem(PREF_KEYS.pathfinderEnabled, String(enabled));
}

/** ---------- Reduced motion ---------- */

/** Default: ON. Only explicit "false" disables it. */
export function getReducedMotionEnabled(): boolean {
    if (!isBrowser()) return true;
    const v = localStorage.getItem(PREF_KEYS.reducedMotion);
    if (v === null) return true; // default on
    return v !== "false";
}

export function setReducedMotion(enabled: boolean): void {
    if (!isBrowser()) return;
    localStorage.setItem(PREF_KEYS.reducedMotion, String(enabled));
    const root = document.documentElement;
    if (enabled) root.setAttribute("data-reduced-motion", "true");
    else root.removeAttribute("data-reduced-motion");
}
