"""AI analysis service using Claude API"""
import anthropic
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from backend.models.schemas import (
    MonthlyComparisonResult, ProductCostAnalysisResult,
    CostSimulationResult, BudgetComparisonResult
)

# 프로젝트 루트의 .env 파일 명시적 로드
PROJECT_ROOT = Path(__file__).parent.parent.parent
ENV_FILE = PROJECT_ROOT / ".env"


def get_api_key():
    """API 키를 가져옴"""
    load_dotenv(ENV_FILE, override=True)
    return os.getenv("ANTHROPIC_API_KEY")


class AIAnalysisService:
    """Claude API 기반 AI 분석 서비스"""

    def __init__(self):
        self.model = "claude-sonnet-4-20250514"

    def _create_client(self):
        """매번 새로운 클라이언트 생성"""
        api_key = get_api_key()
        print(f"[AI DEBUG] ENV_FILE: {ENV_FILE}")
        print(f"[AI DEBUG] ENV_FILE exists: {ENV_FILE.exists()}")
        print(f"[AI DEBUG] API Key: {api_key[:25] if api_key else 'None'}...")
        if api_key:
            client = anthropic.Anthropic(api_key=api_key)
            print(f"[AI DEBUG] Client created: {client}")
            return client
        return None

    def _is_available(self) -> bool:
        return get_api_key() is not None

    async def generate_monthly_comment(
        self,
        analysis: MonthlyComparisonResult
    ) -> str:
        """월간 분석 코멘트 생성"""
        client = self._create_client()
        if not client:
            return ""

        try:
            # 주요 변동 항목 정리
            significant_changes = [
                f"- {item.계정과목}: {item.변동액:,.0f}원 ({item.변동률:+.1f}%)"
                for item in analysis.주요변동항목[:5]
            ]

            prompt = f"""당신은 재무 분석 전문가입니다. 아래 월간 손익 데이터를 분석하고 경영진 보고용 코멘트를 작성해주세요.

[배경: 이 회사는 컬러강판 제조업체로, 냉연강판/도료/아연이 주요 원재료이고 전력비와 가스비가 중요한 제조경비입니다. 이 맥락을 참고하되, 응답에서 "컬러강판 제조업"이라는 표현은 사용하지 마세요.]

## 손익 요약 ({analysis.기준월} → {analysis.비교월})
- 매출액: {analysis.기준_요약.매출액:,.0f}원 → {analysis.비교_요약.매출액:,.0f}원 ({analysis.변동_요약['매출액']['변동률']:+.1f}%)
- 매출원가: {analysis.기준_요약.매출원가:,.0f}원 → {analysis.비교_요약.매출원가:,.0f}원 ({analysis.변동_요약['매출원가']['변동률']:+.1f}%)
- 매출총이익: {analysis.기준_요약.매출총이익:,.0f}원 → {analysis.비교_요약.매출총이익:,.0f}원 ({analysis.변동_요약['매출총이익']['변동률']:+.1f}%)
- 영업이익: {analysis.기준_요약.영업이익:,.0f}원 → {analysis.비교_요약.영업이익:,.0f}원 ({analysis.변동_요약['영업이익']['변동률']:+.1f}%)

## 주요 변동 항목 (5% 이상)
{chr(10).join(significant_changes) if significant_changes else "주요 변동 항목 없음"}

## 요청사항
1. 전월 대비 손익 변동 핵심 요약 (2-3문장)
2. 주요 증감 원인 분석
3. 경영진 주의 필요 사항
4. 개선 제안

한국어로 간결하게 작성하고, 구체적인 수치를 인용해주세요. 마크다운 형식으로 작성해주세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text
        except Exception as e:
            print(f"AI 분석 오류: {e}")
            return ""

    async def generate_product_cost_comment(
        self,
        analysis: ProductCostAnalysisResult
    ) -> str:
        """제품별 원가 분석 코멘트 생성"""
        client = self._create_client()
        if not client:
            return ""

        try:
            product_summary = []
            for p in analysis.제품별_분석:
                product_summary.append(
                    f"- {p.제품군}: 매출 {p.매출액:,.0f}원, 이익 {p.매출총이익:,.0f}원 (이익률 {p.매출총이익률:.1f}%)"
                )

            prompt = f"""당신은 원가 분석 전문가입니다. 아래 제품별 원가 분석 결과를 해석해주세요.

[배경: 이 회사는 컬러강판 제조업체로, 건재용/가전용/기타 제품군으로 구분됩니다. 원재료비(냉연강판, 도료, 아연)가 원가의 70% 이상을 차지합니다. 이 맥락을 참고하되, 응답에서 "컬러강판 제조업"이라는 표현은 사용하지 마세요.]

## 분석 기간: {analysis.기간}

## 제품군별 수익성
{chr(10).join(product_summary)}

## 원가 구성비
- 원재료비: {analysis.원가구성비.get('원재료비', 0)}%
- 노무비: {analysis.원가구성비.get('노무비', 0)}%
- 제조경비: {analysis.원가구성비.get('제조경비', 0)}%

## 요청사항
1. 제품군별 수익성 평가 (어떤 제품이 가장 수익성이 좋은지)
2. 원가 구조 분석
3. 수익성 개선 방안 제안

한국어로 간결하게 작성해주세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text
        except Exception as e:
            print(f"AI 분석 오류: {e}")
            return ""

    async def generate_simulation_comment(
        self,
        simulation: CostSimulationResult
    ) -> str:
        """시뮬레이션 결과 해석"""
        client = self._create_client()
        if not client:
            return ""

        try:
            impact_summary = [
                f"- {항목}: {금액:+,.0f}원"
                for 항목, 금액 in simulation.원가항목별_영향.items()
                if 금액 != 0
            ]

            prompt = f"""당신은 원가 분석 전문가입니다. 아래 원가 변동 시뮬레이션 결과를 해석해주세요.

[배경: 이 회사는 컬러강판 제조업체로, 냉연강판 가격이 원가에 가장 큰 영향을 미칩니다. 이 맥락을 참고하되, 응답에서 "컬러강판 제조업"이라는 표현은 사용하지 마세요.]

## 시뮬레이션 결과
- 기준 영업이익: {simulation.기준_영업이익:,.0f}원
- 예상 영업이익: {simulation.예상_영업이익:,.0f}원
- 영업이익 변동: {simulation.영업이익_변동액:+,.0f}원 ({simulation.영업이익_변동률:+.1f}%)

## 원가 항목별 영향
{chr(10).join(impact_summary) if impact_summary else "변동 없음"}

## 요청사항
1. 시뮬레이션 결과 해석 (영업이익에 미치는 영향)
2. 가장 영향력이 큰 원가 항목 분석
3. 리스크 관리 제안 (원자재 가격 변동 대응)

한국어로 간결하게 작성해주세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text
        except Exception as e:
            print(f"AI 분석 오류: {e}")
            return ""

    async def generate_budget_comment(
        self,
        comparison: BudgetComparisonResult
    ) -> str:
        """예산 대비 실적 분석 코멘트 생성"""
        client = self._create_client()
        if not client:
            return ""

        try:
            deviation_summary = [
                f"- {item.계정과목}: 예산 {item.기준금액:,.0f}원 vs 실적 {item.비교금액:,.0f}원 ({item.변동률:+.1f}%)"
                for item in comparison.주요이탈항목[:5]
            ]

            prompt = f"""당신은 예산 관리 전문가입니다. 아래 예산 대비 실적 분석 결과를 해석해주세요.

[배경: 이 회사는 컬러강판 제조업체입니다. 이 맥락을 참고하되, 응답에서 "컬러강판 제조업"이라는 표현은 사용하지 마세요.]

## 분석 기간: {comparison.기간}

## 주요 달성률
- 매출액: {comparison.달성률['매출액']}%
- 영업이익: {comparison.달성률['영업이익']}%
- 매출원가: {comparison.달성률['매출원가']}%

## 누계 달성률
- 매출액: {comparison.누계_달성률['매출액']}%
- 영업이익: {comparison.누계_달성률['영업이익']}%

## 주요 이탈 항목 (10% 이상)
{chr(10).join(deviation_summary) if deviation_summary else "주요 이탈 항목 없음"}

## 요청사항
1. 예산 달성 현황 평가
2. 주요 이탈 원인 분석
3. 연말 전망 및 대응 방안

한국어로 간결하게 작성해주세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=700,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text
        except Exception as e:
            print(f"AI 분석 오류: {e}")
            return ""

    async def generate_executive_summary(
        self,
        monthly: Optional[MonthlyComparisonResult] = None,
        product: Optional[ProductCostAnalysisResult] = None,
        budget: Optional[BudgetComparisonResult] = None
    ) -> str:
        """경영진용 종합 요약"""
        client = self._create_client()
        if not client:
            return ""

        try:
            sections = []

            if monthly:
                sections.append(f"""## 월간 실적
- 매출액: {monthly.비교_요약.매출액:,.0f}원 (전월대비 {monthly.변동_요약['매출액']['변동률']:+.1f}%)
- 영업이익: {monthly.비교_요약.영업이익:,.0f}원 (전월대비 {monthly.변동_요약['영업이익']['변동률']:+.1f}%)""")

            if product:
                best = max(product.제품별_분석, key=lambda x: x.매출총이익률)
                sections.append(f"""## 제품별 수익성
- 최고 수익 제품군: {best.제품군} (이익률 {best.매출총이익률:.1f}%)
- 원재료비 비중: {product.원가구성비.get('원재료비', 0)}%""")

            if budget:
                sections.append(f"""## 예산 달성 현황
- 매출 달성률: {budget.달성률['매출액']}%
- 영업이익 달성률: {budget.달성률['영업이익']}%""")

            prompt = f"""당신은 CFO입니다. 아래 데이터를 바탕으로 경영진 브리핑용 1분 요약을 작성해주세요.

[배경: 이 회사는 컬러강판 제조업체입니다. 이 맥락을 참고하되, 응답에서 "컬러강판 제조업"이라는 표현은 사용하지 마세요.]

{chr(10).join(sections)}

## 요청사항
1. 핵심 성과 요약 (3줄 이내)
2. 주요 이슈 및 리스크
3. 이번 달 중점 관리 사항

한국어로 간결하고 임팩트 있게 작성해주세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text
        except Exception as e:
            print(f"AI 분석 오류: {e}")
            return ""


# 싱글톤 인스턴스
ai_analysis_service = AIAnalysisService()
