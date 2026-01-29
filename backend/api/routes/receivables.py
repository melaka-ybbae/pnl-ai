"""Account Receivables (매출채권) API routes"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
import json
from pathlib import Path
from datetime import date, datetime

from backend.services.document_ocr import document_ocr_service

router = APIRouter(prefix="/api/receivables", tags=["채권관리"])

# 샘플 데이터 경로
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def load_sample_ar():
    """샘플 AR 데이터 로드"""
    ar_file = DATA_DIR / "sample_ar.json"
    if ar_file.exists():
        with open(ar_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


@router.get("/list")
async def list_receivables(
    status: Optional[str] = Query(None, description="상태 필터 (pending/partial/paid/overdue)"),
    customer: Optional[str] = Query(None, description="거래처 필터"),
    limit: int = Query(50, description="조회 건수")
):
    """
    매출채권 목록 조회
    """
    try:
        ar_data = load_sample_ar()

        # 필터링
        if status:
            ar_data = [ar for ar in ar_data if ar.get("status") == status]
        if customer:
            ar_data = [ar for ar in ar_data if customer.lower() in ar.get("customer", "").lower()]

        return JSONResponse({
            "success": True,
            "data": ar_data[:limit],
            "total": len(ar_data)
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/summary")
async def get_ar_summary():
    """
    매출채권 요약 정보
    """
    try:
        ar_data = load_sample_ar()

        total_usd = sum(ar.get("amount_usd", 0) for ar in ar_data if not ar.get("paid", False))
        total_krw = sum(ar.get("amount_krw", 0) for ar in ar_data if not ar.get("paid", False))
        overdue_usd = sum(ar.get("amount_usd", 0) for ar in ar_data if ar.get("days_overdue", 0) > 0)

        # 연령분석
        current = sum(ar.get("amount_usd", 0) for ar in ar_data if ar.get("days_overdue", 0) == 0 and not ar.get("paid", False))
        days_30 = sum(ar.get("amount_usd", 0) for ar in ar_data if 0 < ar.get("days_overdue", 0) <= 30)
        days_60 = sum(ar.get("amount_usd", 0) for ar in ar_data if 30 < ar.get("days_overdue", 0) <= 60)
        days_90_plus = sum(ar.get("amount_usd", 0) for ar in ar_data if ar.get("days_overdue", 0) > 60)

        return JSONResponse({
            "success": True,
            "data": {
                "total_outstanding_usd": total_usd,
                "total_outstanding_krw": total_krw,
                "overdue_amount_usd": overdue_usd,
                "overdue_ratio": round(overdue_usd / total_usd * 100, 1) if total_usd > 0 else 0,
                "aging": {
                    "current": current,
                    "30_days": days_30,
                    "60_days": days_60,
                    "90_days_plus": days_90_plus
                },
                "count": {
                    "total": len([ar for ar in ar_data if not ar.get("paid", False)]),
                    "overdue": len([ar for ar in ar_data if ar.get("days_overdue", 0) > 0])
                }
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/aging")
async def get_aging_analysis():
    """
    연령분석 상세
    """
    try:
        ar_data = load_sample_ar()

        # 고객별 연령분석
        customer_aging = {}
        for ar in ar_data:
            if ar.get("paid", False):
                continue

            customer = ar.get("customer", "Unknown")
            if customer not in customer_aging:
                customer_aging[customer] = {
                    "customer": customer,
                    "current": 0,
                    "30_days": 0,
                    "60_days": 0,
                    "90_days_plus": 0,
                    "total": 0
                }

            amount = ar.get("amount_usd", 0)
            days = ar.get("days_overdue", 0)

            customer_aging[customer]["total"] += amount
            if days == 0:
                customer_aging[customer]["current"] += amount
            elif days <= 30:
                customer_aging[customer]["30_days"] += amount
            elif days <= 60:
                customer_aging[customer]["60_days"] += amount
            else:
                customer_aging[customer]["90_days_plus"] += amount

        return JSONResponse({
            "success": True,
            "data": list(customer_aging.values())
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/risk-analysis")
async def get_risk_analysis():
    """
    [AI] 채권 리스크 분석
    """
    try:
        ar_data = load_sample_ar()

        # AI 분석 호출
        result = await document_ocr_service.analyze_ar_risk(ar_data)

        return JSONResponse(result)

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/high-risk")
async def get_high_risk_customers():
    """
    고위험 거래처 목록
    """
    try:
        ar_data = load_sample_ar()

        # 고위험 기준: 60일 이상 연체 또는 미수금 $300,000 이상
        high_risk = []
        for ar in ar_data:
            if ar.get("days_overdue", 0) >= 60 or ar.get("risk_level") == "high":
                high_risk.append({
                    "customer": ar.get("customer"),
                    "invoice_no": ar.get("invoice_no"),
                    "amount_usd": ar.get("amount_usd"),
                    "days_overdue": ar.get("days_overdue"),
                    "risk_level": ar.get("risk_level", "unknown"),
                    "due_date": ar.get("due_date")
                })

        return JSONResponse({
            "success": True,
            "data": high_risk,
            "count": len(high_risk)
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/record-payment")
async def record_payment(
    invoice_no: str,
    amount_usd: float,
    payment_date: str,
    exchange_rate: Optional[float] = None
):
    """
    입금 등록
    """
    try:
        # TODO: DB 업데이트 로직
        return JSONResponse({
            "success": True,
            "message": f"입금이 등록되었습니다. ({invoice_no}: ${amount_usd:,.2f})",
            "data": {
                "invoice_no": invoice_no,
                "amount_usd": amount_usd,
                "payment_date": payment_date,
                "exchange_rate": exchange_rate
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


# ============================================
# AP (Account Payables) - 매입채무 관리
# ============================================

def load_sample_ap():
    """샘플 AP 데이터 로드"""
    # 샘플 매입채무 데이터
    return [
        {
            "id": "AP-001",
            "purchase_order": "PO-2025-001",
            "supplier": "POSCO",
            "supplier_type": "원자재",
            "invoice_date": "2025-01-15",
            "due_date": "2025-03-16",
            "amount_krw": 42500000,
            "amount_usd": 0,
            "currency": "KRW",
            "status": "pending",
            "days_until_due": 15,
            "payment_terms": "Net 60",
            "material": "냉연강판"
        },
        {
            "id": "AP-002",
            "purchase_order": "PO-2025-002",
            "supplier": "현대제철",
            "supplier_type": "원자재",
            "invoice_date": "2025-01-20",
            "due_date": "2025-03-06",
            "amount_krw": 38250000,
            "amount_usd": 0,
            "currency": "KRW",
            "status": "pending",
            "days_until_due": 5,
            "payment_terms": "Net 45",
            "material": "아연도금강판"
        },
        {
            "id": "AP-003",
            "purchase_order": "PO-2025-003",
            "supplier": "KCC",
            "supplier_type": "부자재",
            "invoice_date": "2025-01-10",
            "due_date": "2025-02-09",
            "amount_krw": 5600000,
            "amount_usd": 0,
            "currency": "KRW",
            "status": "overdue",
            "days_until_due": -20,
            "payment_terms": "Net 30",
            "material": "도료"
        }
    ]


@router.get("/payables/list")
async def list_payables(
    status: Optional[str] = Query(None, description="상태 필터 (pending/paid/overdue)"),
    supplier: Optional[str] = Query(None, description="공급업체 필터"),
    limit: int = Query(50, description="조회 건수")
):
    """
    매입채무 목록 조회

    - 공급업체별 현황
    - 지급 예정일 기준 정렬
    """
    try:
        ap_data = load_sample_ap()

        # 필터링
        if status:
            ap_data = [ap for ap in ap_data if ap.get("status") == status]
        if supplier:
            ap_data = [ap for ap in ap_data if supplier.lower() in ap.get("supplier", "").lower()]

        # 지급 예정일 순 정렬
        ap_data.sort(key=lambda x: x.get("due_date", ""))

        return JSONResponse({
            "success": True,
            "data": ap_data[:limit],
            "total": len(ap_data)
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/payables/summary")
async def get_ap_summary():
    """
    매입채무 요약 정보

    - 총 미지급 금액
    - 이번 주/다음 주 지급 예정
    - 연체 현황
    """
    try:
        ap_data = load_sample_ap()

        total_krw = sum(ap.get("amount_krw", 0) for ap in ap_data if ap.get("status") != "paid")
        total_usd = sum(ap.get("amount_usd", 0) for ap in ap_data if ap.get("status") != "paid")

        # 이번 주 지급 예정 (7일 이내)
        this_week = sum(
            ap.get("amount_krw", 0) for ap in ap_data
            if 0 <= ap.get("days_until_due", 999) <= 7 and ap.get("status") != "paid"
        )

        # 다음 주 지급 예정 (8-14일)
        next_week = sum(
            ap.get("amount_krw", 0) for ap in ap_data
            if 7 < ap.get("days_until_due", 999) <= 14 and ap.get("status") != "paid"
        )

        # 연체
        overdue = sum(
            ap.get("amount_krw", 0) for ap in ap_data
            if ap.get("days_until_due", 0) < 0
        )

        return JSONResponse({
            "success": True,
            "data": {
                "total_outstanding_krw": total_krw,
                "total_outstanding_usd": total_usd,
                "payment_schedule": {
                    "this_week": this_week,
                    "next_week": next_week,
                    "overdue": overdue
                },
                "count": {
                    "total": len([ap for ap in ap_data if ap.get("status") != "paid"]),
                    "overdue": len([ap for ap in ap_data if ap.get("days_until_due", 0) < 0])
                }
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/payables/schedule")
async def get_payment_schedule(days: int = Query(30, description="조회 기간 (일)")):
    """
    지급 스케줄 조회

    - 일별 지급 예정 금액
    - 현금 흐름 계획
    """
    try:
        ap_data = load_sample_ap()

        # 기간 내 지급 예정 항목
        scheduled = [
            ap for ap in ap_data
            if 0 <= ap.get("days_until_due", 999) <= days and ap.get("status") != "paid"
        ]

        # 날짜별 그룹핑
        schedule_by_date = {}
        for ap in scheduled:
            due_date = ap.get("due_date")
            if due_date not in schedule_by_date:
                schedule_by_date[due_date] = {
                    "date": due_date,
                    "amount_krw": 0,
                    "amount_usd": 0,
                    "items": []
                }
            schedule_by_date[due_date]["amount_krw"] += ap.get("amount_krw", 0)
            schedule_by_date[due_date]["amount_usd"] += ap.get("amount_usd", 0)
            schedule_by_date[due_date]["items"].append({
                "supplier": ap.get("supplier"),
                "amount": ap.get("amount_krw", 0) or ap.get("amount_usd", 0),
                "currency": ap.get("currency"),
                "material": ap.get("material")
            })

        # 날짜순 정렬
        schedule = sorted(schedule_by_date.values(), key=lambda x: x["date"])

        return JSONResponse({
            "success": True,
            "data": {
                "period": f"향후 {days}일",
                "schedule": schedule,
                "total_scheduled_krw": sum(s["amount_krw"] for s in schedule),
                "total_scheduled_usd": sum(s["amount_usd"] for s in schedule)
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/payables/record-payment")
async def record_ap_payment(
    ap_id: str,
    amount_krw: float,
    payment_date: str,
    payment_method: str = "wire_transfer"
):
    """
    매입 대금 지급 등록
    """
    try:
        # TODO: DB 업데이트 로직

        return JSONResponse({
            "success": True,
            "message": f"지급이 등록되었습니다. ({ap_id}: {amount_krw:,.0f}원)",
            "data": {
                "ap_id": ap_id,
                "amount_krw": amount_krw,
                "payment_date": payment_date,
                "payment_method": payment_method
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/payables/by-supplier/{supplier_name}")
async def get_ap_by_supplier(supplier_name: str):
    """
    공급업체별 매입채무 조회
    """
    try:
        ap_data = load_sample_ap()

        # 공급업체 필터링
        supplier_ap = [
            ap for ap in ap_data
            if supplier_name.lower() in ap.get("supplier", "").lower()
        ]

        total_amount = sum(ap.get("amount_krw", 0) for ap in supplier_ap if ap.get("status") != "paid")

        return JSONResponse({
            "success": True,
            "data": {
                "supplier": supplier_name,
                "payables": supplier_ap,
                "summary": {
                    "total_amount_krw": total_amount,
                    "count": len(supplier_ap),
                    "pending_count": len([ap for ap in supplier_ap if ap.get("status") == "pending"])
                }
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
