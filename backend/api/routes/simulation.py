"""Simulation API routes"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List

from backend.models.schemas import (
    AnalysisResponse, CostSimulationInput, CostSimulationResult, SensitivityResult
)
from backend.services.cost_simulation import cost_simulation_service
from backend.services.ai_analysis import ai_analysis_service
from backend.api.routes.data import get_current_data

router = APIRouter(prefix="/api/simulation", tags=["시뮬레이션"])


@router.post("/cost", response_model=AnalysisResponse)
async def simulate_cost(
    input_data: CostSimulationInput,
    기간: Optional[str] = Query(None, description="시뮬레이션 기준 기간"),
    include_ai: bool = Query(True, description="AI 해석 포함 여부")
):
    """
    원가 변동 시뮬레이션

    원자재/에너지 가격 변동에 따른 영업이익 변화를 시뮬레이션합니다.

    변동률 범위:
    - 냉연강판/도료/아연: -50% ~ +50%
    - 전력비/가스비: -50% ~ +50%
    - 노무비: -30% ~ +30%
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        if 기간 not in data.periods:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 기간입니다. 사용 가능: {data.periods}"
            )

        # 시뮬레이션 실행
        result = cost_simulation_service.simulate(data, 기간, input_data)

        # AI 해석 추가
        if include_ai:
            try:
                ai_comment = await ai_analysis_service.generate_simulation_comment(result)
                result.ai_comment = ai_comment
            except Exception as e:
                result.ai_comment = f"AI 분석 생성 실패: {str(e)}"

        return AnalysisResponse(success=True, data=result.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        return AnalysisResponse(success=False, error=str(e))


@router.post("/cost/ai-comment")
async def get_simulation_ai_comment(
    input_data: CostSimulationInput,
    기간: Optional[str] = Query(None, description="시뮬레이션 기준 기간")
):
    """
    시뮬레이션 AI 코멘트만 별도로 가져오기
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        if 기간 not in data.periods:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 기간입니다. 사용 가능: {data.periods}"
            )

        result = cost_simulation_service.simulate(data, 기간, input_data)
        ai_comment = await ai_analysis_service.generate_simulation_comment(result)

        return JSONResponse({
            "success": True,
            "data": {"ai_comment": ai_comment}
        })

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.get("/sensitivity", response_model=AnalysisResponse)
async def sensitivity_analysis(
    기간: Optional[str] = Query(None, description="분석 기준 기간")
):
    """
    민감도 분석

    각 원가 항목 1% 변동 시 영업이익에 미치는 영향을 분석합니다.
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        result = cost_simulation_service.sensitivity_analysis(data, 기간)

        return AnalysisResponse(
            success=True,
            data={
                "기간": 기간,
                "sensitivity": [r.model_dump() for r in result]
            }
        )

    except Exception as e:
        return AnalysisResponse(success=False, error=str(e))


@router.post("/scenarios")
async def compare_scenarios(
    scenarios: List[dict],
    기간: Optional[str] = Query(None, description="시뮬레이션 기준 기간")
):
    """
    복수 시나리오 비교

    여러 시나리오의 시뮬레이션 결과를 비교합니다.

    예시 입력:
    ```json
    [
        {"name": "낙관적", "input": {"냉연강판_변동률": -10, "도료_변동률": -5}},
        {"name": "비관적", "input": {"냉연강판_변동률": 20, "전력비_변동률": 15}}
    ]
    ```
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        # 시나리오 데이터 변환
        scenario_list = []
        for s in scenarios:
            scenario_list.append({
                "name": s.get("name", "시나리오"),
                "input": CostSimulationInput(**s.get("input", {}))
            })

        results = cost_simulation_service.scenario_comparison(data, 기간, scenario_list)

        return JSONResponse({
            "success": True,
            "data": {
                "기간": 기간,
                "scenarios": {
                    name: result.model_dump()
                    for name, result in results.items()
                }
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.post("/breakeven")
async def breakeven_analysis(
    input_data: CostSimulationInput,
    기간: Optional[str] = Query(None, description="분석 기준 기간")
):
    """
    손익분기점 변동 분석

    원가 변동에 따른 손익분기 매출액 변화를 분석합니다.
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        result = cost_simulation_service.calculate_breakeven_change(data, 기간, input_data)

        return JSONResponse({
            "success": True,
            "data": {
                "기간": 기간,
                "breakeven": result
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.get("/breakeven")
async def get_breakeven_point(기간: Optional[str] = Query(None, description="분석 기준 기간")):
    """
    현재 손익분기점 조회

    - 현재 원가 구조 기준
    - 고정비, 변동비 분석
    - BEP 매출액 계산
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        # 샘플 손익분기점 데이터
        breakeven_data = {
            "period": 기간,
            "fixed_costs": 350000000,  # 고정비
            "variable_cost_ratio": 0.725,  # 변동비율
            "contribution_margin_ratio": 0.275,  # 공헌이익률
            "breakeven_sales": 1272727273,  # 손익분기 매출액
            "current_sales": 2850000000,
            "safety_margin": 1577272727,  # 안전한계
            "safety_margin_ratio": 55.3,  # 안전한계율
            "operating_leverage": 1.81  # 영업레버리지
        }

        return JSONResponse({
            "success": True,
            "data": breakeven_data
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.post("/price")
async def simulate_price_change(
    price_change_percent: float = Query(..., description="판매가 변동률 (%)"),
    기간: Optional[str] = Query(None, description="시뮬레이션 기준 기간")
):
    """
    단가 시뮬레이션

    - 판매가 변동에 따른 이익 영향 분석
    - 수량 변화 가정 가능
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        # 샘플 계산
        current_sales = 2850000000
        current_profit = 285000000
        current_volume = 3000  # 톤

        # 가격 변동 적용
        new_price_per_unit = (current_sales / current_volume) * (1 + price_change_percent / 100)
        new_sales = new_price_per_unit * current_volume

        # 원가는 동일하다고 가정
        cost_amount = current_sales - current_profit
        new_profit = new_sales - cost_amount

        result = {
            "period": 기간,
            "price_change_percent": price_change_percent,
            "current": {
                "sales": current_sales,
                "profit": current_profit,
                "volume": current_volume,
                "price_per_unit": current_sales / current_volume
            },
            "simulated": {
                "sales": new_sales,
                "profit": new_profit,
                "volume": current_volume,
                "price_per_unit": new_price_per_unit
            },
            "impact": {
                "sales_change": new_sales - current_sales,
                "profit_change": new_profit - current_profit,
                "profit_margin": (new_profit / new_sales * 100) if new_sales > 0 else 0
            }
        }

        return JSONResponse({
            "success": True,
            "data": result
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.post("/forex")
async def simulate_forex_change(
    usd_rate: float = Query(..., description="시뮬레이션 USD 환율"),
    기간: Optional[str] = Query(None, description="시뮬레이션 기준 기간")
):
    """
    환율 시뮬레이션

    - 환율 변동에 따른 매출/이익 영향
    - 수출 비중 고려
    """
    try:
        # 샘플 데이터
        export_sales_usd = 1800000  # 수출 매출 (USD)
        current_rate = 1450.0
        current_sales_krw = export_sales_usd * current_rate

        new_sales_krw = export_sales_usd * usd_rate
        sales_diff = new_sales_krw - current_sales_krw

        # 원가는 변동 없다고 가정 (단순화)
        current_profit = current_sales_krw * 0.10  # 10% 이익률 가정
        new_profit = current_profit + sales_diff  # 환율 변동만큼 이익 변동

        result = {
            "export_sales_usd": export_sales_usd,
            "current_rate": current_rate,
            "simulated_rate": usd_rate,
            "rate_change_percent": ((usd_rate - current_rate) / current_rate) * 100,
            "current": {
                "sales_krw": current_sales_krw,
                "profit_krw": current_profit
            },
            "simulated": {
                "sales_krw": new_sales_krw,
                "profit_krw": new_profit
            },
            "impact": {
                "sales_change_krw": sales_diff,
                "profit_change_krw": sales_diff,
                "fx_gain_loss": sales_diff
            }
        }

        return JSONResponse({
            "success": True,
            "data": result
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })
