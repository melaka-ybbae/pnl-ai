import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { ChangeDetail } from '../../types';

interface AlertsPanelProps {
  items: ChangeDetail[];
  maxItems?: number;
}

export default function AlertsPanel({ items, maxItems = 5 }: AlertsPanelProps) {
  const displayItems = items.slice(0, maxItems);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertTriangle className="mx-auto mb-2 text-gray-300" size={32} />
        <p>주요 변동 항목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayItems.map((item, index) => (
        <div
          key={index}
          className={`flex items-center justify-between p-3 rounded-lg ${
            item.변동률 > 0 ? 'bg-red-50' : 'bg-blue-50'
          }`}
        >
          <div className="flex items-center gap-3">
            {item.변동률 > 0 ? (
              <TrendingUp className="text-red-500" size={20} />
            ) : (
              <TrendingDown className="text-blue-500" size={20} />
            )}
            <div>
              <p className="font-medium text-gray-800">{item.계정과목}</p>
              <p className="text-sm text-gray-500">{item.분류}</p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`font-semibold ${
                item.변동률 > 0 ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              {item.변동률 > 0 ? '+' : ''}{item.변동률.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">
              {(item.변동액 / 10000).toFixed(0)}만원
            </p>
          </div>
        </div>
      ))}

      {items.length > maxItems && (
        <p className="text-center text-sm text-gray-500">
          외 {items.length - maxItems}개 항목
        </p>
      )}
    </div>
  );
}
