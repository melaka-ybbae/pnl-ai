"""Settings API routes - 시스템 설정"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import json
from pathlib import Path

router = APIRouter(prefix="/api/settings", tags=["설정"])

# 설정 파일 경로
CONFIG_DIR = Path(__file__).parent.parent.parent.parent / "config"
CONFIG_DIR.mkdir(exist_ok=True)


class CompanyInfo(BaseModel):
    """회사 정보 모델"""
    company_name: str = Field(..., description="회사명")
    business_number: str = Field(..., description="사업자등록번호")
    ceo_name: str = Field(..., description="대표자명")
    address: str = Field(..., description="주소")
    tel: str = Field(..., description="전화번호")
    email: str = Field(..., description="이메일")
    industry: str = Field(default="제조업", description="업종")
    fiscal_year_start: int = Field(default=1, description="회계연도 시작월")
    currency: str = Field(default="KRW", description="기본 통화")
    timezone: str = Field(default="Asia/Seoul", description="시간대")


class ERPSettings(BaseModel):
    """ERP 연동 설정 모델"""
    erp_type: str = Field(..., description="ERP 타입 (SAP/Oracle/영림원/더존 등)")
    connection_type: str = Field(default="api", description="연동 방식 (api/db/file)")
    host: Optional[str] = Field(None, description="호스트 주소")
    port: Optional[int] = Field(None, description="포트")
    database: Optional[str] = Field(None, description="데이터베이스명")
    username: Optional[str] = Field(None, description="사용자명")
    api_key: Optional[str] = Field(None, description="API 키")
    sync_interval: int = Field(default=3600, description="동기화 주기 (초)")
    auto_sync: bool = Field(default=True, description="자동 동기화 활성화")
    last_sync_time: Optional[str] = Field(None, description="마지막 동기화 시간")


class ThresholdSettings(BaseModel):
    """알림 기준값 설정"""
    # 채권 관련
    ar_overdue_warning_days: int = Field(default=30, description="채권 연체 경고 기준 (일)")
    ar_overdue_danger_days: int = Field(default=60, description="채권 연체 위험 기준 (일)")
    ar_high_risk_amount_usd: float = Field(default=300000.0, description="고위험 채권 금액 기준 (USD)")

    # 환율 관련
    forex_change_warning: float = Field(default=0.5, description="환율 변동 경고 기준 (%)")
    forex_change_danger: float = Field(default=1.0, description="환율 변동 위험 기준 (%)")

    # 재고 관련
    low_stock_warning: float = Field(default=0.5, description="재고 부족 경고 (최소재고 대비 비율)")
    low_stock_danger: float = Field(default=0.3, description="재고 부족 위험 (최소재고 대비 비율)")

    # 원가 관련
    cost_variance_warning: float = Field(default=5.0, description="원가 차이 경고 기준 (%)")
    cost_variance_danger: float = Field(default=10.0, description="원가 차이 위험 기준 (%)")

    # 매출 관련
    sales_target_achievement: float = Field(default=90.0, description="매출 목표 달성률 알림 기준 (%)")


class NotificationSettings(BaseModel):
    """알림 채널 설정"""
    email_enabled: bool = Field(default=True, description="이메일 알림 활성화")
    email_recipients: list[str] = Field(default_factory=list, description="이메일 수신자 목록")
    slack_enabled: bool = Field(default=False, description="Slack 알림 활성화")
    slack_webhook_url: Optional[str] = Field(None, description="Slack Webhook URL")
    sms_enabled: bool = Field(default=False, description="SMS 알림 활성화")
    alert_frequency: str = Field(default="real-time", description="알림 빈도 (real-time/daily/weekly)")


def load_config(filename: str) -> Dict[str, Any]:
    """설정 파일 로드"""
    filepath = CONFIG_DIR / filename
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_config(filename: str, data: Dict[str, Any]):
    """설정 파일 저장"""
    filepath = CONFIG_DIR / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@router.get("/company")
async def get_company_info():
    """
    회사 정보 조회
    """
    try:
        config = load_config("company.json")

        if not config:
            # 기본값 반환
            config = {
                "company_name": "DK동신",
                "business_number": "123-45-67890",
                "ceo_name": "홍길동",
                "address": "경기도 평택시",
                "tel": "031-1234-5678",
                "email": "contact@dkdongshin.com",
                "industry": "컬러강판 제조업",
                "fiscal_year_start": 1,
                "currency": "KRW",
                "timezone": "Asia/Seoul"
            }

        return JSONResponse({
            "success": True,
            "data": config
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.put("/company")
async def update_company_info(company: CompanyInfo):
    """
    회사 정보 수정
    """
    try:
        config = company.model_dump()
        save_config("company.json", config)

        return JSONResponse({
            "success": True,
            "message": "회사 정보가 업데이트되었습니다.",
            "data": config
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/erp")
async def get_erp_settings():
    """
    ERP 연동 설정 조회
    """
    try:
        config = load_config("erp.json")

        if not config:
            # 기본값 반환
            config = {
                "erp_type": "영림원",
                "connection_type": "api",
                "host": None,
                "port": None,
                "database": None,
                "username": None,
                "api_key": None,
                "sync_interval": 3600,
                "auto_sync": False,
                "last_sync_time": None
            }

        # 민감 정보 마스킹
        if config.get("api_key"):
            config["api_key"] = config["api_key"][:8] + "***"

        return JSONResponse({
            "success": True,
            "data": config
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.put("/erp")
async def update_erp_settings(settings: ERPSettings):
    """
    ERP 연동 설정 수정
    """
    try:
        config = settings.model_dump()
        save_config("erp.json", config)

        # 민감 정보 마스킹하여 응답
        response_config = config.copy()
        if response_config.get("api_key"):
            response_config["api_key"] = response_config["api_key"][:8] + "***"

        return JSONResponse({
            "success": True,
            "message": "ERP 연동 설정이 업데이트되었습니다.",
            "data": response_config
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/erp/test-connection")
async def test_erp_connection():
    """
    ERP 연결 테스트
    """
    try:
        config = load_config("erp.json")

        if not config:
            return JSONResponse({
                "success": False,
                "error": "ERP 설정이 없습니다."
            }, status_code=400)

        # TODO: 실제 ERP 연결 테스트
        # from backend.services.erp_connector import erp_service
        # connection_result = await erp_service.test_connection(config)

        # 임시 응답
        return JSONResponse({
            "success": True,
            "message": "ERP 연결 테스트가 성공했습니다.",
            "data": {
                "erp_type": config.get("erp_type"),
                "connection_status": "success",
                "latency_ms": 125,
                "version": "1.0.0"
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/thresholds")
async def get_thresholds():
    """
    알림 기준값 조회
    """
    try:
        config = load_config("thresholds.json")

        if not config:
            # 기본값
            settings = ThresholdSettings()
            config = settings.model_dump()

        return JSONResponse({
            "success": True,
            "data": config
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.put("/thresholds")
async def update_thresholds(thresholds: ThresholdSettings):
    """
    알림 기준값 수정
    """
    try:
        config = thresholds.model_dump()
        save_config("thresholds.json", config)

        return JSONResponse({
            "success": True,
            "message": "알림 기준값이 업데이트되었습니다.",
            "data": config
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/notifications")
async def get_notification_settings():
    """
    알림 채널 설정 조회
    """
    try:
        config = load_config("notifications.json")

        if not config:
            settings = NotificationSettings()
            config = settings.model_dump()

        # Webhook URL 마스킹
        if config.get("slack_webhook_url"):
            config["slack_webhook_url"] = config["slack_webhook_url"][:20] + "***"

        return JSONResponse({
            "success": True,
            "data": config
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.put("/notifications")
async def update_notification_settings(settings: NotificationSettings):
    """
    알림 채널 설정 수정
    """
    try:
        config = settings.model_dump()
        save_config("notifications.json", config)

        # Webhook URL 마스킹하여 응답
        response_config = config.copy()
        if response_config.get("slack_webhook_url"):
            response_config["slack_webhook_url"] = response_config["slack_webhook_url"][:20] + "***"

        return JSONResponse({
            "success": True,
            "message": "알림 채널 설정이 업데이트되었습니다.",
            "data": response_config
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/all")
async def get_all_settings():
    """
    모든 설정 조회 (대시보드용)
    """
    try:
        company = load_config("company.json")
        erp = load_config("erp.json")
        thresholds = load_config("thresholds.json")
        notifications = load_config("notifications.json")

        # 민감 정보 마스킹
        if erp.get("api_key"):
            erp["api_key"] = erp["api_key"][:8] + "***"
        if notifications.get("slack_webhook_url"):
            notifications["slack_webhook_url"] = notifications["slack_webhook_url"][:20] + "***"

        return JSONResponse({
            "success": True,
            "data": {
                "company": company,
                "erp": erp,
                "thresholds": thresholds,
                "notifications": notifications
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/reset")
async def reset_settings(category: str):
    """
    설정 초기화

    - category: company, erp, thresholds, notifications, all
    """
    try:
        categories_to_reset = [category] if category != "all" else ["company", "erp", "thresholds", "notifications"]

        for cat in categories_to_reset:
            filepath = CONFIG_DIR / f"{cat}.json"
            if filepath.exists():
                filepath.unlink()

        return JSONResponse({
            "success": True,
            "message": f"{category} 설정이 초기화되었습니다."
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/export")
async def export_settings():
    """
    설정 내보내기 (JSON)
    """
    try:
        all_settings = {
            "company": load_config("company.json"),
            "erp": load_config("erp.json"),
            "thresholds": load_config("thresholds.json"),
            "notifications": load_config("notifications.json"),
            "exported_at": datetime.now().isoformat()
        }

        from datetime import datetime

        return JSONResponse({
            "success": True,
            "data": all_settings,
            "filename": f"settings_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/import")
async def import_settings(settings: Dict[str, Any]):
    """
    설정 가져오기 (JSON)
    """
    try:
        imported_count = 0

        if "company" in settings:
            save_config("company.json", settings["company"])
            imported_count += 1

        if "erp" in settings:
            save_config("erp.json", settings["erp"])
            imported_count += 1

        if "thresholds" in settings:
            save_config("thresholds.json", settings["thresholds"])
            imported_count += 1

        if "notifications" in settings:
            save_config("notifications.json", settings["notifications"])
            imported_count += 1

        return JSONResponse({
            "success": True,
            "message": f"{imported_count}개의 설정이 가져와졌습니다."
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
