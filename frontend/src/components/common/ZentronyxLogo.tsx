import React from 'react';

interface ZentronyxLogoProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

export const ZentronyxLogo: React.FC<ZentronyxLogoProps> = ({
  size = 'md',
  animated = false,
  showText = false,
  className = '',
}) => {
  let pixelSize = 40;
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'sm':
        pixelSize = 32;
        break;
      case 'md':
        pixelSize = 42;
        break;
      case 'lg':
        pixelSize = 64;
        break;
      case 'xl':
        pixelSize = 110;
        break;
    }
  }

  return (
    <div className={`inline-flex items-center space-x-3 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: pixelSize, height: pixelSize }}
      >
        {/* Ambient Glow */}
        <div
          className={`absolute inset-0 rounded-2xl bg-cyan-500/20 filter blur-md ${
            animated ? 'animate-pulse' : ''
          }`}
        />

        {/* Official SVG Logo */}
        <svg
          viewBox="0 0 120 120"
          width={pixelSize}
          height={pixelSize}
          className="relative z-10 overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Rounded Frame */}
          <rect
            x="8"
            y="8"
            width="104"
            height="104"
            rx="25"
            fill="rgba(5, 15, 28, 0.85)"
            stroke="#19d5ff"
            strokeWidth="2.5"
            className="drop-shadow-[0_0_8px_rgba(25,213,255,0.4)]"
          />

          {/* Inner Shield */}
          <path
            d="M60 25 L87 36 V58 C87 77 76 91 60 99 C44 91 33 77 33 58 V36 Z"
            fill="rgba(15, 20, 50, 0.6)"
            stroke="#765cff"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_6px_rgba(118,92,255,0.4)]"
          />

          {/* Signature Z Letter */}
          <path
            d="M43 43 H78 L43 77 H78"
            fill="none"
            stroke="#16d9ff"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_6px_#00d9ff]"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <span className="text-lg font-bold tracking-widest font-mono bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent leading-tight">
            ZENTRONYX
          </span>
          <span className="text-[9px] font-mono tracking-[0.25em] text-cyan-400 font-semibold uppercase leading-tight">
            SECURITY PLATFORM
          </span>
        </div>
      )}
    </div>
  );
};

export default ZentronyxLogo;
