import { useEffect, useState } from 'react';
import { useAnalysisStore } from '../stores/analysisStore';
import { analyzeMonthly, analyzeProductCost } from '../services/api';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { FileUp, TrendingUp, TrendingDown } from 'lucide-react';

export default function Analysis() {
  const { data, monthlyResult, productCostResult, setMonthlyResult, setProductCostResult } = useAnalysisStore();
  const [activeTab, setActiveTab] = useState<'monthly' | 'product'>('monthly');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      loadAnalysis();
    }
  }, [data, activeTab]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      if (activeTab === 'monthly') {
        const res = await analyzeMonthly();
        if (res.success && res.data) {
          setMonthlyResult(res.data);
        }
      } else {
        const res = await analyzeProductCost();
        if (res.success && res.data) {
          setProductCostResult(res.data);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <FileUp size={48} className="mb-4 text-gray-300" />
        <p>먼저 엑셀 파일을 업로드해주세요.</p>
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">분석</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('monthly')}
        >
          월간 비교
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'product'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('product')}
        >
          제품별 원가
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : activeTab === 'monthly' && monthlyResult ? (
        <div className="space-y-6">
          {/* Summary Table */}
          <Card title={`${monthlyResult.기준월} vs ${monthlyResult.비교월}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">구분</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">{monthlyResult.기준월}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">{monthlyResult.비교월}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">변동액</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">변동률</th>
                  </tr>
                </thead>
                <tbody>
                  {['매출액', '매출원가', '매출총이익', '판매관리비', '영업이익'].map((item) => {
                    const key = item as keyof typeof monthlyResult.기준_요약;
                    const 기준 = monthlyResult.기준_요약[key] as number;
                    const 비교 = monthlyResult.비교_요약[key] as number;
                    const 변동 = monthlyResult.변동_요약[item];

                    return (
                      <tr key={item} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{item}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(기준)}원</td>
                        <td className="text-right py-3 px-4">{formatCurrency(비교)}원</td>
                        <td className="text-right py-3 px-4">
                          <span className={변동?.변동액 > 0 ? 'text-red-600' : 'text-blue-600'}>
                            {변동?.변동액 > 0 ? '+' : ''}{formatCurrency(변동?.변동액 || 0)}원
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`flex items-center justify-end gap-1 ${
                            변동?.변동률 > 0 ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {변동?.변동률 > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {변동?.변동률 > 0 ? '+' : ''}{변동?.변동률?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Detail Changes */}
          <Card title="주요 변동 항목 상세">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">분류</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">계정과목</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">기준금액</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">비교금액</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">변동률</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyResult.주요변동항목.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500">{item.분류}</td>
                      <td className="py-3 px-4">{item.계정과목}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(item.기준금액)}원</td>
                      <td className="text-right py-3 px-4">{formatCurrency(item.비교금액)}원</td>
                      <td className="text-right py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          item.변동률 > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.변동률 > 0 ? '+' : ''}{item.변동률.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* AI Comment */}
          {monthlyResult.ai_comment && (
            <Card title="AI 분석">
              <MarkdownRenderer content={monthlyResult.ai_comment} />
            </Card>
          )}
        </div>
      ) : activeTab === 'product' && productCostResult ? (
        <div className="space-y-6">
          {/* Product Analysis */}
          <Card title={`제품별 수익성 분석 (${productCostResult.기간})`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">제품군</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">매출액</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">총원가</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">매출총이익</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">이익률</th>
                  </tr>
                </thead>
                <tbody>
                  {productCostResult.제품별_분석.map((p) => (
                    <tr key={p.제품군} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{p.제품군}</td>
                      <td className="text-right py-3 px-4">{formatCurrency(p.매출액)}원</td>
                      <td className="text-right py-3 px-4">{formatCurrency(p.총원가)}원</td>
                      <td className="text-right py-3 px-4">{formatCurrency(p.매출총이익)}원</td>
                      <td className="text-right py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          p.매출총이익률 >= 20 ? 'bg-green-100 text-green-700' :
                          p.매출총이익률 >= 10 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {p.매출총이익률.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cost Structure */}
          <Card title="원가 구성비">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(productCostResult.원가구성비).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-800">{value}%</p>
                  <p className="text-sm text-gray-500">{key}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Comment */}
          {productCostResult.ai_comment && (
            <Card title="AI 분석">
              <MarkdownRenderer content={productCostResult.ai_comment} />
            </Card>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          분석 데이터를 불러오는 중...
        </div>
      )}
    </div>
  );
}
