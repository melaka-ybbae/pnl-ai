import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  getDashboardKPI,
  getSalesTrend,
  getDashboardAlerts,
  getRecentDocuments,
  getQuickStats
} from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  FileText,
  Ship,
  ArrowRight,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface KPIData {
  value: number;
  value_usd?: number;
  change?: number;
  unit: string;
  period?: string;
  overdue_ratio?: number;
  count?: number;
}

interface Alert {
  type: 'danger' | 'warning' | 'info' | 'success';
  category: string;
  title: string;
  message: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

interface TrendPoint {
  date: string;
  day_name: string;
  amount: number;
  export: number;
  domestic: number;
}

interface RecentDoc {
  id: string;
  type: string;
  type_label: string;
  reference: string;
  customer?: string;
  amount?: number;
  currency?: string;
  date: string;
  status: string;
}

export default function Dashboard() {
  const [kpi, setKpi] = useState<Record<string, KPIData> | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setAlertsLoading(true);

    try {
      const [kpiRes, trendRes, docsRes, statsRes] = await Promise.all([
        getDashboardKPI(),
        getSalesTrend(7),
        getRecentDocuments(5),
        getQuickStats()
      ]);

      if (kpiRes.success) setKpi(kpiRes.data);
      if (trendRes.success) setTrend(trendRes.data.trend);
      if (docsRes.success) setRecentDocs(docsRes.data);
      if (statsRes.success) setStats(statsRes.data);

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }

    try {
      const alertsRes = await getDashboardAlerts();
      if (alertsRes.success && alertsRes.data?.alerts) {
        setAlerts(alertsRes.data.alerts);
      }
    } catch (error) {
      console.error('Alerts load error:', error);
    } finally {
      setAlertsLoading(false);
    }
  };

  const formatCurrency = (value: number, short: boolean = true) => {
    if (short) {
      if (Math.abs(value) >= 100000000) {
        return `${(value / 100000000).toFixed(1)}억`;
      }
      if (Math.abs(value) >= 10000) {
        return `${(value / 10000).toFixed(0)}만`;
      }
      return value.toLocaleString();
    }
    return value.toLocaleString();
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'danger': return <AlertTriangle className="text-red-600" size={18} />;
      case 'warning': return <AlertCircle className="text-amber-600" size={18} />;
      case 'success': return <CheckCircle className="text-emerald-600" size={18} />;
      default: return <Info className="text-slate-500" size={18} />;
    }
  };

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'danger': return 'bg-red-50 border-red-100';
      case 'warning': return 'bg-amber-50 border-amber-100';
      case 'success': return 'bg-emerald-50 border-emerald-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <FileText className="text-slate-500" size={16} />;
      case 'bl': return <Ship className="text-slate-500" size={16} />;
      default: return <FileText className="text-slate-400" size={16} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded font-medium">확정</span>;
      case 'parsed':
        return <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded font-medium">파싱완료</span>;
      case 'warning':
        return <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded font-medium">확인필요</span>;
      default:
        return <span className="px-2 py-0.5 text-xs bg-slate-50 text-slate-600 rounded font-medium">{status}</span>;
    }
  };

  const maxTrendValue = Math.max(...trend.map(t => t.amount), 1);

  if (loading) {
    return <LoadingSpinner message="데이터를 불러오는 중입니다..." />;
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">대시보드</h1>
          <p className="text-[13px] text-slate-500 mt-1">컬러강판 수출 재무 현황</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-all btn-press shadow-sm"
        >
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* KPI Cards */}
      {kpi && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 매출액 - Primary gradient */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 card-interactive shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white/90" size={20} />
              </div>
              {kpi.매출액?.change !== undefined && (
                <div className={`flex items-center gap-1 text-[13px] font-medium px-2 py-1 rounded-full ${kpi.매출액.change >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                  {kpi.매출액.change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {Math.abs(kpi.매출액.change).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-[13px] text-slate-400 mb-1">매출액</p>
            <p className="text-[26px] font-semibold text-white tabular-nums tracking-tight">
              {formatCurrency(kpi.매출액?.value || 0)}<span className="text-[15px] font-normal text-slate-400 ml-0.5">원</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-2">{kpi.매출액?.period}</p>
          </div>

          {/* 영업이익 - Accent gradient */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 card-interactive shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <DollarSign className="text-white" size={20} />
              </div>
              {kpi.영업이익?.change !== undefined && (
                <div className={`flex items-center gap-1 text-[13px] font-medium px-2 py-1 rounded-full ${kpi.영업이익.change >= 0 ? 'bg-white/20 text-white' : 'bg-red-900/30 text-red-100'}`}>
                  {kpi.영업이익.change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {Math.abs(kpi.영업이익.change).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-[13px] text-amber-100/80 mb-1">영업이익</p>
            <p className="text-[26px] font-semibold text-white tabular-nums tracking-tight">
              {formatCurrency(kpi.영업이익?.value || 0)}<span className="text-[15px] font-normal text-amber-100/70 ml-0.5">원</span>
            </p>
            <p className="text-[11px] text-amber-200/60 mt-2">{kpi.영업이익?.period}</p>
          </div>

          {/* 원가율 - Clean white */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Percent className="text-slate-600" size={20} />
              </div>
              {kpi.원가율?.change !== undefined && (
                <div className={`flex items-center gap-1 text-[13px] font-medium ${kpi.원가율.change <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {kpi.원가율.change <= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                  {Math.abs(kpi.원가율.change).toFixed(1)}%p
                </div>
              )}
            </div>
            <p className="text-[13px] text-slate-500 mb-1">원가율</p>
            <p className="text-[26px] font-semibold text-slate-900 tabular-nums tracking-tight">
              {kpi.원가율?.value?.toFixed(1)}<span className="text-[15px] font-normal text-slate-400 ml-0.5">%</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-2">{kpi.원가율?.period}</p>
          </div>

          {/* 미수금 - White with warning accent */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm relative overflow-hidden">
            {kpi.미수금?.overdue_ratio !== undefined && kpi.미수금.overdue_ratio > 0 && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full" />
            )}
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-slate-600" size={20} />
                </div>
                {kpi.미수금?.overdue_ratio !== undefined && kpi.미수금.overdue_ratio > 0 && (
                  <div className="flex items-center gap-1 text-[13px] font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    <AlertTriangle size={13} />
                    연체 {kpi.미수금.overdue_ratio}%
                  </div>
                )}
              </div>
              <p className="text-[13px] text-slate-500 mb-1">미수금</p>
              <p className="text-[26px] font-semibold text-slate-900 tabular-nums tracking-tight">
                {formatCurrency(kpi.미수금?.value || 0)}<span className="text-[15px] font-normal text-slate-400 ml-0.5">원</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-2 tabular-nums">
                ${formatCurrency(kpi.미수금?.value_usd || 0, false)} ({kpi.미수금?.count}건)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-[420px] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-[15px] font-semibold text-slate-800">최근 7일 매출 추이</h3>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-center">
              {trend.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-end justify-between h-48 gap-3 px-2">
                    {trend.map((point, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center group">
                        <div className="w-full flex flex-col items-center gap-1" style={{ height: '160px' }}>
                          <span className="text-[11px] text-slate-400 mb-1 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                            {(point.amount / 10000).toFixed(0)}만
                          </span>
                          <div className="w-full flex-1 flex flex-col justify-end">
                            <div
                              className="chart-bar w-full transition-all duration-300 group-hover:scale-105"
                              style={{
                                height: `${(point.amount / maxTrendValue) * 100}%`,
                                minHeight: '4px'
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-2.5 font-medium">{point.day_name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-8 pt-4 border-t border-slate-100/80">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gradient-to-t from-slate-800 to-slate-600 rounded-sm" />
                      <span className="text-[12px] text-slate-500">수출 (70%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-slate-300 rounded-sm" />
                      <span className="text-[12px] text-slate-500">내수 (30%)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Alerts */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden h-[420px] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <h3 className="text-[15px] font-semibold text-slate-800">AI 분석 알림</h3>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              {alertsLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <span className="text-[13px] text-slate-500">AI가 분석 중입니다...</span>
                </div>
              ) : alerts.length > 0 ? (
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border transition-all hover:shadow-sm ${getAlertBgColor(alert.type)}`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 uppercase tracking-wide">{alert.category}</span>
                            {alert.priority === 'high' && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded font-semibold">긴급</span>
                            )}
                          </div>
                          <p className="font-medium text-slate-800 text-[13px] mt-1">{alert.title}</p>
                          <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">{alert.message}</p>
                          {alert.action && (
                            <Link
                              to={alert.action}
                              className="inline-flex items-center gap-1 text-[12px] text-amber-700 hover:text-amber-800 mt-2.5 font-medium transition-colors"
                            >
                              자세히 보기 <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="text-emerald-500" size={24} />
                  </div>
                  <p className="text-[13px] text-slate-600 font-medium">모든 지표가 정상입니다</p>
                  <p className="text-[12px] text-slate-400 mt-1">특별한 알림이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-slate-800">최근 업로드 서류</h3>
            <Link to="/documents" className="text-[12px] text-amber-700 hover:text-amber-800 flex items-center gap-1 font-medium transition-colors">
              전체 보기 <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-4">
            {recentDocs.length > 0 ? (
              <div className="divide-y divide-slate-100/80">
                {recentDocs.map((doc, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0 group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                        {getDocIcon(doc.type)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-[13px]">{doc.reference}</p>
                        <p className="text-[11px] text-slate-500">
                          {doc.type_label} {doc.customer && `· ${doc.customer}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(doc.status)}
                      <p className="text-[11px] text-slate-400 mt-1.5 tabular-nums">{doc.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="text-slate-400" size={22} />
                </div>
                <p className="text-[13px] text-slate-500">업로드된 서류가 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-800">이번 달 현황</h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-100">
                  <p className="text-[28px] font-semibold text-slate-900 tabular-nums">{stats.this_month?.invoices_issued || 0}</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Invoice 발행</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-100">
                  <p className="text-[28px] font-semibold text-amber-700 tabular-nums">{stats.this_month?.shipments || 0}</p>
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">선적 완료</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-100">
                  <p className="text-[28px] font-semibold text-emerald-700 tabular-nums">{stats.this_month?.collections || 0}</p>
                  <p className="text-[11px] text-emerald-600 mt-1 font-medium">입금 확인</p>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-100/80">
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">총 서류</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{stats.documents?.total || 0}건</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">검토 대기</span>
                    <span className="font-semibold text-amber-600 tabular-nums">{stats.documents?.pending_review || 0}건</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">총 채권</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{stats.receivables?.total_count || 0}건</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">연체 채권</span>
                    <span className="font-semibold text-red-600 tabular-nums">{stats.receivables?.overdue_count || 0}건</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-100/80 flex gap-2">
                <Link
                  to="/receivables"
                  className="flex-1 py-2.5 px-3 text-[12px] text-center font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all btn-press"
                >
                  채권 관리
                </Link>
                <Link
                  to="/documents"
                  className="flex-1 py-2.5 px-3 text-[12px] text-center font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all btn-press"
                >
                  서류 센터
                </Link>
                <Link
                  to="/forex"
                  className="flex-1 py-2.5 px-3 text-[12px] text-center font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all btn-press shadow-sm"
                >
                  환율 관리
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
