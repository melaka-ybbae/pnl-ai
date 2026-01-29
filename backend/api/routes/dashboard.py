"""Dashboard API routes"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import date, datetime, timedelta
import json
from pathlib import Path
import random

from backend.services.ai_analysis import ai_analyzer

router = APIRouter(prefix="/api/dashboard", tags=["대시보드"])

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def load_sample_data(filename: str):
    """샘플 데이터 로드"""
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


@router.get("/kpi")
async def get_dashboard_kpi():
    """
    대시보드 KPI 카드 데이터

    - 매출액
    - 영업이익
    - 원가율
    - 미수금 합계
    """
    try:
        ar_raw = load_sample_data("sample_ar.json")
        ar_data = ar_raw.get("accounts_receivable", []) if isinstance(ar_raw, dict) else ar_raw
        exchange_raw = load_sample_data("sample_exchange_rates.json")
        exchange_data = exchange_raw.get("rates", []) if isinstance(exchange_raw, dict) else exchange_raw

        # 미수금 합계 (미결제 건만)
        total_ar_usd = sum(
            ar.get("amount_usd", 0)
            for ar in ar_data
            if ar.get("status") != "paid"
        )

        # USD 환율
        usd_rate = 1450.0
        if isinstance(exchange_data, dict):
            usd_info = exchange_data.get("USD_KRW", {})
            usd_rate = usd_info.get("current", 1450.0) if isinstance(usd_info, dict) else 1450.0
        else:
            for rate in exchange_data:
                if rate.get("currency") == "USD":
                    usd_rate = rate.get("rate", 1450.0)
                    break

        total_ar_krw = total_ar_usd * usd_rate

        # 연체금액
        overdue_usd = sum(
            ar.get("amount_usd", 0)
            for ar in ar_data
            if ar.get("days_overdue", 0) > 0
        )

        # 샘플 KPI 데이터 (실제로는 분석 서비스에서 가져와야 함)
        kpi_data = {
            "매출액": {
                "value": 2850000000,
                "change": 8.5,
                "unit": "원",
                "period": "2025년 2월"
            },
            "영업이익": {
                "value": 285000000,
                "change": 12.3,
                "unit": "원",
                "period": "2025년 2월"
            },
            "원가율": {
                "value": 72.5,
                "change": -1.2,
                "unit": "%",
                "period": "2025년 2월"
            },
            "미수금": {
                "value": total_ar_krw,
                "value_usd": total_ar_usd,
                "overdue_usd": overdue_usd,
                "overdue_ratio": round(overdue_usd / total_ar_usd * 100, 1) if total_ar_usd > 0 else 0,
                "unit": "원",
                "count": len([ar for ar in ar_data if ar.get("status") != "paid"])
            }
        }

        return JSONResponse({
            "success": True,
            "data": kpi_data
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/sales-trend")
async def get_sales_trend(days: int = 7):
    """
    최근 N일 매출 추이 데이터
    """
    try:
        # 샘플 매출 추이 데이터
        today = date.today()
        trend_data = []

        base_amount = 95000000  # 일 평균 매출 약 9500만원

        for i in range(days - 1, -1, -1):
            day = today - timedelta(days=i)
            # 주말은 매출 감소
            multiplier = 0.3 if day.weekday() >= 5 else 1.0
            # 랜덤 변동
            variation = random.uniform(0.85, 1.15)
            amount = int(base_amount * multiplier * variation)

            trend_data.append({
                "date": day.isoformat(),
                "day_name": ["월", "화", "수", "목", "금", "토", "일"][day.weekday()],
                "amount": amount,
                "export": int(amount * 0.7),  # 수출 70%
                "domestic": int(amount * 0.3)  # 내수 30%
            })

        return JSONResponse({
            "success": True,
            "data": {
                "period": f"최근 {days}일",
                "trend": trend_data,
                "total": sum(d["amount"] for d in trend_data),
                "avg": sum(d["amount"] for d in trend_data) // days
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/ai-alerts")
async def get_ai_alerts():
    """
    [AI] 오늘의 알림 - 이상 징후 및 주요 알림
    """
    try:
        ar_raw = load_sample_data("sample_ar.json")
        ar_data = ar_raw.get("accounts_receivable", []) if isinstance(ar_raw, dict) else ar_raw
        exchange_raw = load_sample_data("sample_exchange_rates.json")
        exchange_data = exchange_raw.get("rates", []) if isinstance(exchange_raw, dict) else exchange_raw

        # 알림 데이터 수집
        alerts_context = {
            "ar_data": ar_data,
            "exchange_rates": exchange_data,
            "date": date.today().isoformat()
        }

        # AI 분석 호출
        ai_result = await ai_analyzer.generate_dashboard_alerts(alerts_context)

        if ai_result:
            return JSONResponse({
                "success": True,
                "data": ai_result
            })

        # AI 실패 시 기본 알림
        default_alerts = generate_default_alerts(ar_data, exchange_data)
        return JSONResponse({
            "success": True,
            "data": default_alerts
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


def generate_default_alerts(ar_data: list, exchange_data) -> dict:
    """기본 알림 생성 (AI 실패 시)"""
    alerts = []

    # 연체 채권 알림
    ar_list = ar_data if isinstance(ar_data, list) else []
    overdue_count = len([ar for ar in ar_list if ar.get("days_overdue", 0) > 0])
    if overdue_count > 0:
        overdue_amount = sum(
            ar.get("amount_usd", 0)
            for ar in ar_list
            if ar.get("days_overdue", 0) > 0
        )
        alerts.append({
            "type": "warning",
            "category": "채권",
            "title": f"연체 채권 {overdue_count}건 발생",
            "message": f"총 ${overdue_amount:,.0f} 연체 중. 즉시 확인이 필요합니다.",
            "action": "/receivables",
            "priority": "high"
        })

    # 고위험 거래처 알림 (60일 이상 연체)
    high_risk = [ar for ar in ar_list if ar.get("days_overdue", 0) >= 60]
    if high_risk:
        alerts.append({
            "type": "danger",
            "category": "리스크",
            "title": f"고위험 거래처 {len(high_risk)}건",
            "message": "60일 이상 연체 거래처가 있습니다.",
            "action": "/receivables",
            "priority": "high"
        })

    # 환율 변동 알림
    if isinstance(exchange_data, dict):
        usd_info = exchange_data.get("USD_KRW", {})
        if isinstance(usd_info, dict):
            change = usd_info.get("change_pct", 0)
            if abs(change) >= 0.3:
                direction = "상승" if change > 0 else "하락"
                alerts.append({
                    "type": "info",
                    "category": "환율",
                    "title": f"USD 환율 {abs(change):.1f}% {direction}",
                    "message": f"현재 {usd_info.get('current', 0):,.2f}원. 환차손익 영향 검토 필요.",
                    "action": "/forex",
                    "priority": "medium"
                })

    # 기본 알림 추가
    if not alerts:
        alerts.append({
            "type": "success",
            "category": "상태",
            "title": "정상 운영 중",
            "message": "현재 특별한 이상 징후가 없습니다.",
            "priority": "low"
        })

    return {
        "alerts": alerts,
        "summary": f"총 {len(alerts)}개의 알림이 있습니다.",
        "generated_at": datetime.now().isoformat()
    }


@router.get("/recent-documents")
async def get_recent_documents(limit: int = 5):
    """
    최근 업로드된 서류 목록
    """
    try:
        invoices = load_sample_data("sample_invoices.json")
        bl_data = load_sample_data("sample_bl.json")

        # 모든 서류 합치기
        all_docs = []

        for inv in invoices[:limit]:
            all_docs.append({
                "id": inv.get("invoice_no"),
                "type": "invoice",
                "type_label": "Commercial Invoice",
                "reference": inv.get("invoice_no"),
                "customer": inv.get("customer"),
                "amount": inv.get("total_amount"),
                "currency": inv.get("currency", "USD"),
                "date": inv.get("date"),
                "status": "confirmed"
            })

        for bl in bl_data[:limit]:
            all_docs.append({
                "id": bl.get("bl_no"),
                "type": "bl",
                "type_label": "B/L",
                "reference": bl.get("bl_no"),
                "customer": bl.get("consignee"),
                "vessel": bl.get("vessel"),
                "date": bl.get("ship_date"),
                "status": "parsed" if not bl.get("discrepancy") else "warning"
            })

        # 날짜순 정렬 (최신순)
        all_docs.sort(key=lambda x: x.get("date", ""), reverse=True)

        return JSONResponse({
            "success": True,
            "data": all_docs[:limit],
            "total": len(all_docs)
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/quick-stats")
async def get_quick_stats():
    """
    빠른 통계 요약
    """
    try:
        ar_raw = load_sample_data("sample_ar.json")
        ar_data = ar_raw.get("accounts_receivable", []) if isinstance(ar_raw, dict) else ar_raw
        invoices_raw = load_sample_data("sample_invoices.json")
        invoices = invoices_raw if isinstance(invoices_raw, list) else []
        bl_raw = load_sample_data("sample_bl.json")
        bl_data = bl_raw if isinstance(bl_raw, list) else []

        stats = {
            "documents": {
                "total": len(invoices) + len(bl_data),
                "pending_review": 2,
                "with_issues": len([bl for bl in bl_data if isinstance(bl, dict) and bl.get("discrepancy")])
            },
            "receivables": {
                "total_count": len(ar_data),
                "overdue_count": len([ar for ar in ar_data if isinstance(ar, dict) and ar.get("days_overdue", 0) > 0]),
                "high_risk_count": len([ar for ar in ar_data if isinstance(ar, dict) and ar.get("risk_level") == "high"])
            },
            "this_month": {
                "invoices_issued": len(invoices),
                "shipments": len(bl_data),
                "collections": 3  # 입금 건수
            }
        }

        return JSONResponse({
            "success": True,
            "data": stats
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
