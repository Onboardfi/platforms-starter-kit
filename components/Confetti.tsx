// components/Confetti.tsx

import React, { useEffect, useRef } from 'react';

const SHAPES = ['square', 'triangle'];
const COLOR_DIGIT = "ABCDEF1234567890";

interface ConfettiProps {
  active: boolean;
  count?: number;
  duration?: number; // in milliseconds
}

const Confetti: React.FC<ConfettiProps> = ({ active, count = 50, duration = 4000 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Function to generate a random hex color
  const generateRandomColor = (): string => {
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += COLOR_DIGIT[Math.floor(Math.random() * COLOR_DIGIT.length)];
    }
    return color;
  };

  // Function to generate confetti
  const generateConfetti = () => {
    const container = containerRef.current;
    if (container) {
      for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        const positionX = Math.random() * window.innerWidth;
        const positionY = Math.random() * window.innerHeight;
        const rotation = Math.random() * 360;
        const size = Math.floor(Math.random() * (20 - 5 + 1)) + 5;

        // Set confetti styles
        confetti.style.left = `${positionX}px`;
        confetti.style.top = `${positionY}px`;
        confetti.style.transform = `rotate(${rotation}deg)`;
        confetti.className = 'confetti ' + SHAPES[Math.floor(Math.random() * SHAPES.length)];
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.backgroundColor = generateRandomColor();

        // Append confetti to the container
        container.appendChild(confetti);

        // Remove confetti element after animation duration
        setTimeout(() => {
          container.removeChild(confetti);
        }, duration);
      }
    }
  };

  useEffect(() => {
    if (active) {
      generateConfetti();
    }
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
    ></div>
  );
};

export default Confetti;
