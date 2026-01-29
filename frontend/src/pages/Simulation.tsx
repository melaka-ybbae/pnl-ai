import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysisStore } from '../stores/analysisStore';
import { simulateCost, getSensitivity, getSimulationAiComment } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { Database, Play, RotateCcw, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import type { CostSimulationInput } from '../types';

const defaultInput: CostSimulationInput = {
  냉연강판_변동률: 0,
  도료_변동률: 0,
  아연_변동률: 0,
  전력비_변동률: 0,
  가스비_변동률: 0,
  노무비_변동률: 0
};

const sliderConfig = [
  { key: '냉연강판_변동률', label: '냉연강판', max: 50, color: 'amber' },
  { key: '도료_변동률', label: '도료', max: 50, color: 'slate' },
  { key: '아연_변동률', label: '아연', max: 50, color: 'slate' },
  { key: '전력비_변동률', label: '전력비', max: 50, color: 'slate' },
  { key: '가스비_변동률', label: '가스비', max: 50, color: 'slate' },
  { key: '노무비_변동률', label: '노무비', max: 30, color: 'slate' }
];

export default function Simulation() {
  const { data, simulationResult, setSimulationResult, setSensitivityResult, sensitivityResult } = useAnalysisStore();
  const [input, setInput] = useState<CostSimulationInput>(defaultInput);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiComment, setAiComment] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      loadSensitivity();
    }
  }, [data]);

  const loadSensitivity = async () => {
    try {
      const res = await getSensitivity();
      if (res.success && res.data) {
        setSensitivityResult(res.data.sensitivity);
      }
    } catch (error) {
      console.error('Sensitivity error:', error);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    setAiComment(null);
    try {
      const res = await simulateCost(input, undefined, false);
      if (res.success && res.data) {
        setSimulationResult(res.data);
        loadAiComment();
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAiComment = async () => {
    setAiLoading(true);
    try {
      const res = await getSimulationAiComment(input);
      if (res.success && res.data) {
        setAiComment(res.data.ai_comment);
      }
    } catch (error) {
      console.error('AI comment error:', error);
      setAiComment('AI 분석을 불러오는데 실패했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  const resetInput = () => {
    setInput(defaultInput);
    setSimulationResult(null);
    setAiComment(null);
  };

  const handleSliderChange = (key: string, value: number) => {
    setInput(prev => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억`;
    }
    return `${(value / 10000).toFixed(0)}만`;
  };

  const navigate = useNavigate();

  if (!data) {
    return (
      <div className="animate-in flex flex-col items-center justify-center h-96 text-slate-400">
        <Database size={48} className="mb-4 text-slate-300" />
        <p className="text-[15px] font-medium text-slate-500 mb-2">시뮬레이션할 데이터가 없습니다</p>
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

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">원가 시뮬레이션</h1>
        <p className="text-[13px] text-slate-500 mt-1">원자재 및 비용 변동에 따른 영업이익 시뮬레이션</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[14px] font-medium text-slate-800">변동률 설정</h3>
            <button
              onClick={resetInput}
              className="text-[12px] text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> 초기화
            </button>
          </div>

          <div className="space-y-5">
            {sliderConfig.map(({ key, label, max }, idx) => {
              const value = input[key as keyof CostSimulationInput];
              return (
                <div key={key}>
                  <div className="flex justify-between mb-2">
                    <label className="text-[13px] font-medium text-slate-700">{label}</label>
                    <span className={`text-[13px] font-semibold tabular-nums ${
                      value > 0 ? 'text-red-600' :
                      value < 0 ? 'text-emerald-600' :
                      'text-slate-400'
                    }`}>
                      {value > 0 ? '+' : ''}{value}%
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={-max}
                      max={max}
                      value={value}
                      onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                      className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                        idx === 0 ? 'bg-amber-100' : 'bg-slate-200'
                      }`}
                      style={{
                        background: `linear-gradient(to right,
                          ${value < 0 ? '#10b981' : '#e2e8f0'} 0%,
                          ${value < 0 ? '#10b981' : '#e2e8f0'} ${50 + (value / max) * 50}%,
                          ${value > 0 ? '#ef4444' : '#e2e8f0'} ${50 + (value / max) * 50}%,
                          ${value > 0 ? '#ef4444' : '#e2e8f0'} 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>-{max}%</span>
                    <span>0%</span>
                    <span>+{max}%</span>
                  </div>
                </div>
              );
            })}

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[13px] font-medium rounded-lg hover:from-slate-700 hover:to-slate-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-press transition-all"
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Play size={16} />
                  시뮬레이션 실행
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-5">
          {simulationResult ? (
            <>
              {/* Result Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-[14px] font-medium text-slate-800 mb-4">시뮬레이션 결과</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">기준 영업이익</p>
                    <p className="text-[22px] font-semibold text-slate-800 tabular-nums">
                      {formatCurrency(simulationResult.기준_영업이익)}원
                    </p>
                  </div>
                  <div className={`rounded-xl p-4 ${
                    simulationResult.영업이익_변동률 >= 0
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                      : 'bg-gradient-to-br from-red-500 to-red-600'
                  }`}>
                    <p className="text-[11px] text-white/70 uppercase tracking-wide mb-1">예상 영업이익</p>
                    <p className="text-[22px] font-semibold text-white tabular-nums">
                      {formatCurrency(simulationResult.예상_영업이익)}원
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl text-center ${
                  simulationResult.영업이익_변동률 >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  <p className="text-[12px] text-slate-600 mb-1">영업이익 변동</p>
                  <div className="flex items-center justify-center gap-2">
                    {simulationResult.영업이익_변동률 >= 0
                      ? <TrendingUp size={20} className="text-emerald-600" />
                      : <TrendingDown size={20} className="text-red-600" />
                    }
                    <p className={`text-[28px] font-bold tabular-nums ${
                      simulationResult.영업이익_변동률 >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {simulationResult.영업이익_변동률 > 0 ? '+' : ''}{simulationResult.영업이익_변동률.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-1">
                    ({formatCurrency(simulationResult.영업이익_변동액)}원)
                  </p>
                </div>
              </div>

              {/* Impact by Item */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-[14px] font-medium text-slate-800 mb-4">항목별 영향</h3>
                <div className="space-y-3">
                  {Object.entries(simulationResult.원가항목별_영향)
                    .filter(([_, value]) => value !== 0)
                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <span className="text-[13px] text-slate-700">{key}</span>
                        <span className={`text-[13px] font-semibold tabular-nums ${
                          value > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {value > 0 ? '+' : ''}{formatCurrency(value)}원
                        </span>
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
                    <span className="text-[14px] font-semibold text-slate-800">AI 해석</span>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse inline-block ml-2" />
                  </div>
                </div>
                {aiLoading ? (
                  <div className="flex items-center gap-3 py-6 justify-center text-slate-500 bg-slate-50 rounded-lg">
                    <Sparkles className="animate-pulse text-amber-500" size={20} />
                    <span className="text-[13px]">AI가 분석 중입니다...</span>
                  </div>
                ) : aiComment ? (
                  <div className="prose prose-slate prose-sm max-w-none text-slate-700 bg-slate-50 rounded-lg p-4">
                    <MarkdownRenderer content={aiComment} />
                  </div>
                ) : (
                  <div className="text-slate-400 py-4 text-center text-[13px] bg-slate-50 rounded-lg">AI 분석 결과가 없습니다.</div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-[14px] font-medium text-slate-800 mb-2">민감도 분석</h3>
              <p className="text-[12px] text-slate-500 mb-4">
                각 항목 1% 변동 시 영업이익에 미치는 영향
              </p>
              {sensitivityResult ? (
                <div className="space-y-3">
                  {sensitivityResult.map((item, idx) => (
                    <div key={item.항목} className="flex items-center gap-3">
                      <span className="text-[13px] text-slate-700 w-20">{item.항목}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            idx === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(Math.abs(item.영업이익_영향도) * 10, 100)}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-medium text-slate-600 w-12 text-right tabular-nums">
                        {item.영업이익_영향도.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
