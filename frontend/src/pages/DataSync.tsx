import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Upload,
  AlertCircle,
  Sparkles,
  Loader2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  Trash2,
  FileText,
  Shield,
  Zap
} from 'lucide-react';
import {
  uploadERPFile,
  generateIncomeStatement,
  getERPTemplateInfo,
  analyzeSmartParsing
} from '../services/api';
import { useAnalysisStore } from '../stores/analysisStore';
import type { ProfitLossData, AccountItem } from '../types';

// 데이터 유형 정의
type DataType = 'sales' | 'purchases' | 'payroll' | 'mfg_expenses' | 'inventory' | 'sg_expenses';

interface UploadedFile {
  type: DataType;
  name: string;
  rows: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  preview?: Record<string, unknown>[];
  smartParsing?: SmartParsingResult;
}

interface IncomeStatementData {
  revenue: {
    total: number;
    export: number;
    domestic: number;
    by_category?: Record<string, number>;  // 제품별 매출 (건재용, 가전용 등)
  };
  cost_of_goods_sold: {
    total: number;
    breakdown: {
      raw_materials: number;
      direct_labor: number;
      manufacturing_overhead: number;
      inventory_adjustment: number;
    };
  };
  gross_profit: number;
  selling_admin_expenses: {
    total: number;
    breakdown: {
      sg_expenses: number;
      indirect_labor: number;
    };
  };
  operating_profit: number;
  ratios: {
    cost_ratio: number;
    gross_margin: number;
    operating_margin: number;
  };
}

interface AIAnalysis {
  summary?: string;
  key_findings?: Array<{
    category: string;
    finding: string;
    impact: string;
    severity: string;
  }>;
  recommendations?: Array<{
    priority: string;
    action: string;
    expected_impact: string;
  }>;
  risk_factors?: string[];
  opportunities?: string[];
  raw_response?: string;
  error?: string;
}

interface GenerateResult {
  income_statement: IncomeStatementData;
  ai_analysis: AIAnalysis | null;
  details: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

// 스마트 파싱 관련 타입
interface MappingDetail {
  original: string;
  mapped: string;
  confidence: number;
  method: string;
}

interface Anomaly {
  type: string;
  column: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  rows?: number[];
  sample_values?: (string | number)[];
}

interface SmartParsingResult {
  original_columns: string[];
  mapped_columns: Record<string, string>;
  mapping_confidence: {
    average: number;
    details: MappingDetail[];
  };
  anomalies: Anomaly[];
  warnings: string[];
  data_quality_score: {
    score: number;
    grade: string;
    grade_text: string;
    details: string[];
    mapping_rate: number;
    anomaly_count: {
      high: number;
      medium: number;
      low: number;
    };
  };
  row_count: number;
}

// 데이터 유형별 정보
const dataTypeInfo: Record<DataType, { label: string; description: string; required: boolean; icon: string }> = {
  sales: { label: '매출전표', description: '일별 매출 거래 내역', required: true, icon: '📊' },
  purchases: { label: '매입전표', description: '원자재/부자재 매입 내역', required: true, icon: '📦' },
  payroll: { label: '급여대장', description: '직원별 급여 내역', required: false, icon: '👥' },
  mfg_expenses: { label: '제조경비', description: '제조 관련 경비 내역', required: false, icon: '🏭' },
  inventory: { label: '재고현황', description: '월말 재고 현황', required: false, icon: '📋' },
  sg_expenses: { label: '판매관리비', description: '판매 및 관리 비용', required: false, icon: '💼' },
};

const allDataTypes: DataType[] = ['sales', 'purchases', 'payroll', 'mfg_expenses', 'inventory', 'sg_expenses'];

export default function DataSync() {
  const navigate = useNavigate();
  const { setData } = useAnalysisStore();

  // 상태
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'result'>('upload');
  const [showTemplateInfo, setShowTemplateInfo] = useState(false);
  const [templateInfo, setTemplateInfo] = useState<Record<string, unknown> | null>(null);
  const [smartParsingEnabled, setSmartParsingEnabled] = useState(true);
  const [selectedFileForDetail, setSelectedFileForDetail] = useState<DataType | null>(null);

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(async (file: File, dataType: DataType) => {
    // 업로딩 상태 추가
    const newFile: UploadedFile = {
      type: dataType,
      name: file.name,
      rows: 0,
      status: 'uploading'
    };

    setUploadedFiles(prev => {
      // 같은 타입의 기존 파일 제거
      const filtered = prev.filter(f => f.type !== dataType);
      return [...filtered, newFile];
    });

    try {
      // 1. 스마트 파싱 분석 (활성화된 경우)
      let smartParsingResult: SmartParsingResult | undefined;
      if (smartParsingEnabled && ['sales', 'purchases', 'payroll'].includes(dataType)) {
        try {
          const parseResponse = await analyzeSmartParsing(file, dataType);
          if (parseResponse.success) {
            smartParsingResult = {
              original_columns: parseResponse.original_columns,
              mapped_columns: parseResponse.mapped_columns,
              mapping_confidence: parseResponse.mapping_confidence,
              anomalies: parseResponse.anomalies,
              warnings: parseResponse.warnings,
              data_quality_score: parseResponse.data_quality_score,
              row_count: parseResponse.row_count
            };
          }
        } catch (e) {
          console.warn('스마트 파싱 분석 실패:', e);
        }
      }

      // 2. ERP 업로드 (스마트 파싱 컬럼 매핑 전달)
      const response = await uploadERPFile(
        file,
        dataType,
        sessionId || undefined,
        smartParsingResult?.mapped_columns
      );

      if (response.success) {
        // 세션 ID 저장
        if (!sessionId && response.session_id) {
          setSessionId(response.session_id);
        }

        setUploadedFiles(prev =>
          prev.map(f =>
            f.type === dataType
              ? { ...f, status: 'success', rows: response.rows, preview: response.preview, smartParsing: smartParsingResult }
              : f
          )
        );
      } else {
        setUploadedFiles(prev =>
          prev.map(f =>
            f.type === dataType
              ? { ...f, status: 'error', error: response.error }
              : f
          )
        );
      }
    } catch (error) {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.type === dataType
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : '업로드 실패' }
            : f
        )
      );
    }
  }, [sessionId, smartParsingEnabled]);

  // 손익계산서 결과를 analysisStore 형식으로 변환
  const convertToProfitLossData = (incomeStatement: IncomeStatementData): ProfitLossData => {
    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-01" 형식
    const periods = [currentMonth];

    const items: AccountItem[] = [];

    // 매출 - 제품별 구분이 있으면 사용, 없으면 수출/내수로 저장
    const byCategory = incomeStatement.revenue.by_category;
    if (byCategory && Object.keys(byCategory).length > 0) {
      // 제품별 매출 (건재용, 가전용 등) - "건재용매출", "가전용매출" 형태로 저장
      for (const [category, amount] of Object.entries(byCategory)) {
        items.push({ 분류: '매출액', 계정과목: `${category}매출`, 금액: { [currentMonth]: amount } });
      }
    } else {
      // 기존: 수출/내수로 저장
      items.push({ 분류: '매출액', 계정과목: '수출매출', 금액: { [currentMonth]: incomeStatement.revenue.export } });
      items.push({ 분류: '매출액', 계정과목: '내수매출', 금액: { [currentMonth]: incomeStatement.revenue.domestic } });
    }

    // 매출원가
    items.push({ 분류: '매출원가', 계정과목: '원재료비', 금액: { [currentMonth]: incomeStatement.cost_of_goods_sold.breakdown.raw_materials } });
    items.push({ 분류: '매출원가', 계정과목: '직접노무비', 금액: { [currentMonth]: incomeStatement.cost_of_goods_sold.breakdown.direct_labor } });
    items.push({ 분류: '매출원가', 계정과목: '제조경비', 금액: { [currentMonth]: incomeStatement.cost_of_goods_sold.breakdown.manufacturing_overhead } });
    items.push({ 분류: '매출원가', 계정과목: '재고자산조정', 금액: { [currentMonth]: incomeStatement.cost_of_goods_sold.breakdown.inventory_adjustment } });

    // 판매관리비
    items.push({ 분류: '판매관리비', 계정과목: '판매관리비', 금액: { [currentMonth]: incomeStatement.selling_admin_expenses.breakdown.sg_expenses } });
    items.push({ 분류: '판매관리비', 계정과목: '간접노무비', 금액: { [currentMonth]: incomeStatement.selling_admin_expenses.breakdown.indirect_labor } });

    return { periods, items };
  };

  // 손익계산서 생성
  const handleGenerate = async () => {
    if (!sessionId) return;

    setGenerating(true);
    setResult(null);

    try {
      const response = await generateIncomeStatement(sessionId, true);

      if (response.success) {
        setResult(response.result);
        setActiveTab('result');

        // 결과를 analysisStore에 저장하여 다른 페이지에서 사용 가능하게 함
        if (response.result?.income_statement) {
          const profitLossData = convertToProfitLossData(response.result.income_statement);
          setData(profitLossData);
        }
      } else {
        alert('손익계산서 생성 실패: ' + response.error);
      }
    } catch (error) {
      alert('오류 발생: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setGenerating(false);
    }
  };

  // 초기화
  const handleReset = () => {
    setSessionId(null);
    setUploadedFiles([]);
    setResult(null);
    setActiveTab('upload');
  };

  // 파일 삭제
  const handleRemoveFile = (dataType: DataType) => {
    setUploadedFiles(prev => prev.filter(f => f.type !== dataType));
  };

  // 템플릿 정보 로드
  const loadTemplateInfo = async () => {
    try {
      const response = await getERPTemplateInfo();
      if (response.success) {
        setTemplateInfo(response.templates);
        setShowTemplateInfo(true);
      }
    } catch (error) {
      console.error('템플릿 정보 로드 실패:', error);
    }
  };

  // 업로드 가능 여부 확인
  const canGenerate = uploadedFiles.some(f => f.type === 'sales' && f.status === 'success');

  // 숫자 포맷
  const formatNumber = (num: number) => {
    if (Math.abs(num) >= 100000000) {
      return (num / 100000000).toFixed(1) + '억';
    } else if (Math.abs(num) >= 10000) {
      return (num / 10000).toFixed(0) + '만';
    }
    return num.toLocaleString();
  };

  const formatFullNumber = (num: number) => {
    return num.toLocaleString() + '원';
  };

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">ERP 데이터 → AI 손익계산서</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            ERP 원천 데이터를 업로드하면 AI가 자동으로 분석하고 손익계산서를 생성합니다
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTemplateInfo}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-all btn-press shadow-sm"
          >
            <Info size={14} />
            템플릿 안내
          </button>
          {(uploadedFiles.length > 0 || result) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-red-600 hover:text-red-700 bg-white border border-red-200 hover:border-red-300 rounded-lg transition-all btn-press shadow-sm"
            >
              <Trash2 size={14} />
              초기화
            </button>
          )}
        </div>
      </div>

      {/* AI 스마트 파싱 안내 */}
      <div className="bg-gradient-to-r from-slate-50 to-amber-50/30 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                <Sparkles size={18} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-slate-800">AI 스마트 파싱</h3>
                <p className="text-[11px] text-slate-500">컬럼명 자동 인식 · 이상치 감지 · 데이터 품질 분석</p>
              </div>
            </div>
            <div className="flex items-center gap-4 ml-6 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Zap size={12} className="text-amber-500" />
                다른 컬럼명도 자동 매핑
              </span>
              <span className="flex items-center gap-1.5">
                <Shield size={12} className="text-red-400" />
                오류/이상치 자동 감지
              </span>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[12px] text-slate-600">활성화</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={smartParsingEnabled}
                onChange={(e) => setSmartParsingEnabled(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${smartParsingEnabled ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${smartParsingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all relative ${
            activeTab === 'upload' ? 'text-amber-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          1. 데이터 업로드
          {activeTab === 'upload' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => result && setActiveTab('result')}
          disabled={!result}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all relative ${
            activeTab === 'result' ? 'text-amber-700' : result ? 'text-slate-500 hover:text-slate-700' : 'text-slate-300'
          }`}
        >
          2. 손익계산서 결과
          {activeTab === 'result' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'upload' ? (
        <>
          {/* 업로드 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 필수 데이터 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-[11px] font-bold">필수</span>
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800">필수 데이터</h3>
              </div>

              <div className="space-y-3">
                {allDataTypes.filter(t => dataTypeInfo[t].required).map(dataType => {
                  const info = dataTypeInfo[dataType];
                  const uploaded = uploadedFiles.find(f => f.type === dataType);

                  return (
                    <div
                      key={dataType}
                      className={`p-4 border rounded-xl transition-all ${
                        uploaded?.status === 'success'
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : uploaded?.status === 'error'
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{info.icon}</span>
                          <div>
                            <h4 className="text-[14px] font-medium text-slate-800">{info.label}</h4>
                            <p className="text-[11px] text-slate-500">{info.description}</p>
                          </div>
                        </div>

                        {uploaded?.status === 'success' ? (
                          <div className="flex items-center gap-2">
                            {uploaded.smartParsing && (
                              <button
                                onClick={() => setSelectedFileForDetail(dataType)}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer hover:opacity-80 ${
                                  uploaded.smartParsing.data_quality_score.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                  uploaded.smartParsing.data_quality_score.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                  uploaded.smartParsing.data_quality_score.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}
                              >
                                {uploaded.smartParsing.data_quality_score.grade} ({uploaded.smartParsing.data_quality_score.score}점)
                              </button>
                            )}
                            <span className="text-[12px] text-emerald-600 font-medium">{uploaded.rows}건</span>
                            <CheckCircle size={18} className="text-emerald-500" />
                            <button
                              onClick={() => handleRemoveFile(dataType)}
                              className="p-1 hover:bg-red-100 rounded"
                            >
                              <XCircle size={16} className="text-red-400 hover:text-red-600" />
                            </button>
                          </div>
                        ) : uploaded?.status === 'uploading' ? (
                          <div className="flex items-center gap-2">
                            <Loader2 size={18} className="text-amber-500 animate-spin" />
                            <span className="text-[11px] text-slate-500">AI 분석 중...</span>
                          </div>
                        ) : uploaded?.status === 'error' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-red-500">{uploaded.error}</span>
                            <AlertCircle size={18} className="text-red-500" />
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, dataType);
                              }}
                            />
                            <span className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                              <Upload size={14} />
                              업로드
                            </span>
                          </label>
                        )}
                      </div>

                      {/* 스마트 파싱 요약 (이상치 있을 경우) */}
                      {uploaded?.smartParsing && uploaded.smartParsing.anomalies.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-amber-200 bg-amber-50/50 -mx-4 -mb-4 px-4 pb-3 rounded-b-xl">
                          <div className="flex items-center gap-2">
                            <Shield size={14} className="text-amber-600" />
                            <span className="text-[11px] font-medium text-amber-700">
                              이상치 {uploaded.smartParsing.anomalies.length}건 감지
                            </span>
                            <button
                              onClick={() => setSelectedFileForDetail(dataType)}
                              className="text-[11px] text-amber-600 underline hover:text-amber-700"
                            >
                              상세보기
                            </button>
                          </div>
                          <div className="flex gap-2 mt-1">
                            {uploaded.smartParsing.data_quality_score.anomaly_count.high > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                                심각 {uploaded.smartParsing.data_quality_score.anomaly_count.high}
                              </span>
                            )}
                            {uploaded.smartParsing.data_quality_score.anomaly_count.medium > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded">
                                주의 {uploaded.smartParsing.data_quality_score.anomaly_count.medium}
                              </span>
                            )}
                            {uploaded.smartParsing.data_quality_score.anomaly_count.low > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                                참고 {uploaded.smartParsing.data_quality_score.anomaly_count.low}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 미리보기 (이상치 없을 경우만) */}
                      {uploaded?.preview && uploaded.preview.length > 0 && (!uploaded.smartParsing || uploaded.smartParsing.anomalies.length === 0) && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-[11px] text-slate-400 mb-1">미리보기 (첫 2행)</p>
                          <div className="text-[10px] text-slate-500 overflow-x-auto">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(uploaded.preview.slice(0, 2), null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 선택 데이터 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-slate-500 text-[11px] font-bold">선택</span>
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800">추가 데이터</h3>
                <span className="text-[11px] text-slate-400">(정확도 향상)</span>
              </div>

              <div className="space-y-3">
                {allDataTypes.filter(t => !dataTypeInfo[t].required).map(dataType => {
                  const info = dataTypeInfo[dataType];
                  const uploaded = uploadedFiles.find(f => f.type === dataType);

                  return (
                    <div
                      key={dataType}
                      className={`p-4 border rounded-xl transition-all ${
                        uploaded?.status === 'success'
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : uploaded?.status === 'error'
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{info.icon}</span>
                          <div>
                            <h4 className="text-[14px] font-medium text-slate-800">{info.label}</h4>
                            <p className="text-[11px] text-slate-500">{info.description}</p>
                          </div>
                        </div>

                        {uploaded?.status === 'success' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-emerald-600 font-medium">{uploaded.rows}건</span>
                            <CheckCircle size={18} className="text-emerald-500" />
                            <button
                              onClick={() => handleRemoveFile(dataType)}
                              className="p-1 hover:bg-red-100 rounded"
                            >
                              <XCircle size={16} className="text-red-400 hover:text-red-600" />
                            </button>
                          </div>
                        ) : uploaded?.status === 'uploading' ? (
                          <Loader2 size={18} className="text-amber-500 animate-spin" />
                        ) : uploaded?.status === 'error' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-red-500 max-w-[150px] truncate">{uploaded.error}</span>
                            <AlertCircle size={18} className="text-red-500" />
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, dataType);
                              }}
                            />
                            <span className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                              <Upload size={14} />
                              업로드
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 생성 버튼 */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className={`flex items-center gap-3 px-8 py-4 text-[15px] font-semibold rounded-xl transition-all btn-press shadow-lg ${
                canGenerate && !generating
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {generating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  AI가 손익계산서를 생성하고 있습니다...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  AI 손익계산서 생성
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>

          {!canGenerate && uploadedFiles.length > 0 && (
            <p className="text-center text-[13px] text-red-500">
              매출전표는 필수입니다. 매출전표를 업로드해주세요.
            </p>
          )}
        </>
      ) : result && (
        <>
          {/* 손익계산서 결과 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 손익계산서 메인 */}
            <div className="lg:col-span-2 space-y-4">
              {/* KPI 카드 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
                  <p className="text-[12px] text-slate-400 mb-1">매출액</p>
                  <p className="text-[24px] font-bold tabular-nums">{formatNumber(result.income_statement.revenue.total)}</p>
                  <div className="flex gap-2 mt-2 text-[11px]">
                    <span className="text-slate-400">수출 {((result.income_statement.revenue.export / result.income_statement.revenue.total) * 100).toFixed(0)}%</span>
                    <span className="text-slate-400">내수 {((result.income_statement.revenue.domestic / result.income_statement.revenue.total) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className={`rounded-xl p-5 ${result.income_statement.gross_profit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' : 'bg-gradient-to-br from-red-500 to-red-600 text-white'}`}>
                  <p className="text-[12px] opacity-80 mb-1">매출총이익</p>
                  <p className="text-[24px] font-bold tabular-nums">{formatNumber(result.income_statement.gross_profit)}</p>
                  <div className="flex items-center gap-1 mt-2 text-[11px] opacity-80">
                    {result.income_statement.ratios.gross_margin >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{result.income_statement.ratios.gross_margin}%</span>
                  </div>
                </div>

                <div className={`rounded-xl p-5 ${result.income_statement.operating_profit >= 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' : 'bg-gradient-to-br from-red-500 to-red-600 text-white'}`}>
                  <p className="text-[12px] opacity-80 mb-1">영업이익</p>
                  <p className="text-[24px] font-bold tabular-nums">{formatNumber(result.income_statement.operating_profit)}</p>
                  <div className="flex items-center gap-1 mt-2 text-[11px] opacity-80">
                    {result.income_statement.ratios.operating_margin >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{result.income_statement.ratios.operating_margin}%</span>
                  </div>
                </div>
              </div>

              {/* 손익계산서 상세 */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-600" />
                    <h3 className="text-[15px] font-semibold text-slate-800">손익계산서</h3>
                    <span className="text-[11px] text-slate-400">(AI 자동 생성)</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {/* 매출액 */}
                  <div className="px-5 py-3 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="text-[14px] font-semibold text-slate-800">Ⅰ. 매출액</span>
                      <span className="text-[14px] font-bold text-slate-900 tabular-nums">{formatFullNumber(result.income_statement.revenue.total)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-2 pl-10">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">수출매출</span>
                      <span className="text-slate-700 tabular-nums">{formatFullNumber(result.income_statement.revenue.export)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-2 pl-10">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">내수매출</span>
                      <span className="text-slate-700 tabular-nums">{formatFullNumber(result.income_statement.revenue.domestic)}</span>
                    </div>
                  </div>

                  {/* 매출원가 */}
                  <div className="px-5 py-3 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="text-[14px] font-semibold text-slate-800">Ⅱ. 매출원가</span>
                      <span className="text-[14px] font-bold text-slate-900 tabular-nums">{formatFullNumber(result.income_statement.cost_of_goods_sold.total)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-2 pl-10">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">원재료비</span>
                      <span className="text-slate-700 tabular-nums">{formatFullNumber(result.income_statement.cost_of_goods_sold.breakdown.raw_materials)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-2 pl-10">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">직접노무비</span>
                      <span className="text-slate-700 tabular-nums">{formatFullNumber(result.income_statement.cost_of_goods_sold.breakdown.direct_labor)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-2 pl-10">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">제조경비</span>
                      <span className="text-slate-700 tabular-nums">{formatFullNumber(result.income_statement.cost_of_goods_sold.breakdown.manufacturing_overhead)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-2 pl-10">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">재고자산 조정</span>
                      <span className="text-slate-700 tabular-nums">{formatFullNumber(result.income_statement.cost_of_goods_sold.breakdown.inventory_adjustment)}</span>
                    </div>
                  </div>

                  {/* 매출총이익 */}
                  <div className="px-5 py-3 bg-emerald-50">
                    <div className="flex justify-between items-center">
                      <span className="text-[14px] font-semibold text-emerald-800">Ⅲ. 매출총이익</span>
                      <div className="text-right">
                        <span className="text-[14px] font-bold text-emerald-700 tabular-nums">{formatFullNumber(result.income_statement.gross_profit)}</span>
                        <span className="text-[11px] text-emerald-600 ml-2">({result.income_statement.ratios.gross_margin}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* 판매관리비 */}
                  <div className="px-5 py-3 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="text-[14px] font-semibold text-slate-800">Ⅳ. 판매비와관리비</span>
                      <span className="text-[14px] font-bold text-slate-900 tabular-nums">{formatFullNumber(result.income_statement.selling_admin_expenses.total)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-2 pl-10">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">판매관리비</span>
                      <span className="text-slate-700 tabular-nums">{formatFullNumber(result.income_statement.selling_admin_expenses.breakdown.sg_expenses)}</span>
                    </div>
                  </div>
                  <div className="px-5 py-2 pl-10">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-600">간접노무비</span>
                      <span className="text-slate-700 tabular-nums">{formatFullNumber(result.income_statement.selling_admin_expenses.breakdown.indirect_labor)}</span>
                    </div>
                  </div>

                  {/* 영업이익 */}
                  <div className="px-5 py-4 bg-amber-50">
                    <div className="flex justify-between items-center">
                      <span className="text-[15px] font-bold text-amber-800">Ⅴ. 영업이익</span>
                      <div className="text-right">
                        <span className="text-[16px] font-bold text-amber-700 tabular-nums">{formatFullNumber(result.income_statement.operating_profit)}</span>
                        <span className="text-[12px] text-amber-600 ml-2">({result.income_statement.ratios.operating_margin}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI 분석 */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="text-amber-600" size={16} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-800">AI 분석 코멘트</h3>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse inline-block ml-1" />
                  </div>
                </div>

                {result.ai_analysis ? (
                  <div className="space-y-4">
                    {result.ai_analysis.summary && (
                      <p className="text-[13px] text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">
                        {result.ai_analysis.summary}
                      </p>
                    )}

                    {result.ai_analysis.key_findings && result.ai_analysis.key_findings.length > 0 && (
                      <div>
                        <p className="text-[12px] text-amber-700 font-medium mb-2">주요 발견사항</p>
                        <div className="space-y-2">
                          {result.ai_analysis.key_findings.slice(0, 3).map((finding, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  finding.severity === 'high' ? 'bg-red-100 text-red-700' :
                                  finding.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {finding.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600">{finding.finding}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.ai_analysis.recommendations && result.ai_analysis.recommendations.length > 0 && (
                      <div>
                        <p className="text-[12px] text-amber-700 font-medium mb-2">권장 조치</p>
                        <div className="space-y-1.5">
                          {result.ai_analysis.recommendations.slice(0, 3).map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded mt-0.5 font-medium ${
                                rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-200 text-slate-600'
                              }`}>
                                {rec.priority}
                              </span>
                              <p className="text-[11px] text-slate-600 flex-1">{rec.action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.ai_analysis.error && (
                      <p className="text-[12px] text-red-600 bg-red-50 p-2 rounded-lg">
                        AI 분석 오류: {result.ai_analysis.error}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[12px] text-slate-400 bg-slate-50 p-3 rounded-lg text-center">AI 분석 데이터가 없습니다.</p>
                )}
              </div>

              {/* 경고/오류 */}
              {(result.warnings.length > 0 || result.errors.length > 0) && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="text-[13px] font-medium text-slate-800 mb-3">알림</h4>

                  {result.errors.map((err, idx) => (
                    <div key={`err-${idx}`} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg mb-2">
                      <AlertCircle size={14} className="text-red-500 mt-0.5" />
                      <span className="text-[12px] text-red-700">{err}</span>
                    </div>
                  ))}

                  {result.warnings.map((warn, idx) => (
                    <div key={`warn-${idx}`} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg mb-2">
                      <AlertCircle size={14} className="text-amber-500 mt-0.5" />
                      <span className="text-[12px] text-amber-700">{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 데이터 소스 */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-[13px] font-medium text-slate-800 mb-3">사용된 데이터</h4>
                <div className="space-y-2">
                  {uploadedFiles.filter(f => f.status === 'success').map(f => (
                    <div key={f.type} className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-600">{dataTypeInfo[f.type].label}</span>
                      <span className="text-slate-500">{f.rows}건</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 추가 분석 바로가기 */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
                <h4 className="text-[13px] font-medium text-amber-800 mb-3">추가 분석</h4>
                <p className="text-[11px] text-amber-600 mb-3">
                  생성된 손익계산서를 기반으로 심층 분석을 진행할 수 있습니다.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/analysis')}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors group"
                  >
                    <span className="text-[12px] font-medium text-slate-700">손익 분석</span>
                    <ArrowRight size={14} className="text-amber-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate('/simulation')}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors group"
                  >
                    <span className="text-[12px] font-medium text-slate-700">원가 시뮬레이션</span>
                    <ArrowRight size={14} className="text-amber-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate('/reports')}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors group"
                  >
                    <span className="text-[12px] font-medium text-slate-700">보고서 생성</span>
                    <ArrowRight size={14} className="text-amber-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 템플릿 정보 모달 */}
      {showTemplateInfo && templateInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTemplateInfo(false)}>
          <div className="bg-white rounded-2xl max-w-4xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-slate-800">엑셀 템플릿 안내</h3>
              <button onClick={() => setShowTemplateInfo(false)} className="p-1 hover:bg-slate-100 rounded">
                <XCircle size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(templateInfo).map(([key, info]: [string, unknown]) => {
                  const templateData = info as {
                    name: string;
                    description: string;
                    required_columns: string[];
                    example: Record<string, unknown>;
                  };
                  return (
                    <div key={key} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{dataTypeInfo[key as DataType]?.icon || '📄'}</span>
                        <h4 className="text-[14px] font-medium text-slate-800">{templateData.name}</h4>
                      </div>
                      <p className="text-[12px] text-slate-500 mb-3">{templateData.description}</p>

                      <p className="text-[11px] font-medium text-slate-600 mb-1">필수 컬럼:</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {templateData.required_columns.map((col: string) => (
                          <span key={col} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded">
                            {col}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] font-medium text-slate-600 mb-1">예시:</p>
                      <pre className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(templateData.example, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 스마트 파싱 상세 모달 */}
      {selectedFileForDetail && (() => {
        const file = uploadedFiles.find(f => f.type === selectedFileForDetail);
        const sp = file?.smartParsing;
        if (!sp) return null;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedFileForDetail(null)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-amber-500" />
                  <div>
                    <h3 className="text-[16px] font-semibold text-slate-800">
                      AI 스마트 파싱 결과 - {dataTypeInfo[selectedFileForDetail].label}
                    </h3>
                    <p className="text-[12px] text-slate-500">{file?.name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedFileForDetail(null)} className="p-1 hover:bg-slate-100 rounded">
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-6">
                {/* 품질 점수 */}
                <div className="grid grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl border-2 text-center ${
                    sp.data_quality_score.grade === 'A' ? 'bg-emerald-50 border-emerald-300' :
                    sp.data_quality_score.grade === 'B' ? 'bg-blue-50 border-blue-300' :
                    sp.data_quality_score.grade === 'C' ? 'bg-amber-50 border-amber-300' :
                    'bg-red-50 border-red-300'
                  }`}>
                    <div className={`text-3xl font-bold ${
                      sp.data_quality_score.grade === 'A' ? 'text-emerald-600' :
                      sp.data_quality_score.grade === 'B' ? 'text-blue-600' :
                      sp.data_quality_score.grade === 'C' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {sp.data_quality_score.score}
                    </div>
                    <div className="text-[11px] text-slate-500">품질 점수</div>
                    <div className={`text-[16px] font-bold mt-1 ${
                      sp.data_quality_score.grade === 'A' ? 'text-emerald-600' :
                      sp.data_quality_score.grade === 'B' ? 'text-blue-600' :
                      sp.data_quality_score.grade === 'C' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {sp.data_quality_score.grade} ({sp.data_quality_score.grade_text})
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 text-center">
                    <div className="text-2xl font-bold text-slate-700">{sp.data_quality_score.mapping_rate}%</div>
                    <div className="text-[11px] text-slate-500">컬럼 매핑률</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 text-center">
                    <div className="text-2xl font-bold text-slate-700">{sp.mapping_confidence.average}%</div>
                    <div className="text-[11px] text-slate-500">매핑 신뢰도</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 text-center">
                    <div className="flex justify-center gap-1 text-lg font-bold">
                      <span className="text-red-500">{sp.data_quality_score.anomaly_count.high}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-amber-500">{sp.data_quality_score.anomaly_count.medium}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-blue-500">{sp.data_quality_score.anomaly_count.low}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">이상치 (심각/주의/참고)</div>
                  </div>
                </div>

                {/* 컬럼 매핑 */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h4 className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                      <ArrowRight size={14} />
                      AI 컬럼 매핑 결과
                    </h4>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr className="text-[11px] text-slate-500">
                          <th className="text-left py-2 px-4 font-medium">원본 컬럼</th>
                          <th className="text-center py-2 px-4 font-medium">→</th>
                          <th className="text-left py-2 px-4 font-medium">표준 컬럼</th>
                          <th className="text-center py-2 px-4 font-medium">신뢰도</th>
                          <th className="text-left py-2 px-4 font-medium">방법</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sp.mapping_confidence.details.map((detail, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-4 text-[12px] text-slate-600 font-mono">{detail.original}</td>
                            <td className="py-2 px-4 text-center"><ArrowRight size={12} className="text-slate-400 mx-auto" /></td>
                            <td className="py-2 px-4 text-[12px] text-slate-800 font-medium">{detail.mapped}</td>
                            <td className="py-2 px-4 text-center">
                              <span className={`text-[12px] font-bold ${
                                detail.confidence >= 90 ? 'text-emerald-600' :
                                detail.confidence >= 70 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {detail.confidence}%
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded ${
                                detail.method === 'exact_match' ? 'bg-emerald-100 text-emerald-700' :
                                detail.method === 'case_insensitive' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {detail.method === 'exact_match' ? '정확 일치' :
                                 detail.method === 'case_insensitive' ? '대소문자 무시' : 'AI 추론'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 이상치 */}
                {sp.anomalies.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                      <h4 className="text-[13px] font-semibold text-red-700 flex items-center gap-2">
                        <Shield size={14} />
                        감지된 이상치 ({sp.anomalies.length}건)
                      </h4>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {sp.anomalies.map((anomaly, idx) => (
                        <div key={idx} className={`p-4 ${
                          anomaly.severity === 'high' ? 'bg-red-50/50' :
                          anomaly.severity === 'medium' ? 'bg-amber-50/50' : 'bg-blue-50/50'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  anomaly.severity === 'high' ? 'bg-red-200 text-red-700' :
                                  anomaly.severity === 'medium' ? 'bg-amber-200 text-amber-700' :
                                  'bg-blue-200 text-blue-700'
                                }`}>
                                  {anomaly.severity === 'high' ? '심각' : anomaly.severity === 'medium' ? '주의' : '참고'}
                                </span>
                                <span className="text-[11px] text-slate-500">컬럼: {anomaly.column}</span>
                              </div>
                              <p className="text-[13px] text-slate-700">{anomaly.message}</p>
                              {anomaly.sample_values && (
                                <p className="text-[11px] text-slate-500 mt-1">
                                  샘플: {anomaly.sample_values.slice(0, 3).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
