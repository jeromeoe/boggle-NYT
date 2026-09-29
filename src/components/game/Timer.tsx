import { TbStopwatch } from "react-icons/tb";

export function Timer({ timeLeft, gameActive, zenMode }: { timeLeft: number; gameActive: boolean; zenMode?: boolean }) {

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const timeLabel = `${minutes} minute${minutes === 1 ? '' : 's'}, ${seconds} second${seconds === 1 ? '' : 's'}`;

    return (
        <div
            role="timer"
            aria-label={`${zenMode ? 'Elapsed time' : 'Time remaining'}: ${timeLabel}`}
            className={`flex items-center gap-3 font-mono text-5xl md:text-6xl font-bold tracking-tight
                ${!zenMode && timeLeft <= 30 && gameActive ? 'text-[#9B2226]' : 'text-[#1A3C34]'}`}
        >
            {zenMode && <TbStopwatch className="h-8 w-8 md:h-9 md:w-9" aria-hidden="true" />}
            <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
    );
}
