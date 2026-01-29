import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wallet, Clock, CheckCircle, AlertCircle, Upload, CreditCard, AlertTriangle, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import { getReceivablesSummary, getReceivablesList, getAgingAnalysis, getARRiskAnalysis, getPayablesSummary, getPayablesList, getPaymentSchedule } from '../services/api';

interface ReceivableItem {
  invoice_no: string;
  customer: string;
  country: string;
  amount_usd: number;
  amount_krw: number;
  issue_date: string;
  due_date: string;
  days_overdue: number;
  status: 'current' | 'overdue' | 'paid';
}

interface ARSummary {
  total_outstanding_usd: number;
  total_outstanding_krw: number;
  overdue_amount_usd: number;
  overdue_amount_krw: number;
  overdue_count: number;
  collected_this_month_krw: number;
}

interface AgingData {
  current: number;
  days_30: number;
  days_60: number;
  days_90_plus: number;
}

interface RiskAnalysis {
  high_risk_customers: Array<{
    customer: string;
    outstanding_usd: number;
    days_overdue: number;
    risk_reason: string;
  }>;
  recommendations: string[];
  summary: string;
}

interface PayableItem {
  invoice_no: string;
  supplier: string;
  amount_usd: number;
  amount_krw: number;
  due_date: string;
  days_overdue: number;
  status: 'pending' | 'paid' | 'overdue';
}

interface APSummary {
  total_payables_usd: number;
  total_payables_krw: number;
  due_this_month_count: number;
  due_this_month_amount: number;
  overdue_amount: number;
}

const formatCurrency = (value: number, currency: 'KRW' | 'USD' = 'KRW') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value);
};

export default function Receivables() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ar' | 'ap'>('ar');

  // AR State
  const [arSummary, setArSummary] = useState<ARSummary | null>(null);
  const [arList, setArList] = useState<ReceivableItem[]>([]);
  const [aging, setAging] = useState<AgingData | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [arLoading, setArLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(false);

  // AP State
  const [apSummary, setApSummary] = useState<APSummary | null>(null);
  const [apList, setApList] = useState<PayableItem[]>([]);
  const [paymentSchedule, setPaymentSchedule] = useState<PayableItem[]>([]);
  const [apLoading, setApLoading] = useState(true);

  useEffect(() => {
    if (location.pathname.includes('/receivables/ap')) {
      setActiveTab('ap');
    } else {
      setActiveTab('ar');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (activeTab === 'ar') {
      loadARData();
    } else {
      loadAPData();
    }
  }, [activeTab]);

  const loadARData = async () => {
    setArLoading(true);
    try {
      const [summaryRes, listRes, agingRes] = await Promise.all([
        getReceivablesSummary(),
        getReceivablesList(),
        getAgingAnalysis()
      ]);

      if (summaryRes.success && summaryRes.data) {
        setArSummary(summaryRes.data);
      }
      if (listRes.success && listRes.data) {
        setArList(listRes.data);
      }
      if (agingRes.success && agingRes.data) {
        setAging(agingRes.data);
      }
    } catch (error) {
      console.error('AR 데이터 로드 오류:', error);
    } finally {
      setArLoading(false);
    }
  };

  const loadAPData = async () => {
    setApLoading(true);
    try {
      const [summaryRes, listRes, scheduleRes] = await Promise.all([
        getPayablesSummary(),
        getPayablesList(),
        getPaymentSchedule()
      ]);

      if (summaryRes.success && summaryRes.data) {
        setApSummary(summaryRes.data);
      }
      if (listRes.success && listRes.data) {
        setApList(listRes.data);
      }
      if (scheduleRes.success && scheduleRes.data) {
        setPaymentSchedule(scheduleRes.data);
      }
    } catch (error) {
      console.error('AP 데이터 로드 오류:', error);
    } finally {
      setApLoading(false);
    }
  };

  const loadRiskAnalysis = async () => {
    setRiskLoading(true);
    try {
      const res = await getARRiskAnalysis();
      if (res.success && res.analysis) {
        setRiskAnalysis(res.analysis);
      }
    } catch (error) {
      console.error('리스크 분석 오류:', error);
    } finally {
      setRiskLoading(false);
    }
  };

  const handleTabChange = (tab: 'ar' | 'ap') => {
    setActiveTab(tab);
    navigate(tab === 'ar' ? '/receivables/ar' : '/receivables/ap');
  };

  const getStatusBadge = (status: string, daysOverdue: number) => {
    if (status === 'paid') {
      return <span className="px-2 py-0.5 text-[11px] bg-emerald-50 text-emerald-700 rounded-full">완료</span>;
    }
    if (daysOverdue > 0) {
      return <span className="px-2 py-0.5 text-[11px] bg-red-50 text-red-700 rounded-full">{daysOverdue}일 연체</span>;
    }
    return <span className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 rounded-full">정상</span>;
  };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">채권/채무 관리</h1>
        <p className="text-[13px] text-slate-500 mt-1">외상매출금 및 외상매입금 관리</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => handleTabChange('ar')}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all btn-press relative ${
            activeTab === 'ar'
              ? 'text-amber-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          외상매출금 (AR)
          {activeTab === 'ar' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('ap')}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all btn-press relative ${
            activeTab === 'ap'
              ? 'text-amber-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          외상매입금 (AP)
          {activeTab === 'ap' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'ar' ? (
        <div className="space-y-6">
          {/* AR Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 card-interactive shadow-lg">
              <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center mb-3">
                <Wallet className="text-white/90" size={20} />
              </div>
              <p className="text-[13px] text-slate-400 mb-1">총 채권</p>
              {arLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="text-slate-400 animate-spin" size={18} />
                </div>
              ) : (
                <>
                  <p className="text-[24px] font-semibold text-white tabular-nums tracking-tight">
                    {arSummary ? formatCurrency(arSummary.total_outstanding_usd, 'USD') : '-'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {arSummary ? formatCurrency(arSummary.total_outstanding_krw) : ''}
                  </p>
                </>
              )}
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 card-interactive shadow-lg">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center mb-3">
                <Clock className="text-white" size={20} />
              </div>
              <p className="text-[13px] text-amber-100/80 mb-1">미수금</p>
              {arLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="text-amber-200 animate-spin" size={18} />
                </div>
              ) : (
                <>
                  <p className="text-[24px] font-semibold text-white tabular-nums tracking-tight">
                    {arSummary ? formatCurrency(arSummary.overdue_amount_usd, 'USD') : '-'}
                  </p>
                  <p className="text-[11px] text-amber-200/60 mt-1">
                    {arSummary?.overdue_count || 0}건 연체
                  </p>
                </>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
                <CheckCircle className="text-emerald-600" size={20} />
              </div>
              <p className="text-[13px] text-slate-500 mb-1">회수 완료</p>
              {arLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="text-slate-400 animate-spin" size={18} />
                </div>
              ) : (
                <>
                  <p className="text-[24px] font-semibold text-slate-900 tabular-nums tracking-tight">
                    {arSummary ? formatCurrency(arSummary.collected_this_month_krw) : '-'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">이번 달</p>
                </>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full"></div>
              <div className="relative">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                  <AlertCircle className="text-red-600" size={20} />
                </div>
                <p className="text-[13px] text-slate-500 mb-1">연체</p>
                {arLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="text-slate-400 animate-spin" size={18} />
                  </div>
                ) : (
                  <>
                    <p className="text-[24px] font-semibold text-red-600 tabular-nums tracking-tight">
                      {arSummary?.overdue_count || 0}건
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">30일 초과</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AR List & Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-[15px] font-semibold text-slate-800">채권 목록</h3>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                {arLoading ? (
                  <div className="py-12 flex items-center justify-center">
                    <Loader2 className="text-slate-400 animate-spin" size={24} />
                  </div>
                ) : arList.length > 0 ? (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2 text-left text-[12px] font-medium text-slate-500">Invoice</th>
                        <th className="px-4 py-2 text-left text-[12px] font-medium text-slate-500">거래처</th>
                        <th className="px-4 py-2 text-right text-[12px] font-medium text-slate-500">금액</th>
                        <th className="px-4 py-2 text-center text-[12px] font-medium text-slate-500">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arList.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-[13px] text-slate-800 font-medium">{item.invoice_no}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-600">{item.customer}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-800 text-right tabular-nums">
                            {formatCurrency(item.amount_usd, 'USD')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(item.status, item.days_overdue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-[13px]">채권 데이터가 없습니다</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden card-interactive">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-[15px] font-semibold text-slate-800">입금 내역 업로드</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer group">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-100 transition-colors">
                    <Upload className="text-slate-400 group-hover:text-amber-600 transition-colors" size={18} />
                  </div>
                  <p className="text-[13px] text-slate-600">은행 엑셀 파일 업로드</p>
                  <p className="text-[11px] text-slate-400 mt-1">AI가 인보이스와 자동 매칭합니다</p>
                </div>
                <button className="w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[13px] font-medium rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all btn-press shadow-sm">
                  업로드 및 매칭
                </button>
              </div>
            </div>
          </div>

          {/* Aging Analysis */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-800">미수금 연령 분석</h3>
            </div>
            <div className="p-5">
              {arLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="text-slate-400 animate-spin" size={24} />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-100">
                    <p className="text-[11px] text-emerald-600 mb-1 font-medium">30일 이내</p>
                    <p className="text-[22px] font-semibold text-emerald-700 tabular-nums">
                      {aging ? formatCurrency(aging.current, 'USD') : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-100">
                    <p className="text-[11px] text-amber-600 mb-1 font-medium">31-60일</p>
                    <p className="text-[22px] font-semibold text-amber-700 tabular-nums">
                      {aging ? formatCurrency(aging.days_30, 'USD') : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-100">
                    <p className="text-[11px] text-orange-600 mb-1 font-medium">61-90일</p>
                    <p className="text-[22px] font-semibold text-orange-700 tabular-nums">
                      {aging ? formatCurrency(aging.days_60, 'USD') : '-'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border border-red-100">
                    <p className="text-[11px] text-red-600 mb-1 font-medium">90일 초과</p>
                    <p className="text-[22px] font-semibold text-red-700 tabular-nums">
                      {aging ? formatCurrency(aging.days_90_plus, 'USD') : '-'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Risk Analysis */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <h3 className="text-[15px] font-semibold text-slate-800">연체 리스크 AI 알림</h3>
              </div>
              <button
                onClick={loadRiskAnalysis}
                disabled={riskLoading}
                className="px-3 py-1.5 bg-slate-900 text-white text-[12px] font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {riskLoading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    AI 분석
                  </>
                )}
              </button>
            </div>
            <div className="p-4">
              {riskAnalysis ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200">
                    <p className="text-[13px] text-slate-700">{riskAnalysis.summary}</p>
                  </div>

                  {/* High Risk Customers */}
                  {riskAnalysis.high_risk_customers && riskAnalysis.high_risk_customers.length > 0 && (
                    <div className="space-y-3">
                      {riskAnalysis.high_risk_customers.map((customer, idx) => (
                        <div key={idx} className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/80 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="text-red-600" size={18} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-red-900 text-[13px]">
                                {customer.customer} - {customer.days_overdue}일 연체
                              </p>
                              <p className="text-[12px] text-red-700 mt-1">
                                미수금: {formatCurrency(customer.outstanding_usd, 'USD')}
                              </p>
                              <p className="text-[12px] text-red-600 mt-1.5">
                                {customer.risk_reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  {riskAnalysis.recommendations && riskAnalysis.recommendations.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-[12px] font-medium text-amber-800 mb-2">권장 조치사항</p>
                      <ul className="space-y-1">
                        {riskAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[13px] text-amber-700">
                            <ChevronRight size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-xl text-center">
                  <p className="text-[13px] text-slate-500">"AI 분석" 버튼을 클릭하여 리스크 분석을 실행하세요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AP Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 card-interactive shadow-lg">
              <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center mb-3">
                <CreditCard className="text-white/90" size={20} />
              </div>
              <p className="text-[13px] text-slate-400 mb-1">총 채무</p>
              {apLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="text-slate-400 animate-spin" size={18} />
                </div>
              ) : (
                <>
                  <p className="text-[24px] font-semibold text-white tabular-nums tracking-tight">
                    {apSummary ? formatCurrency(apSummary.total_payables_usd, 'USD') : '-'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {apSummary ? formatCurrency(apSummary.total_payables_krw) : ''}
                  </p>
                </>
              )}
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 card-interactive shadow-lg">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center mb-3">
                <Clock className="text-white" size={20} />
              </div>
              <p className="text-[13px] text-amber-100/80 mb-1">이번 달 지급 예정</p>
              {apLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="text-amber-200 animate-spin" size={18} />
                </div>
              ) : (
                <>
                  <p className="text-[24px] font-semibold text-white tabular-nums tracking-tight">
                    {apSummary ? formatCurrency(apSummary.due_this_month_amount, 'USD') : '-'}
                  </p>
                  <p className="text-[11px] text-amber-200/60 mt-1">
                    {apSummary?.due_this_month_count || 0}건
                  </p>
                </>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 card-interactive shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full"></div>
              <div className="relative">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                  <AlertCircle className="text-red-600" size={20} />
                </div>
                <p className="text-[13px] text-slate-500 mb-1">미지급금</p>
                {apLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="text-slate-400 animate-spin" size={18} />
                  </div>
                ) : (
                  <>
                    <p className="text-[24px] font-semibold text-slate-900 tabular-nums tracking-tight">
                      {apSummary ? formatCurrency(apSummary.overdue_amount, 'USD') : '-'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">기한 초과</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-800">지급 예정 스케줄</h3>
            </div>
            <div className="overflow-x-auto">
              {apLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 className="text-slate-400 animate-spin" size={24} />
                </div>
              ) : paymentSchedule.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 text-left text-[12px] font-medium text-slate-500">지급일</th>
                      <th className="px-5 py-3 text-left text-[12px] font-medium text-slate-500">공급업체</th>
                      <th className="px-5 py-3 text-left text-[12px] font-medium text-slate-500">Invoice</th>
                      <th className="px-5 py-3 text-right text-[12px] font-medium text-slate-500">금액</th>
                      <th className="px-5 py-3 text-center text-[12px] font-medium text-slate-500">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentSchedule.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3 text-[13px] text-slate-600">{item.due_date}</td>
                        <td className="px-5 py-3 text-[13px] text-slate-800 font-medium">{item.supplier}</td>
                        <td className="px-5 py-3 text-[13px] text-slate-600">{item.invoice_no}</td>
                        <td className="px-5 py-3 text-[13px] text-slate-800 text-right tabular-nums">
                          {formatCurrency(item.amount_usd, 'USD')}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {getStatusBadge(item.status, item.days_overdue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-[13px]">지급 예정 데이터가 없습니다</p>
                </div>
              )}
            </div>
          </div>

          {/* AP List */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[15px] font-semibold text-slate-800">미지급 현황</h3>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              {apLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 className="text-slate-400 animate-spin" size={24} />
                </div>
              ) : apList.filter(item => item.status !== 'paid').length > 0 ? (
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-[12px] font-medium text-slate-500">Invoice</th>
                      <th className="px-4 py-2 text-left text-[12px] font-medium text-slate-500">공급업체</th>
                      <th className="px-4 py-2 text-right text-[12px] font-medium text-slate-500">금액</th>
                      <th className="px-4 py-2 text-center text-[12px] font-medium text-slate-500">연체일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apList.filter(item => item.status !== 'paid').map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-[13px] text-slate-800 font-medium">{item.invoice_no}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{item.supplier}</td>
                        <td className="px-4 py-3 text-[13px] text-slate-800 text-right tabular-nums">
                          {formatCurrency(item.amount_usd, 'USD')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.days_overdue > 0 ? (
                            <span className="text-[13px] text-red-600 font-medium">{item.days_overdue}일</span>
                          ) : (
                            <span className="text-[13px] text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-[13px]">미지급 내역이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
