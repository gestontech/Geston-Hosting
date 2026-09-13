export function AppBootLoader() {
  return (
    <div className="app-boot-loader">
      <style>{`
        .app-boot-loader {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          background: hsl(var(--background));
          backdrop-filter: blur(8px);
          animation: boot-fade-in 0.25s ease forwards;
        }
        @keyframes boot-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .app-boot-loader img {
          width: 56px;
          height: 56px;
          object-fit: contain;
          filter: drop-shadow(0 0 18px rgba(59,130,246,0.55));
          animation: boot-logo-pulse 2.1s ease-in-out infinite;
        }
        @keyframes boot-logo-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        .boot-cubes {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .boot-cube {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          animation: cube-float 2.1s ease-in-out infinite;
        }
        .boot-cube:nth-child(1) {
          background: linear-gradient(135deg, #60a5fa, #1d5fff);
          animation-delay: 0s;
        }
        .boot-cube:nth-child(2) {
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          animation-delay: 0.25s;
        }
        .boot-cube:nth-child(3) {
          background: linear-gradient(135deg, #818cf8, #1d4ed8);
          animation-delay: 0.5s;
        }
        @keyframes cube-float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.85;
          }
          50% {
            transform: translateY(-14px) rotate(12deg);
            opacity: 1;
          }
        }
        .boot-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          background: linear-gradient(90deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          user-select: none;
        }
      `}</style>
      <img src="/logo/icon.png" alt="Geston Hosting" draggable={false} />
      <div className="boot-cubes">
        <div className="boot-cube" />
        <div className="boot-cube" />
        <div className="boot-cube" />
      </div>
      <span className="boot-label">Geston Hosting</span>
    </div>
  );
}
