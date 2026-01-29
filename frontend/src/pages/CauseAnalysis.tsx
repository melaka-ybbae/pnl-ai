import { useState } from 'react';
import Card from '../components/common/Card';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, ExternalLink,
  DollarSign, Fuel, Zap, BarChart3, ArrowRight, RefreshCw,
  ChevronDown, ChevronUp, Link2, Calendar, Search
} from 'lucide-react';

interface CauseItem {
  id: string;
  category: string;
  item: string;
  change: number;
  changeAmount: number;
  causes: {
    factor: string;
    impact: number;
    confidence: number;
    source: string;
    sourceUrl?: string;
  }[];
  aiAnalysis: string;
}

// 데모 데이터
const demoCauses: CauseItem[] = [
  {
    id: '1',
    category: '매출원가',
    item: '원재료비-냉연강판',
    change: 8.0,
    changeAmount: 151000000,
    causes: [
      {
        factor: '냉연강판 국제 가격 인상',
        impact: 65,
        confidence: 92,
        source: 'POSCO 고시가격',
        sourceUrl: 'https://www.posco.co.kr'
      },
      {
        factor: '원/달러 환율 상승 (1,350원 → 1,420원)',
        impact: 25,
        confidence: 88,
        source: '한국은행 환율 정보',
        sourceUrl: 'https://www.bok.or.kr'
      },
      {
        factor: '생산량 증가에 따른 수요 확대',
        impact: 10,
        confidence: 75,
        source: '내부 생산 데이터'
      }
    ],
    aiAnalysis: '냉연강판 원가 상승의 주요 원인은 **국제 철강 가격 인상**(+8%)과 **환율 상승**으로 분석됩니다. 특히 중국 철강 감산 정책으로 인한 공급 감소가 가격 상승을 주도했습니다. 단기적으로 가격 안정화는 어려울 것으로 예상되며, 대안 공급처 확보를 권장합니다.'
  },
  {
    id: '2',
    category: '매출원가',
    item: '제조경비-전력비',
    change: 7.7,
    changeAmount: 12000000,
    causes: [
      {
        factor: '한전 산업용 전기요금 인상',
        impact: 70,
        confidence: 95,
        source: '한국전력공사',
        sourceUrl: 'https://www.kepco.co.kr'
      },
      {
        factor: '생산라인 가동시간 증가',
        impact: 30,
        confidence: 82,
        source: '내부 생산 데이터'
      }
    ],
    aiAnalysis: '전력비 상승은 **2025년 1월 산업용 전기요금 인상**(kWh당 +5.3%)이 주요 원인입니다. 야간 전력 사용 비중 확대 및 에너지 효율 설비 투자를 검토하시기 바랍니다.'
  },
  {
    id: '3',
    category: '매출원가',
    item: '원재료비-아연',
    change: 9.9,
    changeAmount: 14000000,
    causes: [
      {
        factor: 'LME 아연 선물가격 상승',
        impact: 80,
        confidence: 90,
        source: 'LME (London Metal Exchange)',
        sourceUrl: 'https://www.lme.com'
      },
      {
        factor: '도금 두께 사양 변경',
        impact: 20,
        confidence: 70,
        source: '품질관리부 보고서'
      }
    ],
    aiAnalysis: '아연 가격은 LME 시장에서 **톤당 $2,450 → $2,680**으로 상승했습니다. 주요 원인은 유럽 아연 제련소 가동 중단입니다. 헤지 계약 체결을 권장합니다.'
  },
  {
    id: '4',
    category: '판매관리비',
    item: '물류비',
    change: 4.3,
    changeAmount: 8000000,
    causes: [
      {
        factor: '유류비 상승 (경유 +6.2%)',
        impact: 55,
        confidence: 88,
        source: '오피넷 유가정보',
        sourceUrl: 'https://www.opinet.co.kr'
      },
      {
        factor: '배송 건수 증가',
        impact: 45,
        confidence: 85,
        source: '물류팀 월간 보고'
      }
    ],
    aiAnalysis: '물류비 증가는 **국제 유가 상승**과 **주문 건수 증가**가 복합적으로 작용했습니다. 물류 효율화를 위한 권역별 배송 통합을 검토하시기 바랍니다.'
  }
];

// 외부 요인 데모 데이터
const externalFactors = [
  { name: '원/달러 환율', value: '1,420원', change: '+5.2%', icon: DollarSign },
  { name: '국제 유가 (WTI)', value: '$78.5', change: '+3.8%', icon: Fuel },
  { name: '산업용 전기요금', value: '112.5원/kWh', change: '+5.3%', icon: Zap },
  { name: '철강 가격지수', value: '142.3p', change: '+7.1%', icon: BarChart3 },
];

export default function CauseAnalysis() {
  const [selectedItem, setSelectedItem] = useState<CauseItem | null>(demoCauses[0]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['1']));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      alert('원인 분석이 완료되었습니다.');
    }, 2000);
  };

  const getChangeColor = (change: number) => {
    if (change > 5) return 'text-red-600';
    if (change > 0) return 'text-orange-500';
    if (change < -5) return 'text-green-600';
    return 'text-blue-500';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-500';
    if (confidence >= 70) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const filteredCauses = demoCauses.filter(item =>
    item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">원인 추론 엔진</h1>
          <p className="text-gray-500 mt-1">AI 기반 비용 변동 원인 자동 분석</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          <RefreshCw size={18} className={isAnalyzing ? 'animate-spin' : ''} />
          {isAnalyzing ? '분석 중...' : '원인 재분석'}
        </button>
      </div>

      {/* 외부 요인 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {externalFactors.map((factor, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <factor.icon size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">{factor.name}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold">{factor.value}</span>
              <span className={`text-sm font-medium ${
                factor.change.startsWith('+') ? 'text-red-500' : 'text-green-500'
              }`}>
                {factor.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 변동 항목 목록 */}
        <div className="lg:col-span-1">
          <Card title="주요 변동 항목">
            <div className="space-y-2">
              <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="항목 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {filteredCauses.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    if (!expandedItems.has(item.id)) {
                      toggleExpand(item.id);
                    }
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{item.category}</p>
                      <p className="font-medium">{item.item.split('-')[1] || item.item}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getChangeColor(item.change)}`}>
                        {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {(item.changeAmount / 100000000).toFixed(2)}억원
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <Brain size={12} />
                    <span>{item.causes.length}개 원인 식별</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 상세 원인 분석 */}
        <div className="lg:col-span-2 space-y-6">
          {selectedItem ? (
            <>
              {/* AI 요약 분석 */}
              <Card title="AI 원인 분석">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Brain className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{selectedItem.item}</h3>
                      <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                        selectedItem.change > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {selectedItem.change > 0 ? '+' : ''}{selectedItem.change.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">
                      전월 대비 {(selectedItem.changeAmount / 10000).toLocaleString()}만원 {selectedItem.change > 0 ? '증가' : '감소'}
                    </p>
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <MarkdownRenderer content={selectedItem.aiAnalysis} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* 원인별 상세 */}
              <Card title="원인별 상세 분석">
                <div className="space-y-4">
                  {selectedItem.causes.map((cause, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{cause.factor}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {cause.sourceUrl ? (
                                <a
                                  href={cause.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Link2 size={12} />
                                  {cause.source}
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                  <Link2 size={12} />
                                  {cause.source}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{cause.impact}%</p>
                          <p className="text-xs text-gray-500">영향도</p>
                        </div>
                      </div>

                      {/* 신뢰도 바 */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">분석 신뢰도</span>
                          <span className="font-medium">{cause.confidence}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getConfidenceColor(cause.confidence)}`}
                            style={{ width: `${cause.confidence}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 영향도 시각화 */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-3">원인별 영향도 비교</h4>
                  <div className="space-y-2">
                    {selectedItem.causes.map((cause, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-32 text-sm text-gray-600 truncate">{cause.factor.split(' ')[0]}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${cause.impact}%` }}
                          >
                            <span className="text-xs text-white font-medium">{cause.impact}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* 관련 외부 데이터 */}
              <Card title="관련 외부 데이터 소스">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'POSCO 철강 가격', date: '2025-01-28', type: '고시가격' },
                    { name: '한국은행 환율', date: '2025-01-29', type: '기준환율' },
                    { name: 'LME 금속 시세', date: '2025-01-29', type: '선물가격' },
                    { name: '한전 전기요금표', date: '2025-01-01', type: '공시요금' },
                  ].map((source, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{source.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Calendar size={12} />
                            <span>{source.date}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded">{source.type}</span>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card title="원인 분석">
              <div className="text-center py-12 text-gray-400">
                <Brain size={48} className="mx-auto mb-4" />
                <p>좌측에서 분석할 항목을 선택하세요</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
