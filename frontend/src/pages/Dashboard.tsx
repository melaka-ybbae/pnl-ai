import { useEffect, useState } from 'react';
import { useAnalysisStore } from '../stores/analysisStore';
import { analyzeMonthly, getTrend, getCostBreakdown } from '../services/api';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import KPICard from '../components/dashboard/KPICard';
import TrendChart from '../components/dashboard/TrendChart';
import CostPieChart from '../components/dashboard/CostPieChart';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import { FileUp } from 'lucide-react';

export default function Dashboard() {
  const { data, monthlyResult, setMonthlyResult, isLoading, setLoading } = useAnalysisStore();
  const [trendData, setTrendData] = useState<{ 기간: string; 금액: number }[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<Record<string, number>>({});
  const [aiComment, setAiComment] = useState<string>('');

  useEffect(() => {
    if (data) {
      loadDashboardData();
    }
  }, [data]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 월간 분석
      const monthlyRes = await analyzeMonthly();
      if (monthlyRes.success && monthlyRes.data) {
        setMonthlyResult(monthlyRes.data);
        setAiComment(monthlyRes.data.ai_comment || '');
      }

      // 추이 데이터
      const trendRes = await getTrend('영업이익');
      if (trendRes.success) {
        setTrendData(trendRes.data.trend);
      }

      // 원가 구성
      const costRes = await getCostBreakdown();
      if (costRes.success) {
        setCostBreakdown(costRes.data.breakdown);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <FileUp size={48} className="mb-4 text-gray-300" />
        <p className="text-lg">먼저 엑셀 파일을 업로드해주세요.</p>
        <p className="text-sm mt-2">왼쪽 사이드바에서 파일을 드래그하거나 클릭하여 업로드할 수 있습니다.</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="대시보드 로딩 중..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">대시보드</h1>
        {monthlyResult && (
          <span className="text-sm text-gray-500">
            {monthlyResult.비교월} 기준
          </span>
        )}
      </div>

      {/* KPI Cards */}
      {monthlyResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="매출액"
            value={monthlyResult.비교_요약.매출액}
            change={monthlyResult.변동_요약.매출액?.변동률}
          />
          <KPICard
            title="매출원가"
            value={monthlyResult.비교_요약.매출원가}
            change={monthlyResult.변동_요약.매출원가?.변동률}
          />
          <KPICard
            title="영업이익"
            value={monthlyResult.비교_요약.영업이익}
            change={monthlyResult.변동_요약.영업이익?.변동률}
          />
          <KPICard
            title="영업이익률"
            value={
              monthlyResult.비교_요약.매출액 > 0
                ? (monthlyResult.비교_요약.영업이익 / monthlyResult.비교_요약.매출액) * 100
                : 0
            }
            format="percent"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="영업이익 추이">
          {trendData.length > 0 ? (
            <TrendChart data={trendData} title="영업이익" />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              데이터 없음
            </div>
          )}
        </Card>

        <Card title="원가 구성">
          {Object.keys(costBreakdown).length > 0 ? (
            <CostPieChart data={costBreakdown} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              데이터 없음
            </div>
          )}
        </Card>
      </div>

      {/* Alerts and AI Comment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="주요 변동 항목">
          {monthlyResult && (
            <AlertsPanel items={monthlyResult.주요변동항목} />
          )}
        </Card>

        <Card title="AI 분석 코멘트">
          {aiComment ? (
            <MarkdownRenderer content={aiComment} />
          ) : (
            <div className="text-gray-400 text-center py-8">
              AI 분석 코멘트를 생성 중...
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
