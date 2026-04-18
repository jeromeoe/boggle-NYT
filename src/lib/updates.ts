/**
 * "What's New" update notes.
 *
 * Bump CURRENT_UPDATE.id whenever there's a new release worth telling
 * returning users about. The popup compares this against the value in
 * localStorage under UPDATE_SEEN_KEY — if they differ, it shows once, then
 * writes the new id and stays quiet until the next bump.
 *
 * Rule of thumb: only add an entry for things users will notice. Back-end
 * refactors, bug fixes, and internal tooling changes should NOT trigger the
 * popup — the point is to prevent jarring UI changes, not to log a
 * changelog.
 */

export interface UpdateNote {
    title: string;
    description: string;
}

export interface Update {
    /** Stable identifier. Change this to trigger the popup for all users. */
    id: string;
    /** Date the update shipped, ISO format (YYYY-MM-DD). Displayed to users. */
    date: string;
    /** Headline for the popup. */
    headline: string;
    /** 2–4 short bullets, no more. */
    notes: UpdateNote[];
}

export const UPDATE_SEEN_KEY = "boggle.update.lastSeen";

export const CURRENT_UPDATE: Update = {
    id: "2026-04-18-v1",
    date: "2026-04-18",
    headline: "Multiplayer got some love",
    notes: [
        {
            title: "Friends",
            description: "friends!",
        },
        {
            title: "Play again",
            description: "After a game, everyone stays in the same lobby for replayability",
        },
        {
            title: "Countdown",
            description: "for you da en",
        },
    ],
};
