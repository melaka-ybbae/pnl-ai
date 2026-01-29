import { useState, useRef } from 'react';
import { useAnalysisStore } from '../stores/analysisStore';
import { uploadBudget, compareBudget } from '../services/api';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import { FileUp, Upload, TrendingUp, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';
import type { BudgetComparisonResult } from '../types';

export default function Budget() {
  const { data } = useAnalysisStore();
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [comparison, setComparison] = useState<BudgetComparisonResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const res = await uploadBudget(file, year);
      if (res.success) {
        setUploadStatus('success');
        setUploadMessage(res.message);
      } else {
        setUploadStatus('error');
        setUploadMessage(res.error || '업로드 실패');
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('서버 연결 오류');
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    if (!data) return;

    setLoading(true);
    try {
      const res = await compareBudget(year, month);
      if (res.success && res.data) {
        setComparison(res.data);
      }
    } catch (error) {
      console.error('Comparison error:', error);
    } finally {
      setLoading(false);
    }
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
        <p>먼저 손익 엑셀 파일을 업로드해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">예산 관리</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Upload */}
        <Card title="예산 업로드">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                uploadStatus === 'success' ? 'border-green-300 bg-green-50' :
                uploadStatus === 'error' ? 'border-red-300 bg-red-50' :
                'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                className="hidden"
              />

              {uploadStatus === 'success' ? (
                <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
              ) : uploadStatus === 'error' ? (
                <AlertCircle className="mx-auto mb-2 text-red-500" size={32} />
              ) : (
                <Upload className="mx-auto mb-2 text-gray-400" size={32} />
              )}

              <p className="text-sm">
                {uploadMessage || '예산 엑셀 파일을 업로드하세요'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                필수 컬럼: 분류, 계정과목, 1월~12월
              </p>
            </div>
          </div>
        </Card>

        {/* Comparison Settings */}
        <Card title="예산 대비 실적 비교">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">월</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>{m}월</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={runComparison}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '분석 중...' : '비교 분석 실행'}
            </button>
          </div>
        </Card>
      </div>

      {/* Comparison Results */}
      {loading ? (
        <LoadingSpinner message="예산 비교 분석 중..." />
      ) : comparison && (
        <div className="space-y-6">
          {/* Achievement Rate Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['매출액', '영업이익', '매출원가'].map((item) => {
              const rate = comparison.달성률[item];
              const isGood = item === '매출원가' ? rate <= 100 : rate >= 100;

              return (
                <div key={item} className={`p-4 rounded-lg ${isGood ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-sm text-gray-600">{item} 달성률</p>
                  <p className={`text-3xl font-bold ${isGood ? 'text-green-700' : 'text-red-700'}`}>
                    {rate?.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detailed Comparison */}
          <Card title={`${comparison.기간} 예산 대비 실적`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">구분</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">예산</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">실적</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">달성률</th>
                  </tr>
                </thead>
                <tbody>
                  {['매출액', '매출원가', '매출총이익', '판매관리비', '영업이익'].map((item) => {
                    const 예산 = comparison.예산_요약[item as keyof typeof comparison.예산_요약] as number;
                    const 실적 = comparison.실적_요약[item as keyof typeof comparison.실적_요약] as number;
                    const 달성률 = comparison.달성률[item];

                    return (
                      <tr key={item} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{item}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(예산)}원</td>
                        <td className="text-right py-3 px-4">{formatCurrency(실적)}원</td>
                        <td className="text-right py-3 px-4">
                          <span className={`flex items-center justify-end gap-1 ${
                            달성률 >= 100 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {달성률 >= 100 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {달성률?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* YTD Comparison */}
          <Card title="누계 달성률">
            <div className="grid grid-cols-3 gap-4">
              {['매출액', '영업이익', '경상이익'].map((item) => {
                const rate = comparison.누계_달성률[item];
                return (
                  <div key={item} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">{item}</p>
                    <p className={`text-2xl font-bold ${
                      rate >= 100 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {rate?.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* AI Comment */}
          {comparison.ai_comment && (
            <Card title="AI 분석">
              <MarkdownRenderer content={comparison.ai_comment} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
