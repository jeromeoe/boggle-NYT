
export default function NoiseOverlay() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-multiply">
            {/* 
        This is a lightweight noise texture.
        We can also use a base64 png if prefered, but SVG is cleaner.
      */}
            <svg className="w-full h-full">
                <filter id="noiseFilter">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.80"
                        numOctaves="3"
                        stitchTiles="stitch"
                    />
                </filter>
                <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.15" />
            </svg>
        </div>
    );
}
