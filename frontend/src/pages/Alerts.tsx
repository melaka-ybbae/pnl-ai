import { useState } from 'react';
import { Bell, AlertCircle, CheckCircle, Info, AlertTriangle, Sparkles, Calendar, TrendingUp, TrendingDown, DollarSign, Banknote } from 'lucide-react';

type AlertType = 'danger' | 'warning' | 'info' | 'success';
type AlertCategory = 'cost' | 'revenue' | 'receivable' | 'forex' | 'system';

interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  categoryLabel: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'danger',
      category: 'cost',
      categoryLabel: '원가 관리',
      title: '원가율 급등 경고',
      message: '이번 달 원가율이 전월 대비 8.5% 상승했습니다. 냉연강판 단가 상승이 주요 원인입니다.',
      timestamp: '2026-01-29 10:30',
      read: false,
      action: '/cost',
      priority: 'high'
    },
    {
      id: '2',
      type: 'danger',
      category: 'receivable',
      categoryLabel: '채권 관리',
      title: '미수금 연체 발생',
      message: 'ABC Trading Co. 60일 연체 (USD $50,000). 즉시 회수 조치가 필요합니다.',
      timestamp: '2026-01-29 09:15',
      read: false,
      action: '/receivables',
      priority: 'high'
    },
    {
      id: '3',
      type: 'warning',
      category: 'forex',
      categoryLabel: '환율 관리',
      title: '환율 급변동 감지',
      message: 'USD/KRW 환율이 1일 만에 15원 상승했습니다. 환헤지 전략 재검토가 필요합니다.',
      timestamp: '2026-01-29 08:00',
      read: true,
      action: '/forex',
      priority: 'medium'
    },
    {
      id: '4',
      type: 'warning',
      category: 'revenue',
      categoryLabel: '매출 관리',
      title: '매출 급감 알림',
      message: '이번 주 수출 매출이 전주 대비 25% 감소했습니다. 주요 바이어 발주 지연으로 추정됩니다.',
      timestamp: '2026-01-28 16:45',
      read: true,
      action: '/sales',
      priority: 'medium'
    },
    {
      id: '5',
      type: 'info',
      category: 'system',
      categoryLabel: '시스템',
      title: 'ERP 데이터 동기화 완료',
      message: '오전 6시 예정 동기화가 성공적으로 완료되었습니다. (1,234건 업데이트)',
      timestamp: '2026-01-29 06:05',
      read: true,
      priority: 'low'
    },
    {
      id: '6',
      type: 'success',
      category: 'system',
      categoryLabel: '시스템',
      title: '월간 보고서 생성 완료',
      message: '2026년 1월 월간 손익 보고서가 생성되어 finance@company.com으로 발송되었습니다.',
      timestamp: '2026-01-28 09:00',
      read: true,
      priority: 'low'
    },
  ]);

  const [filter, setFilter] = useState<'all' | AlertType>('all');

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="text-red-600" size={18} />;
      case 'warning':
        return <AlertCircle className="text-amber-600" size={18} />;
      case 'success':
        return <CheckCircle className="text-emerald-600" size={18} />;
      default:
        return <Info className="text-blue-600" size={18} />;
    }
  };

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case 'cost':
        return <DollarSign className="text-orange-600" size={14} />;
      case 'revenue':
        return <TrendingUp className="text-blue-600" size={14} />;
      case 'receivable':
        return <Calendar className="text-purple-600" size={14} />;
      case 'forex':
        return <Banknote className="text-emerald-600" size={14} />;
      default:
        return <Bell className="text-slate-600" size={14} />;
    }
  };

  const getAlertBgColor = (type: AlertType, read: boolean) => {
    if (read) return 'bg-slate-50 border-slate-200';

    switch (type) {
      case 'danger':
        return 'bg-red-50 border-red-300';
      case 'warning':
        return 'bg-amber-50 border-amber-300';
      case 'success':
        return 'bg-emerald-50 border-emerald-300';
      default:
        return 'bg-blue-50 border-blue-300';
    }
  };

  const markAsRead = (id: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === id ? { ...alert, read: true } : alert
      )
    );
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
  };

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter(alert => alert.type === filter);

  const stats = {
    danger: alerts.filter(a => a.type === 'danger' && !a.read).length,
    warning: alerts.filter(a => a.type === 'warning' && !a.read).length,
    info: alerts.filter(a => a.type === 'info' && !a.read).length,
    success: alerts.filter(a => a.type === 'success' && !a.read).length,
  };

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">알림 센터</h1>
          <p className="text-[13px] text-slate-500 mt-1">AI가 감지한 이상 징후 및 시스템 알림</p>
        </div>
        <button
          onClick={markAllAsRead}
          className="px-4 py-2 text-[13px] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          모두 읽음 처리
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilter(filter === 'danger' ? 'all' : 'danger')}
          className={`p-5 rounded-xl border-2 transition-all ${
            filter === 'danger'
              ? 'border-red-400 bg-red-50'
              : 'border-slate-200 bg-white hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-center mb-2">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <div className="text-[24px] font-bold text-slate-800">{stats.danger}</div>
          <p className="text-[12px] text-slate-500 mt-1">긴급</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
          className={`p-5 rounded-xl border-2 transition-all ${
            filter === 'warning'
              ? 'border-amber-400 bg-amber-50'
              : 'border-slate-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-center mb-2">
            <AlertCircle className="text-amber-600" size={28} />
          </div>
          <div className="text-[24px] font-bold text-slate-800">{stats.warning}</div>
          <p className="text-[12px] text-slate-500 mt-1">경고</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'info' ? 'all' : 'info')}
          className={`p-5 rounded-xl border-2 transition-all ${
            filter === 'info'
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-center mb-2">
            <Info className="text-blue-600" size={28} />
          </div>
          <div className="text-[24px] font-bold text-slate-800">{stats.info}</div>
          <p className="text-[12px] text-slate-500 mt-1">정보</p>
        </button>

        <button
          onClick={() => setFilter(filter === 'success' ? 'all' : 'success')}
          className={`p-5 rounded-xl border-2 transition-all ${
            filter === 'success'
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="text-emerald-600" size={28} />
          </div>
          <div className="text-[24px] font-bold text-slate-800">{stats.success}</div>
          <p className="text-[12px] text-slate-500 mt-1">완료</p>
        </button>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500" size={16} />
            <span className="text-[14px] font-semibold text-slate-800">
              {filter === 'all' ? '전체 알림' : `${
                filter === 'danger' ? '긴급' :
                filter === 'warning' ? '경고' :
                filter === 'info' ? '정보' : '완료'
              } 알림`}
            </span>
          </div>
          <span className="text-[12px] text-slate-500">
            {filteredAlerts.filter(a => !a.read).length}개 읽지 않음
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => !alert.read && markAsRead(alert.id)}
                className={`p-4 border-l-4 transition-all cursor-pointer ${getAlertBgColor(alert.type, alert.read)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getCategoryIcon(alert.category)}
                      <span className="text-[11px] text-slate-500">{alert.categoryLabel}</span>
                      {alert.priority === 'high' && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 rounded font-medium">
                          긴급
                        </span>
                      )}
                      {!alert.read && (
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      )}
                    </div>
                    <p className={`text-[14px] font-medium ${alert.read ? 'text-slate-600' : 'text-slate-900'}`}>
                      {alert.title}
                    </p>
                    <p className={`text-[13px] mt-1 ${alert.read ? 'text-slate-500' : 'text-slate-700'}`}>
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-slate-400">{alert.timestamp}</span>
                      {alert.action && (
                        <a
                          href={alert.action}
                          className="text-[11px] text-amber-600 hover:text-amber-700 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          자세히 보기 →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Bell className="mx-auto mb-3 text-slate-300" size={40} />
              <p className="text-[14px] text-slate-400">알림이 없습니다.</p>
              <p className="text-[12px] text-slate-400 mt-1">새로운 알림이 있으면 여기에 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Detection Info */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
              <Sparkles className="text-amber-600" size={14} />
            </div>
            <span className="text-[14px] font-semibold text-slate-800">AI 이상 탐지 기준</span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-red-600" size={18} />
                <h3 className="text-[13px] font-medium text-red-900">원가율 급등</h3>
              </div>
              <p className="text-[12px] text-red-700">
                원가율이 설정 임계치(기본 10%)를 초과하여 상승한 경우 자동 알림
              </p>
            </div>

            <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="text-red-600" size={18} />
                <h3 className="text-[13px] font-medium text-red-900">미수금 연체</h3>
              </div>
              <p className="text-[12px] text-red-700">
                결제 기한이 30일 이상 경과한 미수금 자동 탐지 및 알림
              </p>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="text-amber-600" size={18} />
                <h3 className="text-[13px] font-medium text-amber-900">환율 급변동</h3>
              </div>
              <p className="text-[12px] text-amber-700">
                일일 환율 변동폭이 5원 이상일 경우 자동 감지
              </p>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="text-amber-600" size={18} />
                <h3 className="text-[13px] font-medium text-amber-900">매출 급감</h3>
              </div>
              <p className="text-[12px] text-amber-700">
                주간/월간 매출이 전기 대비 20% 이상 감소한 경우 알림
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
