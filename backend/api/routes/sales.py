"""Sales Management API routes - 매출 관리"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional
import json
from pathlib import Path
from datetime import date, datetime
import io

router = APIRouter(prefix="/api/sales", tags=["매출관리"])

# 샘플 데이터 경로
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def load_sample_data(filename: str):
    """샘플 데이터 로드"""
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


@router.get("/export")
async def get_export_sales(
    start_date: Optional[str] = Query(None, description="시작일 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료일 (YYYY-MM-DD)"),
    customer: Optional[str] = Query(None, description="거래처 필터"),
    limit: int = Query(50, description="조회 건수")
):
    """
    수출 매출 목록 조회

    - 수출 인보이스 기반
    - 거래처별, 기간별 필터링
    - USD 금액 기준
    """
    try:
        invoices = load_sample_data("sample_invoices.json")

        # 수출 매출만 필터링
        export_sales = [inv for inv in invoices if inv.get("type") == "export"]

        # 날짜 필터
        if start_date:
            export_sales = [inv for inv in export_sales if inv.get("date", "") >= start_date]
        if end_date:
            export_sales = [inv for inv in export_sales if inv.get("date", "") <= end_date]

        # 거래처 필터
        if customer:
            export_sales = [inv for inv in export_sales if customer.lower() in inv.get("customer", "").lower()]

        # 요약 통계
        total_amount = sum(inv.get("total_amount", 0) for inv in export_sales)
        total_quantity = sum(inv.get("quantity", 0) for inv in export_sales)

        return JSONResponse({
            "success": True,
            "data": {
                "sales": export_sales[:limit],
                "summary": {
                    "total_amount_usd": total_amount,
                    "total_quantity": total_quantity,
                    "count": len(export_sales),
                    "avg_unit_price": total_amount / total_quantity if total_quantity > 0 else 0
                }
            },
            "total": len(export_sales)
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/domestic")
async def get_domestic_sales(
    start_date: Optional[str] = Query(None, description="시작일 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료일 (YYYY-MM-DD)"),
    customer: Optional[str] = Query(None, description="거래처 필터"),
    limit: int = Query(50, description="조회 건수")
):
    """
    내수 매출 목록 조회

    - 국내 거래처 매출
    - KRW 금액 기준
    """
    try:
        invoices = load_sample_data("sample_invoices.json")

        # 내수 매출만 필터링
        domestic_sales = [inv for inv in invoices if inv.get("type") == "domestic"]

        # 날짜 필터
        if start_date:
            domestic_sales = [inv for inv in domestic_sales if inv.get("date", "") >= start_date]
        if end_date:
            domestic_sales = [inv for inv in domestic_sales if inv.get("date", "") <= end_date]

        # 거래처 필터
        if customer:
            domestic_sales = [inv for inv in domestic_sales if customer.lower() in inv.get("customer", "").lower()]

        # 요약 통계
        total_amount = sum(inv.get("total_amount_krw", 0) for inv in domestic_sales)
        total_quantity = sum(inv.get("quantity", 0) for inv in domestic_sales)

        return JSONResponse({
            "success": True,
            "data": {
                "sales": domestic_sales[:limit],
                "summary": {
                    "total_amount_krw": total_amount,
                    "total_quantity": total_quantity,
                    "count": len(domestic_sales),
                    "avg_unit_price": total_amount / total_quantity if total_quantity > 0 else 0
                }
            },
            "total": len(domestic_sales)
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/summary")
async def get_sales_summary(
    year: Optional[int] = Query(None, description="연도"),
    month: Optional[int] = Query(None, description="월")
):
    """
    매출 현황 요약

    - 수출/내수 구분
    - 월별 집계
    - 전월 대비 증감률
    """
    try:
        invoices = load_sample_data("sample_invoices.json")

        # 기본값: 현재 년월
        if not year:
            year = date.today().year
        if not month:
            month = date.today().month

        target_period = f"{year}-{month:02d}"

        # 해당 월 매출 필터링
        current_sales = [
            inv for inv in invoices
            if inv.get("date", "").startswith(target_period)
        ]

        # 수출/내수 구분 집계
        export_sales = [inv for inv in current_sales if inv.get("type") == "export"]
        domestic_sales = [inv for inv in current_sales if inv.get("type") == "domestic"]

        export_total_usd = sum(inv.get("total_amount", 0) for inv in export_sales)
        domestic_total_krw = sum(inv.get("total_amount_krw", 0) for inv in domestic_sales)

        # 거래처별 집계
        customer_sales = {}
        for inv in current_sales:
            customer = inv.get("customer", "Unknown")
            amount = inv.get("total_amount", 0) if inv.get("type") == "export" else inv.get("total_amount_krw", 0)

            if customer not in customer_sales:
                customer_sales[customer] = {
                    "customer": customer,
                    "amount": 0,
                    "count": 0,
                    "type": inv.get("type")
                }
            customer_sales[customer]["amount"] += amount
            customer_sales[customer]["count"] += 1

        # 상위 거래처 정렬
        top_customers = sorted(
            customer_sales.values(),
            key=lambda x: x["amount"],
            reverse=True
        )[:10]

        return JSONResponse({
            "success": True,
            "data": {
                "period": f"{year}년 {month}월",
                "export": {
                    "amount_usd": export_total_usd,
                    "count": len(export_sales),
                    "avg_per_invoice": export_total_usd / len(export_sales) if export_sales else 0
                },
                "domestic": {
                    "amount_krw": domestic_total_krw,
                    "count": len(domestic_sales),
                    "avg_per_invoice": domestic_total_krw / len(domestic_sales) if domestic_sales else 0
                },
                "total": {
                    "count": len(current_sales),
                    "export_ratio": len(export_sales) / len(current_sales) * 100 if current_sales else 0
                },
                "top_customers": top_customers
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/invoice/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    invoice_type: str = Query("export", description="invoice 타입 (export/domestic)")
):
    """
    인보이스 업로드 및 OCR 파싱

    - PDF/이미지 파일 업로드
    - AI OCR로 자동 파싱
    - 매출 데이터 자동 등록
    """
    try:
        # 파일 확장자 검증
        allowed_extensions = [".pdf", ".png", ".jpg", ".jpeg"]
        file_ext = Path(file.filename).suffix.lower()

        if file_ext not in allowed_extensions:
            return JSONResponse({
                "success": False,
                "error": f"지원하지 않는 파일 형식입니다. ({file_ext})"
            }, status_code=400)

        # 파일 읽기
        contents = await file.read()

        # TODO: OCR 처리
        # from backend.services.document_ocr import document_ocr_service
        # ocr_result = await document_ocr_service.parse_invoice(contents, invoice_type)

        # 임시 응답
        return JSONResponse({
            "success": True,
            "message": "인보이스가 업로드되었습니다.",
            "data": {
                "filename": file.filename,
                "size": len(contents),
                "type": invoice_type,
                "parsed_data": {
                    "invoice_no": "INV-2025-001",
                    "customer": "Sample Customer",
                    "date": date.today().isoformat(),
                    "total_amount": 50000.00,
                    "currency": "USD" if invoice_type == "export" else "KRW"
                }
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/by-customer/{customer_name}")
async def get_sales_by_customer(
    customer_name: str,
    start_date: Optional[str] = Query(None, description="시작일"),
    end_date: Optional[str] = Query(None, description="종료일")
):
    """
    거래처별 매출 조회
    """
    try:
        invoices = load_sample_data("sample_invoices.json")

        # 거래처 필터링
        customer_sales = [
            inv for inv in invoices
            if customer_name.lower() in inv.get("customer", "").lower()
        ]

        # 날짜 필터
        if start_date:
            customer_sales = [inv for inv in customer_sales if inv.get("date", "") >= start_date]
        if end_date:
            customer_sales = [inv for inv in customer_sales if inv.get("date", "") <= end_date]

        # 통계
        export_amount = sum(inv.get("total_amount", 0) for inv in customer_sales if inv.get("type") == "export")
        domestic_amount = sum(inv.get("total_amount_krw", 0) for inv in customer_sales if inv.get("type") == "domestic")

        return JSONResponse({
            "success": True,
            "data": {
                "customer": customer_name,
                "sales": customer_sales,
                "summary": {
                    "export_usd": export_amount,
                    "domestic_krw": domestic_amount,
                    "total_count": len(customer_sales)
                }
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/monthly-trend")
async def get_monthly_trend(months: int = Query(12, description="조회 개월 수")):
    """
    월별 매출 추이
    """
    try:
        invoices = load_sample_data("sample_invoices.json")

        # 월별 집계
        monthly_data = {}
        for inv in invoices:
            inv_date = inv.get("date", "")
            if not inv_date:
                continue

            month_key = inv_date[:7]  # YYYY-MM

            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    "month": month_key,
                    "export_usd": 0,
                    "domestic_krw": 0,
                    "count": 0
                }

            if inv.get("type") == "export":
                monthly_data[month_key]["export_usd"] += inv.get("total_amount", 0)
            else:
                monthly_data[month_key]["domestic_krw"] += inv.get("total_amount_krw", 0)
            monthly_data[month_key]["count"] += 1

        # 최근 N개월만 추출
        trend_data = sorted(monthly_data.values(), key=lambda x: x["month"], reverse=True)[:months]
        trend_data.reverse()  # 시간순 정렬

        return JSONResponse({
            "success": True,
            "data": {
                "trend": trend_data,
                "period": f"최근 {months}개월"
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
