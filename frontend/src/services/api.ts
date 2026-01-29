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

export default api;
