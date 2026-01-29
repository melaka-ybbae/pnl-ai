import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysisStore } from '../stores/analysisStore';
import { analyzeMonthly, analyzeProductCost, getMonthlyAiComment, getProductCostAiComment } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { Database, TrendingUp, TrendingDown, Sparkles, BarChart3, PieChart } from 'lucide-react';

export default function Analysis() {
  const { data, monthlyResult, productCostResult, setMonthlyResult, setProductCostResult } = useAnalysisStore();
  const [activeTab, setActiveTab] = useState<'monthly' | 'product'>('monthly');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [monthlyAiComment, setMonthlyAiComment] = useState<string | null>(null);
  const [productAiComment, setProductAiComment] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      loadAnalysis();
    }
  }, [data, activeTab]);

  const loadAnalysis = async () => {
    setLoading(true);
    if (activeTab === 'monthly') {
      setMonthlyAiComment(null);
    } else {
      setProductAiComment(null);
    }

    try {
      if (activeTab === 'monthly') {
        const res = await analyzeMonthly(undefined, undefined, false);
        if (res.success && res.data) {
          setMonthlyResult(res.data);
          loadMonthlyAiComment();
        }
      } else {
        const res = await analyzeProductCost(undefined, false);
        if (res.success && res.data) {
          setProductCostResult(res.data);
          loadProductAiComment();
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyAiComment = async () => {
    setAiLoading(true);
    try {
      const res = await getMonthlyAiComment();
      if (res.success && res.data) {
        setMonthlyAiComment(res.data.ai_comment);
      }
    } catch (error) {
      console.error('AI comment error:', error);
      setMonthlyAiComment('AI 분석을 불러오는데 실패했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  const loadProductAiComment = async () => {
    setAiLoading(true);
    try {
      const res = await getProductCostAiComment();
      if (res.success && res.data) {
        setProductAiComment(res.data.ai_comment);
      }
    } catch (error) {
      console.error('AI comment error:', error);
      setProductAiComment('AI 분석을 불러오는데 실패했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  const navigate = useNavigate();

  if (!data) {
    return (
      <div className="animate-in flex flex-col items-center justify-center h-96 text-slate-400">
        <Database size={48} className="mb-4 text-slate-300" />
        <p className="text-[15px] font-medium text-slate-500 mb-2">분석할 데이터가 없습니다</p>
        <p className="text-[13px] text-slate-400 mb-4">먼저 데이터 연동에서 ERP 데이터를 업로드하고 손익계산서를 생성해주세요.</p>
        <button
          onClick={() => navigate('/data-sync')}
          className="px-4 py-2 bg-amber-500 text-white text-[13px] font-medium rounded-lg hover:bg-amber-600 transition-colors"
        >
          데이터 연동으로 이동
        </button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억`;
    }
    return `${(value / 10000).toFixed(0)}만`;
  };

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">손익 분석</h1>
        <p className="text-[13px] text-slate-500 mt-1">월간 비교 및 제품별 수익성 분석</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-all relative ${
            activeTab === 'monthly'
              ? 'text-amber-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('monthly')}
        >
          <BarChart3 size={15} />
          월간 비교
          {activeTab === 'monthly' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-all relative ${
            activeTab === 'product'
              ? 'text-amber-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('product')}
        >
          <PieChart size={15} />
          제품별 원가
          {activeTab === 'product' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : activeTab === 'monthly' && monthlyResult ? (
        <div className="space-y-5">
          {/* 단일 기간 분석 (비교 대상 없음) */}
          {(monthlyResult as any).is_single_period ? (
            <>
              {/* 단일 기간 요약 */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-[14px] font-medium text-slate-800">
                    {monthlyResult.기준월} 손익 현황
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full table-clean">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left">구분</th>
                        <th className="text-right">금액</th>
                        <th className="text-right">비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['매출액', '매출원가', '매출총이익', '판매관리비', '영업이익'].map((item, idx) => {
                        const key = item as keyof typeof monthlyResult.기준_요약;
                        const 금액 = monthlyResult.기준_요약[key] as number;
                        const 매출액 = monthlyResult.기준_요약.매출액 as number;
                        const 비율 = 매출액 > 0 ? (금액 / 매출액 * 100) : 0;
                        const isProfit = item === '영업이익' || item === '매출총이익';

                        return (
                          <tr key={item} className={idx === 4 ? 'bg-slate-50 font-medium' : ''}>
                            <td className="font-medium text-slate-700">{item}</td>
                            <td className="text-right tabular-nums">{formatCurrency(금액)}원</td>
                            <td className="text-right">
                              <span className={`badge ${
                                isProfit
                                  ? (금액 >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')
                                  : 'bg-slate-50 text-slate-600'
                              }`}>
                                {비율.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 비율 카드 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white text-center">
                  <p className="text-[12px] text-slate-400 mb-1">매출총이익률</p>
                  <p className="text-[28px] font-bold tabular-nums">
                    {((monthlyResult as any).비율?.매출총이익률 || 0).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white text-center">
                  <p className="text-[12px] text-amber-100 mb-1">영업이익률</p>
                  <p className="text-[28px] font-bold tabular-nums">
                    {((monthlyResult as any).비율?.영업이익률 || 0).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-100 rounded-xl p-5 text-center">
                  <p className="text-[12px] text-slate-500 mb-1">원가율</p>
                  <p className="text-[28px] font-bold text-slate-800 tabular-nums">
                    {((monthlyResult as any).비율?.원가율 || 0).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[13px] text-amber-800">
                  <strong>참고:</strong> 현재 1개 기간 데이터만 있어 전월 대비 분석이 불가합니다.
                  추가 기간 데이터를 업로드하면 월간 비교 분석이 가능합니다.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* 기존 비교 분석 UI */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-[14px] font-medium text-slate-800">
                    {monthlyResult.기준월} vs {monthlyResult.비교월}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full table-clean">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left">구분</th>
                        <th className="text-right">{monthlyResult.기준월}</th>
                        <th className="text-right">{monthlyResult.비교월}</th>
                        <th className="text-right">변동액</th>
                        <th className="text-right">변동률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['매출액', '매출원가', '매출총이익', '판매관리비', '영업이익'].map((item, idx) => {
                        const key = item as keyof typeof monthlyResult.기준_요약;
                        const 기준 = monthlyResult.기준_요약[key] as number;
                        const 비교 = monthlyResult.비교_요약?.[key] as number || 0;
                        const 변동 = monthlyResult.변동_요약?.[item];
                        const isProfit = item === '영업이익' || item === '매출총이익';

                        return (
                          <tr key={item} className={idx === 4 ? 'bg-slate-50 font-medium' : ''}>
                            <td className="font-medium text-slate-700">{item}</td>
                            <td className="text-right tabular-nums">{formatCurrency(기준)}원</td>
                            <td className="text-right tabular-nums">{formatCurrency(비교)}원</td>
                            <td className="text-right tabular-nums">
                              <span className={isProfit
                                ? (변동?.변동액 >= 0 ? 'text-emerald-600' : 'text-red-600')
                                : (변동?.변동액 > 0 ? 'text-red-600' : 'text-emerald-600')
                              }>
                                {변동?.변동액 > 0 ? '+' : ''}{formatCurrency(변동?.변동액 || 0)}원
                              </span>
                            </td>
                            <td className="text-right">
                              <span className={`inline-flex items-center gap-1 ${
                                isProfit
                                  ? (변동?.변동률 >= 0 ? 'text-emerald-600' : 'text-red-600')
                                  : (변동?.변동률 > 0 ? 'text-red-600' : 'text-emerald-600')
                              }`}>
                                {변동?.변동률 > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {변동?.변동률 > 0 ? '+' : ''}{변동?.변동률?.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Detail Changes - 비교 분석 시에만 표시 */}
          {!(monthlyResult as any).is_single_period && monthlyResult.주요변동항목?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-[14px] font-medium text-slate-800">주요 변동 항목 상세</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-clean">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left">분류</th>
                      <th className="text-left">계정과목</th>
                      <th className="text-right">기준금액</th>
                      <th className="text-right">비교금액</th>
                      <th className="text-right">변동률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyResult.주요변동항목.slice(0, 10).map((item, idx) => (
                      <tr key={idx}>
                        <td className="text-slate-500">{item.분류}</td>
                        <td className="font-medium text-slate-700">{item.계정과목}</td>
                        <td className="text-right tabular-nums">{formatCurrency(item.기준금액)}원</td>
                        <td className="text-right tabular-nums">{formatCurrency(item.비교금액)}원</td>
                        <td className="text-right">
                          <span className={`badge ${
                            item.변동률 > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {item.변동률 > 0 ? '+' : ''}{item.변동률.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Comment */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Sparkles className="text-amber-600" size={16} />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-slate-800">AI 분석</span>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse inline-block ml-2" />
              </div>
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-3 py-6 justify-center text-slate-500 bg-slate-50 rounded-lg">
                <Sparkles className="animate-pulse text-amber-500" size={20} />
                <span className="text-[13px]">AI가 분석 중입니다...</span>
              </div>
            ) : monthlyAiComment ? (
              <div className="prose prose-slate prose-sm max-w-none text-slate-700 bg-slate-50 rounded-lg p-4">
                <MarkdownRenderer content={monthlyAiComment} />
              </div>
            ) : (
              <div className="text-slate-400 py-4 text-center text-[13px] bg-slate-50 rounded-lg">AI 분석 결과가 없습니다.</div>
            )}
          </div>
        </div>
      ) : activeTab === 'product' && productCostResult ? (
        <div className="space-y-5">
          {/* Product Analysis */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-[14px] font-medium text-slate-800">
                제품별 수익성 분석 ({productCostResult.기간})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-clean">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left">제품군</th>
                    <th className="text-right">매출액</th>
                    <th className="text-right">총원가</th>
                    <th className="text-right">매출총이익</th>
                    <th className="text-right">이익률</th>
                  </tr>
                </thead>
                <tbody>
                  {productCostResult.제품별_분석.map((p) => (
                    <tr key={p.제품군}>
                      <td className="font-medium text-slate-700">{p.제품군}</td>
                      <td className="text-right tabular-nums">{formatCurrency(p.매출액)}원</td>
                      <td className="text-right tabular-nums">{formatCurrency(p.총원가)}원</td>
                      <td className="text-right tabular-nums">{formatCurrency(p.매출총이익)}원</td>
                      <td className="text-right">
                        <span className={`badge ${
                          p.매출총이익률 >= 20 ? 'bg-emerald-50 text-emerald-700' :
                          p.매출총이익률 >= 10 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {p.매출총이익률.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Structure */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-medium text-slate-800 mb-4">원가 구성비</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(productCostResult.원가구성비).map(([key, value], idx) => (
                <div
                  key={key}
                  className={`text-center p-4 rounded-xl ${
                    idx === 0 ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white' :
                    idx === 1 ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' :
                    'bg-slate-100'
                  }`}
                >
                  <p className={`text-[28px] font-semibold tabular-nums ${idx > 1 ? 'text-slate-800' : ''}`}>
                    {value}%
                  </p>
                  <p className={`text-[12px] mt-1 ${
                    idx === 0 ? 'text-slate-400' :
                    idx === 1 ? 'text-amber-100' :
                    'text-slate-500'
                  }`}>{key}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Comment */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Sparkles className="text-amber-600" size={16} />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-slate-800">AI 분석</span>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse inline-block ml-2" />
              </div>
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-3 py-6 justify-center text-slate-500 bg-slate-50 rounded-lg">
                <Sparkles className="animate-pulse text-amber-500" size={20} />
                <span className="text-[13px]">AI가 분석 중입니다...</span>
              </div>
            ) : productAiComment ? (
              <div className="prose prose-slate prose-sm max-w-none text-slate-700 bg-slate-50 rounded-lg p-4">
                <MarkdownRenderer content={productAiComment} />
              </div>
            ) : (
              <div className="text-slate-400 py-4 text-center text-[13px] bg-slate-50 rounded-lg">AI 분석 결과가 없습니다.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-[14px]">
          분석 데이터를 불러오는 중...
        </div>
      )}
    </div>
  );
}
