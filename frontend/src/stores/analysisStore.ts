import { create } from 'zustand';
import type {
  ProfitLossData,
  MonthlyComparisonResult,
  ProductCostAnalysisResult,
  CostSimulationResult,
  SensitivityResult
} from '../types';

interface AnalysisState {
  // 데이터 상태
  data: ProfitLossData | null;
  isLoading: boolean;
  error: string | null;

  // 분석 결과
  monthlyResult: MonthlyComparisonResult | null;
  productCostResult: ProductCostAnalysisResult | null;
  simulationResult: CostSimulationResult | null;
  sensitivityResult: SensitivityResult[] | null;

  // 선택된 기간
  selectedPeriod: string | null;

  // Actions
  setData: (data: ProfitLossData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMonthlyResult: (result: MonthlyComparisonResult | null) => void;
  setProductCostResult: (result: ProductCostAnalysisResult | null) => void;
  setSimulationResult: (result: CostSimulationResult | null) => void;
  setSensitivityResult: (result: SensitivityResult[] | null) => void;
  setSelectedPeriod: (period: string) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  // Initial state
  data: null,
  isLoading: false,
  error: null,
  monthlyResult: null,
  productCostResult: null,
  simulationResult: null,
  sensitivityResult: null,
  selectedPeriod: null,

  // Actions
  setData: (data) => set({
    data,
    selectedPeriod: data.periods[data.periods.length - 1]
  }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setMonthlyResult: (monthlyResult) => set({ monthlyResult }),
  setProductCostResult: (productCostResult) => set({ productCostResult }),
  setSimulationResult: (simulationResult) => set({ simulationResult }),
  setSensitivityResult: (sensitivityResult) => set({ sensitivityResult }),
  setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),
  reset: () => set({
    data: null,
    error: null,
    monthlyResult: null,
    productCostResult: null,
    simulationResult: null,
    sensitivityResult: null,
    selectedPeriod: null
  })
}));
