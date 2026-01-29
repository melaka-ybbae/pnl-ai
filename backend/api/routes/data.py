"""Data upload and ERP connection routes"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from backend.models.schemas import UploadResponse, ERPConfig, ERPConnectionTest, ProfitLossData
from backend.services.data_loader import data_loader
from backend.services.erp_connector import erp_connector

router = APIRouter(prefix="/api/data", tags=["데이터"])

# 메모리에 데이터 저장 (실제 환경에서는 DB나 캐시 사용)
_current_data: ProfitLossData = None


def get_current_data() -> ProfitLossData:
    """현재 로드된 데이터 반환"""
    global _current_data
    if _current_data is None:
        raise HTTPException(status_code=400, detail="먼저 데이터를 업로드해주세요.")
    return _current_data


@router.post("/upload", response_model=UploadResponse)
async def upload_excel(file: UploadFile = File(...)):
    """
    엑셀 파일 업로드

    손익 데이터가 포함된 엑셀 파일을 업로드합니다.
    필수 컬럼: 분류, 계정과목, 월별 데이터 (예: '2025년 1월')
    """
    global _current_data

    # 파일 형식 확인
    if not file.filename.endswith(('.xlsx', '.xls')):
        return UploadResponse(
            success=False,
            message="엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.",
            warnings=[]
        )

    # 파일 파싱
    data, errors_or_warnings = await data_loader.parse_excel(file)

    if data is None:
        return UploadResponse(
            success=False,
            message="파일 처리 실패",
            warnings=errors_or_warnings
        )

    # 데이터 저장
    _current_data = data

    return UploadResponse(
        success=True,
        message=f"파일 업로드 성공. {len(data.periods)}개 기간, {len(data.items)}개 항목이 로드되었습니다.",
        data=data,
        warnings=errors_or_warnings
    )


@router.get("/current")
async def get_loaded_data():
    """현재 로드된 데이터 조회"""
    global _current_data

    if _current_data is None:
        return JSONResponse({
            "success": False,
            "message": "로드된 데이터가 없습니다."
        })

    return JSONResponse({
        "success": True,
        "data": {
            "periods": _current_data.periods,
            "item_count": len(_current_data.items),
            "categories": list(set(item.분류 for item in _current_data.items))
        }
    })


@router.post("/erp/connect", response_model=ERPConnectionTest)
async def connect_erp(config: ERPConfig):
    """
    ERP 연결 설정

    ERP 시스템에 연결을 설정합니다.
    (현재는 인터페이스만 제공, 실제 연동은 추후 구현)
    """
    result = await erp_connector.connect(config)
    return result


@router.get("/erp/test", response_model=ERPConnectionTest)
async def test_erp_connection():
    """
    ERP 연결 테스트

    현재 설정된 ERP 연결을 테스트합니다.
    """
    result = await erp_connector.test_connection()
    return result


@router.get("/erp/fetch")
async def fetch_erp_data(year: int, month: int):
    """
    ERP 데이터 조회

    ERP 시스템에서 손익 데이터를 조회합니다.
    (현재는 미구현, 추후 ERP 연동 시 활성화)
    """
    return JSONResponse({
        "success": False,
        "message": "ERP 연동은 추후 구현 예정입니다. 현재는 엑셀 업로드를 이용해주세요."
    })
