import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface BentoProps {
  cards: BentoCardProps[];
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = "15, 23, 42"; // slate-900 RGB values
const MOBILE_BREAKPOINT = 768;

const BentoCardGrid: React.FC<{
  children: React.ReactNode;
  gridRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ children, gridRef }) => (
  <div
    className="bento-section max-w-5xl mx-auto px-4"
    ref={gridRef}
  >
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () =>
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

const MagicBento: React.FC<BentoProps> = ({
  cards = [],
  textAutoHide = true,
  enableStars = false,
  enableSpotlight = false,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = false,
  enableMagnetism = false,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;

  return (
    <>
      <style>
        {`
        .bento-section {
          --glow-x: 50%;
          --glow-y: 50%;
          --glow-intensity: 0;
          --glow-radius: 200px;
        }

        .card-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          padding: 1rem;
        }

        @media (min-width: 768px) {
          .card-container {
            grid-template-columns: repeat(${Math.min(cards.length, 3)}, 1fr);
            gap: 2rem;
          }
        }

        .magic-card {
          aspect-ratio: 1 / 1;
          min-height: 200px;
          width: 100%;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .magic-card:hover {
          transform: translateY(-4px);
          border-color: rgb(${glowColor});
          box-shadow: 
            0 0 0 1px rgba(${glowColor}, 0.2),
            0 4px 12px rgba(${glowColor}, 0.1),
            0 8px 24px rgba(${glowColor}, 0.1),
            0 16px 48px rgba(${glowColor}, 0.05);
        }

        .magic-card::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 16px;
          padding: 2px;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(${glowColor}, 0.1) 50%,
            transparent 70%
          );
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .magic-card:hover::before {
          opacity: 1;
        }

        .card-icon {
          margin-bottom: 1rem;
          transition: transform 0.3s ease;
        }

        .magic-card:hover .card-icon {
          transform: scale(1.1);
        }

        .card-label {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-top: 0.5rem;
        }

        .card-glow-effect {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(${glowColor}, 0.3) 0%,
            rgba(${glowColor}, 0.1) 40%,
            transparent 70%
          );
          pointer-events: none;
          opacity: 0;
          transition: all 0.5s ease;
        }

        .magic-card:hover .card-glow-effect {
          width: 200%;
          height: 200%;
          opacity: 1;
        }

        @media (max-width: 767px) {
          .card-container {
            grid-template-columns: 1fr;
            max-width: 300px;
            margin: 0 auto;
          }
          
          .magic-card {
            min-height: 180px;
          }
        }
        `}
      </style>

      <BentoCardGrid gridRef={gridRef}>
        <div className="card-container">
          {cards.map((card, index) => (
            <div
              key={index}
              className="magic-card"
              onClick={card.onClick}
              onMouseEnter={(e) => {
                if (!shouldDisableAnimations && enableTilt) {
                  gsap.to(e.currentTarget, {
                    rotateX: 5,
                    rotateY: 5,
                    duration: 0.3,
                    ease: "power2.out",
                    transformPerspective: 1000,
                  });
                }
              }}
              onMouseLeave={(e) => {
                if (!shouldDisableAnimations && enableTilt) {
                  gsap.to(e.currentTarget, {
                    rotateX: 0,
                    rotateY: 0,
                    duration: 0.3,
                    ease: "power2.out",
                  });
                }
              }}
              onMouseMove={(e) => {
                if (!shouldDisableAnimations && (enableTilt || enableMagnetism)) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;

                  if (enableTilt) {
                    const rotateX = ((y - centerY) / centerY) * -5;
                    const rotateY = ((x - centerX) / centerX) * 5;

                    gsap.to(e.currentTarget, {
                      rotateX,
                      rotateY,
                      duration: 0.1,
                      ease: "power2.out",
                      transformPerspective: 1000,
                    });
                  }

                  if (enableMagnetism) {
                    const magnetX = (x - centerX) * 0.03;
                    const magnetY = (y - centerY) * 0.03;

                    gsap.to(e.currentTarget, {
                      x: magnetX,
                      y: magnetY,
                      duration: 0.3,
                      ease: "power2.out",
                    });
                  }
                }
              }}
            >
              <div className="card-glow-effect"></div>
              <div className="card-icon">
                {card.icon}
              </div>
              <div className="card-label">
                {card.label}
              </div>
              {card.title && (
                <h3 className="text-sm text-slate-600 mt-2">
                  {card.title}
                </h3>
              )}
              {card.description && (
                <p className="text-xs text-slate-500 mt-1">
                  {card.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </BentoCardGrid>
    </>
  );
};

export default MagicBento;