import { ReactNode } from 'react';

interface CardProps {
  title?: string | ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  noPadding?: boolean;
}

export default function Card({ title, children, className = '', action, noPadding = false }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}
