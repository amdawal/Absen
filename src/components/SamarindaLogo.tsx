import React from 'react';

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
        src="/Logo_Kota_Samarinda.png"
        alt="Lambang Kota Samarinda"
        className="w-full h-full object-contain drop-shadow-xs"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
