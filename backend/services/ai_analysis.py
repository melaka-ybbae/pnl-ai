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


    async def generate_dashboard_alerts(
        self,
        context: dict
    ) -> dict:
        """대시보드 AI 알림 생성"""
        client = self._create_client()
        if not client:
            return None

        try:
            import json as json_module
            prompt = f"""당신은 재무 리스크 모니터링 전문가입니다. 아래 데이터를 분석하여 오늘의 주요 알림을 생성해주세요.

[배경: 이 회사는 컬러강판 수출 제조업체로, 해외 바이어와 USD 결제가 주요 매출입니다.]

## 현재 데이터
- 날짜: {context.get('date', 'N/A')}
- 외상매출금(AR) 현황: {json_module.dumps(context.get('ar_data', [])[:5], ensure_ascii=False)}
- 환율 현황: {json_module.dumps(context.get('exchange_rates', []), ensure_ascii=False)}

## 요청사항
아래 JSON 형식으로 알림을 생성해주세요:
{{
  "alerts": [
    {{
      "type": "danger/warning/info/success",
      "category": "채권/환율/원가/리스크/상태",
      "title": "알림 제목 (15자 이내)",
      "message": "상세 설명 (50자 이내)",
      "action": "/receivables 또는 /forex 등 관련 페이지",
      "priority": "high/medium/low"
    }}
  ],
  "summary": "오늘의 재무 상황 요약 (30자 이내)"
}}

주요 체크 포인트:
1. 연체 채권 발생 여부 및 금액
2. 고위험 거래처 존재 여부
3. 환율 급등락 (0.5% 이상)
4. 대규모 미수금 집중 여부

JSON만 출력하고 다른 설명은 하지 마세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text
            try:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                else:
                    json_str = response_text

                result = json_module.loads(json_str.strip())
                from datetime import datetime
                result["generated_at"] = datetime.now().isoformat()
                return result
            except json_module.JSONDecodeError:
                return None

        except Exception as e:
            print(f"AI 대시보드 알림 오류: {e}")
            return None


    async def generate_alert_message(
        self,
        anomaly_type: str,
        item: str,
        threshold: float,
        actual_value: float,
        change_rate: float,
        related_data: dict = None
    ) -> dict:
        """이상 탐지 알림 메시지 생성"""
        client = self._create_client()
        if not client:
            return None

        try:
            import json as json_module
            prompt = f"""당신은 재무 모니터링 시스템입니다.
아래 이상 탐지 데이터를 바탕으로 경고 알림 메시지를 생성하세요.

[탐지된 이상]
- 유형: {anomaly_type}
- 항목: {item}
- 기준값: {threshold}
- 실제값: {actual_value}
- 변동률: {change_rate}%

[관련 데이터]
{json_module.dumps(related_data or {}, ensure_ascii=False, indent=2)}

[알림 메시지 작성]
1. 제목 (한 줄)
2. 상황 요약 (2-3줄)
3. 영향 분석 (예상되는 영향)
4. 권장 조치 (즉시 필요한 액션)

[출력 형식]
{{
  "title": "알림 제목",
  "severity": "critical/warning/info",
  "summary": "상황 요약",
  "impact": "예상 영향",
  "action_required": ["조치1", "조치2"],
  "related_links": ["관련 메뉴/페이지"]
}}

JSON만 출력하세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text
            try:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                else:
                    json_str = response_text
                return json_module.loads(json_str.strip())
            except json_module.JSONDecodeError:
                return None

        except Exception as e:
            print(f"AI 알림 생성 오류: {e}")
            return None

    async def generate_monthly_report(
        self,
        monthly_data: dict,
        comparison_data: dict = None,
        external_data: dict = None
    ) -> str:
        """월간 경영 보고서 자동 작성"""
        client = self._create_client()
        if not client:
            return ""

        try:
            import json as json_module

            # 데이터 정리
            summary = monthly_data.get('기준_요약', {})
            ratios = monthly_data.get('비율', {})
            items_list = monthly_data.get('항목별_데이터', [])

            # 분류별 그룹화
            items_by_category = {}
            for item in items_list:
                cat = item.get('분류', '기타')
                if cat not in items_by_category:
                    items_by_category[cat] = []
                items_by_category[cat].append(item)

            # 원가 구성 계산
            매출원가 = summary.get('매출원가', 0)
            원재료비 = sum(i.get('금액', 0) for i in items_list if i.get('분류') == '매출원가' and '원재료' in i.get('계정과목', ''))
            노무비 = sum(i.get('금액', 0) for i in items_list if i.get('분류') == '매출원가' and '노무' in i.get('계정과목', ''))
            제조경비 = 매출원가 - 원재료비 - 노무비

            # 전월 비교 데이터 처리
            comparison_text = ""
            if comparison_data and comparison_data.get('변동_요약'):
                변동 = comparison_data.get('변동_요약', {})
                comparison_text = f"""
### 전월 대비 변동
| 항목 | 변동액 | 변동률 |
|------|------|------|
| 매출액 | {변동.get('매출액', {}).get('변동액', 0):,.0f}원 | {변동.get('매출액', {}).get('변동률', 0):.1f}% |
| 영업이익 | {변동.get('영업이익', {}).get('변동액', 0):,.0f}원 | {변동.get('영업이익', {}).get('변동률', 0):.1f}% |
"""

            prompt = f"""당신은 컬러강판 제조업 전문 CFO입니다.
아래 재무 데이터를 분석하여 **월간 경영 보고서**를 작성하세요.

---

## 📊 {monthly_data.get('기준월', '당월')} 재무 현황

### 손익계산서 핵심 지표

| 항목 | 금액 | 매출 대비 |
|------|------|------|
| **매출액** | {summary.get('매출액', 0):,.0f}원 | 100.0% |
| 매출원가 | {summary.get('매출원가', 0):,.0f}원 | {ratios.get('원가율', 0):.1f}% |
| **매출총이익** | {summary.get('매출총이익', 0):,.0f}원 | {ratios.get('매출총이익률', 0):.1f}% |
| 판매관리비 | {summary.get('판매관리비', 0):,.0f}원 | - |
| **영업이익** | {summary.get('영업이익', 0):,.0f}원 | {ratios.get('영업이익률', 0):.1f}% |

### 원가 구성 (매출원가 {매출원가:,.0f}원 내역)

| 항목 | 금액 | 원가 내 비율 |
|------|------|------|
| 원재료비 | {원재료비:,.0f}원 | {(원재료비/매출원가*100) if 매출원가 > 0 else 0:.1f}% |
| 노무비 | {노무비:,.0f}원 | {(노무비/매출원가*100) if 매출원가 > 0 else 0:.1f}% |
| 제조경비 등 | {제조경비:,.0f}원 | {(제조경비/매출원가*100) if 매출원가 > 0 else 0:.1f}% |
{comparison_text}
### 외부 환경
{json_module.dumps(external_data or {}, ensure_ascii=False, indent=2)}

---

## 📝 보고서 작성 요청

**아래 7개 섹션 모두 작성해주세요. 각 섹션별 4-6문장 이상으로 상세히 작성하세요.**

### 1. 📈 경영 실적 요약 (Executive Summary)
- 이번 달 매출액, 영업이익, 원가율 핵심 수치 요약
- 매출총이익률 {ratios.get('매출총이익률', 0):.1f}%, 영업이익률 {ratios.get('영업이익률', 0):.1f}% 평가
- 동종업계(컬러강판 제조업) 평균 대비 성과 분석
- 경영 성과 종합 평가 (우수/보통/개선필요)

### 2. 💰 매출 분석
- 매출액 {summary.get('매출액', 0):,.0f}원의 구성 분석
- 제품군별 매출 추정 (건재용/가전용/기타)
- 수출 vs 내수 비중 추정 및 분석
- 주요 거래처 매출 기여도 추정
- 매출 성장 동력 및 잠재 리스크

### 3. 🏭 원가 구조 분석
- 원가율 {ratios.get('원가율', 0):.1f}%의 적정성 평가
- 원재료비 {(원재료비/매출원가*100) if 매출원가 > 0 else 0:.1f}% 비중 분석 (업계 평균 60-70% 대비)
- 노무비, 제조경비 효율성 분석
- 원가 절감 기회 포인트 3가지 이상 제시

### 4. 📊 수익성 분석
- 매출총이익률, 영업이익률 심층 분석
- 손익분기점 추정 (고정비/변동비 가정)
- 제품군별 수익성 추정
- 수익성 개선을 위한 구체적 방안

### 5. ⚠️ 리스크 요인
- **원자재 리스크**: 냉연강판, 도료 가격 변동 영향
- **환율 리스크**: USD/KRW 변동이 수출 매출에 미치는 영향
- **채권 리스크**: 매출채권 회수 관련 리스크
- **시장 리스크**: 건설/가전 경기 변동 영향
- 각 리스크별 영향도(상/중/하) 및 대응 방안

### 6. 🔮 다음 달 전망
- 예상 매출 및 이익 전망
- 주요 모니터링 지표 3가지
- 계절성/시장 동향 고려 사항
- 기회 요인과 위협 요인

### 7. 💡 경영진 권고사항
- **즉시 실행 (1주 내)**: 긴급 조치 사항 2-3가지
- **단기 (1개월 내)**: 중요 개선 과제 3-4가지
- **중장기 (3-6개월)**: 전략적 검토 사항 2-3가지
- 각 권고사항별 예상 효과 명시

---

**작성 지침**
- 마크다운 형식 사용 (헤더, 볼드, 리스트, 테이블)
- 숫자는 억원/백만원 단위로 가독성 있게 표시
- 긍정적 변화 ▲, 부정적 변화 ▼ 표시
- 구체적인 수치를 인용하며 분석
- 총 분량 A4 2-3페이지 분량으로 상세히 작성"""

            message = client.messages.create(
                model=self.model,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text
        except Exception as e:
            print(f"AI 보고서 생성 오류: {e}")
            return ""

    async def analyze_cost_variance(
        self,
        current_cost: dict,
        simulation_condition: dict,
        simulation_result: dict
    ) -> dict:
        """원가 시뮬레이션 상세 분석"""
        client = self._create_client()
        if not client:
            return None

        try:
            import json as json_module
            prompt = f"""당신은 제조업 원가 분석 전문가입니다.
아래 시뮬레이션 결과를 바탕으로 영향 분석 및 대응 방안을 제시하세요.

[현재 상황]
{json_module.dumps(current_cost, ensure_ascii=False, indent=2)}

[시뮬레이션 조건]
- 변동 항목: {simulation_condition.get('item', 'N/A')}
- 변동률: {simulation_condition.get('change_rate', 0)}%

[시뮬레이션 결과]
{json_module.dumps(simulation_result, ensure_ascii=False, indent=2)}

[분석 요청]
1. 원가율 변동 영향
2. 영업이익률 변동 영향
3. 월 이익 감소/증가 금액
4. 제품별 영향 차이

[대응 방안 제시]
1. 마진 유지를 위한 단가 조정 필요율
2. 원가 절감 가능 항목
3. 대체 원자재 검토 필요성
4. 바이어 협상 전략

[출력 형식]
{{
  "impact_summary": "영향 요약",
  "cost_rate_change": {{ "before": X, "after": Y, "change": Z }},
  "profit_rate_change": {{ "before": X, "after": Y, "change": Z }},
  "monthly_profit_impact": "월 이익 영향 (원)",
  "recommendations": [
    {{
      "action": "조치 내용",
      "expected_effect": "기대 효과",
      "priority": "high/medium/low"
    }}
  ],
  "price_adjustment_needed": "마진 유지를 위한 단가 인상률 (%)"
}}

JSON만 출력하세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text
            try:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                else:
                    json_str = response_text
                return json_module.loads(json_str.strip())
            except json_module.JSONDecodeError:
                return {"raw_response": response_text}

        except Exception as e:
            print(f"AI 원가 분석 오류: {e}")
            return None

    async def review_lc_conditions(
        self,
        lc_conditions: dict,
        invoice_data: dict,
        bl_data: dict,
        packing_list_data: dict = None
    ) -> dict:
        """L/C 조건 검토 (AI)"""
        client = self._create_client()
        if not client:
            return {"success": False, "error": "API key not configured"}

        try:
            import json as json_module
            docs = {
                "invoice": invoice_data,
                "bl": bl_data
            }
            if packing_list_data:
                docs["packing_list"] = packing_list_data

            prompt = f"""당신은 신용장 검토 전문가입니다.
아래 L/C 조건과 선적서류를 비교하여 불일치(Discrepancy) 항목을 찾으세요.

[L/C 조건]
{json_module.dumps(lc_conditions, ensure_ascii=False, indent=2)}

[선적 서류]
{json_module.dumps(docs, ensure_ascii=False, indent=2)}

[검토 항목]
1. 선적 기한 준수 여부
2. 유효기간 내 서류 제시 여부
3. 금액 조건 일치 여부
4. 수량 허용 오차 범위 내 여부
5. 필수 서류 구비 여부
6. 표기 사항 일치 여부

[출력 형식]
{{
  "compliant": true 또는 false,
  "discrepancies": [
    {{
      "item": "불일치 항목",
      "lc_requirement": "L/C 요구사항",
      "actual": "실제 서류 내용",
      "severity": "major/minor",
      "bank_rejection_risk": "high/medium/low"
    }}
  ],
  "recommendations": ["권장사항"],
  "deadline_alert": "기한 관련 알림",
  "overall_risk": "high/medium/low"
}}

JSON만 출력하세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=1200,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text
            try:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                else:
                    json_str = response_text

                result = json_module.loads(json_str.strip())
                return {"success": True, "review": result}
            except json_module.JSONDecodeError:
                return {"success": True, "review": None, "raw_response": response_text}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def generate_single_period_comment(self, data: dict) -> str:
        """단일 기간 분석 코멘트 생성 (상세 버전)"""
        client = self._create_client()
        if not client:
            return ""

        try:
            summary = data.get('기준_요약', {})
            ratios = data.get('비율', {})
            items_list = data.get('항목별_데이터', [])

            # 항목별 데이터 정리 (리스트 형태로 처리)
            # 분류별로 그룹화
            items_by_category = {}
            for item in items_list:
                category = item.get('분류', '기타')
                if category not in items_by_category:
                    items_by_category[category] = []
                items_by_category[category].append(item)

            items_text = ""
            for category, items in items_by_category.items():
                items_text += f"\n**{category}**\n"
                for item in items:
                    items_text += f"  - {item.get('계정과목', '')}: {item.get('금액', 0):,.0f}원\n"

            # 원가 구성비 계산 (매출원가 내 비중)
            매출원가 = summary.get('매출원가', 0)
            원재료비 = 0
            노무비 = 0
            제조경비 = 0

            for item in items_list:
                if item.get('분류') == '매출원가':
                    계정 = item.get('계정과목', '')
                    금액 = item.get('금액', 0)
                    if '원재료' in 계정:
                        원재료비 += 금액
                    elif '노무' in 계정:
                        노무비 += 금액
                    else:
                        제조경비 += 금액

            # 매출원가 대비 비율 (원가 내 구성비)
            원재료비_비율 = (원재료비 / 매출원가 * 100) if 매출원가 > 0 else 0
            노무비_비율 = (노무비 / 매출원가 * 100) if 매출원가 > 0 else 0
            제조경비_비율 = (제조경비 / 매출원가 * 100) if 매출원가 > 0 else 0

            prompt = f"""당신은 컬러강판 제조업 전문 재무 분석가입니다.
아래 손익계산서 데이터를 분석하여 **경영진 브리핑용 상세 분석 보고서**를 작성해주세요.

## {data.get('기준월', '당월')} 손익계산서

### 핵심 지표
| 항목 | 금액 | 매출 대비 비율 |
|------|------|------|
| 매출액 | {summary.get('매출액', 0):,.0f}원 | 100% |
| 매출원가 | {summary.get('매출원가', 0):,.0f}원 | {ratios.get('원가율', 0):.1f}% |
| 매출총이익 | {summary.get('매출총이익', 0):,.0f}원 | {ratios.get('매출총이익률', 0):.1f}% |
| 판매관리비 | {summary.get('판매관리비', 0):,.0f}원 | - |
| 영업이익 | {summary.get('영업이익', 0):,.0f}원 | {ratios.get('영업이익률', 0):.1f}% |

### 원가 구성 (매출원가 {매출원가:,.0f}원 내 비중)
| 항목 | 금액 | 원가 내 비율 |
|------|------|------|
| 원재료비 | {원재료비:,.0f}원 | {원재료비_비율:.1f}% |
| 노무비(직접+간접) | {노무비:,.0f}원 | {노무비_비율:.1f}% |
| 제조경비 등 | {제조경비:,.0f}원 | {제조경비_비율:.1f}% |

### 계정과목별 상세
{items_text}

## 분석 요청

아래 구조로 **상세 분석 보고서**를 작성해주세요:

### 1. 경영 실적 총평 (Executive Summary)
- 매출 및 이익 현황 요약
- 업종 평균 대비 평가 (컬러강판 제조업 기준)
- 핵심 성과 지표 (KPI) 평가

### 2. 매출 분석
- 매출 구성 분석 (제품별, 수출/내수 비중 추정)
- 매출 규모 적정성 평가
- 성장 잠재력 분석

### 3. 원가 구조 분석
- 원재료비, 노무비, 제조경비의 **원가 내 비중** 평가 (위 표 참고)
- 원가율({ratios.get('원가율', 0):.1f}%) 적정성 분석
- 원가 절감 기회 포인트

### 4. 수익성 분석
- 매출총이익률({ratios.get('매출총이익률', 0):.1f}%), 영업이익률({ratios.get('영업이익률', 0):.1f}%) 평가
- 판관비 효율성
- 손익분기점 추정

### 5. 리스크 요인
- 원자재 가격 변동 리스크
- 환율 리스크 (수출 비중 가정)
- 계절성/시장 리스크

### 6. 개선 권고사항
- 단기 (1-3개월): 즉시 실행 가능한 개선안
- 중기 (3-6개월): 구조적 개선 방안
- 장기 (6개월+): 전략적 방향성

마크다운 형식으로 각 섹션별 **2-4문장**으로 작성하되, 구체적인 수치와 비율을 인용해주세요.
총 분량은 A4 1페이지 내외로 작성해주세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text

        except Exception as e:
            return f"AI 분석 생성 실패: {str(e)}"


# 싱글톤 인스턴스
ai_analysis_service = AIAnalysisService()

# ai_analyzer alias for backward compatibility
ai_analyzer = ai_analysis_service
