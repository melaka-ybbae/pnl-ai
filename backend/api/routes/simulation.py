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
