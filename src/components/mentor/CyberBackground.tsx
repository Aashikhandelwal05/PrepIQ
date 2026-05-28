import { useEffect, useRef } from "react";

export function CyberBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if it's a touch device; if so, we can disable the animation to save battery
    if (window.matchMedia("(hover: none)").matches) {
      return;
    }

    let rafId: number;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      
      container.style.setProperty("--mouse-x", `${currentX}px`);
      container.style.setProperty("--mouse-y", `${currentY}px`);
      
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden bg-[#03030a] pointer-events-none rounded-xl"
    >
      {/* Ambient static glow for mobile fallback and baseline aesthetics */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px]" />

      {/* The Dynamic Cursor Glow (Desktop Only) */}
      <div 
        className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full mix-blend-screen hidden sm:block opacity-60"
        style={{
          transform: "translate(calc(var(--mouse-x, 50vw) - 400px), calc(var(--mouse-y, 50vh) - 400px))",
          background: "radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.05) 40%, transparent 70%)",
          willChange: "transform"
        }}
      />
      
      {/* The + Grid Pattern with dynamic masking */}
      <div 
        className="absolute inset-0 opacity-40 sm:opacity-70"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 17v6m-3-3h6' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' stroke-linecap='round' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(circle 400px at var(--mouse-x, 50vw) var(--mouse-y, 50vh), black 10%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle 400px at var(--mouse-x, 50vw) var(--mouse-y, 50vh), black 10%, transparent 100%)"
        }}
      />
    </div>
  );
}
