"""Analysis API routes"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional

from backend.models.schemas import (
    AnalysisResponse, MonthlyComparisonResult, ProductCostAnalysisResult
)
from backend.services.monthly_analysis import monthly_analysis_service
from backend.services.product_cost import product_cost_service
from backend.services.ai_analysis import ai_analysis_service
from backend.api.routes.data import get_current_data

router = APIRouter(prefix="/api/analysis", tags=["분석"])


@router.post("/monthly", response_model=AnalysisResponse)
async def analyze_monthly(
    기준월: Optional[str] = Query(None, description="비교 기준월 (예: '2025년 1월')"),
    비교월: Optional[str] = Query(None, description="비교 대상월 (예: '2025년 2월')"),
    include_ai: bool = Query(True, description="AI 분석 코멘트 포함 여부")
):
    """
    월간 손익 비교 분석

    두 기간의 손익을 비교 분석합니다.
    기준월/비교월을 지정하지 않으면 가장 최근 두 기간을 자동으로 비교합니다.
    """
    try:
        data = get_current_data()

        # 1개 기간만 있는 경우 단일 기간 분석
        if len(data.periods) == 1:
            single_period = data.periods[0]
            single_result = monthly_analysis_service.analyze_single_period(data, single_period)

            if include_ai:
                try:
                    ai_comment = await ai_analysis_service.generate_single_period_comment(single_result)
                    single_result['ai_comment'] = ai_comment
                except Exception as e:
                    single_result['ai_comment'] = f"AI 분석 생성 실패: {str(e)}"

            return AnalysisResponse(success=True, data=single_result)

        # 기간 자동 설정
        if not 기준월 or not 비교월:
            기준월 = data.periods[-2]
            비교월 = data.periods[-1]

        # 기간 검증
        if 기준월 not in data.periods or 비교월 not in data.periods:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 기간입니다. 사용 가능: {data.periods}"
            )

        # 분석 수행
        result = monthly_analysis_service.compare_periods(data, 기준월, 비교월)

        # AI 코멘트 추가
        if include_ai:
            try:
                ai_comment = await ai_analysis_service.generate_monthly_comment(result)
                result.ai_comment = ai_comment
            except Exception as e:
                result.ai_comment = f"AI 분석 생성 실패: {str(e)}"

        return AnalysisResponse(success=True, data=result.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        return AnalysisResponse(success=False, error=str(e))


@router.post("/product-cost", response_model=AnalysisResponse)
async def analyze_product_cost(
    기간: Optional[str] = Query(None, description="분석 기간 (예: '2025년 2월')"),
    include_ai: bool = Query(True, description="AI 분석 코멘트 포함 여부")
):
    """
    제품별 원가 분석

    제품군(건재용, 가전용, 기타)별 수익성을 분석합니다.
    """
    try:
        data = get_current_data()

        # 기간 자동 설정 (최신)
        if not 기간:
            기간 = data.periods[-1]

        if 기간 not in data.periods:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 기간입니다. 사용 가능: {data.periods}"
            )

        # 분석 수행
        result = product_cost_service.analyze(data, 기간)

        # AI 코멘트 추가
        if include_ai:
            try:
                ai_comment = await ai_analysis_service.generate_product_cost_comment(result)
                result.ai_comment = ai_comment
            except Exception as e:
                result.ai_comment = f"AI 분석 생성 실패: {str(e)}"

        return AnalysisResponse(success=True, data=result.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        return AnalysisResponse(success=False, error=str(e))


@router.post("/monthly/ai-comment")
async def get_monthly_ai_comment(
    기준월: Optional[str] = Query(None, description="비교 기준월"),
    비교월: Optional[str] = Query(None, description="비교 대상월")
):
    """
    월간 분석 AI 코멘트만 별도로 가져오기
    """
    try:
        data = get_current_data()

        if not 기준월 or not 비교월:
            if len(data.periods) < 2:
                raise HTTPException(status_code=400, detail="최소 2개 기간의 데이터가 필요합니다.")
            기준월 = data.periods[-2]
            비교월 = data.periods[-1]

        if 기준월 not in data.periods or 비교월 not in data.periods:
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 기간입니다. 사용 가능: {data.periods}"
            )

        result = monthly_analysis_service.compare_periods(data, 기준월, 비교월)
        ai_comment = await ai_analysis_service.generate_monthly_comment(result)

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


@router.post("/product-cost/ai-comment")
async def get_product_cost_ai_comment(
    기간: Optional[str] = Query(None, description="분석 기간")
):
    """
    제품별 원가 분석 AI 코멘트만 별도로 가져오기
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

        result = product_cost_service.analyze(data, 기간)
        ai_comment = await ai_analysis_service.generate_product_cost_comment(result)

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


@router.get("/trend")
async def get_trend(
    항목: str = Query("영업이익", description="추이 항목 (매출액, 매출원가, 영업이익 등)")
):
    """
    추이 데이터 조회 (차트용)

    지정된 항목의 기간별 추이 데이터를 반환합니다.
    """
    try:
        data = get_current_data()
        trend = monthly_analysis_service.get_trend_data(data, 항목)

        return JSONResponse({
            "success": True,
            "data": {
                "항목": 항목,
                "trend": trend
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.get("/cost-breakdown")
async def get_cost_breakdown(
    기간: Optional[str] = Query(None, description="분석 기간")
):
    """
    원가 구성 비율 조회 (파이차트용)

    원가 항목별 구성 비율을 반환합니다.
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        breakdown = monthly_analysis_service.get_cost_breakdown(data, 기간)

        return JSONResponse({
            "success": True,
            "data": {
                "기간": 기간,
                "breakdown": breakdown
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.get("/contribution-margin")
async def get_contribution_margin(
    기간: Optional[str] = Query(None, description="분석 기간")
):
    """
    공헌이익 분석

    제품군별 공헌이익을 분석합니다.
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        result = product_cost_service.calculate_contribution_margin(data, 기간)

        return JSONResponse({
            "success": True,
            "data": {
                "기간": 기간,
                "contribution_margin": result
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })
