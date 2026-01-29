import axios from 'axios';
import type {
  ApiResponse,
  UploadResponse,
  MonthlyComparisonResult,
  ProductCostAnalysisResult,
  CostSimulationInput,
  CostSimulationResult,
  SensitivityResult,
  BudgetComparisonResult
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 데이터 업로드
export const uploadExcel = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/data/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// 현재 데이터 조회
export const getCurrentData = async () => {
  const response = await api.get('/data/current');
  return response.data;
};

// 월간 분석
export const analyzeMonthly = async (
  기준월?: string,
  비교월?: string,
  includeAi: boolean = true
): Promise<ApiResponse<MonthlyComparisonResult>> => {
  const params = new URLSearchParams();
  if (기준월) params.append('기준월', 기준월);
  if (비교월) params.append('비교월', 비교월);
  params.append('include_ai', String(includeAi));

  const response = await api.post(`/analysis/monthly?${params.toString()}`);
  return response.data;
};

// 제품별 원가 분석
export const analyzeProductCost = async (
  기간?: string,
  includeAi: boolean = true
): Promise<ApiResponse<ProductCostAnalysisResult>> => {
  const params = new URLSearchParams();
  if (기간) params.append('기간', 기간);
  params.append('include_ai', String(includeAi));

  const response = await api.post(`/analysis/product-cost?${params.toString()}`);
  return response.data;
};

// 월간 분석 AI 코멘트만 별도 요청
export const getMonthlyAiComment = async (
  기준월?: string,
  비교월?: string
): Promise<ApiResponse<{ ai_comment: string }>> => {
  const params = new URLSearchParams();
  if (기준월) params.append('기준월', 기준월);
  if (비교월) params.append('비교월', 비교월);

  const response = await api.post(`/analysis/monthly/ai-comment?${params.toString()}`);
  return response.data;
};

// 제품별 원가 AI 코멘트만 별도 요청
export const getProductCostAiComment = async (
  기간?: string
): Promise<ApiResponse<{ ai_comment: string }>> => {
  const params = new URLSearchParams();
  if (기간) params.append('기간', 기간);

  const response = await api.post(`/analysis/product-cost/ai-comment?${params.toString()}`);
  return response.data;
};

// 추이 데이터
export const getTrend = async (항목: string = '영업이익') => {
  const response = await api.get(`/analysis/trend?항목=${항목}`);
  return response.data;
};

// 원가 구성
export const getCostBreakdown = async (기간?: string) => {
  const params = 기간 ? `?기간=${기간}` : '';
  const response = await api.get(`/analysis/cost-breakdown${params}`);
  return response.data;
};

// 원가 시뮬레이션
export const simulateCost = async (
  input: CostSimulationInput,
  기간?: string,
  includeAi: boolean = true
): Promise<ApiResponse<CostSimulationResult>> => {
  const params = new URLSearchParams();
  if (기간) params.append('기간', 기간);
  params.append('include_ai', String(includeAi));

  const response = await api.post(`/simulation/cost?${params.toString()}`, input);
  return response.data;
};

// 시뮬레이션 AI 코멘트만 별도 요청
export const getSimulationAiComment = async (
  input: CostSimulationInput,
  기간?: string
): Promise<ApiResponse<{ ai_comment: string }>> => {
  const params = new URLSearchParams();
  if (기간) params.append('기간', 기간);

  const response = await api.post(`/simulation/cost/ai-comment?${params.toString()}`, input);
  return response.data;
};

// 민감도 분석
export const getSensitivity = async (
  기간?: string
): Promise<ApiResponse<{ 기간: string; sensitivity: SensitivityResult[] }>> => {
  const params = 기간 ? `?기간=${기간}` : '';
  const response = await api.get(`/simulation/sensitivity${params}`);
  return response.data;
};

// 예산 업로드
export const uploadBudget = async (file: File, year: number, version: string = '기본') => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    `/budget/upload?year=${year}&version=${version}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

// 예산 대비 실적
export const compareBudget = async (
  year: number,
  month: number,
  version: string = '기본',
  includeAi: boolean = true
): Promise<ApiResponse<BudgetComparisonResult>> => {
  const params = new URLSearchParams();
  params.append('year', String(year));
  params.append('month', String(month));
  params.append('version', version);
  params.append('include_ai', String(includeAi));

  const response = await api.post(`/budget/comparison?${params.toString()}`);
  return response.data;
};

// 예산 AI 코멘트만 별도 요청
export const getBudgetAiComment = async (
  year: number,
  month: number,
  version: string = '기본'
): Promise<ApiResponse<{ ai_comment: string }>> => {
  const params = new URLSearchParams();
  params.append('year', String(year));
  params.append('month', String(month));
  params.append('version', version);

  const response = await api.post(`/budget/comparison/ai-comment?${params.toString()}`);
  return response.data;
};

// 보고서 미리보기
export const previewReport = async (기간?: string, includeAi: boolean = true) => {
  const params = new URLSearchParams();
  if (기간) params.append('기간', 기간);
  params.append('include_ai', String(includeAi));

  const response = await api.get(`/reports/preview?${params.toString()}`);
  return response.data;
};

// Excel 다운로드
export const downloadExcel = async (기간?: string, sections: string[] = ['monthly', 'product_cost']) => {
  const params = new URLSearchParams();
  if (기간) params.append('기간', 기간);
  sections.forEach(s => params.append('include_sections', s));

  const response = await api.post(`/reports/excel?${params.toString()}`, null, {
    responseType: 'blob'
  });

  // 파일 다운로드
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `손익분석_${기간 || 'report'}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// AI 월간 경영 보고서 생성
export const generateMonthlyReport = async (year: number, month: number, useAi: boolean = true) => {
  const params = new URLSearchParams();
  params.append('year', String(year));
  params.append('month', String(month));
  params.append('use_ai', String(useAi));

  const response = await api.post(`/reports/monthly?${params.toString()}`);
  return response.data;
};

// ========== 대시보드 API ==========

// 대시보드 KPI 조회
export const getDashboardKPI = async () => {
  const response = await api.get('/dashboard/kpi');
  return response.data;
};

// 매출 추이 조회
export const getSalesTrend = async (days: number = 7) => {
  const response = await api.get(`/dashboard/sales-trend?days=${days}`);
  return response.data;
};

// AI 알림 조회
export const getDashboardAlerts = async () => {
  const response = await api.get('/dashboard/ai-alerts');
  return response.data;
};

// 최근 서류 목록 조회
export const getRecentDocuments = async (limit: number = 5) => {
  const response = await api.get(`/dashboard/recent-documents?limit=${limit}`);
  return response.data;
};

// 빠른 통계 조회
export const getQuickStats = async () => {
  const response = await api.get('/dashboard/quick-stats');
  return response.data;
};

// ========== 채권 관리 API ==========

// 채권 목록 조회
export const getReceivablesList = async (status?: string, customer?: string, limit: number = 50) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (customer) params.append('customer', customer);
  params.append('limit', String(limit));
  const response = await api.get(`/receivables/list?${params.toString()}`);
  return response.data;
};

// 채권 요약 조회
export const getReceivablesSummary = async () => {
  const response = await api.get('/receivables/summary');
  return response.data;
};

// 연령분석 조회
export const getAgingAnalysis = async () => {
  const response = await api.get('/receivables/aging');
  return response.data;
};

// AI 리스크 분석 조회
export const getARRiskAnalysis = async () => {
  const response = await api.get('/receivables/risk-analysis');
  return response.data;
};

// 고위험 거래처 조회
export const getHighRiskCustomers = async () => {
  const response = await api.get('/receivables/high-risk');
  return response.data;
};

// ========== 환율 관리 API ==========

// 현재 환율 조회
export const getCurrentRates = async () => {
  const response = await api.get('/forex/rates');
  return response.data;
};

// 환차손익 계산
export const calculateFXGainLoss = async () => {
  const response = await api.get('/forex/fx-gain-loss');
  return response.data;
};

// 환율 히스토리 조회
export const getRateHistory = async (currency: string = 'USD', days: number = 30) => {
  const response = await api.get(`/forex/history?currency=${currency}&days=${days}`);
  return response.data;
};

// ========== 무역 서류 API ==========

// Invoice 업로드
export const uploadInvoice = async (file: File, autoParse: boolean = true) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/documents/upload/invoice?auto_parse=${autoParse}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// B/L 업로드
export const uploadBL = async (file: File, autoParse: boolean = true) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/documents/upload/bl?auto_parse=${autoParse}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Packing List 업로드
export const uploadPackingList = async (file: File, autoParse: boolean = true) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/documents/upload/packing-list?auto_parse=${autoParse}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// 서류 목록 조회
export const getDocumentsList = async (docType?: string, status?: string, limit: number = 50) => {
  const params = new URLSearchParams();
  if (docType) params.append('doc_type', docType);
  if (status) params.append('status', status);
  params.append('limit', String(limit));
  const response = await api.get(`/documents/list?${params.toString()}`);
  return response.data;
};

// L/C 업로드
export const uploadLC = async (file: File, autoParse: boolean = true) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/documents/upload/lc?auto_parse=${autoParse}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// 서류 대사 (Invoice vs B/L vs Packing List 비교)
export const compareDocuments = async (
  invoiceData: Record<string, unknown>,
  blData: Record<string, unknown>,
  packingListData?: Record<string, unknown>
) => {
  const response = await api.post('/documents/compare', {
    invoice_data: invoiceData,
    bl_data: blData,
    packing_list_data: packingListData
  });
  return response.data;
};

// L/C 조건 검토
export const reviewLCConditions = async (lcData: Record<string, unknown>) => {
  const response = await api.post('/documents/lc-review', lcData);
  return response.data;
};

// 서류 확정
export const confirmDocument = async (fileId: string, confirmedData: Record<string, unknown>) => {
  const response = await api.post(`/documents/confirm/${fileId}`, confirmedData);
  return response.data;
};

// 서류 상세 조회
export const getDocumentDetail = async (fileId: string) => {
  const response = await api.get(`/documents/${fileId}`);
  return response.data;
};

// ========== 채무 관리 API ==========

// 채무 목록 조회
export const getPayablesList = async (status?: string, supplier?: string, limit: number = 50) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (supplier) params.append('supplier', supplier);
  params.append('limit', String(limit));
  const response = await api.get(`/receivables/payables/list?${params.toString()}`);
  return response.data;
};

// 채무 요약 조회
export const getPayablesSummary = async () => {
  const response = await api.get('/receivables/payables/summary');
  return response.data;
};

// 지급 스케줄 조회
export const getPaymentSchedule = async () => {
  const response = await api.get('/receivables/payables/schedule');
  return response.data;
};

// ========== 알림 API ==========

// 알림 목록 조회
export const getAlertsList = async (limit: number = 50) => {
  const response = await api.get(`/alerts/list?limit=${limit}`);
  return response.data;
};

// 미읽음 알림 개수
export const getUnreadAlertsCount = async () => {
  const response = await api.get('/alerts/unread-count');
  return response.data;
};

// 알림 읽음 처리
export const markAlertAsRead = async (alertId: string) => {
  const response = await api.post('/alerts/mark-read', { alert_id: alertId });
  return response.data;
};

// ========== ERP 데이터 동기화 API ==========

// ERP 파일 업로드
export const uploadERPFile = async (
  file: File,
  dataType: string,
  sessionId?: string,
  columnMapping?: Record<string, string>
) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('data_type', dataType);
  if (sessionId) {
    formData.append('session_id', sessionId);
  }
  if (columnMapping) {
    formData.append('column_mapping', JSON.stringify(columnMapping));
  }
  const response = await api.post('/erp-sync/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// 세션 상태 조회
export const getERPSessionStatus = async (sessionId: string) => {
  const response = await api.get(`/erp-sync/session/${sessionId}/status`);
  return response.data;
};

// 손익계산서 생성
export const generateIncomeStatement = async (sessionId: string, includeAi: boolean = true) => {
  const response = await api.post(`/erp-sync/session/${sessionId}/generate?include_ai=${includeAi}`);
  return response.data;
};

// 세션 삭제
export const deleteERPSession = async (sessionId: string) => {
  const response = await api.delete(`/erp-sync/session/${sessionId}`);
  return response.data;
};

// 빠른 손익계산서 생성 (모든 파일 한번에)
export const quickGenerateIncomeStatement = async (
  files: {
    sales: File;
    purchases: File;
    payroll?: File;
    mfg_expenses?: File;
    inventory?: File;
    sg_expenses?: File;
  },
  includeAi: boolean = true
) => {
  const formData = new FormData();
  formData.append('sales_file', files.sales);
  formData.append('purchases_file', files.purchases);
  if (files.payroll) formData.append('payroll_file', files.payroll);
  if (files.mfg_expenses) formData.append('mfg_expenses_file', files.mfg_expenses);
  if (files.inventory) formData.append('inventory_file', files.inventory);
  if (files.sg_expenses) formData.append('sg_expenses_file', files.sg_expenses);

  const response = await api.post(`/erp-sync/quick-generate?include_ai=${includeAi}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// 템플릿 정보 조회
export const getERPTemplateInfo = async () => {
  const response = await api.get('/erp-sync/template-info');
  return response.data;
};

// ========== AI 스마트 파싱 API ==========

// 스마트 파싱 분석
export const analyzeSmartParsing = async (file: File, dataType: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('data_type', dataType);
  const response = await api.post('/smart-parser/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// 두 파일 비교 분석
export const compareSmartParsing = async (cleanFile: File, messyFile: File, dataType: string = 'sales') => {
  const formData = new FormData();
  formData.append('clean_file', cleanFile);
  formData.append('messy_file', messyFile);
  formData.append('data_type', dataType);
  const response = await api.post('/smart-parser/compare', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// 데모 파일 목록 조회
export const getDemoFiles = async () => {
  const response = await api.get('/smart-parser/demo-files');
  return response.data;
};

export default api;
