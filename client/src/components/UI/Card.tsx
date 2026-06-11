import React, { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', noPadding = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden ${className}`}
        {...props}
      >
        {noPadding ? children : <div className="p-6">{children}</div>}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
