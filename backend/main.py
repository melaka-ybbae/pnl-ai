"""
수출 제조업 AI 재무 플랫폼

FastAPI 기반 백엔드 서버 - DK동신 컬러강판 수출 제조업
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes import data, analysis, simulation, budget, reports
from backend.api.routes import documents, receivables, forex, dashboard
from backend.api.routes import sales, cost, alerts, settings
from backend.api.routes import erp_sync, smart_parser
from backend.models.database import init_db

# FastAPI 앱 생성
app = FastAPI(
    title="수출 제조업 AI 재무 플랫폼",
    description="""
    컬러강판 수출 제조업체를 위한 AI 기반 재무 관리 플랫폼입니다.

    ## 주요 기능

    * **대시보드**: 핵심 KPI, AI 알림
    * **매출 관리**: 수출/내수 매출, Invoice OCR 파싱
    * **매입/원가 관리**: 원자재 매입, 원가 분석
    * **채권/채무 관리**: AR/AP 연령분석, 리스크 모니터링
    * **외환/환율 관리**: 환율 조회, 환차손익 계산
    * **무역 서류 센터**: AI OCR 파싱, 서류 대사
    * **손익 분석**: 월간 비교, AI 코멘트
    * **시뮬레이션**: 원가/환율 What-if 분석
    * **보고서**: PDF/Excel 자동 생성
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(dashboard.router)  # 대시보드
app.include_router(data.router)  # 데이터 연동
app.include_router(sales.router)  # 매출 관리 (신규)
app.include_router(cost.router)  # 원가 관리 (신규)
app.include_router(receivables.router)  # 채권/채무 관리 (AP 확장됨)
app.include_router(forex.router)  # 환율 관리 (확장됨)
app.include_router(documents.router)  # 무역 서류 (L/C 추가됨)
app.include_router(analysis.router)  # 손익 분석
app.include_router(simulation.router)  # 시뮬레이션 (확장됨)
app.include_router(budget.router)  # 예산 관리
app.include_router(reports.router)  # 보고서 (일일/주간/월간 추가됨)
app.include_router(alerts.router)  # 알림 (신규)
app.include_router(settings.router)  # 설정 (신규)
app.include_router(erp_sync.router)  # ERP 데이터 동기화 (핵심!)
app.include_router(smart_parser.router)  # AI 스마트 파싱 (데모 핵심!)


@app.on_event("startup")
async def startup_event():
    """앱 시작 시 초기화"""
    # 데이터베이스 초기화
    init_db()
    print("Database initialized")


@app.get("/", tags=["상태"])
async def root():
    """API 루트"""
    return {
        "name": "컬러강판 손익 추정 시스템",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health", tags=["상태"])
async def health_check():
    """헬스 체크"""
    return {"status": "ok"}


@app.get("/debug/ai", tags=["디버그"])
async def debug_ai():
    """AI 서비스 디버그"""
    import os
    from pathlib import Path
    from dotenv import load_dotenv

    PROJECT_ROOT = Path(__file__).parent.parent
    ENV_FILE = PROJECT_ROOT / ".env"

    result = {
        "project_root": str(PROJECT_ROOT),
        "env_file": str(ENV_FILE),
        "env_exists": ENV_FILE.exists(),
    }

    load_dotenv(ENV_FILE, override=True)
    api_key = os.getenv("ANTHROPIC_API_KEY")

    result["api_key_loaded"] = api_key is not None
    result["api_key_prefix"] = api_key[:25] + "..." if api_key else None

    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            msg = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=50,
                messages=[{"role": "user", "content": "Say hi"}]
            )
            result["api_test"] = "SUCCESS"
            result["response"] = msg.content[0].text
        except Exception as e:
            result["api_test"] = "FAILED"
            result["error"] = str(e)

    return result


@app.get("/api/info", tags=["상태"])
async def api_info():
    """API 정보"""
    return {
        "version": "2.0.0",
        "description": "DK동신 컬러강판 손익 분석 시스템 API",
        "endpoints": {
            "dashboard": {
                "kpi": "GET /api/dashboard/kpi - KPI 카드",
                "sales_trend": "GET /api/dashboard/sales-trend - 매출 추이",
                "ai_alerts": "GET /api/dashboard/ai-alerts - AI 알림",
                "quick_stats": "GET /api/dashboard/quick-stats - 빠른 통계"
            },
            "data": {
                "upload": "POST /api/data/upload - 엑셀 업로드",
                "current": "GET /api/data/current - 현재 데이터 조회",
                "erp_connect": "POST /api/data/erp/connect - ERP 연결"
            },
            "sales": {
                "export": "GET /api/sales/export - 수출 매출",
                "domestic": "GET /api/sales/domestic - 내수 매출",
                "summary": "GET /api/sales/summary - 매출 현황",
                "invoice_upload": "POST /api/sales/invoice/upload - 인보이스 업로드"
            },
            "cost": {
                "raw_materials": "GET /api/cost/raw-materials - 원자재 현황",
                "analysis": "GET /api/cost/analysis - 원가 분석",
                "purchase_upload": "POST /api/cost/purchase/upload - 수입 인보이스",
                "variance": "GET /api/cost/variance - 원가 차이 분석"
            },
            "receivables": {
                "ar_list": "GET /api/receivables/list - 매출채권 목록",
                "ar_summary": "GET /api/receivables/summary - 채권 요약",
                "aging": "GET /api/receivables/aging - 연령분석",
                "risk_analysis": "GET /api/receivables/risk-analysis - 리스크 분석",
                "ap_list": "GET /api/receivables/payables/list - 매입채무 목록",
                "ap_summary": "GET /api/receivables/payables/summary - 채무 요약",
                "payment_schedule": "GET /api/receivables/payables/schedule - 지급 스케줄"
            },
            "forex": {
                "rates": "GET /api/forex/rates - 실시간 환율",
                "history": "GET /api/forex/history - 환율 추이",
                "fx_gain_loss": "GET /api/forex/fx-gain-loss - 환차손익",
                "convert": "POST /api/forex/convert - 환산 계산"
            },
            "documents": {
                "upload_invoice": "POST /api/documents/upload/invoice - Invoice OCR",
                "upload_bl": "POST /api/documents/upload/bl - B/L OCR",
                "upload_packing": "POST /api/documents/upload/packing-list - P/L OCR",
                "upload_lc": "POST /api/documents/upload/lc - L/C 업로드",
                "compare": "POST /api/documents/compare - 서류 대사",
                "lc_review": "POST /api/documents/lc-review - L/C 조건 검토"
            },
            "analysis": {
                "monthly": "POST /api/analysis/monthly - 월간 분석",
                "product_cost": "POST /api/analysis/product-cost - 제품별 원가",
                "trend": "GET /api/analysis/trend - 추이 데이터"
            },
            "simulation": {
                "cost": "POST /api/simulation/cost - 원가 시뮬레이션",
                "price": "POST /api/simulation/price - 단가 시뮬레이션",
                "forex": "POST /api/simulation/forex - 환율 시뮬레이션",
                "breakeven": "GET /api/simulation/breakeven - 손익분기점",
                "sensitivity": "GET /api/simulation/sensitivity - 민감도 분석"
            },
            "reports": {
                "daily": "POST /api/reports/daily - 일일 자금일보",
                "weekly": "POST /api/reports/weekly - 주간 리포트",
                "monthly": "POST /api/reports/monthly - 월간 경영 보고서",
                "excel": "POST /api/reports/excel - 엑셀 보고서",
                "pdf": "POST /api/reports/pdf - PDF 보고서",
                "download": "GET /api/reports/download/{id} - 보고서 다운로드"
            },
            "alerts": {
                "list": "GET /api/alerts/list - 알림 목록",
                "unread_count": "GET /api/alerts/unread-count - 미확인 개수",
                "mark_read": "POST /api/alerts/mark-read - 읽음 처리",
                "settings": "GET /api/alerts/settings - 알림 설정"
            },
            "settings": {
                "company": "GET /api/settings/company - 회사 정보",
                "erp": "GET /api/settings/erp - ERP 연동 설정",
                "thresholds": "GET /api/settings/thresholds - 알림 기준값",
                "all": "GET /api/settings/all - 전체 설정"
            }
        }
    }


# 에러 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """전역 예외 처리"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
            "detail": "서버 오류가 발생했습니다."
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
