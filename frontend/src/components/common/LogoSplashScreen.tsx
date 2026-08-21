import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface LogoSplashScreenProps {
  onComplete?: () => void;
  autoDismissTime?: number; // ms, e.g. 5000
}

export const LogoSplashScreen: React.FC<LogoSplashScreenProps> = ({
  onComplete,
  autoDismissTime = 4800,
}) => {
  const [replayKey, setReplayKey] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const logoContainerRef = useRef<HTMLDivElement | null>(null);

  // Replay handler
  const handleReplay = () => {
    setReplayKey((prev) => prev + 1);
  };

  // Dismiss / Enter handler
  const handleEnter = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 450);
  };

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissTime <= 0) return;
    const timer = setTimeout(() => {
      handleEnter();
    }, autoDismissTime);

    return () => clearTimeout(timer);
  }, [autoDismissTime, replayKey]);

  // Parallax 3D tilt effect on mouse move
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!logoContainerRef.current) return;
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      const rotateX = y * -6;
      const rotateY = x * 6;

      logoContainerRef.current.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      if (!logoContainerRef.current) return;
      logoContainerRef.current.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#03060b] text-white overflow-hidden transition-opacity duration-500 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(circle at center, #111827 0%, #080d16 45%, #03060b 100%)',
      }}
    >
      {/* Top Controls / Skip Button */}
      <div className="absolute top-6 right-6 z-20 flex items-center space-x-3">
        <button
          onClick={handleEnter}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-mono tracking-wider transition-all backdrop-blur-md shadow-lg"
        >
          <span>ENTER PLATFORM</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Page Container */}
      <main className="w-full h-full flex flex-col items-center justify-center relative">
        <div
          key={replayKey}
          onClick={handleReplay}
          className="zentronyx-logo flex items-center justify-center gap-6 cursor-pointer p-4 transition-transform duration-200"
          title="Click to replay animation"
        >
          {/* Logo Container */}
          <div
            ref={logoContainerRef}
            className="logo-container relative w-[110px] h-[110px] flex items-center justify-center transition-transform duration-100 ease-out"
          >
            {/* Outer Glow */}
            <div className="logo-glow" />

            {/* Scanning Ring */}
            <div className="scan-ring" />

            {/* SVG Logo */}
            <svg
              className="logo-svg"
              viewBox="0 0 120 120"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer rounded square frame */}
              <rect
                className="outer-frame"
                x="8"
                y="8"
                width="104"
                height="104"
                rx="25"
              />

              {/* Shield */}
              <path
                className="shield"
                d="
                  M60 25
                  L87 36
                  V58
                  C87 77 76 91 60 99
                  C44 91 33 77 33 58
                  V36
                  Z
                "
              />

              {/* Z Letter */}
              <path
                className="z-letter"
                d="
                  M43 43
                  H78
                  L43 77
                  H78
                "
              />
            </svg>

            {/* Moving Scanner */}
            <div className="scan-line" />
          </div>

          {/* Brand Typography */}
          <div className="brand flex flex-col justify-center min-w-[280px] sm:min-w-[330px]">
            <div className="brand-name flex items-center gap-[2px] text-3xl sm:text-4xl font-extrabold tracking-[4px] leading-none text-[#eef8ff]">
              <span>Z</span>
              <span>E</span>
              <span>N</span>
              <span>T</span>
              <span>R</span>
              <span>O</span>
              <span>N</span>
              <span>Y</span>
              <span>X</span>
            </div>

            <div className="brand-line" />

            <div className="brand-subtitle mt-2 text-[9px] sm:text-[10px] font-semibold tracking-[5px] text-[#36d9ff]">
              SECURITY PLATFORM
            </div>
          </div>
        </div>

        {/* Instruction Footer */}
        <div className="instruction absolute bottom-8 text-[9px] sm:text-[10px] tracking-[3px] font-mono text-cyan-400/50 flex items-center space-x-2">
          <span>CLICK LOGO TO REPLAY</span>
          <span className="text-slate-600">&bull;</span>
          <button
            onClick={handleEnter}
            className="text-cyan-300 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            CONTINUE TO DASHBOARD
          </button>
        </div>
      </main>
    </div>
  );
};

export default LogoSplashScreen;
