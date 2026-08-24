import React from 'react';
import { SAMARINDA_LOGO_BASE64 } from '../data/logoSamarindaBase64';

interface SamarindaLogoProps {
  className?: string;
  size?: number | string;
}

export const SamarindaLogo: React.FC<SamarindaLogoProps> = ({
  className = 'w-10 h-10',
  size,
}) => {
  const sizeStyle = size ? { width: size, height: size } : undefined;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${className}`}
      style={sizeStyle}
      title="Lambang Pemerintah Kota Samarinda"
    >
      <img
        src={SAMARINDA_LOGO_BASE64}
        alt="Lambang Kota Samarinda"
        className="w-full h-full object-contain drop-shadow-xs"
      />
    </div>
  );
};
