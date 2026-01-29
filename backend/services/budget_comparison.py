"""Budget comparison service"""
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.models.schemas import (
    ProfitLossData, PeriodSummary,
    BudgetData, BudgetItem as BudgetItemSchema,
    BudgetComparisonResult, ChangeDetail
)
from backend.models.database import Budget, BudgetItemDB, get_session, init_db
from backend.services.monthly_analysis import MonthlyAnalysisService


class BudgetComparisonService:
    """예산 대비 실적 비교 서비스"""

    def __init__(self):
        self.monthly_service = MonthlyAnalysisService()
        init_db()  # 테이블 생성

    def save_budget(self, budget_data: BudgetData) -> int:
        """예산 데이터 저장"""
        session = get_session()

        try:
            # 기존 동일 연도/버전 예산 삭제
            existing = session.query(Budget).filter(
                Budget.year == budget_data.연도,
                Budget.version == budget_data.버전
            ).first()

            if existing:
                session.delete(existing)
                session.commit()

            # 새 예산 생성
            budget = Budget(
                year=budget_data.연도,
                version=budget_data.버전,
                created_at=datetime.now()
            )
            session.add(budget)
            session.flush()

            # 항목 저장
            for item in budget_data.항목:
                db_item = BudgetItemDB(
                    budget_id=budget.id,
                    분류=item.분류,
                    계정과목=item.계정과목,
                    month_01=item.월별금액.get('1월', 0),
                    month_02=item.월별금액.get('2월', 0),
                    month_03=item.월별금액.get('3월', 0),
                    month_04=item.월별금액.get('4월', 0),
                    month_05=item.월별금액.get('5월', 0),
                    month_06=item.월별금액.get('6월', 0),
                    month_07=item.월별금액.get('7월', 0),
                    month_08=item.월별금액.get('8월', 0),
                    month_09=item.월별금액.get('9월', 0),
                    month_10=item.월별금액.get('10월', 0),
                    month_11=item.월별금액.get('11월', 0),
                    month_12=item.월별금액.get('12월', 0)
                )
                session.add(db_item)

            session.commit()
            return budget.id

        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_budget(self, year: int, version: str = "기본") -> Optional[BudgetData]:
        """예산 데이터 조회"""
        session = get_session()

        try:
            budget = session.query(Budget).filter(
                Budget.year == year,
                Budget.version == version
            ).first()

            if not budget:
                return None

            items = []
            for db_item in budget.items:
                items.append(BudgetItemSchema(
                    분류=db_item.분류,
                    계정과목=db_item.계정과목,
                    월별금액={
                        f'{i}월': getattr(db_item, f'month_{i:02d}', 0)
                        for i in range(1, 13)
                    }
                ))

            return BudgetData(연도=year, 버전=version, 항목=items)

        finally:
            session.close()

    def _budget_to_period_summary(
        self,
        budget_data: BudgetData,
        month: int
    ) -> PeriodSummary:
        """예산 데이터를 PeriodSummary로 변환"""
        month_key = f'{month}월'

        매출 = sum(
            item.월별금액.get(month_key, 0)
            for item in budget_data.항목 if item.분류 in ('매출', '매출액')
        )
        매출원가 = sum(
            item.월별금액.get(month_key, 0)
            for item in budget_data.항목 if item.분류 == '매출원가'
        )
        판매관리비 = sum(
            item.월별금액.get(month_key, 0)
            for item in budget_data.항목 if item.분류 == '판매관리비'
        )
        영업외수익 = sum(
            item.월별금액.get(month_key, 0)
            for item in budget_data.항목
            if item.분류 == '영업외손익' and ('수익' in item.계정과목 or '차익' in item.계정과목)
        )
        영업외비용 = sum(
            item.월별금액.get(month_key, 0)
            for item in budget_data.항목
            if item.분류 == '영업외손익' and ('비용' in item.계정과목 or '차손' in item.계정과목)
        )

        매출총이익 = 매출 - 매출원가
        영업이익 = 매출총이익 - 판매관리비
        경상이익 = 영업이익 + 영업외수익 - 영업외비용

        return PeriodSummary(
            매출액=매출,
            매출원가=매출원가,
            매출총이익=매출총이익,
            판매관리비=판매관리비,
            영업이익=영업이익,
            영업외수익=영업외수익,
            영업외비용=영업외비용,
            경상이익=경상이익
        )

    def _calculate_ytd_summary(
        self,
        budget_data: BudgetData,
        up_to_month: int
    ) -> PeriodSummary:
        """누계 요약 계산"""
        totals = PeriodSummary()

        for month in range(1, up_to_month + 1):
            monthly = self._budget_to_period_summary(budget_data, month)
            totals.매출액 += monthly.매출액
            totals.매출원가 += monthly.매출원가
            totals.매출총이익 += monthly.매출총이익
            totals.판매관리비 += monthly.판매관리비
            totals.영업이익 += monthly.영업이익
            totals.영업외수익 += monthly.영업외수익
            totals.영업외비용 += monthly.영업외비용
            totals.경상이익 += monthly.경상이익

        return totals

    def compare(
        self,
        actual_data: ProfitLossData,
        year: int,
        month: int,
        budget_version: str = "기본"
    ) -> BudgetComparisonResult:
        """예산 대비 실적 비교"""

        # 예산 조회
        budget_data = self.get_budget(year, budget_version)
        if not budget_data:
            raise ValueError(f"{year}년 예산 데이터가 없습니다.")

        # 실적 기간 찾기
        period = f"{year}년 {month}월"
        if period not in actual_data.periods:
            raise ValueError(f"{period} 실적 데이터가 없습니다.")

        # 월별 비교
        예산_요약 = self._budget_to_period_summary(budget_data, month)
        실적_요약 = self.monthly_service.calculate_period_summary(actual_data.items, period)

        # 달성률 계산
        달성률 = self._calculate_achievement_rate(예산_요약, 실적_요약)

        # 주요 이탈 항목
        주요이탈항목 = self._find_significant_deviations(
            budget_data, actual_data, month, period
        )

        # 누계 비교
        누계_예산 = self._calculate_ytd_summary(budget_data, month)
        누계_실적 = self._calculate_actual_ytd(actual_data, year, month)
        누계_달성률 = self._calculate_achievement_rate(누계_예산, 누계_실적)

        return BudgetComparisonResult(
            기간=period,
            예산_요약=예산_요약,
            실적_요약=실적_요약,
            달성률=달성률,
            주요이탈항목=주요이탈항목,
            누계_예산=누계_예산,
            누계_실적=누계_실적,
            누계_달성률=누계_달성률
        )

    def _calculate_achievement_rate(
        self,
        budget: PeriodSummary,
        actual: PeriodSummary
    ) -> Dict[str, float]:
        """달성률 계산"""

        def calc_rate(actual_val: float, budget_val: float) -> float:
            if budget_val == 0:
                return 100.0 if actual_val >= 0 else 0.0
            return round((actual_val / budget_val) * 100, 1)

        return {
            '매출액': calc_rate(actual.매출액, budget.매출액),
            '매출원가': calc_rate(actual.매출원가, budget.매출원가),
            '매출총이익': calc_rate(actual.매출총이익, budget.매출총이익),
            '판매관리비': calc_rate(actual.판매관리비, budget.판매관리비),
            '영업이익': calc_rate(actual.영업이익, budget.영업이익),
            '경상이익': calc_rate(actual.경상이익, budget.경상이익),
        }

    def _find_significant_deviations(
        self,
        budget_data: BudgetData,
        actual_data: ProfitLossData,
        month: int,
        period: str,
        threshold: float = 10.0
    ) -> List[ChangeDetail]:
        """주요 이탈 항목 (10% 이상)"""
        deviations = []
        month_key = f'{month}월'

        for budget_item in budget_data.항목:
            예산금액 = budget_item.월별금액.get(month_key, 0)

            # 실적에서 매칭되는 항목 찾기
            actual_item = next(
                (item for item in actual_data.items
                 if item.분류 == budget_item.분류 and item.계정과목 == budget_item.계정과목),
                None
            )

            실적금액 = actual_item.금액.get(period, 0) if actual_item else 0
            차이 = 실적금액 - 예산금액
            차이율 = ((차이 / 예산금액) * 100) if 예산금액 != 0 else 0

            if abs(차이율) >= threshold:
                deviations.append(ChangeDetail(
                    분류=budget_item.분류,
                    계정과목=budget_item.계정과목,
                    기준금액=예산금액,
                    비교금액=실적금액,
                    변동액=차이,
                    변동률=round(차이율, 1)
                ))

        # 차이 절대값 순 정렬
        deviations.sort(key=lambda x: abs(x.변동액), reverse=True)

        return deviations

    def _calculate_actual_ytd(
        self,
        actual_data: ProfitLossData,
        year: int,
        up_to_month: int
    ) -> PeriodSummary:
        """실적 누계 계산"""
        totals = PeriodSummary()

        for month in range(1, up_to_month + 1):
            period = f"{year}년 {month}월"
            if period in actual_data.periods:
                monthly = self.monthly_service.calculate_period_summary(actual_data.items, period)
                totals.매출액 += monthly.매출액
                totals.매출원가 += monthly.매출원가
                totals.매출총이익 += monthly.매출총이익
                totals.판매관리비 += monthly.판매관리비
                totals.영업이익 += monthly.영업이익
                totals.영업외수익 += monthly.영업외수익
                totals.영업외비용 += monthly.영업외비용
                totals.경상이익 += monthly.경상이익

        return totals

    def list_budgets(self, year: Optional[int] = None) -> List[Dict]:
        """예산 목록 조회"""
        session = get_session()

        try:
            query = session.query(Budget)
            if year:
                query = query.filter(Budget.year == year)

            budgets = query.all()
            return [
                {
                    'id': b.id,
                    'year': b.year,
                    'version': b.version,
                    'created_at': b.created_at.isoformat() if b.created_at else None
                }
                for b in budgets
            ]
        finally:
            session.close()


# 싱글톤 인스턴스
budget_comparison_service = BudgetComparisonService()
