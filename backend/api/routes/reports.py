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
            # 2개 이상 기간: 비교 분석
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
        elif len(data.periods) == 1:
            # 1개 기간: 단일 분석
            single_result = monthly_analysis_service.analyze_single_period(data, 기간)
            preview_data["monthly_summary"] = {
                "매출액": single_result['기준_요약']['매출액'],
                "영업이익": single_result['기준_요약']['영업이익'],
                "변동률": None  # 단일 기간은 변동률 없음
            }

            if include_ai:
                try:
                    ai_comment = await ai_analysis_service.generate_single_period_comment(single_result)
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


@router.post("/daily")
async def generate_daily_cash_report(report_date: str = Query(..., description="보고서 날짜 (YYYY-MM-DD)")):
    """
    일일 자금일보 생성

    - 당일 입출금 내역
    - 잔액 현황
    - 향후 지급 예정
    """
    try:
        from datetime import datetime

        # 샘플 데이터
        report = {
            "report_date": report_date,
            "generated_at": datetime.now().isoformat(),
            "opening_balance": {
                "krw": 850000000,
                "usd": 650000
            },
            "inflows": {
                "customer_payments": [
                    {"customer": "ABC Corp", "amount_usd": 85000, "note": "Invoice INV-2025-001"},
                    {"customer": "XYZ Ltd", "amount_krw": 45000000, "note": "내수 매출"}
                ],
                "total_krw": 45000000,
                "total_usd": 85000
            },
            "outflows": {
                "supplier_payments": [
                    {"supplier": "POSCO", "amount_krw": 30000000, "note": "원자재 구매"},
                    {"supplier": "KCC", "amount_krw": 5000000, "note": "도료 구매"}
                ],
                "other_expenses": [
                    {"description": "전력비", "amount_krw": 8500000}
                ],
                "total_krw": 43500000,
                "total_usd": 0
            },
            "closing_balance": {
                "krw": 851500000,
                "usd": 735000
            },
            "upcoming_payments": [
                {"date": "2025-02-05", "supplier": "현대제철", "amount_krw": 38250000},
                {"date": "2025-02-10", "customer": "DEF Inc", "amount_usd": 95000, "type": "receivable"}
            ]
        }

        return JSONResponse({
            "success": True,
            "data": report
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.post("/weekly")
async def generate_weekly_report(
    year: int = Query(..., description="연도"),
    week: int = Query(..., description="주차 (1-52)")
):
    """
    주간 리포트 생성

    - 주간 매출/원가 요약
    - 주요 거래 내역
    - 이슈 및 알림
    """
    try:
        report = {
            "period": f"{year}년 {week}주차",
            "date_range": {
                "start": f"{year}-01-{(week-1)*7 + 1:02d}",
                "end": f"{year}-01-{week*7:02d}"
            },
            "sales_summary": {
                "total_sales_krw": 685000000,
                "export_sales_usd": 425000,
                "domestic_sales_krw": 68000000,
                "vs_previous_week": 5.2
            },
            "cost_summary": {
                "raw_materials": 485000000,
                "labor": 85000000,
                "overhead": 65000000
            },
            "key_transactions": [
                {"date": "2025-01-27", "type": "sale", "customer": "ABC Corp", "amount_usd": 125000},
                {"date": "2025-01-28", "type": "purchase", "supplier": "POSCO", "amount_krw": 42500000}
            ],
            "issues": [
                {"severity": "high", "issue": "공급업체 KCC 대금 연체 중", "amount_krw": 5600000},
                {"severity": "medium", "issue": "환율 변동 주의 필요", "comment": "USD 0.8% 상승"}
            ],
            "action_items": [
                "KCC 연체 대금 즉시 지급",
                "다음 주 선적 준비 (BL-MSKU7890123)",
                "원자재 재고 확인 필요"
            ]
        }

        return JSONResponse({
            "success": True,
            "data": report
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.post("/monthly")
async def generate_monthly_management_report(
    year: int = Query(..., description="연도"),
    month: int = Query(..., description="월"),
    use_ai: bool = Query(True, description="AI 보고서 생성 사용")
):
    """
    월간 경영 보고서 생성

    - 손익 분석
    - 전월 대비 증감
    - AI 인사이트
    - 다음 달 전망
    """
    try:
        period = f"{year}년 {month}월"
        data = get_current_data()

        # 실제 데이터로 월간 분석 수행
        monthly_data = {}
        comparison_data = {}

        # 해당 기간 데이터 찾기 (두 가지 형식 모두 지원: "2025-01" 또는 "2025년 1월")
        target_period_dash = f"{year}-{month:02d}"  # "2025-01" 형식
        target_period_korean = f"{year}년 {month}월"  # "2025년 1월" 형식

        # 실제 데이터에 있는 period 찾기
        target_period = None
        if target_period_dash in data.periods:
            target_period = target_period_dash
        elif target_period_korean in data.periods:
            target_period = target_period_korean
        elif len(data.periods) > 0:
            # 해당 월이 없으면 가장 최근 데이터 사용
            target_period = data.periods[-1]

        if target_period:
            # 월간 분석 데이터 구성
            period_idx = data.periods.index(target_period)
            monthly_result = monthly_analysis_service.analyze_single_period(data, target_period)
            monthly_data = monthly_result

            # 전월 데이터가 있으면 비교 분석
            if period_idx > 0:
                prev_period = data.periods[period_idx - 1]
                comparison_result = monthly_analysis_service.compare_periods(data, prev_period, target_period)
                comparison_data = {
                    "기준월": prev_period,
                    "비교월": target_period,
                    "변동_요약": comparison_result.변동_요약
                }

        # AI 보고서 생성
        ai_report = ""
        if use_ai:
            try:
                ai_report = await ai_analysis_service.generate_monthly_report(
                    monthly_data=monthly_data,
                    comparison_data=comparison_data,
                    external_data={
                        "환율": "USD/KRW 1,450원 (전월 대비 +15원)",
                        "원자재": "냉연강판 톤당 85만원 (전월 대비 +3%)"
                    }
                )
            except Exception as e:
                ai_report = f"AI 보고서 생성 오류: {str(e)}"

        # 기본 데이터 구성 (AI 보고서와 함께 반환)
        report = {
            "period": period,
            "generated_at": __import__('datetime').datetime.now().isoformat(),
            "executive_summary": monthly_data.get('기준_요약', {
                "매출액": 0,
                "영업이익": 0,
                "영업이익률": 0
            }),
            "comparison": comparison_data,
            "ai_report": ai_report,  # AI가 작성한 상세 보고서
            "ai_enabled": bool(ai_report)
        }

        return JSONResponse({
            "success": True,
            "data": report
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        })


@router.get("/download/{report_id}")
async def download_report(report_id: str):
    """
    생성된 보고서 다운로드

    - 보고서 ID로 파일 조회
    - PDF 또는 Excel 반환
    """
    try:
        # TODO: 실제 파일 시스템이나 DB에서 조회
        # 임시로 샘플 응답

        return JSONResponse({
            "success": False,
            "error": "보고서를 찾을 수 없습니다.",
            "message": f"Report ID: {report_id} - 실제 구현 시 파일 스토리지에서 조회합니다."
        }, status_code=404)

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
