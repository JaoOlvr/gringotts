import React from 'react';

interface GringottsLogoProps {
  className?: string;
  size?: number | string;
  withBackground?: boolean;
}

export const GringottsLogo: React.FC<GringottsLogoProps> = ({ 
  className = 'w-9 h-9', 
  size, 
  withBackground = true 
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      fill="none"
      role="img"
      aria-label="Gringotts Logo"
    >
      <defs>
        <linearGradient id="gringotts-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE27A" />
          <stop offset="45%" stopColor="#F5B82E" />
          <stop offset="100%" stopColor="#C98A12" />
        </linearGradient>
        <linearGradient id="gringotts-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3A2A0B" />
          <stop offset="100%" stopColor="#1E1405" />
        </linearGradient>
        <linearGradient id="gringotts-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF1B8" />
          <stop offset="50%" stopColor="#FFD25A" />
          <stop offset="100%" stopColor="#E2A21F" />
        </linearGradient>
        <radialGradient id="gringotts-shine" cx="0.25" cy="0.15" r="0.8">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Fundo Dourado Arredondado */}
      {withBackground && (
        <>
          <rect width="512" height="512" rx="116" fill="url(#gringotts-bg)" />
          <rect width="512" height="512" rx="116" fill="url(#gringotts-shine)" />
        </>
      )}

      {/* Moeda interna */}
      <circle cx="256" cy="256" r="176" fill="url(#gringotts-coin)" />
      <circle
        cx="256"
        cy="256"
        r="160"
        fill="none"
        stroke="#F5B82E"
        strokeOpacity="0.55"
        strokeWidth="5"
        strokeDasharray="3 11"
        strokeLinecap="round"
      />

      {/* Monograma 'G' de Gringotts */}
      <path
        d="M 332.6 191.7 A 100 100 0 1 0 356 256 L 262 256"
        fill="none"
        stroke="url(#gringotts-g)"
        strokeWidth="46"
        strokeLinejoin="miter"
      />

      {/* Brilho da Moeda */}
      <path
        d="M 372 112 L 381 140 L 409 149 L 381 158 L 372 186 L 363 158 L 335 149 L 363 140 Z"
        fill="#FFF6D0"
      />
    </svg>
  );
};

export default GringottsLogo;
