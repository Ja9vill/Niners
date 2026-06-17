import React from 'react';

interface StaticContainerProps {
  /** Maps to data-target attribute for targeting/testing */
  target?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Global.StaticContainer
 * A full-width section container with dark bg, subtle border,
 * 12px radius, and responsive padding (sm:14 / md:18 / lg:24).
 */
export const StaticContainer: React.FC<StaticContainerProps> = ({
  target,
  children,
  className = '',
}) => {
  return (
    <div
      className={[
        'w-full max-w-full rounded-xl my-3',
        'px-[14px] py-[14px]',
        'md:px-[18px] md:py-[18px]',
        'lg:px-[24px] lg:py-[24px]',
        className,
      ].join(' ')}
      style={{
        background: '#0F0F0F',
        border: '1px solid #1E1E1E',
        borderRadius: '12px',
        margin: '12px 0',
      }}
      data-target={target}
    >
      {children}
    </div>
  );
};

export default StaticContainer;
