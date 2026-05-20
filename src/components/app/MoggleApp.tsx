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
import { getCurrentUser, signOut } from "@/lib/supabase/auth";
import type { User } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { findCandidateTrail } from "@/lib/boggle/pathFinder";
import { getPathfinderEnabled, PREF_KEYS } from "@/lib/preferences";
import { TbTrophy, TbBulb } from "react-icons/tb";
import { LandingPage } from "@/components/landing/LandingPage";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { AppShell } from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";

export type MoggleInitialView = "dashboard" | "mail" | "play" | "blitz" | "rapid" | "daily" | "zen" | "practice" | "multiplayer" | "live-mp" | "friends-mp";

export function MoggleApp({ initialView = "dashboard" }: { initialView?: MoggleInitialView }) {
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
    allPossibleWords,
    isDailyReplay,
    isGeneratingBoard,
    isZenMode,
    hintCooldownMs,

    // Actions
    startGame,
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
  const [pathfinderEnabled, setPathfinderEnabledState] = useState(true);

  const candidateTrail = useMemo(
    () => (pathfinderEnabled && gameActive && currInput && board.length > 0 ? findCandidateTrail(currInput, board) : undefined),
    [currInput, board, gameActive, pathfinderEnabled]
  );
  const [user, setUser] = useState<User | null>(null);
  const [showingDashboard, setShowingDashboard] = useState(initialView === "dashboard" || initialView === "mail");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'practice' | 'multiplayer'>(
    initialView === "practice" ? "practice" : ["multiplayer", "live-mp", "friends-mp"].includes(initialView) ? "multiplayer" : "play"
  );
  const [pendingChallengeCode, setPendingChallengeCode] = useState<string | null>(null);
  const initialViewHandledRef = useRef(false);
  const hintFillPercent = hintCooldownMs === 0 ? 100 : Math.max(0, Math.min(100, ((10000 - hintCooldownMs) / 10000) * 100));
  const hintReady = hintCooldownMs === 0;
  const shellActive = isZenMode
    ? "zen"
    : activeTab === "multiplayer" && ["multiplayer", "live-mp", "friends-mp"].includes(initialView)
      ? initialView === "friends-mp" ? "friends-mp" : "live-mp"
    : activeTab === "play" && ["blitz", "rapid", "daily"].includes(initialView)
      ? initialView
      : activeTab;

  const handleSelectMode = (mode: GameMode) => {
    startGame(mode);
    setShowModeModal(false);
  };

  const handleSelectCustom = (letters: string) => {
    startCustomGameFromInput(letters);
    setShowModeModal(false);
  };

  // Load user session on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) setUser(currentUser);
  }, []);

  useEffect(() => {
    if (!dictionaryLoaded || !user || initialViewHandledRef.current) return;
    initialViewHandledRef.current = true;

    if (initialView === "dashboard" || initialView === "mail") return;

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
    if (initialView === "blitz") startBlitz();
    else if (initialView === "rapid") startRapid();
    else if (initialView === "daily") startDailyChallenge();
    else if (initialView === "zen") startZen();
  }, [dictionaryLoaded, user, initialView, startBlitz, startRapid, startDailyChallenge, startZen]);

  // Load pathfinder preference and keep it in sync across tabs / return from /settings
  useEffect(() => {
    setPathfinderEnabledState(getPathfinderEnabled());
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

  const goDashboard = () => {
    setShowingDashboard(true);
    if (window.location.pathname !== "/") router.push("/");
  };

  // When a game ends, return to dashboard
  useEffect(() => {
    if (!gameActive && !showResults && user) {
      // Don't force back on initial load - only after a game was played
    }
  }, [gameActive, showResults, user]);

  if (!dictionaryLoaded) {
    return (
      <div className="min-h-screen bg-[#F9F7F1] text-[#1A1A1A] flex flex-col items-center justify-center font-serif">
        <div className="animate-pulse text-2xl tracking-widest mb-4">INITIALIZING ENGINE...</div>
        <div className="text-sm font-mono text-[#8A8A8A]">Loading Dictionary (CSW24)</div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onAuthSuccess={(u) => { setUser(u); setShowingDashboard(initialView === "dashboard" || initialView === "mail"); }} />;
  }

  // Show dashboard when signed in and not actively in a game
  if (showingDashboard && !gameActive) {
    return (
      <>
        <Dashboard
          user={user}
          initialActive={initialView === "mail" ? "mail" : undefined}
          onPlayDaily={() => {
            router.push("/play/daily");
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
    <AppShell
      user={user}
      onSignOut={handleSignOut}
      onDashboardClick={goDashboard}
      active={shellActive}
      title={activeTab === "multiplayer" ? "Multiplayer" : activeTab === "practice" ? "Practice" : isZenMode ? "Zen Mode" : "Game"}
    >
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
            {/* Daily Challenge Banner */}
            {!gameActive && (
              <DailyChallengeBanner
                onStartDaily={startDailyChallenge}
                isActive={gameActive}
                hasPlayed={isDailyReplay}
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
                />

                <GameControls
                  gameActive={gameActive}
                  onStart={() => setShowModeModal(true)}
                  onEnd={() => endGame(true)}
                  isLoading={isGeneratingBoard}
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
                />

                {isZenMode && gameActive && (
                  <button
                    type="button"
                    onClick={useZenHint}
                    disabled={!hintReady}
                    title={hintReady ? "Reveal a Zen hint" : "Hint is recharging"}
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
                      {hintReady ? "Hint Ready" : `Hint ${Math.ceil(hintCooldownMs / 1000)}s`}
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
            onClose={() => { setShowResults(false); if (user) goDashboard(); }}
            allPossibleWords={allPossibleWords}
            foundWords={new Set(foundWords)}
            gross={scores.gross}
            penalty={scores.penalty}
            net={scores.net}
            wasManual={gameWasManual}
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
    </AppShell>
  );
}
