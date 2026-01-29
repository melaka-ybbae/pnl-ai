"""Budget API routes"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
import pandas as pd
import io

from backend.models.schemas import (
    AnalysisResponse, BudgetData, BudgetItem, BudgetComparisonResult
)
from backend.services.budget_comparison import budget_comparison_service
from backend.services.ai_analysis import ai_analysis_service
from backend.api.routes.data import get_current_data

router = APIRouter(prefix="/api/budget", tags=["예산"])


@router.post("/upload")
async def upload_budget(
    file: UploadFile = File(...),
    year: int = Query(..., description="예산 연도"),
    version: str = Query("기본", description="예산 버전")
):
    """
    예산 데이터 업로드

    예산 엑셀 파일을 업로드합니다.
    필수 컬럼: 분류, 계정과목, 1월~12월
    """
    try:
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="엑셀 파일만 업로드 가능합니다.")

        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        # 필수 컬럼 확인
        required_cols = ['분류', '계정과목']
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"필수 컬럼 '{col}'이 없습니다.")

        # 월별 컬럼 찾기
        month_cols = {}
        for col in df.columns:
            for i in range(1, 13):
                if f'{i}월' in str(col) or col == str(i):
                    month_cols[f'{i}월'] = col
                    break

        if len(month_cols) == 0:
            raise HTTPException(status_code=400, detail="월별 데이터 컬럼을 찾을 수 없습니다.")

        # BudgetData 생성
        items = []
        for _, row in df.iterrows():
            월별금액 = {}
            for month_key, col_name in month_cols.items():
                value = row[col_name]
                월별금액[month_key] = float(value) if pd.notna(value) else 0

            items.append(BudgetItem(
                분류=row['분류'],
                계정과목=row['계정과목'],
                월별금액=월별금액
            ))

        budget_data = BudgetData(연도=year, 버전=version, 항목=items)

        # 저장
        budget_id = budget_comparison_service.save_budget(budget_data)

        return JSONResponse({
            "success": True,
            "message": f"{year}년 예산이 저장되었습니다.",
            "budget_id": budget_id,
            "item_count": len(items)
        })

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/{year}")
async def get_budget(
    year: int,
    version: str = Query("기본", description="예산 버전")
):
    """
    예산 데이터 조회

    저장된 예산 데이터를 조회합니다.
    """
    try:
        budget = budget_comparison_service.get_budget(year, version)

        if not budget:
            raise HTTPException(status_code=404, detail=f"{year}년 예산 데이터가 없습니다.")

        return JSONResponse({
            "success": True,
            "data": budget.model_dump()
        })

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.get("/list/all")
async def list_budgets(
    year: Optional[int] = Query(None, description="연도 필터")
):
    """
    예산 목록 조회

    저장된 모든 예산 목록을 조회합니다.
    """
    try:
        budgets = budget_comparison_service.list_budgets(year)

        return JSONResponse({
            "success": True,
            "data": budgets
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.post("/comparison/ai-comment")
async def get_budget_ai_comment(
    year: int = Query(..., description="연도"),
    month: int = Query(..., description="월"),
    version: str = Query("기본", description="예산 버전")
):
    """
    예산 대비 실적 AI 코멘트만 별도로 가져오기
    """
    try:
        actual_data = get_current_data()

        result = budget_comparison_service.compare(
            actual_data, year, month, version
        )

        ai_comment = await ai_analysis_service.generate_budget_comment(result)

        return JSONResponse({
            "success": True,
            "data": {"ai_comment": ai_comment}
        })

    except ValueError as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.post("/comparison", response_model=AnalysisResponse)
async def compare_budget(
    year: int = Query(..., description="연도"),
    month: int = Query(..., description="월"),
    version: str = Query("기본", description="예산 버전"),
    include_ai: bool = Query(True, description="AI 분석 포함 여부")
):
    """
    예산 대비 실적 비교

    예산과 실적을 비교 분석합니다.
    """
    try:
        actual_data = get_current_data()

        result = budget_comparison_service.compare(
            actual_data, year, month, version
        )

        # AI 코멘트 추가
        if include_ai:
            try:
                ai_comment = await ai_analysis_service.generate_budget_comment(result)
                result.ai_comment = ai_comment
            except Exception as e:
                result.ai_comment = f"AI 분석 생성 실패: {str(e)}"

        return AnalysisResponse(success=True, data=result.model_dump())

    except ValueError as e:
        return AnalysisResponse(success=False, error=str(e))
    except Exception as e:
        return AnalysisResponse(success=False, error=str(e))
