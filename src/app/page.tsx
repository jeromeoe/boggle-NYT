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
import NoiseOverlay from "@/components/shared/noise-overlay";
import { getCurrentUser, signOut } from "@/lib/supabase/auth";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { SiGithub } from "react-icons/si";
import { useState, useEffect } from "react";
import { TbTrophy, TbUser, TbLogout, TbLogin, TbGridDots, TbBrain } from "react-icons/tb";

export default function BogglePage() {
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
    isDailyChallenge,
    isDailyReplay,
    isCustomBoardLoaded,

    // Actions
    startGame,
    startCustomGame,
    startDailyChallenge,
    endGame,
    submitWord,
    setShowResults,
    loadCustomBoard
  } = useGameLogic();

  const [currInput, setCurrInput] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'practice'>('play');

  // Load user session on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) setUser(currentUser);
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

  const handleCustomBoard = () => {
    const input = prompt("Enter 16 letters for custom board:");
    if (input) {
      const success = loadCustomBoard(input);
      if (!success) alert("Invalid board input. Must be 16 letters.");
    }
  };

  const handleSignOut = () => {
    signOut();
    setUser(null);
  };

  if (!dictionaryLoaded) {
    return (
      <div className="min-h-screen bg-[#F9F7F1] text-[#1A1A1A] flex flex-col items-center justify-center font-serif">
        <div className="animate-pulse text-2xl tracking-widest mb-4">INITIALIZING ENGINE...</div>
        <div className="text-sm font-mono text-[#8A8A8A]">Loading Dictionary (CSW24)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F1] text-[#1A1A1A] relative selection:bg-[#D4AF37]/30 overflow-hidden flex flex-col">
      <NoiseOverlay />

      {/* Header */}
      <header className="w-full px-6 py-4 flex justify-between items-center z-10 border-b border-[#E6E4DD] bg-[#F9F7F1]/80 backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <div className="text-xl font-serif font-bold tracking-tighter text-[#1A3C34]">
            BOGGLE<span className="text-[#D4AF37]">.WEB</span>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-white border border-[#E6E4DD] rounded-lg p-1">
            <button
              onClick={() => setActiveTab('play')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-all ${activeTab === 'play'
                ? 'bg-[#1A3C34] text-white'
                : 'text-[#666] hover:text-[#1A3C34]'
                }`}
            >
              <TbGridDots className="w-4 h-4" />
              <span className="hidden sm:inline">Play</span>
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-all ${activeTab === 'practice'
                ? 'bg-[#1A3C34] text-white'
                : 'text-[#666] hover:text-[#1A3C34]'
                }`}
            >
              <TbBrain className="w-4 h-4" />
              <span className="hidden sm:inline">Practice</span>
            </button>
          </div>

          {/* Desktop score badge - only show in Play mode */}
          {activeTab === 'play' && (
            <motion.div
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#1A3C34] rounded-full shadow-md"
              whileHover={{ scale: 1.05 }}
            >
              <TbTrophy className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-mono text-[#8A9A90]">SCORE</span>
              <span className="text-lg font-bold text-[#F9F7F1]">{scores.net}</span>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E6E4DD] rounded-lg">
                <TbUser className="w-4 h-4 text-[#1A3C34]" />
                <span className="text-sm font-semibold text-[#1A3C34]">{user.display_name || user.username}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-full hover:bg-[#E6E4DD] text-[#1A3C34] transition-colors"
                title="Sign Out"
              >
                <TbLogout className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A3C34] hover:bg-[#142E28] text-[#F9F7F1] rounded-lg transition-all font-semibold"
            >
              <TbLogin className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          <button
            onClick={() => setShowLeaderboard(true)}
            className="p-2 rounded-full hover:bg-[#E6E4DD] text-[#1A3C34] transition-colors"
            title="Leaderboard"
          >
            <TbTrophy className="w-5 h-5" />
          </button>

          <Link
            href="https://github.com/jeromeoe/boggle-NYT"
            target="_blank"
            className="p-2 rounded-full hover:bg-[#E6E4DD] text-[#1A3C34] transition-colors"
            title="View Source"
          >
            <SiGithub className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 z-10">
        {activeTab === 'practice' ? (
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
                        <div className="text-2xl font-mono font-bold text-red-300">-{scores.penalty}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[#8A9A90]">Penalty</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Timer */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-[#E6E4DD]">
                  <Timer timeLeft={timeLeft} gameActive={gameActive} />
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
                />

                <GameControls
                  gameActive={gameActive}
                  onStart={isCustomBoardLoaded ? startCustomGame : startGame}
                  onEnd={() => endGame(true)}
                  onCustomBoard={handleCustomBoard}
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

                <FoundWordsList foundWords={foundWords} penalizedWords={penalizedWords} />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Results Modal */}
      <ResultsReport
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        allPossibleWords={allPossibleWords}
        foundWords={new Set(foundWords)}
        gross={scores.gross}
        penalty={scores.penalty}
        net={scores.net}
        wasManual={gameWasManual}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={setUser}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        userId={user?.id}
      />
    </div>
  );
}
