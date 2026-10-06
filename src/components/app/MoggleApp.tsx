"use client";

import { useGameLogic } from "@/hooks/useGameLogic";
import { Board } from "@/components/game/Board";
import { Timer } from "@/components/game/Timer";
import { GameControls } from "@/components/game/Controls";
import { WordInput } from "@/components/game/WordInput";
import { FoundWordsList } from "@/components/game/FoundWordsList";
import { ResultsReport } from "@/components/analysis/ResultsReport";
import { AuthModal } from "@/components/auth/AuthModal";
import { DailyChallengeBanner } from "@/components/game/DailyChallenge";
import { LeaderboardModal } from "@/components/game/Leaderboard";
import { PracticeMode } from "@/components/practice/PracticeMode";
import { GameModeModal } from "@/components/game/GameModeModal";
import { MultiplayerView } from "@/components/multiplayer/MultiplayerView";
import { ChallengeNotification } from "@/components/multiplayer/ChallengeNotification";
import type { GameMode } from "@/components/game/GameModeModal";
import { WhatsNewPopup } from "@/components/shared/WhatsNewPopup";
import { getAuthenticatedUser, getCurrentUser, signOut } from "@/lib/supabase/auth";
import type { User } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { findCandidateTrail } from "@/lib/boggle/pathFinder";
import { getPathfinderEnabled, PREF_KEYS } from "@/lib/preferences";
import { TbTrophy, TbBulb } from "react-icons/tb";
import { LandingPage } from "@/components/landing/LandingPage";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useRouter } from "next/navigation";
import {
  createSeededChallengeUrl,
  getChallengeModeLabel,
  type SeededChallenge,
} from "@/lib/boggle/share";

export type MoggleInitialView = "dashboard" | "mail" | "play" | "blitz" | "rapid" | "daily" | "zen" | "practice" | "multiplayer" | "live-mp" | "friends-mp";

interface MoggleAppProps {
  initialView?: MoggleInitialView;
  initialChallenge?: SeededChallenge | null;
}

export function MoggleApp({ initialView = "dashboard", initialChallenge = null }: MoggleAppProps) {
  const router = useRouter();
  const {
    // State
    dictionaryLoaded,
    board,
    gameActive,
    timeLeft,
    foundWords,
    penalizedWords,
    scores,
    statusMessage,
    showResults,
    gameWasManual,
    gameWasCompleted,
    allPossibleWords,
    isDailyChallenge,
    isDailyReplay,
    isGeneratingBoard,
    isZenMode,
    hintCooldownMs,
    zenHintCell,
    currentChallenge,
    isSharedChallenge,

    // Actions
    startGame,
    startSeededChallenge,
    startBlitz,
    startRapid,
    startZen,
    startCustomGameFromInput,
    startDailyChallenge,
    endGame,
    submitWord,
    useZenHint,
    setShowResults,
  } = useGameLogic();

  const [currInput, setCurrInput] = useState("");
  const [pathfinderEnabled, setPathfinderEnabledState] = useState(() => getPathfinderEnabled());

  const candidateTrail = useMemo(
    () => (pathfinderEnabled && gameActive && currInput && board.length > 0 ? findCandidateTrail(currInput, board) : undefined),
    [currInput, board, gameActive, pathfinderEnabled]
  );
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [authMessage, setAuthMessage] = useState("");
  const [showingDashboard, setShowingDashboard] = useState(initialView === "dashboard" || initialView === "mail");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'practice' | 'multiplayer'>(
    initialView === "practice" ? "practice" : ["multiplayer", "live-mp", "friends-mp"].includes(initialView) ? "multiplayer" : "play"
  );
  const [pendingChallengeCode, setPendingChallengeCode] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const initialViewHandledRef = useRef(false);
  const dailyStartInFlightRef = useRef(false);
  const hintFillPercent = hintCooldownMs === 0 ? 100 : Math.max(0, Math.min(100, ((10000 - hintCooldownMs) / 10000) * 100));
  const hintReady = hintCooldownMs === 0;

  const handleSelectMode = (mode: GameMode) => {
    setShareStatus("");
    startGame(mode);
    setShowModeModal(false);
  };

  const handleSelectCustom = (letters: string) => {
    setShareStatus("");
    startCustomGameFromInput(letters);
    setShowModeModal(false);
  };

  const handleStartDailyChallenge = useCallback(async () => {
    if (dailyStartInFlightRef.current || (isDailyChallenge && gameActive)) return;
    dailyStartInFlightRef.current = true;

    try {
      const started = await startDailyChallenge();
      if (!started) return;

      // Keep the current app tree mounted. Native history updates the URL and
      // AppShell's active item without remounting MoggleApp into a blank state.
      setActiveTab("play");
      setShowingDashboard(false);
      if (window.location.pathname !== "/play/daily") {
        window.history.pushState({}, "", "/play/daily");
      }
    } finally {
      dailyStartInFlightRef.current = false;
    }
  }, [gameActive, isDailyChallenge, startDailyChallenge]);

  useEffect(() => {
    const onDailyNavigation = () => { void handleStartDailyChallenge(); };
    window.addEventListener("moggle:start-daily", onDailyNavigation);
    return () => window.removeEventListener("moggle:start-daily", onDailyNavigation);
  }, [handleStartDailyChallenge]);

  // Load user session on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      getAuthenticatedUser().then((authUser) => {
        if (authUser) {
          setUser(authUser);
          return;
        }

        setUser(null);
        if (initialView === "daily") {
          setAuthMessage("Your session expired. Sign in again before playing Daily Challenge so your score is saved.");
        }
      }).catch(() => {});
    }
  }, [initialView]);

  useEffect(() => {
    if (!dictionaryLoaded || initialViewHandledRef.current) return;
    initialViewHandledRef.current = true;

    if (initialView === "dashboard" || initialView === "mail") return;

    Promise.resolve().then(() => {
      setShowingDashboard(false);

      if (initialView === "practice") {
        setActiveTab("practice");
        return;
      }

      if (["multiplayer", "live-mp", "friends-mp"].includes(initialView)) {
        setActiveTab("multiplayer");
        return;
      }

      setActiveTab("play");
      if (initialChallenge) {
        startSeededChallenge(initialChallenge);
        return;
      }
      if (initialView === "blitz") startBlitz();
      else if (initialView === "rapid") startRapid();
      else if (initialView === "daily") handleStartDailyChallenge();
      else if (initialView === "zen") startZen();
    });
  }, [dictionaryLoaded, user, initialView, initialChallenge, startBlitz, startRapid, handleStartDailyChallenge, startZen, startSeededChallenge]);

  const handleShareBoard = useCallback(async () => {
    if (!currentChallenge || typeof window === 'undefined') return;

    const url = createSeededChallengeUrl(window.location.origin, currentChallenge);
    const modeLabel = getChallengeModeLabel(currentChallenge.mode);
    const text = showResults
      ? `I scored ${scores.net} on this Moggle ${modeLabel}. Can you beat me on the exact same board?`
      : `Play this exact Moggle ${modeLabel} board and see how you score.`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Moggle board challenge', text, url });
        setShareStatus('Challenge shared');
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus('Link copied');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        setShareStatus('Link copied');
      } catch {
        setShareStatus('Could not copy link');
      }
    }
  }, [currentChallenge, scores.net, showResults]);

  // Load pathfinder preference and keep it in sync across tabs / return from /settings
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREF_KEYS.pathfinderEnabled) {
        setPathfinderEnabledState(getPathfinderEnabled());
      }
    };
    const onFocus = () => setPathfinderEnabledState(getPathfinderEnabled());
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleSubmit = () => {
    const res = submitWord(currInput);
    if (res.status === "valid" || res.status === "invalid" || res.status === "duplicate" || res.status === "too_short") {
      setCurrInput("");
    }
  };

  const handleTileClick = (letter: string) => {
    if (gameActive) {
      setCurrInput((prev) => prev + letter);
    }
  };

  const handleSignOut = () => {
    signOut();
    setUser(null);
    setShowingDashboard(true);
    router.push("/");
  };

  // When a game ends, return to dashboard
  useEffect(() => {
    if (!gameActive && !showResults && user) {
      // Don't force back on initial load - only after a game was played
    }
  }, [gameActive, showResults, user]);

  const guestLanding = !user && !initialChallenge && initialView === "dashboard";

  if (!dictionaryLoaded && !guestLanding) {
    return (
      <div className="min-h-screen bg-[#F9F7F1] text-[#1A1A1A] flex flex-col items-center justify-center font-serif">
        <div className="animate-pulse text-2xl tracking-widest mb-4">INITIALIZING ENGINE...</div>
        <div className="text-sm font-mono text-[#8A8A8A]">Loading Dictionary (CSW24)</div>
      </div>
    );
  }

  const guestNeedsAccountFeature = ["mail", "multiplayer", "live-mp", "friends-mp"].includes(initialView);
  if (guestLanding || (!user && guestNeedsAccountFeature)) {
    return <LandingPage authMessage={authMessage} onAuthSuccess={(u) => { setAuthMessage(""); setUser(u); setShowingDashboard(initialView === "dashboard" || initialView === "mail"); }} />;
  }

  // Show dashboard when signed in and not actively in a game
  if (user && showingDashboard && !gameActive) {
    return (
      <>
        <Dashboard
          user={user}
          initialActive={initialView === "mail" ? "mail" : undefined}
          onPlayDaily={() => {
            void handleStartDailyChallenge();
          }}
          onStartGame={() => {
            router.push("/play");
          }}
          onStartBlitz={() => {
            router.push("/play/blitz");
          }}
          onStartRapid={() => {
            router.push("/play/rapid");
          }}
          onStartZen={() => {
            router.push("/play/zen");
          }}
          onStartMultiplayer={() => {
            router.push("/multiplayer/live");
          }}
          onStartPractice={() => {
            router.push("/practice");
          }}
          onSignOut={handleSignOut}
        />
        {/* Keep mode modal accessible from dashboard */}
        <AnimatePresence>
          {showModeModal && (
            <GameModeModal
              isOpen={showModeModal}
              onClose={() => setShowModeModal(false)}
              onSelectMode={(mode) => { handleSelectMode(mode); setShowModeModal(false); setShowingDashboard(false); }}
              onSelectCustom={(letters) => { handleSelectCustom(letters); setShowModeModal(false); setShowingDashboard(false); }}
              isGenerating={isGeneratingBoard}
            />
          )}
        </AnimatePresence>
        {user && (
          <ChallengeNotification
            user={user}
            onAccept={(code) => {
              setPendingChallengeCode(code);
              router.push("/multiplayer/live");
            }}
          />
        )}
        <WhatsNewPopup />
      </>
    );
  }

  return (
    <>
      {/* Challenge invite toast — always mounted so the Realtime subscription survives tab switches */}
      {user && (
        <ChallengeNotification
          user={user}
          onAccept={(code) => {
            setPendingChallengeCode(code);
            router.push("/multiplayer/live");
          }}
        />
      )}

      {/* Main Game Area */}
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'multiplayer' ? (
          <MultiplayerView
            user={user!}
            onExit={() => setActiveTab('play')}
            onSignInClick={() => setShowAuthModal(true)}
            pendingJoinCode={pendingChallengeCode}
            onPendingJoinConsumed={() => setPendingChallengeCode(null)}
          />
        ) : activeTab === 'practice' ? (
          <PracticeMode />
        ) : (
          <>
            {isSharedChallenge && currentChallenge && (
              <div className="mb-5 flex flex-col gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#1A3C34] px-5 py-4 text-[#F9F7F1] shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-serif text-lg font-semibold">Friend challenge</div>
                  <div className="text-sm text-[#EDE8DF]/80">
                    Exact {getChallengeModeLabel(currentChallenge.mode).toLowerCase()} board, identical rules and clock.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleShareBoard}
                  className="self-start rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] sm:self-auto"
                >
                  {shareStatus || 'Pass it on'}
                </button>
              </div>
            )}
            {/* Daily Challenge Banner */}
            {!gameActive && (
              <DailyChallengeBanner
                onStartDaily={handleStartDailyChallenge}
                isActive={gameActive}
                hasPlayed={isDailyReplay}
                isGuest={!user}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Left Panel: Score Hero Section */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                {/* Prominent Score Display */}
                <motion.div
                  className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] rounded-2xl p-6 shadow-2xl border border-[#D4AF37]/20"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-[#8A9A90]">
                      <TbTrophy className="w-5 h-5 text-[#D4AF37]" />
                      <span className="text-xs font-mono uppercase tracking-widest">Current Score</span>
                    </div>

                    <motion.div
                      className="text-7xl font-serif font-bold text-[#F9F7F1]"
                      key={scores.net}
                      initial={{ scale: 1.2, color: "#D4AF37" }}
                      animate={{ scale: 1, color: "#F9F7F1" }}
                      transition={{ duration: 0.3 }}
                    >
                      {scores.net}
                    </motion.div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#D4AF37]/20">
                      <div>
                        <div className="text-2xl font-mono font-bold text-green-300">{scores.gross}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[#8A9A90]">Gross</div>
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-bold text-red-300">{Math.abs(scores.penalty)}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[#8A9A90]">Penalty</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Timer */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-[#E6E4DD]">
                  <Timer timeLeft={timeLeft} gameActive={gameActive} zenMode={isZenMode} />
                </div>

                {/* Game Stats */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-[#E6E4DD] space-y-2">
                  <div className="text-xs font-mono uppercase tracking-widest text-[#8A8A8A] mb-3">Session Stats</div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#666]">Words Found</span>
                    <span className="font-bold text-[#1A3C34]">{foundWords.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#666]">Penalties</span>
                    <span className="font-bold text-red-600">{penalizedWords.length}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#E6E4DD]">
                    <span className="text-sm text-[#666]">Available</span>
                    <span className="font-bold text-[#8A8A8A]">{allPossibleWords.size}</span>
                  </div>
                </div>
              </div>

              {/* Center: Board */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center gap-8">
                <Board
                  board={board}
                  onTileClick={handleTileClick}
                  disabled={!gameActive}
                  candidateTrail={candidateTrail}
                  hintCell={zenHintCell}
                />

                <GameControls
                  gameActive={gameActive}
                  onStart={() => setShowModeModal(true)}
                  onEnd={() => endGame(true)}
                  isLoading={isGeneratingBoard}
                  onShare={currentChallenge ? handleShareBoard : undefined}
                  shareStatus={shareStatus}
                />
              </div>

              {/* Right Panel: Input & Word List */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <WordInput
                  currInput={currInput}
                  setCurrInput={setCurrInput}
                  onSubmit={handleSubmit}
                  gameActive={gameActive}
                  statusMessage={statusMessage}
                  onHint={isZenMode ? useZenHint : undefined}
                  hintReady={hintReady}
                />

                {isZenMode && gameActive && (
                  <button
                    type="button"
                    onClick={useZenHint}
                    onMouseDown={(event) => event.preventDefault()}
                    disabled={!hintReady}
                    title={hintReady ? "Highlight a hint tile (Space)" : "Hint is recharging"}
                    className={`
                      relative w-full max-w-sm overflow-hidden rounded-lg border px-4 py-3
                      font-mono text-sm font-bold uppercase tracking-widest shadow-sm
                      transition-all active:scale-[0.98] disabled:cursor-not-allowed
                      ${hintReady
                        ? "border-[#0F221E] text-[#F9F7F1] hover:brightness-110"
                        : "border-[#CFCBC1] text-[#1A3C34]/55"
                      }
                    `}
                    style={{
                      background: `linear-gradient(90deg, #1A3C34 ${hintFillPercent}%, #D8D4CA ${hintFillPercent}%)`,
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <TbBulb className="h-4 w-4" />
                      {hintReady ? (
                        <>
                          Hint Ready
                          <kbd className="rounded border border-white/35 bg-white/10 px-1.5 py-0.5 text-[10px] tracking-normal">Space</kbd>
                        </>
                      ) : `Hint ${Math.ceil(hintCooldownMs / 1000)}s`}
                    </span>
                  </button>
                )}

                <FoundWordsList foundWords={foundWords} penalizedWords={penalizedWords} />
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {/* Game Mode Modal */}
        {showModeModal && (
          <GameModeModal
            isOpen={showModeModal}
            onClose={() => setShowModeModal(false)}
            onSelectMode={handleSelectMode}
            onSelectCustom={handleSelectCustom}
            isGenerating={isGeneratingBoard}
          />
        )}

        {/* Results Modal */}
        {showResults && (
          <ResultsReport
            isOpen={showResults}
            onClose={() => { setShowResults(false); if (user) router.push("/"); }}
            allPossibleWords={allPossibleWords}
            foundWords={new Set(foundWords)}
            gross={scores.gross}
            penalty={scores.penalty}
            net={scores.net}
            wasManual={gameWasManual}
            wasCompleted={gameWasCompleted}
            onShare={currentChallenge ? handleShareBoard : undefined}
            shareStatus={shareStatus}
            persistenceNotice={isDailyChallenge && !user ? "Create a free account to save future Daily scores, build streaks, and show your time on the leaderboard." : undefined}
            onCreateAccount={isDailyChallenge && !user ? () => setShowAuthModal(true) : undefined}
          />
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={setUser}
          />
        )}

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <LeaderboardModal
            isOpen={showLeaderboard}
            onClose={() => setShowLeaderboard(false)}
            userId={user?.id}
          />
        )}
      </AnimatePresence>

      {/* One-time "What's new" popup — self-dismissing after first view per update id */}
      <WhatsNewPopup />
    </>
  );
}
