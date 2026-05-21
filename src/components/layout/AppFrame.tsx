"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser, signOut } from "@/lib/supabase/auth";
import type { User } from "@/lib/supabase/client";

const PUBLIC_PATHS = ["/reset-password", "/verify-email"];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mailUnread, setMailUnread] = useState(0);

  useEffect(() => {
    setUser(getCurrentUser());
    setLoaded(true);

    const refreshUser = () => setUser(getCurrentUser());
    window.addEventListener("storage", refreshUser);
    window.addEventListener("focus", refreshUser);
    return () => {
      window.removeEventListener("storage", refreshUser);
      window.removeEventListener("focus", refreshUser);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setMailUnread(0);
      return;
    }

    let cancelled = false;

    const loadMailUnread = async () => {
      try {
        const res = await fetch("/api/mail", { cache: "no-store" });
        if (!res.ok) return;
        const { mails } = await res.json();
        if (cancelled) return;
        const unread = (mails ?? []).filter(
          (mail: { recipient_id: string; recipient_played_at: string | null }) =>
            mail.recipient_id === user.id && !mail.recipient_played_at
        ).length;
        setMailUnread(unread);
      } catch {
        // Navigation should not care if the mail endpoint is briefly unavailable.
      }
    };

    loadMailUnread();
    const interval = window.setInterval(loadMailUnread, 30_000);
    window.addEventListener("focus", loadMailUnread);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadMailUnread);
    };
  }, [user?.id, pathname]);

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isLanding = pathname === "/" && loaded && !user;

  if (isPublicPath || isLanding || !loaded) {
    return <>{children}</>;
  }

  return (
    <AppShell
      user={user}
      mailUnread={mailUnread}
      onSignOut={() => {
        signOut();
        setUser(null);
        window.location.href = "/";
      }}
    >
      {children}
    </AppShell>
  );
}
