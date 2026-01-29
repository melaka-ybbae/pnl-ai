"""Alerts & Notifications API routes - 알림 관리"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel
import json
from pathlib import Path
from datetime import date, datetime, timedelta

router = APIRouter(prefix="/api/alerts", tags=["알림"])

# 샘플 데이터 경로
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


class AlertSettings(BaseModel):
    """알림 설정 모델"""
    ar_overdue_threshold: int = 30  # 채권 연체 기준 (일)
    ar_high_risk_amount: float = 300000.0  # 고위험 채권 금액 기준 (USD)
    forex_change_threshold: float = 0.5  # 환율 변동 알림 기준 (%)
    low_stock_threshold: float = 0.5  # 재고 부족 알림 기준 (최소재고 대비 비율)
    cost_variance_threshold: float = 5.0  # 원가 차이 알림 기준 (%)
    email_notifications: bool = True
    slack_notifications: bool = False
    alert_frequency: str = "real-time"  # real-time, daily, weekly


def load_sample_data(filename: str):
    """샘플 데이터 로드"""
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def generate_alerts() -> List[dict]:
    """알림 생성 로직"""
    alerts = []
    ar_data = load_sample_data("sample_ar.json")
    exchange_data = load_sample_data("sample_exchange_rates.json")

    # 1. 연체 채권 알림
    overdue_items = [ar for ar in ar_data if ar.get("days_overdue", 0) > 0]
    if overdue_items:
        total_overdue = sum(ar.get("amount_usd", 0) for ar in overdue_items)
        alerts.append({
            "id": "alert_001",
            "type": "warning",
            "category": "채권",
            "title": f"연체 채권 {len(overdue_items)}건 발생",
            "message": f"총 ${total_overdue:,.0f} 연체 중입니다. 즉시 확인이 필요합니다.",
            "severity": "high",
            "action_url": "/receivables",
            "action_label": "채권 관리로 이동",
            "created_at": datetime.now().isoformat(),
            "read": False,
            "data": {
                "count": len(overdue_items),
                "amount": total_overdue
            }
        })

    # 2. 고위험 채권 알림
    high_risk = [ar for ar in ar_data if ar.get("risk_level") == "high"]
    if high_risk:
        alerts.append({
            "id": "alert_002",
            "type": "danger",
            "category": "리스크",
            "title": f"고위험 거래처 {len(high_risk)}건",
            "message": "60일 이상 연체 또는 대금 회수 위험이 높은 거래처가 있습니다.",
            "severity": "critical",
            "action_url": "/receivables/risk-analysis",
            "action_label": "리스크 분석 확인",
            "created_at": datetime.now().isoformat(),
            "read": False,
            "data": {
                "count": len(high_risk),
                "customers": [ar.get("customer") for ar in high_risk]
            }
        })

    # 3. 환율 변동 알림
    for rate in exchange_data:
        if rate.get("currency") == "USD":
            change = abs(rate.get("change_percent", 0))
            if change >= 0.5:
                direction = "상승" if rate.get("change_percent", 0) > 0 else "하락"
                alerts.append({
                    "id": "alert_003",
                    "type": "info",
                    "category": "환율",
                    "title": f"USD 환율 {change:.1f}% {direction}",
                    "message": f"현재 환율: {rate.get('rate', 0):,.2f}원. 환차손익 영향 검토가 필요합니다.",
                    "severity": "medium",
                    "action_url": "/forex",
                    "action_label": "환율 관리로 이동",
                    "created_at": datetime.now().isoformat(),
                    "read": False,
                    "data": {
                        "currency": "USD",
                        "rate": rate.get("rate"),
                        "change_percent": rate.get("change_percent")
                    }
                })
            break

    # 4. 재고 부족 알림 (샘플)
    alerts.append({
        "id": "alert_004",
        "type": "warning",
        "category": "재고",
        "title": "원자재 재고 부족",
        "message": "냉연강판(CR Coil) 재고가 최소 수준 이하입니다. 발주가 필요합니다.",
        "severity": "medium",
        "action_url": "/cost/raw-materials",
        "action_label": "원자재 현황 확인",
        "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
        "read": False,
        "data": {
            "material": "냉연강판 (CR Coil)",
            "current_stock": 45.0,
            "min_stock": 50.0,
            "unit": "톤"
        }
    })

    # 5. 매출 목표 달성률 알림 (샘플)
    alerts.append({
        "id": "alert_005",
        "type": "success",
        "category": "매출",
        "title": "월간 매출 목표 95% 달성",
        "message": "2025년 2월 매출이 목표의 95%에 도달했습니다. (목표: 30억원)",
        "severity": "low",
        "action_url": "/sales/summary",
        "action_label": "매출 현황 확인",
        "created_at": (datetime.now() - timedelta(hours=5)).isoformat(),
        "read": True,
        "data": {
            "target": 3000000000,
            "actual": 2850000000,
            "achievement_rate": 95.0
        }
    })

    return alerts


@router.get("/list")
async def get_alerts(
    category: Optional[str] = Query(None, description="카테고리 필터 (채권/환율/재고/매출/리스크)"),
    severity: Optional[str] = Query(None, description="심각도 필터 (critical/high/medium/low)"),
    unread_only: bool = Query(False, description="읽지 않은 알림만 조회"),
    limit: int = Query(50, description="조회 건수")
):
    """
    알림 목록 조회

    - 카테고리별 필터링
    - 심각도별 필터링
    - 읽음/안읽음 상태
    """
    try:
        alerts = generate_alerts()

        # 필터링
        if category:
            alerts = [a for a in alerts if a.get("category") == category]
        if severity:
            alerts = [a for a in alerts if a.get("severity") == severity]
        if unread_only:
            alerts = [a for a in alerts if not a.get("read", False)]

        # 최신순 정렬
        alerts.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        return JSONResponse({
            "success": True,
            "data": alerts[:limit],
            "total": len(alerts),
            "unread_count": len([a for a in alerts if not a.get("read", False)])
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/unread-count")
async def get_unread_count():
    """
    읽지 않은 알림 개수 조회
    """
    try:
        alerts = generate_alerts()
        unread = [a for a in alerts if not a.get("read", False)]

        # 카테고리별 집계
        by_category = {}
        for alert in unread:
            category = alert.get("category", "기타")
            by_category[category] = by_category.get(category, 0) + 1

        # 심각도별 집계
        by_severity = {}
        for alert in unread:
            severity = alert.get("severity", "low")
            by_severity[severity] = by_severity.get(severity, 0) + 1

        return JSONResponse({
            "success": True,
            "data": {
                "total_unread": len(unread),
                "by_category": by_category,
                "by_severity": by_severity,
                "critical_count": by_severity.get("critical", 0),
                "high_count": by_severity.get("high", 0)
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/mark-read")
async def mark_alerts_as_read(alert_ids: List[str] = Query(..., description="알림 ID 목록")):
    """
    알림 읽음 처리

    - 단일 또는 다중 알림 처리
    """
    try:
        # TODO: DB 업데이트 로직
        # 실제로는 데이터베이스의 read 상태를 업데이트해야 함

        return JSONResponse({
            "success": True,
            "message": f"{len(alert_ids)}개의 알림이 읽음 처리되었습니다.",
            "data": {
                "processed_ids": alert_ids,
                "processed_count": len(alert_ids)
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/mark-all-read")
async def mark_all_as_read(category: Optional[str] = Query(None, description="특정 카테고리만 읽음 처리")):
    """
    모든 알림 읽음 처리

    - 전체 또는 카테고리별
    """
    try:
        alerts = generate_alerts()

        if category:
            alerts = [a for a in alerts if a.get("category") == category]

        unread_alerts = [a for a in alerts if not a.get("read", False)]

        return JSONResponse({
            "success": True,
            "message": f"{len(unread_alerts)}개의 알림이 읽음 처리되었습니다.",
            "data": {
                "processed_count": len(unread_alerts),
                "category": category
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/settings")
async def get_alert_settings():
    """
    알림 설정 조회
    """
    try:
        # 기본 설정 반환
        settings = AlertSettings()

        return JSONResponse({
            "success": True,
            "data": settings.model_dump()
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.put("/settings")
async def update_alert_settings(settings: AlertSettings):
    """
    알림 설정 업데이트

    - 알림 기준값 조정
    - 알림 채널 설정 (이메일, Slack)
    - 알림 빈도 설정
    """
    try:
        # TODO: DB 업데이트 로직

        return JSONResponse({
            "success": True,
            "message": "알림 설정이 업데이트되었습니다.",
            "data": settings.model_dump()
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/summary")
async def get_alerts_summary():
    """
    알림 요약 정보

    - 오늘 발생한 알림
    - 심각도별 집계
    - 미처리 중요 알림
    """
    try:
        alerts = generate_alerts()

        # 오늘 발생한 알림
        today = date.today().isoformat()
        today_alerts = [a for a in alerts if a.get("created_at", "").startswith(today)]

        # 심각도별 집계
        critical = [a for a in alerts if a.get("severity") == "critical"]
        high = [a for a in alerts if a.get("severity") == "high"]
        medium = [a for a in alerts if a.get("severity") == "medium"]

        # 미처리 중요 알림
        important_unread = [
            a for a in alerts
            if not a.get("read", False) and a.get("severity") in ["critical", "high"]
        ]

        return JSONResponse({
            "success": True,
            "data": {
                "total_alerts": len(alerts),
                "today_count": len(today_alerts),
                "unread_count": len([a for a in alerts if not a.get("read", False)]),
                "by_severity": {
                    "critical": len(critical),
                    "high": len(high),
                    "medium": len(medium),
                    "low": len(alerts) - len(critical) - len(high) - len(medium)
                },
                "important_unread": important_unread[:5],  # 상위 5개
                "requires_action": len(important_unread)
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str):
    """
    알림 삭제
    """
    try:
        # TODO: DB 삭제 로직

        return JSONResponse({
            "success": True,
            "message": f"알림 {alert_id}가 삭제되었습니다."
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
