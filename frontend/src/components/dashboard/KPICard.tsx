import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  format?: 'currency' | 'percent' | 'number';
}

export default function KPICard({
  title,
  value,
  unit = '원',
  change,
  changeLabel = '전월대비',
  format = 'currency'
}: KPICardProps) {
  const formatValue = (val: number) => {
    if (format === 'currency') {
      // 억 단위로 표시
      if (Math.abs(val) >= 100000000) {
        return `${(val / 100000000).toFixed(1)}억`;
      }
      // 만 단위로 표시
      if (Math.abs(val) >= 10000) {
        return `${(val / 10000).toFixed(0)}만`;
      }
      return val.toLocaleString();
    }
    if (format === 'percent') {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString();
  };

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-800">
        {formatValue(value)}
        {format === 'currency' && <span className="text-sm font-normal ml-1">{unit}</span>}
      </p>

      {change !== undefined && (
        <div className="flex items-center mt-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
          ) : isNegative ? (
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
          ) : (
            <Minus className="w-4 h-4 text-gray-400 mr-1" />
          )}
          <span
            className={`text-sm ${
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            {change > 0 ? '+' : ''}{change.toFixed(1)}% {changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
