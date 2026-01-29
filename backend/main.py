"""
컬러강판 제조 ERP 손익 추정 시스템

FastAPI 기반 백엔드 서버
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes import data, analysis, simulation, budget, reports
from backend.models.database import init_db

# FastAPI 앱 생성
app = FastAPI(
    title="컬러강판 손익 추정 시스템",
    description="""
    컬러강판 제조 회사의 ERP 데이터를 기반으로 한 손익 분석 및 추정 시스템입니다.

    ## 주요 기능

    * **데이터 관리**: 엑셀 업로드, ERP 연동 (추후)
    * **월간 분석**: 전월/전년 대비 손익 비교
    * **제품별 원가**: 건재용/가전용/기타 수익성 분석
    * **시뮬레이션**: 원가 변동 What-if 분석
    * **예산 관리**: 예산 대비 실적 비교
    * **보고서**: PDF/Excel 자동 생성
    """,
    version="1.0.0",
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
app.include_router(data.router)
app.include_router(analysis.router)
app.include_router(simulation.router)
app.include_router(budget.router)
app.include_router(reports.router)


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
        "endpoints": {
            "data": {
                "upload": "POST /api/data/upload - 엑셀 업로드",
                "current": "GET /api/data/current - 현재 데이터 조회",
                "erp_connect": "POST /api/data/erp/connect - ERP 연결"
            },
            "analysis": {
                "monthly": "POST /api/analysis/monthly - 월간 분석",
                "product_cost": "POST /api/analysis/product-cost - 제품별 원가",
                "trend": "GET /api/analysis/trend - 추이 데이터",
                "cost_breakdown": "GET /api/analysis/cost-breakdown - 원가 구성"
            },
            "simulation": {
                "cost": "POST /api/simulation/cost - 원가 시뮬레이션",
                "sensitivity": "GET /api/simulation/sensitivity - 민감도 분석",
                "scenarios": "POST /api/simulation/scenarios - 시나리오 비교",
                "breakeven": "POST /api/simulation/breakeven - 손익분기점"
            },
            "budget": {
                "upload": "POST /api/budget/upload - 예산 업로드",
                "get": "GET /api/budget/{year} - 예산 조회",
                "comparison": "POST /api/budget/comparison - 예산 vs 실적"
            },
            "reports": {
                "excel": "POST /api/reports/excel - 엑셀 보고서",
                "pdf": "POST /api/reports/pdf - PDF 보고서",
                "preview": "GET /api/reports/preview - 미리보기"
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
