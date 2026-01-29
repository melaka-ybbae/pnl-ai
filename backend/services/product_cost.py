"""Product cost analysis service"""
from typing import List, Dict
from backend.models.schemas import (
    ProfitLossData, AccountItem,
    ProductCostResult, ProductCostAnalysisResult
)
from backend.models.enums import 제품군


class ProductCostAnalysisService:
    """
    제품별 원가 분석 서비스

    컬러강판 제조 특성 반영:
    - 원재료비 비중이 높음 (60-70%)
    - 제품군별 원자재 투입량 차이 고려
    - 에너지 비용(전력, 가스) 중요
    """

    # 원가 배부 기준 (매출 비율 기반)
    # 실제로는 제품별 원가 데이터가 있어야 하지만, 여기서는 매출 비율로 배부
    DEFAULT_ALLOCATION_RATES = {
        '건재용': {'직접원가': 0.55, '간접원가': 0.50},
        '가전용': {'직접원가': 0.35, '간접원가': 0.40},
        '기타': {'직접원가': 0.10, '간접원가': 0.10},
    }

    # 직접원가 항목 (제품별 추적 가능)
    # 원재료비, 직접노무비 및 기존 상세 항목 포함
    DIRECT_COST_KEYWORDS = ['원재료비', '직접노무비', '냉연강판', '도료', '아연', '생산직']

    # 간접원가 항목 (배부 필요)
    # 제조경비, 재고자산조정 및 기존 상세 항목 포함
    INDIRECT_COST_KEYWORDS = ['제조경비', '재고자산조정', '전력비', '가스비', '감가상각비', '수선유지비', '외주가공비', '품질관리']

    def _extract_product_from_account(self, 계정과목: str) -> str:
        """계정과목에서 제품군 추출"""
        for 제품 in ['건재용', '가전용']:
            if 제품 in 계정과목:
                return 제품
        return '기타'

    def _calculate_sales_ratio(
        self,
        items: List[AccountItem],
        period: str
    ) -> Dict[str, float]:
        """제품군별 매출 비율 계산"""
        sales_by_product = {'건재용': 0, '가전용': 0, '기타': 0}
        total_sales = 0

        for item in items:
            if item.분류 in ('매출', '매출액'):
                amount = item.금액.get(period, 0)
                product = self._extract_product_from_account(item.계정과목)
                sales_by_product[product] += amount
                total_sales += amount

        # 비율 계산
        ratios = {}
        for product, amount in sales_by_product.items():
            ratios[product] = amount / total_sales if total_sales > 0 else 0

        return ratios

    def _calculate_cost_structure(
        self,
        items: List[AccountItem],
        period: str
    ) -> Dict[str, float]:
        """원가 구성 비율 계산"""
        cost_structure = {
            '원재료비': 0,
            '노무비': 0,
            '제조경비': 0
        }

        total_cost = 0
        원가_items = [item for item in items if item.분류 == '매출원가']

        for item in 원가_items:
            amount = item.금액.get(period, 0)
            total_cost += amount

            # 원재료비 매칭 (계정과목에 '원재료' 포함 또는 기존 키워드)
            if any(kw in item.계정과목 for kw in ['원재료', '냉연강판', '도료', '아연']):
                cost_structure['원재료비'] += amount
            # 노무비 매칭 (계정과목에 '노무' 포함 또는 기존 키워드)
            elif any(kw in item.계정과목 for kw in ['노무비', '노무', '생산직', '품질관리']):
                cost_structure['노무비'] += amount
            # 나머지는 제조경비
            else:
                cost_structure['제조경비'] += amount

        # 비율로 변환
        if total_cost > 0:
            for key in cost_structure:
                cost_structure[key] = round((cost_structure[key] / total_cost) * 100, 1)

        return cost_structure

    def analyze(
        self,
        data: ProfitLossData,
        period: str
    ) -> ProductCostAnalysisResult:
        """제품군별 원가 분석"""

        # 매출 비율 계산
        sales_ratio = self._calculate_sales_ratio(data.items, period)

        # 총 원가 계산
        원가_items = [item for item in data.items if item.분류 == '매출원가']
        직접원가_합계 = sum(
            item.금액.get(period, 0) for item in 원가_items
            if any(kw in item.계정과목 for kw in self.DIRECT_COST_KEYWORDS)
        )
        간접원가_합계 = sum(
            item.금액.get(period, 0) for item in 원가_items
            if any(kw in item.계정과목 for kw in self.INDIRECT_COST_KEYWORDS)
        )

        # 제품별 분석
        제품별_분석 = []

        for 제품 in ['건재용', '가전용', '기타']:
            # 매출액
            매출액 = sum(
                item.금액.get(period, 0) for item in data.items
                if item.분류 in ('매출', '매출액') and self._extract_product_from_account(item.계정과목) == 제품
            )

            # 원가 배부 (매출 비율 기반)
            ratio = sales_ratio.get(제품, 0)
            직접원가 = 직접원가_합계 * ratio
            간접원가배부 = 간접원가_합계 * ratio
            총원가 = 직접원가 + 간접원가배부

            # 이익 계산
            매출총이익 = 매출액 - 총원가
            매출총이익률 = (매출총이익 / 매출액 * 100) if 매출액 > 0 else 0

            제품별_분석.append(ProductCostResult(
                제품군=제품,
                매출액=매출액,
                직접원가=직접원가,
                간접원가배부=간접원가배부,
                총원가=총원가,
                매출총이익=매출총이익,
                매출총이익률=round(매출총이익률, 2)
            ))

        # 원가 구성비
        원가구성비 = self._calculate_cost_structure(data.items, period)

        return ProductCostAnalysisResult(
            기간=period,
            제품별_분석=제품별_분석,
            원가구성비=원가구성비
        )

    def calculate_contribution_margin(
        self,
        data: ProfitLossData,
        period: str
    ) -> Dict[str, Dict[str, float]]:
        """공헌이익 분석"""
        result = {}

        for 제품 in ['건재용', '가전용', '기타']:
            # 매출
            매출액 = sum(
                item.금액.get(period, 0) for item in data.items
                if item.분류 in ('매출', '매출액') and self._extract_product_from_account(item.계정과목) == 제품
            )

            # 변동비 (원재료비만 변동비로 가정)
            sales_ratio = self._calculate_sales_ratio(data.items, period)
            ratio = sales_ratio.get(제품, 0)

            변동비 = sum(
                item.금액.get(period, 0) for item in data.items
                if item.분류 == '매출원가' and any(kw in item.계정과목 for kw in ['냉연강판', '도료', '아연'])
            ) * ratio

            공헌이익 = 매출액 - 변동비
            공헌이익률 = (공헌이익 / 매출액 * 100) if 매출액 > 0 else 0

            result[제품] = {
                '매출액': 매출액,
                '변동비': 변동비,
                '공헌이익': 공헌이익,
                '공헌이익률': round(공헌이익률, 2)
            }

        return result


# 싱글톤 인스턴스
product_cost_service = ProductCostAnalysisService()
