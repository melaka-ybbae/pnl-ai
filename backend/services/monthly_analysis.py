"""Monthly P&L analysis service"""
from typing import List, Dict, Optional
from backend.models.schemas import (
    ProfitLossData, AccountItem, PeriodSummary,
    MonthlyComparisonResult, ChangeDetail
)


class MonthlyAnalysisService:
    """월간 손익 비교 분석 서비스"""

    # 주요 변동 임계값 (%)
    SIGNIFICANT_CHANGE_THRESHOLD = 5.0

    def calculate_period_summary(self, items: List[AccountItem], period: str) -> PeriodSummary:
        """특정 기간의 손익 요약 계산"""

        # 분류별 합계 (분류명이 '매출' 또는 '매출액'인 경우 모두 처리)
        매출_합계 = sum(
            item.금액.get(period, 0) for item in items if item.분류 in ('매출', '매출액')
        )
        매출원가_합계 = sum(
            item.금액.get(period, 0) for item in items if item.분류 == '매출원가'
        )
        판매관리비_합계 = sum(
            item.금액.get(period, 0) for item in items if item.분류 == '판매관리비'
        )

        # 영업외손익 세분화
        영업외수익 = sum(
            item.금액.get(period, 0) for item in items
            if item.분류 == '영업외손익' and '수익' in item.계정과목 or '차익' in item.계정과목
        )
        영업외비용 = sum(
            item.금액.get(period, 0) for item in items
            if item.분류 == '영업외손익' and ('비용' in item.계정과목 or '차손' in item.계정과목)
        )

        # 손익 계산
        매출총이익 = 매출_합계 - 매출원가_합계
        영업이익 = 매출총이익 - 판매관리비_합계
        경상이익 = 영업이익 + 영업외수익 - 영업외비용

        return PeriodSummary(
            매출액=매출_합계,
            매출원가=매출원가_합계,
            매출총이익=매출총이익,
            판매관리비=판매관리비_합계,
            영업이익=영업이익,
            영업외수익=영업외수익,
            영업외비용=영업외비용,
            경상이익=경상이익
        )

    def compare_periods(
        self,
        data: ProfitLossData,
        기준월: str,
        비교월: str
    ) -> MonthlyComparisonResult:
        """두 기간 비교 분석"""

        # 기간별 요약 계산
        기준_요약 = self.calculate_period_summary(data.items, 기준월)
        비교_요약 = self.calculate_period_summary(data.items, 비교월)

        # 변동 요약 계산
        변동_요약 = self._calculate_change_summary(비교_요약, 기준_요약)

        # 주요 변동 항목 추출
        주요변동항목 = self._find_significant_changes(
            data.items, 기준월, 비교월
        )

        return MonthlyComparisonResult(
            기준월=기준월,
            비교월=비교월,
            기준_요약=기준_요약,
            비교_요약=비교_요약,
            변동_요약=변동_요약,
            주요변동항목=주요변동항목
        )

    def _calculate_change_summary(
        self,
        current: PeriodSummary,
        previous: PeriodSummary
    ) -> Dict[str, Dict[str, float]]:
        """변동 요약 계산"""

        def calc_change(curr: float, prev: float) -> Dict[str, float]:
            변동액 = curr - prev
            변동률 = ((curr - prev) / prev * 100) if prev != 0 else 0
            return {"변동액": 변동액, "변동률": round(변동률, 2)}

        return {
            "매출액": calc_change(current.매출액, previous.매출액),
            "매출원가": calc_change(current.매출원가, previous.매출원가),
            "매출총이익": calc_change(current.매출총이익, previous.매출총이익),
            "판매관리비": calc_change(current.판매관리비, previous.판매관리비),
            "영업이익": calc_change(current.영업이익, previous.영업이익),
            "경상이익": calc_change(current.경상이익, previous.경상이익),
        }

    def _find_significant_changes(
        self,
        items: List[AccountItem],
        기준월: str,
        비교월: str
    ) -> List[ChangeDetail]:
        """주요 변동 항목 추출 (임계값 이상)"""

        changes = []

        for item in items:
            기준금액 = item.금액.get(기준월, 0)
            비교금액 = item.금액.get(비교월, 0)
            변동액 = 비교금액 - 기준금액
            변동률 = ((변동액 / 기준금액) * 100) if 기준금액 != 0 else 0

            if abs(변동률) >= self.SIGNIFICANT_CHANGE_THRESHOLD:
                changes.append(ChangeDetail(
                    분류=item.분류,
                    계정과목=item.계정과목,
                    기준금액=기준금액,
                    비교금액=비교금액,
                    변동액=변동액,
                    변동률=round(변동률, 2)
                ))

        # 변동액 절대값 기준 정렬
        changes.sort(key=lambda x: abs(x.변동액), reverse=True)

        return changes

    def analyze(self, data: ProfitLossData) -> MonthlyComparisonResult:
        """기본 분석 (마지막 두 기간 비교)"""
        if len(data.periods) < 2:
            raise ValueError("최소 2개 기간의 데이터가 필요합니다.")

        기준월 = data.periods[-2]  # 전월
        비교월 = data.periods[-1]  # 당월

        return self.compare_periods(data, 기준월, 비교월)

    def get_trend_data(
        self,
        data: ProfitLossData,
        항목: str = "영업이익"
    ) -> List[Dict]:
        """추이 데이터 추출 (차트용)"""
        trend = []

        for period in data.periods:
            summary = self.calculate_period_summary(data.items, period)
            value = getattr(summary, 항목, 0)
            trend.append({
                "기간": period,
                "금액": value
            })

        return trend

    def get_cost_breakdown(
        self,
        data: ProfitLossData,
        period: str
    ) -> Dict[str, float]:
        """원가 구성 비율 계산 (파이차트용)"""
        breakdown = {}

        # 매출원가 항목별 합계
        원가_items = [item for item in data.items if item.분류 == '매출원가']
        총_원가 = sum(item.금액.get(period, 0) for item in 원가_items)

        if 총_원가 == 0:
            return breakdown

        # 카테고리별 분류
        categories = {
            "원재료비": ["냉연강판", "도료", "아연"],
            "노무비": ["생산직", "품질관리"],
            "제조경비": ["전력비", "가스비", "감가상각비", "수선유지비", "외주가공비"]
        }

        for category, keywords in categories.items():
            category_sum = sum(
                item.금액.get(period, 0) for item in 원가_items
                if any(kw in item.계정과목 for kw in keywords)
            )
            breakdown[category] = round((category_sum / 총_원가) * 100, 1)

        # 기타
        classified_sum = sum(breakdown.values())
        if classified_sum < 100:
            breakdown["기타"] = round(100 - classified_sum, 1)

        return breakdown

    def analyze_single_period(self, data: ProfitLossData, period: str) -> Dict:
        """단일 기간 분석 (비교 대상 없이)"""
        summary = self.calculate_period_summary(data.items, period)

        # 비율 계산
        매출총이익률 = (summary.매출총이익 / summary.매출액 * 100) if summary.매출액 != 0 else 0
        영업이익률 = (summary.영업이익 / summary.매출액 * 100) if summary.매출액 != 0 else 0
        원가율 = (summary.매출원가 / summary.매출액 * 100) if summary.매출액 != 0 else 0

        # 분류별 상세
        항목별_데이터 = []
        for item in data.items:
            금액 = item.금액.get(period, 0)
            if 금액 != 0:
                항목별_데이터.append({
                    '분류': item.분류,
                    '계정과목': item.계정과목,
                    '금액': 금액
                })

        return {
            'is_single_period': True,
            '기준월': period,
            '비교월': None,
            '기준_요약': {
                '매출액': summary.매출액,
                '매출원가': summary.매출원가,
                '매출총이익': summary.매출총이익,
                '판매관리비': summary.판매관리비,
                '영업이익': summary.영업이익,
                '영업외수익': summary.영업외수익,
                '영업외비용': summary.영업외비용,
                '경상이익': summary.경상이익
            },
            '비교_요약': None,
            '변동_요약': {},
            '주요변동항목': [],
            '비율': {
                '매출총이익률': round(매출총이익률, 2),
                '영업이익률': round(영업이익률, 2),
                '원가율': round(원가율, 2)
            },
            '항목별_데이터': 항목별_데이터
        }


# 싱글톤 인스턴스
monthly_analysis_service = MonthlyAnalysisService()
