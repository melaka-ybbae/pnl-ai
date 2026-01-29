"""Cost simulation service for what-if analysis"""
from typing import List, Dict
from backend.models.schemas import (
    ProfitLossData, AccountItem,
    CostSimulationInput, CostSimulationResult, SensitivityResult
)
from backend.services.monthly_analysis import MonthlyAnalysisService


class CostSimulationService:
    """
    원가 변동 시뮬레이션 서비스

    컬러강판 원가 구조 기반 시뮬레이션:
    - 냉연강판: 원가의 60-65% (POSCO, 현대제철 가격 연동)
    - 도료: 원가의 15-20% (수입 의존, 환율 영향)
    - 에너지: 전력비 + 가스비 (정부 정책 영향)
    """

    # 원가 항목별 매핑
    COST_ITEM_MAPPING = {
        '냉연강판': ['냉연강판'],
        '도료': ['도료'],
        '아연': ['아연'],
        '전력비': ['전력비'],
        '가스비': ['가스비'],
        '노무비': ['생산직', '품질관리']
    }

    def __init__(self):
        self.monthly_service = MonthlyAnalysisService()

    def _get_cost_amount(
        self,
        items: List[AccountItem],
        period: str,
        cost_type: str
    ) -> float:
        """특정 원가 항목의 금액 조회"""
        keywords = self.COST_ITEM_MAPPING.get(cost_type, [])
        return sum(
            item.금액.get(period, 0) for item in items
            if item.분류 == '매출원가' and any(kw in item.계정과목 for kw in keywords)
        )

    def simulate(
        self,
        data: ProfitLossData,
        period: str,
        simulation_input: CostSimulationInput
    ) -> CostSimulationResult:
        """
        What-if 시뮬레이션 실행

        각 원가 항목의 변동률을 적용하여 예상 영업이익 계산
        """

        # 기준 데이터 계산
        summary = self.monthly_service.calculate_period_summary(data.items, period)
        기준_매출원가 = summary.매출원가
        기준_영업이익 = summary.영업이익

        # 원가 항목별 기준 금액
        항목별_금액 = {
            '냉연강판': self._get_cost_amount(data.items, period, '냉연강판'),
            '도료': self._get_cost_amount(data.items, period, '도료'),
            '아연': self._get_cost_amount(data.items, period, '아연'),
            '전력비': self._get_cost_amount(data.items, period, '전력비'),
            '가스비': self._get_cost_amount(data.items, period, '가스비'),
            '노무비': self._get_cost_amount(data.items, period, '노무비'),
        }

        # 변동률 적용
        변동률_mapping = {
            '냉연강판': simulation_input.냉연강판_변동률,
            '도료': simulation_input.도료_변동률,
            '아연': simulation_input.아연_변동률,
            '전력비': simulation_input.전력비_변동률,
            '가스비': simulation_input.가스비_변동률,
            '노무비': simulation_input.노무비_변동률,
        }

        # 항목별 영향 계산
        원가항목별_영향 = {}
        총_원가_변동 = 0

        for 항목, 기준금액 in 항목별_금액.items():
            변동률 = 변동률_mapping.get(항목, 0)
            변동액 = 기준금액 * (변동률 / 100)
            원가항목별_영향[항목] = round(변동액, 0)
            총_원가_변동 += 변동액

        # 예상 원가 및 영업이익
        예상_매출원가 = 기준_매출원가 + 총_원가_변동
        예상_영업이익 = summary.매출액 - 예상_매출원가 - summary.판매관리비
        영업이익_변동액 = 예상_영업이익 - 기준_영업이익
        영업이익_변동률 = (영업이익_변동액 / 기준_영업이익 * 100) if 기준_영업이익 != 0 else 0

        return CostSimulationResult(
            기준_매출원가=기준_매출원가,
            예상_매출원가=예상_매출원가,
            기준_영업이익=기준_영업이익,
            예상_영업이익=예상_영업이익,
            영업이익_변동액=영업이익_변동액,
            영업이익_변동률=round(영업이익_변동률, 2),
            원가항목별_영향=원가항목별_영향
        )

    def sensitivity_analysis(
        self,
        data: ProfitLossData,
        period: str
    ) -> List[SensitivityResult]:
        """
        민감도 분석

        각 원가 항목 1% 변동 시 영업이익에 미치는 영향 계산
        """
        results = []

        summary = self.monthly_service.calculate_period_summary(data.items, period)
        기준_영업이익 = summary.영업이익

        if 기준_영업이익 == 0:
            return results

        for 항목 in self.COST_ITEM_MAPPING.keys():
            기준금액 = self._get_cost_amount(data.items, period, 항목)

            # 1% 변동 시 영업이익 영향
            영향액 = 기준금액 * 0.01
            영향도 = (영향액 / 기준_영업이익) * 100

            results.append(SensitivityResult(
                항목=항목,
                영업이익_영향도=round(영향도, 2)
            ))

        # 영향도 순 정렬
        results.sort(key=lambda x: abs(x.영업이익_영향도), reverse=True)

        return results

    def scenario_comparison(
        self,
        data: ProfitLossData,
        period: str,
        scenarios: List[Dict[str, CostSimulationInput]]
    ) -> Dict[str, CostSimulationResult]:
        """
        복수 시나리오 비교

        Args:
            scenarios: [{"name": "낙관적", "input": CostSimulationInput}, ...]
        """
        results = {}

        for scenario in scenarios:
            name = scenario.get("name", "시나리오")
            input_data = scenario.get("input")
            results[name] = self.simulate(data, period, input_data)

        return results

    def calculate_breakeven_change(
        self,
        data: ProfitLossData,
        period: str,
        simulation_input: CostSimulationInput
    ) -> Dict[str, float]:
        """
        손익분기점 변동 분석
        """
        summary = self.monthly_service.calculate_period_summary(data.items, period)
        simulation_result = self.simulate(data, period, simulation_input)

        # 고정비 (판매관리비 + 감가상각비)
        고정비 = summary.판매관리비

        # 변동비 (원재료비)
        기준_변동비 = self._get_cost_amount(data.items, period, '냉연강판') + \
                     self._get_cost_amount(data.items, period, '도료') + \
                     self._get_cost_amount(data.items, period, '아연')

        예상_변동비 = 기준_변동비 + \
                     simulation_result.원가항목별_영향.get('냉연강판', 0) + \
                     simulation_result.원가항목별_영향.get('도료', 0) + \
                     simulation_result.원가항목별_영향.get('아연', 0)

        매출액 = summary.매출액

        # 변동비율
        기준_변동비율 = 기준_변동비 / 매출액 if 매출액 > 0 else 0
        예상_변동비율 = 예상_변동비 / 매출액 if 매출액 > 0 else 0

        # 손익분기매출 = 고정비 / (1 - 변동비율)
        기준_손익분기매출 = 고정비 / (1 - 기준_변동비율) if 기준_변동비율 < 1 else 0
        예상_손익분기매출 = 고정비 / (1 - 예상_변동비율) if 예상_변동비율 < 1 else 0

        return {
            '기준_손익분기매출': round(기준_손익분기매출, 0),
            '예상_손익분기매출': round(예상_손익분기매출, 0),
            '변동액': round(예상_손익분기매출 - 기준_손익분기매출, 0),
            '변동률': round((예상_손익분기매출 - 기준_손익분기매출) / 기준_손익분기매출 * 100, 2) if 기준_손익분기매출 > 0 else 0
        }


# 싱글톤 인스턴스
cost_simulation_service = CostSimulationService()
