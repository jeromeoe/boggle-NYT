import { motion } from "framer-motion";

interface TileProps {
    letter: string;
    onClick: () => void;
    disabled?: boolean;
    isActive?: boolean;
}

export function Tile({ letter, onClick, disabled, isActive }: TileProps) {
    return (
        <motion.button
            whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            animate={{
                backgroundColor: isActive ? '#1A3C34' : '#F9F7F1',
                color: isActive ? '#F9F7F1' : '#1A1A1A',
                borderColor: isActive ? '#1A3C34' : '#E6E4DD',
                scale: isActive ? 1.08 : 1,
            }}
            transition={{ duration: 0.12 }}
            onClick={onClick}
            disabled={disabled}
            className={`
        w-14 h-14 md:w-16 md:h-16
        font-serif text-2xl md:text-3xl font-bold
        rounded-lg
        shadow-[2px_2px_0px_0px_rgba(26,60,52,0.1),inset_0_-2px_0_rgba(0,0,0,0.05)]
        border
        flex items-center justify-center
        transition-shadow
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:border-[#1A3C34] hover:text-[#1A3C34]
      `}
        >
            {letter === "Q" ? "Qu" : letter}
        </motion.button>
    );
}
