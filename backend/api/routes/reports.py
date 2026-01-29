"""Report generation API routes"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional, List
from urllib.parse import quote
import io

from backend.models.schemas import ReportType, ExportFormat
from backend.services.report_generator import report_generator
from backend.services.monthly_analysis import monthly_analysis_service
from backend.services.product_cost import product_cost_service
from backend.services.cost_simulation import cost_simulation_service
from backend.services.ai_analysis import ai_analysis_service
from backend.api.routes.data import get_current_data

router = APIRouter(prefix="/api/reports", tags=["보고서"])


@router.post("/excel")
async def generate_excel_report(
    기간: Optional[str] = Query(None, description="보고서 기간"),
    include_sections: List[str] = Query(
        ["monthly", "product_cost"],
        description="포함할 섹션"
    ),
    include_ai: bool = Query(True, description="AI 코멘트 포함")
):
    """
    Excel 보고서 생성

    손익 분석 결과를 엑셀 파일로 다운로드합니다.

    포함 가능 섹션:
    - monthly: 월간 분석
    - product_cost: 제품별 원가
    - simulation: 시뮬레이션 결과 (기본값 미포함)
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        # 보고서 데이터 수집
        report_data = {}

        if "monthly" in include_sections and len(data.periods) >= 2:
            기준월 = data.periods[-2]
            비교월 = data.periods[-1] if not 기간 else 기간
            monthly_result = monthly_analysis_service.compare_periods(data, 기준월, 비교월)
            report_data["monthly"] = monthly_result

            if include_ai:
                try:
                    ai_comment = await ai_analysis_service.generate_monthly_comment(monthly_result)
                    report_data["ai_comment"] = ai_comment
                except:
                    pass

        if "product_cost" in include_sections:
            product_result = product_cost_service.analyze(data, 기간)
            report_data["product_cost"] = product_result

        # Excel 생성
        excel_bytes = report_generator.generate_excel_report(report_data)

        # 파일명 생성 (한글 URL 인코딩)
        filename = f"손익분석_{기간.replace(' ', '_')}.xlsx"
        encoded_filename = quote(filename)

        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pdf")
async def generate_pdf_report(
    기간: Optional[str] = Query(None, description="보고서 기간"),
    include_sections: List[str] = Query(
        ["monthly", "product_cost"],
        description="포함할 섹션"
    ),
    include_ai: bool = Query(True, description="AI 코멘트 포함")
):
    """
    PDF 보고서 생성

    손익 분석 결과를 PDF 파일로 다운로드합니다.
    (WeasyPrint 설치 필요)
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        # 보고서 데이터 수집
        report_data = {}

        if "monthly" in include_sections and len(data.periods) >= 2:
            기준월 = data.periods[-2]
            비교월 = data.periods[-1] if not 기간 else 기간
            monthly_result = monthly_analysis_service.compare_periods(data, 기준월, 비교월)
            report_data["monthly"] = monthly_result

            if include_ai:
                try:
                    ai_comment = await ai_analysis_service.generate_monthly_comment(monthly_result)
                    report_data["ai_comment"] = ai_comment
                except:
                    pass

        if "product_cost" in include_sections:
            product_result = product_cost_service.analyze(data, 기간)
            report_data["product_cost"] = product_result

        # PDF 생성
        try:
            pdf_bytes = report_generator.generate_pdf_report(report_data)
        except ImportError:
            return JSONResponse({
                "success": False,
                "error": "PDF 생성을 위해 weasyprint 패키지가 필요합니다. pip install weasyprint"
            }, status_code=500)

        # 파일명 생성 (한글 URL 인코딩)
        filename = f"손익분석_{기간.replace(' ', '_')}.pdf"
        encoded_filename = quote(filename)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview")
async def preview_report(
    기간: Optional[str] = Query(None, description="보고서 기간"),
    include_ai: bool = Query(True, description="AI 코멘트 포함")
):
    """
    보고서 미리보기 (JSON)

    보고서에 포함될 데이터를 JSON 형식으로 미리 확인합니다.
    """
    try:
        data = get_current_data()

        if not 기간:
            기간 = data.periods[-1]

        preview_data = {
            "기간": 기간,
            "periods_available": data.periods,
        }

        # 월간 분석
        if len(data.periods) >= 2:
            기준월 = data.periods[-2]
            monthly = monthly_analysis_service.compare_periods(data, 기준월, 기간)
            preview_data["monthly_summary"] = {
                "매출액": monthly.비교_요약.매출액,
                "영업이익": monthly.비교_요약.영업이익,
                "변동률": {
                    "매출액": monthly.변동_요약["매출액"]["변동률"],
                    "영업이익": monthly.변동_요약["영업이익"]["변동률"]
                }
            }

            if include_ai:
                try:
                    ai_comment = await ai_analysis_service.generate_monthly_comment(monthly)
                    preview_data["ai_comment"] = ai_comment
                except Exception as e:
                    preview_data["ai_comment_error"] = str(e)

        # 제품별 분석
        product = product_cost_service.analyze(data, 기간)
        preview_data["product_summary"] = [
            {
                "제품군": p.제품군,
                "매출액": p.매출액,
                "이익률": p.매출총이익률
            }
            for p in product.제품별_분석
        ]

        return JSONResponse({
            "success": True,
            "data": preview_data
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })
