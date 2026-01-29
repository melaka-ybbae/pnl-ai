// API Response Types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 손익 데이터 타입
export interface AccountItem {
  분류: string;
  계정과목: string;
  금액: Record<string, number>;
}

export interface ProfitLossData {
  periods: string[];
  items: AccountItem[];
}

// 기간 요약 타입
export interface PeriodSummary {
  매출액: number;
  매출원가: number;
  매출총이익: number;
  판매관리비: number;
  영업이익: number;
  영업외수익: number;
  영업외비용: number;
  경상이익: number;
}

// 변동 상세 타입
export interface ChangeDetail {
  분류: string;
  계정과목: string;
  기준금액: number;
  비교금액: number;
  변동액: number;
  변동률: number;
}

// 월간 비교 결과 타입
export interface MonthlyComparisonResult {
  기준월: string;
  비교월: string;
  기준_요약: PeriodSummary;
  비교_요약: PeriodSummary;
  변동_요약: Record<string, { 변동액: number; 변동률: number }>;
  주요변동항목: ChangeDetail[];
  ai_comment?: string;
}

// 제품별 원가 분석 타입
export interface ProductCostResult {
  제품군: string;
  매출액: number;
  직접원가: number;
  간접원가배부: number;
  총원가: number;
  매출총이익: number;
  매출총이익률: number;
}

export interface ProductCostAnalysisResult {
  기간: string;
  제품별_분석: ProductCostResult[];
  원가구성비: Record<string, number>;
  ai_comment?: string;
}

// 시뮬레이션 타입
export interface CostSimulationInput {
  냉연강판_변동률: number;
  도료_변동률: number;
  아연_변동률: number;
  전력비_변동률: number;
  가스비_변동률: number;
  노무비_변동률: number;
}

export interface CostSimulationResult {
  기준_매출원가: number;
  예상_매출원가: number;
  기준_영업이익: number;
  예상_영업이익: number;
  영업이익_변동액: number;
  영업이익_변동률: number;
  원가항목별_영향: Record<string, number>;
  ai_comment?: string;
}

export interface SensitivityResult {
  항목: string;
  영업이익_영향도: number;
}

// 예산 타입
export interface BudgetComparisonResult {
  기간: string;
  예산_요약: PeriodSummary;
  실적_요약: PeriodSummary;
  달성률: Record<string, number>;
  주요이탈항목: ChangeDetail[];
  누계_예산: PeriodSummary;
  누계_실적: PeriodSummary;
  누계_달성률: Record<string, number>;
  ai_comment?: string;
}

// 업로드 응답 타입
export interface UploadResponse {
  success: boolean;
  message: string;
  data?: ProfitLossData;
  warnings: string[];
}
