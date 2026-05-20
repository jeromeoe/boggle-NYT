export function Timer({ timeLeft, gameActive, zenMode }: { timeLeft: number; gameActive: boolean; zenMode?: boolean }) {
    if (zenMode) {
        return (
            <div className="font-mono text-4xl md:text-5xl font-bold tracking-tight text-[#1A3C34]">
                ∞
            </div>
        );
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className={`font-mono text-4xl md:text-5xl font-bold tracking-tight
      ${timeLeft <= 30 && gameActive ? 'text-[#9B2226]' : 'text-[#1A3C34]'}`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
    );
}
