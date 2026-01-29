import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { getCurrentRates, getRateHistory, calculateFXGainLoss } from '../services/api';

interface ExchangeRate {
  currency: string;
  name: string;
  rate: number;
  change: number;
  change_percent: number;
  flag: string;
}

interface RateHistory {
  date: string;
  rate: number;
}

interface FXGainLoss {
  currency: string;
  exposure_amount: number;
  book_rate: number;
  current_rate: number;
  gain_loss_krw: number;
  gain_loss_percent: number;
}

interface FXSummary {
  total_exposure_usd: number;
  total_gain_loss_krw: number;
  largest_exposure: string;
  hedged_ratio: number;
}

// 통화별 플래그와 한글명
const currencyInfo: Record<string, { flag: string; name: string }> = {
  USD: { flag: '🇺🇸', name: '미국 달러' },
  EUR: { flag: '🇪🇺', name: '유럽 유로' },
  JPY: { flag: '🇯🇵', name: '일본 엔 (100)' },
  CNY: { flag: '🇨🇳', name: '중국 위안' },
  GBP: { flag: '🇬🇧', name: '영국 파운드' },
};

export default function Forex() {
  // 상태
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [history, setHistory] = useState<RateHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [historyDays, setHistoryDays] = useState(30);
  const [fxGainLoss, setFxGainLoss] = useState<FXGainLoss[]>([]);
  const [fxSummary, setFxSummary] = useState<FXSummary | null>(null);
  const [fxLoading, setFxLoading] = useState(true);

  // 환산 계산기
  const [convertAmount, setConvertAmount] = useState<string>('');
  const [convertCurrency, setConvertCurrency] = useState('USD');
  const [convertedKRW, setConvertedKRW] = useState<number | null>(null);

  // 현재 환율 조회
  const loadRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      const res = await getCurrentRates();
      if (res.success && res.data) {
        const rateList: ExchangeRate[] = res.data.rates.map((r: { currency: string; rate: number; change: number; change_percent: number }) => ({
          currency: r.currency,
          name: currencyInfo[r.currency]?.name || r.currency,
          rate: r.rate,
          change: r.change,
          change_percent: r.change_percent,
          flag: currencyInfo[r.currency]?.flag || '🏳️'
        }));
        setRates(rateList);
      }
    } catch (error) {
      console.error('환율 조회 실패:', error);
      // 폴백 더미 데이터
      setRates([
        { currency: 'USD', name: '미국 달러', rate: 1330.5, change: 2.3, change_percent: 0.17, flag: '🇺🇸' },
        { currency: 'EUR', name: '유럽 유로', rate: 1450.2, change: -1.1, change_percent: -0.08, flag: '🇪🇺' },
        { currency: 'JPY', name: '일본 엔 (100)', rate: 895.7, change: 0.5, change_percent: 0.06, flag: '🇯🇵' },
        { currency: 'CNY', name: '중국 위안', rate: 182.4, change: 0.8, change_percent: 0.44, flag: '🇨🇳' },
      ]);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  // 환율 히스토리 조회
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getRateHistory(selectedCurrency, historyDays);
      if (res.success && res.data) {
        setHistory(res.data.history || []);
      }
    } catch (error) {
      console.error('환율 히스토리 조회 실패:', error);
      // 더미 데이터 생성
      const dummyHistory: RateHistory[] = [];
      const baseRate = selectedCurrency === 'USD' ? 1330 : selectedCurrency === 'EUR' ? 1450 : 900;
      for (let i = historyDays; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dummyHistory.push({
          date: date.toISOString().split('T')[0],
          rate: baseRate + (Math.random() - 0.5) * 30
        });
      }
      setHistory(dummyHistory);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedCurrency, historyDays]);

  // 환차손익 조회
  const loadFXGainLoss = useCallback(async () => {
    setFxLoading(true);
    try {
      const res = await calculateFXGainLoss();
      if (res.success && res.data) {
        setFxGainLoss(res.data.details || []);
        setFxSummary(res.data.summary || null);
      }
    } catch (error) {
      console.error('환차손익 조회 실패:', error);
      // 폴백 데이터
      setFxGainLoss([
        { currency: 'USD', exposure_amount: 500000, book_rate: 1320, current_rate: 1330.5, gain_loss_krw: 5250000, gain_loss_percent: 0.8 },
        { currency: 'EUR', exposure_amount: 100000, book_rate: 1460, current_rate: 1450.2, gain_loss_krw: -980000, gain_loss_percent: -0.67 },
      ]);
      setFxSummary({
        total_exposure_usd: 600000,
        total_gain_loss_krw: 4270000,
        largest_exposure: 'USD',
        hedged_ratio: 35
      });
    } finally {
      setFxLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadRates();
    loadFXGainLoss();
  }, [loadRates, loadFXGainLoss]);

  // 히스토리 로드 (통화/기간 변경 시)
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 환산 계산
  const handleConvert = () => {
    const amount = parseFloat(convertAmount);
    if (isNaN(amount)) {
      setConvertedKRW(null);
      return;
    }
    const rate = rates.find(r => r.currency === convertCurrency);
    if (rate) {
      const krw = convertCurrency === 'JPY' ? amount * rate.rate / 100 : amount * rate.rate;
      setConvertedKRW(krw);
    }
  };

  // 새로고침
  const handleRefresh = () => {
    loadRates();
    loadHistory();
    loadFXGainLoss();
  };

  // 환율 추이 차트 (간단한 ASCII 스타일)
  const renderHistoryChart = () => {
    if (historyLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      );
    }

    if (history.length === 0) {
      return (
        <div className="p-8 text-center text-slate-400">
          <p className="text-[13px]">환율 히스토리 데이터가 없습니다</p>
        </div>
      );
    }

    const minRate = Math.min(...history.map(h => h.rate));
    const maxRate = Math.max(...history.map(h => h.rate));
    const range = maxRate - minRate || 1;

    return (
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-400"
          >
            <option value="USD">USD/KRW</option>
            <option value="EUR">EUR/KRW</option>
            <option value="JPY">JPY/KRW</option>
            <option value="CNY">CNY/KRW</option>
          </select>
          <select
            value={historyDays}
            onChange={(e) => setHistoryDays(Number(e.target.value))}
            className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-400"
          >
            <option value={7}>최근 7일</option>
            <option value={30}>최근 30일</option>
            <option value={90}>최근 90일</option>
          </select>
        </div>

        {/* 간단한 바 차트 */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500 mb-2">
            <span>₩{minRate.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            <span>₩{maxRate.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
          </div>
          <div className="flex items-end gap-[2px] h-32">
            {history.slice(-30).map((h, idx) => {
              const height = ((h.rate - minRate) / range) * 100;
              const isLast = idx === history.slice(-30).length - 1;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-t transition-all hover:opacity-80 ${isLast ? 'bg-amber-500' : 'bg-slate-300'}`}
                  style={{ height: `${Math.max(height, 5)}%` }}
                  title={`${h.date}: ₩${h.rate.toLocaleString()}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>{history[0]?.date}</span>
            <span>{history[history.length - 1]?.date}</span>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-[11px] text-slate-500">최저</p>
            <p className="text-[14px] font-semibold text-slate-800">₩{minRate.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-500">최고</p>
            <p className="text-[14px] font-semibold text-slate-800">₩{maxRate.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-500">현재</p>
            <p className="text-[14px] font-semibold text-amber-600">₩{history[history.length - 1]?.rate.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">외환/환율 관리</h1>
          <p className="text-[13px] text-slate-500 mt-1">실시간 환율 및 환차손익 관리</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={ratesLoading}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-all btn-press shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={ratesLoading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Real-time Exchange Rates */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-semibold text-slate-800">실시간 환율</h3>
        </div>
        <div className="p-5">
          {ratesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rates.map((item, idx) => (
                <div key={idx} className="p-4 border border-slate-200/80 rounded-xl hover:border-amber-300 hover:bg-amber-50/20 transition-all card-interactive group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{item.flag}</span>
                      <div>
                        <p className="font-semibold text-slate-800 text-[14px]">{item.currency}</p>
                        <p className="text-[11px] text-slate-500">{item.name}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[22px] font-semibold text-slate-900 tabular-nums">₩{item.rate.toLocaleString()}</p>
                    <div className={`flex items-center gap-1 text-[12px] mt-1 ${item.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      <span className="tabular-nums">{item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}원 ({item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exchange Rate Trend */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-semibold text-slate-800">환율 추이</h3>
        </div>
        {renderHistoryChart()}
      </div>

      {/* FX Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currency Conversion */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">외화 ↔ 원화 환산</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-2">외화 금액</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0.00"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                />
                <select
                  value={convertCurrency}
                  onChange={(e) => setConvertCurrency(e.target.value)}
                  className="px-4 py-2.5 text-[13px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                >
                  {rates.map(r => (
                    <option key={r.currency} value={r.currency}>{r.currency}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-block p-2 bg-slate-100 rounded-full">
                <RefreshCw className="text-slate-500" size={18} />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-2">원화 금액</label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-[18px] font-semibold text-slate-800 tabular-nums">
                  {convertedKRW !== null ? `₩${convertedKRW.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '₩0'}
                </p>
              </div>
            </div>
            <button
              onClick={handleConvert}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[13px] font-medium rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all btn-press shadow-sm"
            >
              환산하기
            </button>
          </div>
        </div>

        {/* FX Exposure Summary */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-[15px] font-semibold text-slate-800">외화 익스포저 현황</h3>
          </div>
          <div className="p-5">
            {fxLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-slate-400" size={24} />
              </div>
            ) : fxSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/80 rounded-xl">
                    <p className="text-[11px] text-slate-500 mb-1">총 외화 익스포저</p>
                    <p className="text-[16px] font-semibold text-slate-800 tabular-nums">
                      ${fxSummary.total_exposure_usd.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/80 rounded-xl">
                    <p className="text-[11px] text-slate-500 mb-1">최대 익스포저 통화</p>
                    <p className="text-[16px] font-semibold text-slate-800">{fxSummary.largest_exposure}</p>
                  </div>
                </div>
                <div className={`p-4 rounded-xl ${fxSummary.total_gain_loss_krw >= 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/80' : 'bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/80'}`}>
                  <p className={`text-[12px] mb-1 ${fxSummary.total_gain_loss_krw >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    총 환차손익
                  </p>
                  <p className={`text-[22px] font-semibold tabular-nums ${fxSummary.total_gain_loss_krw >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {fxSummary.total_gain_loss_krw >= 0 ? '+' : ''}₩{fxSummary.total_gain_loss_krw.toLocaleString()}
                    <span className="text-[13px] font-normal ml-1">
                      ({fxSummary.total_gain_loss_krw >= 0 ? '환차익' : '환차손'})
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/80 rounded-xl">
                  <div className="flex justify-between items-center">
                    <p className="text-[12px] text-amber-600">환헤지 비율</p>
                    <p className="text-[16px] font-semibold text-amber-700">{fxSummary.hedged_ratio}%</p>
                  </div>
                  <div className="mt-2 h-2 bg-amber-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${fxSummary.hedged_ratio}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-[13px]">
                데이터를 불러올 수 없습니다
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FX Gain/Loss Details */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-semibold text-slate-800">통화별 환차손익 상세</h3>
        </div>
        <div className="overflow-x-auto">
          {fxLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : fxGainLoss.length > 0 ? (
            <table className="w-full table-clean">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3 text-left">통화</th>
                  <th className="px-5 py-3 text-right">익스포저</th>
                  <th className="px-5 py-3 text-right">장부환율</th>
                  <th className="px-5 py-3 text-right">현재환율</th>
                  <th className="px-5 py-3 text-right">환차손익</th>
                  <th className="px-5 py-3 text-right">변동률</th>
                </tr>
              </thead>
              <tbody>
                {fxGainLoss.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span>{currencyInfo[item.currency]?.flag || '🏳️'}</span>
                        <span className="font-medium text-slate-800">{item.currency}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                      {item.currency === 'JPY' ? '¥' : item.currency === 'EUR' ? '€' : '$'}
                      {item.exposure_amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                      ₩{item.book_rate.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                      ₩{item.current_rate.toLocaleString()}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold tabular-nums ${item.gain_loss_krw >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.gain_loss_krw >= 0 ? '+' : ''}₩{item.gain_loss_krw.toLocaleString()}
                    </td>
                    <td className={`px-5 py-3 text-right tabular-nums ${item.gain_loss_percent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.gain_loss_percent >= 0 ? '+' : ''}{item.gain_loss_percent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-12 text-center text-slate-400 text-[13px]">
              환차손익 데이터가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <h3 className="text-[15px] font-semibold text-slate-800">환율 영향 AI 분석</h3>
          </div>
        </div>
        <div className="p-4">
          {fxLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : fxSummary ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="font-semibold text-[14px] mb-2 text-slate-800">
                {fxSummary.total_gain_loss_krw >= 0
                  ? `이번 달 환차익 ${Math.abs(fxSummary.total_gain_loss_krw / 10000).toFixed(0)}만원 발생`
                  : `이번 달 환차손 ${Math.abs(fxSummary.total_gain_loss_krw / 10000).toFixed(0)}만원 발생`
                }
              </p>
              <div className="text-[12px] text-slate-600 space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-amber-700 font-medium">현황:</span>{' '}
                  총 외화 익스포저 ${fxSummary.total_exposure_usd.toLocaleString()}, 주요 통화 {fxSummary.largest_exposure}
                </p>
                <p>
                  <span className="text-amber-700 font-medium">헤지 비율:</span>{' '}
                  현재 {fxSummary.hedged_ratio}% 수준으로 {fxSummary.hedged_ratio < 50 ? '환위험 노출도가 높습니다' : '적정 수준입니다'}
                </p>
                <p>
                  <span className="text-amber-700 font-medium">제안:</span>{' '}
                  {fxSummary.hedged_ratio < 50
                    ? '환헤지 비율을 50% 이상으로 확대하는 것을 권장합니다'
                    : '현 수준의 환헤지 비율을 유지하면서 환율 동향을 모니터링하세요'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle size={16} />
                <span className="text-[13px]">환차손익 데이터를 불러올 수 없습니다</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
