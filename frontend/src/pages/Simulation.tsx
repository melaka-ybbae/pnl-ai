import { useState, useEffect } from 'react';
import { useAnalysisStore } from '../stores/analysisStore';
import { simulateCost, getSensitivity } from '../services/api';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { FileUp, Play, RotateCcw } from 'lucide-react';
import type { CostSimulationInput, SensitivityResult } from '../types';

const defaultInput: CostSimulationInput = {
  냉연강판_변동률: 0,
  도료_변동률: 0,
  아연_변동률: 0,
  전력비_변동률: 0,
  가스비_변동률: 0,
  노무비_변동률: 0
};

const sliderConfig = [
  { key: '냉연강판_변동률', label: '냉연강판', max: 50 },
  { key: '도료_변동률', label: '도료', max: 50 },
  { key: '아연_변동률', label: '아연', max: 50 },
  { key: '전력비_변동률', label: '전력비', max: 50 },
  { key: '가스비_변동률', label: '가스비', max: 50 },
  { key: '노무비_변동률', label: '노무비', max: 30 }
];

export default function Simulation() {
  const { data, simulationResult, setSimulationResult, setSensitivityResult, sensitivityResult } = useAnalysisStore();
  const [input, setInput] = useState<CostSimulationInput>(defaultInput);
  const [loading, setLoading] = useState(false);

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
    try {
      const res = await simulateCost(input);
      if (res.success && res.data) {
        setSimulationResult(res.data);
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetInput = () => {
    setInput(defaultInput);
    setSimulationResult(null);
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

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <FileUp size={48} className="mb-4 text-gray-300" />
        <p>먼저 엑셀 파일을 업로드해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">원가 시뮬레이션</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card title="변동률 설정" action={
          <button
            onClick={resetInput}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RotateCcw size={14} /> 초기화
          </button>
        }>
          <div className="space-y-6">
            {sliderConfig.map(({ key, label, max }) => (
              <div key={key}>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <span className={`text-sm font-semibold ${
                    input[key as keyof CostSimulationInput] > 0 ? 'text-red-600' :
                    input[key as keyof CostSimulationInput] < 0 ? 'text-blue-600' :
                    'text-gray-500'
                  }`}>
                    {input[key as keyof CostSimulationInput] > 0 ? '+' : ''}
                    {input[key as keyof CostSimulationInput]}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-max}
                  max={max}
                  value={input[key as keyof CostSimulationInput]}
                  onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>-{max}%</span>
                  <span>0%</span>
                  <span>+{max}%</span>
                </div>
              </div>
            ))}

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? <LoadingSpinner /> : <><Play size={18} /> 시뮬레이션 실행</>}
            </button>
          </div>
        </Card>

        {/* Results Panel */}
        <div className="space-y-6">
          {simulationResult ? (
            <>
              <Card title="시뮬레이션 결과">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">기준 영업이익</p>
                      <p className="text-xl font-bold">{formatCurrency(simulationResult.기준_영업이익)}원</p>
                    </div>
                    <div className={`p-4 rounded-lg ${
                      simulationResult.영업이익_변동률 >= 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <p className="text-sm text-gray-500">예상 영업이익</p>
                      <p className="text-xl font-bold">{formatCurrency(simulationResult.예상_영업이익)}원</p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg text-center ${
                    simulationResult.영업이익_변동률 >= 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <p className="text-sm text-gray-600">영업이익 변동</p>
                    <p className={`text-2xl font-bold ${
                      simulationResult.영업이익_변동률 >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {simulationResult.영업이익_변동률 > 0 ? '+' : ''}{simulationResult.영업이익_변동률.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      ({formatCurrency(simulationResult.영업이익_변동액)}원)
                    </p>
                  </div>
                </div>
              </Card>

              <Card title="항목별 영향">
                <div className="space-y-3">
                  {Object.entries(simulationResult.원가항목별_영향)
                    .filter(([_, value]) => value !== 0)
                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-gray-700">{key}</span>
                        <span className={`font-semibold ${
                          value > 0 ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {value > 0 ? '+' : ''}{formatCurrency(value)}원
                        </span>
                      </div>
                    ))}
                </div>
              </Card>

              {simulationResult.ai_comment && (
                <Card title="AI 해석">
                  <MarkdownRenderer content={simulationResult.ai_comment} />
                </Card>
              )}
            </>
          ) : (
            <Card title="민감도 분석">
              <p className="text-sm text-gray-500 mb-4">
                각 항목 1% 변동 시 영업이익에 미치는 영향
              </p>
              {sensitivityResult ? (
                <div className="space-y-3">
                  {sensitivityResult.map((item) => (
                    <div key={item.항목} className="flex items-center justify-between">
                      <span className="text-gray-700">{item.항목}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${Math.min(Math.abs(item.영업이익_영향도) * 10, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-16 text-right">
                          {item.영업이익_영향도.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <LoadingSpinner message="민감도 분석 중..." />
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
