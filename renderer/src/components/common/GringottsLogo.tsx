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
        <linearGradient id="gringotts-logomark-gd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE27A" />
          <stop offset="50%" stopColor="#F5B82E" />
          <stop offset="100%" stopColor="#C98A12" />
        </linearGradient>
      </defs>

      {/* Fundo Squircle Dourado Oficial */}
      {withBackground && (
        <rect width="512" height="512" rx="116" fill="url(#gringotts-logomark-gd)" />
      )}

      {/* Barras Financeiras de Crescimento */}
      <rect x="104" y="288" width="76" height="120" rx="20" fill="#1A1103" opacity="0.55" />
      <rect x="218" y="228" width="76" height="180" rx="20" fill="#1A1103" opacity="0.78" />
      <rect x="332" y="168" width="76" height="240" rx="20" fill="#1A1103" />

      {/* Moeda no Topo da Maior Barra */}
      <circle cx="370" cy="118" r="38" fill="#FFF6D0" />
      <circle cx="370" cy="118" r="26" fill="none" stroke="#C98A12" strokeWidth="6" />
    </svg>
  );
};

export default GringottsLogo;
