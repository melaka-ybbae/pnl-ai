"""Foreign Exchange (외환/환율) API routes"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
import json
from pathlib import Path
from datetime import date, datetime

router = APIRouter(prefix="/api/forex", tags=["외환관리"])

# 샘플 데이터 경로
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def load_exchange_rates():
    """샘플 환율 데이터 로드"""
    rate_file = DATA_DIR / "sample_exchange_rates.json"
    if rate_file.exists():
        with open(rate_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"rates": {}}


@router.get("/rates")
async def get_current_rates():
    """
    현재 환율 조회
    """
    try:
        data = load_exchange_rates()

        # 프론트엔드가 기대하는 배열 형식으로 변환
        rates_list = []
        for currency_pair, info in data.get("rates", {}).items():
            # currency_pair가 "USD_KRW" 형식이면 "USD"만 추출
            currency = currency_pair.split("_")[0] if "_" in currency_pair else currency_pair
            rate = info.get("current", 0)
            change = info.get("change", 0)
            # change_percent 계산 (이전 환율이 있으면)
            previous = info.get("previous")
            if previous and previous > 0:
                change_percent = round((rate - previous) / previous * 100, 2)
            else:
                change_percent = round(change / rate * 100, 2) if rate > 0 else 0

            rates_list.append({
                "currency": currency,
                "rate": rate,
                "change": change,
                "change_percent": change_percent
            })

        return JSONResponse({
            "success": True,
            "data": {
                "rates": rates_list,
                "last_updated": data.get("last_updated")
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/rates/{currency}")
async def get_currency_rate(
    currency: str,
    days: int = Query(30, description="조회 기간 (일)")
):
    """
    특정 통화 환율 상세 및 추이
    """
    try:
        data = load_exchange_rates()
        currency_upper = currency.upper()

        if currency_upper not in data.get("rates", {}):
            raise HTTPException(
                status_code=404,
                detail=f"통화 '{currency_upper}'를 찾을 수 없습니다."
            )

        currency_data = data["rates"][currency_upper]

        return JSONResponse({
            "success": True,
            "data": {
                "currency": currency_upper,
                "current": currency_data.get("current"),
                "previous": currency_data.get("previous"),
                "change": currency_data.get("change"),
                "history": currency_data.get("history", [])[-days:]
            }
        })

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/convert")
async def convert_currency(
    from_currency: str,
    to_currency: str,
    amount: float,
    rate: Optional[float] = None
):
    """
    환율 변환 계산
    """
    try:
        data = load_exchange_rates()

        from_upper = from_currency.upper()
        to_upper = to_currency.upper()

        # KRW로 먼저 변환 후 타겟 통화로 변환
        if rate is None:
            if from_upper == "KRW":
                krw_amount = amount
            elif from_upper in data.get("rates", {}):
                from_rate = data["rates"][from_upper].get("current", 1)
                krw_amount = amount * from_rate
            else:
                raise HTTPException(status_code=400, detail=f"지원하지 않는 통화: {from_upper}")

            if to_upper == "KRW":
                converted = krw_amount
            elif to_upper in data.get("rates", {}):
                to_rate = data["rates"][to_upper].get("current", 1)
                converted = krw_amount / to_rate
            else:
                raise HTTPException(status_code=400, detail=f"지원하지 않는 통화: {to_upper}")
        else:
            converted = amount * rate

        return JSONResponse({
            "success": True,
            "data": {
                "from_currency": from_upper,
                "to_currency": to_upper,
                "original_amount": amount,
                "converted_amount": round(converted, 2),
                "rate_used": rate or (converted / amount if amount > 0 else 0)
            }
        })

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/fx-gain-loss")
async def calculate_fx_gain_loss(
    invoice_amount_usd: float,
    invoice_rate: float,
    settlement_rate: float
):
    """
    환차손익 계산

    송장 발행 시점과 결제 시점의 환율 차이로 인한 환차손익을 계산합니다.
    """
    try:
        invoice_krw = invoice_amount_usd * invoice_rate
        settlement_krw = invoice_amount_usd * settlement_rate
        fx_diff = settlement_krw - invoice_krw

        return JSONResponse({
            "success": True,
            "data": {
                "invoice_amount_usd": invoice_amount_usd,
                "invoice_rate": invoice_rate,
                "settlement_rate": settlement_rate,
                "invoice_amount_krw": round(invoice_krw, 0),
                "settlement_amount_krw": round(settlement_krw, 0),
                "fx_gain_loss_krw": round(fx_diff, 0),
                "type": "환차익" if fx_diff > 0 else "환차손" if fx_diff < 0 else "변동없음",
                "percentage": round((settlement_rate - invoice_rate) / invoice_rate * 100, 2)
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/fx-summary")
async def get_fx_summary(
    year: int = Query(2025, description="연도"),
    month: Optional[int] = Query(None, description="월 (생략 시 연간)")
):
    """
    환차손익 요약
    """
    try:
        # TODO: DB에서 실제 데이터 조회
        # 현재는 샘플 데이터 반환
        sample_summary = {
            "period": f"{year}년 {month}월" if month else f"{year}년",
            "total_export_usd": 2500000,
            "average_invoice_rate": 1295.50,
            "average_settlement_rate": 1302.30,
            "total_fx_gain_loss_krw": 17000000,
            "type": "환차익",
            "monthly_breakdown": [
                {"month": "1월", "fx_gain_loss": 8500000},
                {"month": "2월", "fx_gain_loss": 8500000}
            ] if not month else None
        }

        return JSONResponse({
            "success": True,
            "data": sample_summary
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/simulate")
async def simulate_fx_impact(
    expected_rate: float,
    outstanding_usd: Optional[float] = None
):
    """
    환율 변동 시뮬레이션

    예상 환율에 따른 미수금 환산액 변동을 시뮬레이션합니다.
    """
    try:
        data = load_exchange_rates()
        current_rate = data.get("rates", {}).get("USD", {}).get("current", 1300)

        # 미수금 없으면 샘플 데이터 사용
        if outstanding_usd is None:
            outstanding_usd = 1500000  # 샘플 미수금

        current_krw = outstanding_usd * current_rate
        expected_krw = outstanding_usd * expected_rate
        diff = expected_krw - current_krw

        return JSONResponse({
            "success": True,
            "data": {
                "outstanding_usd": outstanding_usd,
                "current_rate": current_rate,
                "expected_rate": expected_rate,
                "current_value_krw": round(current_krw, 0),
                "expected_value_krw": round(expected_krw, 0),
                "value_change_krw": round(diff, 0),
                "change_percentage": round((expected_rate - current_rate) / current_rate * 100, 2),
                "impact_type": "유리" if diff > 0 else "불리" if diff < 0 else "중립"
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/history")
async def get_exchange_rate_history(
    currency: str = Query("USD", description="통화 코드"),
    start_date: Optional[str] = Query(None, description="시작일 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료일 (YYYY-MM-DD)"),
    days: int = Query(30, description="조회 기간 (일, start_date 미지정 시)")
):
    """
    환율 추이 데이터

    - 특정 통화의 과거 환율 데이터
    - 차트 표시용
    """
    try:
        data = load_exchange_rates()
        currency_upper = currency.upper()

        if currency_upper not in data.get("rates", {}):
            return JSONResponse({
                "success": False,
                "error": f"지원하지 않는 통화: {currency_upper}"
            }, status_code=400)

        currency_data = data["rates"][currency_upper]
        history = currency_data.get("history", [])

        # 샘플 히스토리 데이터 (실제로는 DB에서 가져와야 함)
        import random
        from datetime import timedelta

        if not history:
            base_rate = currency_data.get("current", 1300)
            history = []
            for i in range(days):
                day_date = (datetime.now() - timedelta(days=days-i-1)).date().isoformat()
                variation = random.uniform(-0.015, 0.015)
                day_rate = base_rate * (1 + variation)
                history.append({
                    "date": day_date,
                    "rate": round(day_rate, 2),
                    "open": round(day_rate * 0.998, 2),
                    "close": round(day_rate, 2),
                    "high": round(day_rate * 1.005, 2),
                    "low": round(day_rate * 0.995, 2)
                })

        # 날짜 필터링
        if start_date:
            history = [h for h in history if h["date"] >= start_date]
        if end_date:
            history = [h for h in history if h["date"] <= end_date]

        return JSONResponse({
            "success": True,
            "data": {
                "currency": currency_upper,
                "period": {
                    "start": history[0]["date"] if history else None,
                    "end": history[-1]["date"] if history else None,
                    "count": len(history)
                },
                "history": history,
                "statistics": {
                    "max_rate": max(h["rate"] for h in history) if history else 0,
                    "min_rate": min(h["rate"] for h in history) if history else 0,
                    "avg_rate": sum(h["rate"] for h in history) / len(history) if history else 0,
                    "volatility": round(
                        (max(h["rate"] for h in history) - min(h["rate"] for h in history)) /
                        (sum(h["rate"] for h in history) / len(history)) * 100, 2
                    ) if history else 0
                }
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/fx-gain-loss")
async def get_fx_gain_loss_report(
    year: Optional[int] = Query(None, description="연도"),
    month: Optional[int] = Query(None, description="월")
):
    """
    환차손익 리포트

    - 기간별 환차손익 집계
    - 거래처별 환차손익
    """
    try:
        # 기본값
        if not year:
            year = date.today().year
        if not month:
            month = date.today().month

        # 프론트엔드가 기대하는 형식으로 변환
        # details: 통화별 환차손익 상세
        # summary: 요약 정보
        details = [
            {
                "currency": "USD",
                "exposure_amount": 500000,
                "book_rate": 1320,
                "current_rate": 1330.5,
                "gain_loss_krw": 5250000,
                "gain_loss_percent": 0.8
            },
            {
                "currency": "EUR",
                "exposure_amount": 100000,
                "book_rate": 1460,
                "current_rate": 1450.2,
                "gain_loss_krw": -980000,
                "gain_loss_percent": -0.67
            },
            {
                "currency": "JPY",
                "exposure_amount": 5000000,
                "book_rate": 8.90,
                "current_rate": 8.85,
                "gain_loss_krw": -250000,
                "gain_loss_percent": -0.56
            }
        ]

        # 총 환차손익 계산
        total_gain_loss = sum(d["gain_loss_krw"] for d in details)

        summary = {
            "total_exposure_usd": 600000,  # USD 환산 총 익스포저
            "total_gain_loss_krw": total_gain_loss,
            "largest_exposure": "USD",
            "hedged_ratio": 35
        }

        return JSONResponse({
            "success": True,
            "data": {
                "period": f"{year}년 {month}월",
                "details": details,
                "summary": summary
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
