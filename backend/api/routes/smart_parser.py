"""
AI 스마트 파싱 API

지저분한 엑셀 데이터를 AI가 자동으로 인식하고 매핑하는 API
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import Optional
import os
import uuid
from pathlib import Path

from backend.services.ai_smart_parser import AISmartParser

router = APIRouter(prefix="/api/smart-parser", tags=["스마트파싱"])

# 업로드 디렉토리
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "uploads" / "smart_parser"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_result(obj):
    """JSON 직렬화를 위한 데이터 정리"""
    import pandas as pd
    import numpy as np
    import math
    from datetime import datetime

    if isinstance(obj, dict):
        return {k: sanitize_result(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_result(v) for v in obj]
    elif isinstance(obj, (pd.DataFrame,)):
        return None  # DataFrame은 제외
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.floating, np.integer)):
        val = float(obj)
        if math.isnan(val) or math.isinf(val):
            return None
        return val
    elif isinstance(obj, (datetime, pd.Timestamp)):
        return obj.isoformat() if pd.notna(obj) else None
    elif pd.isna(obj):
        return None
    return obj


@router.post("/analyze")
async def analyze_excel(
    file: UploadFile = File(...),
    data_type: str = Form(..., description="데이터 유형: sales, purchases, payroll")
):
    """
    엑셀 파일 스마트 분석

    AI가 컬럼명을 자동으로 인식하고, 이상치를 감지합니다.

    Returns:
    - original_columns: 원본 컬럼명 목록
    - mapped_columns: 매핑된 표준 컬럼명
    - mapping_confidence: 매핑 신뢰도 (평균 및 상세)
    - anomalies: 감지된 이상치 목록
    - warnings: 경고 사항
    - data_quality_score: 데이터 품질 점수 (0-100)
    - parsed_preview: 파싱된 데이터 미리보기 (5행)
    """
    try:
        # 파일 확장자 검증
        allowed_extensions = ['.xlsx', '.xls']
        ext = Path(file.filename).suffix.lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다. 지원: {allowed_extensions}"
            )

        # 데이터 유형 검증
        valid_types = ['sales', 'purchases', 'payroll']
        if data_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"잘못된 데이터 유형입니다. 지원: {valid_types}"
            )

        # 파일 저장
        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{data_type}_{file_id}{ext}"

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # AI 스마트 파싱
        parser = AISmartParser()
        result = parser.analyze_excel(str(file_path), data_type)

        if not result['success']:
            return JSONResponse({
                "success": False,
                "error": result.get('error', '분석 실패')
            }, status_code=400)

        # DataFrame 제거하고 나머지 반환
        result.pop('data', None)

        # JSON 직렬화 가능하도록 정리
        sanitized = sanitize_result(result)

        return JSONResponse({
            "success": True,
            "file_name": file.filename,
            "data_type": data_type,
            **sanitized
        })

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/compare")
async def compare_formats(
    clean_file: UploadFile = File(..., description="깔끔한 데이터"),
    messy_file: UploadFile = File(..., description="지저분한 데이터"),
    data_type: str = Form("sales")
):
    """
    두 파일 비교 분석

    깔끔한 데이터와 지저분한 데이터를 비교하여
    AI 스마트 파싱의 효과를 보여줍니다.
    """
    try:
        parser = AISmartParser()
        results = {}

        for label, file in [("clean", clean_file), ("messy", messy_file)]:
            ext = Path(file.filename).suffix.lower()
            file_id = str(uuid.uuid4())
            file_path = UPLOAD_DIR / f"{label}_{file_id}{ext}"

            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)

            result = parser.analyze_excel(str(file_path), data_type)
            result.pop('data', None)
            results[label] = sanitize_result(result)

        # 비교 요약
        comparison = {
            "clean": {
                "quality_score": results['clean'].get('data_quality_score', {}).get('score', 0),
                "mapping_rate": results['clean'].get('data_quality_score', {}).get('mapping_rate', 0),
                "anomaly_count": sum(results['clean'].get('data_quality_score', {}).get('anomaly_count', {}).values()),
            },
            "messy": {
                "quality_score": results['messy'].get('data_quality_score', {}).get('score', 0),
                "mapping_rate": results['messy'].get('data_quality_score', {}).get('mapping_rate', 0),
                "anomaly_count": sum(results['messy'].get('data_quality_score', {}).get('anomaly_count', {}).values()),
            }
        }

        return JSONResponse({
            "success": True,
            "results": results,
            "comparison": comparison,
            "message": "두 파일 모두 성공적으로 분석되었습니다. 지저분한 데이터도 AI가 자동으로 매핑했습니다."
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/demo-files")
async def list_demo_files():
    """데모용 샘플 파일 목록"""
    sample_dir = Path(__file__).parent.parent.parent.parent / "sample_data"
    messy_dir = sample_dir / "messy_samples"

    files = {
        "clean": [],
        "messy": []
    }

    # 깔끔한 파일
    for f in sample_dir.glob("*.xlsx"):
        if "messy" not in str(f):
            files["clean"].append({
                "name": f.name,
                "path": str(f.relative_to(sample_dir.parent)),
                "description": "표준 형식 데이터"
            })

    # 지저분한 파일
    if messy_dir.exists():
        for f in messy_dir.glob("*.xlsx"):
            desc = ""
            if "더존" in f.name:
                desc = "더존 ERP 스타일 (한글 컬럼명 변형)"
            elif "SAP" in f.name:
                desc = "SAP 스타일 (영문 필드명, 유럽식 날짜)"
            elif "자체" in f.name:
                desc = "회사 자체 양식 (커스텀 컬럼명)"
            elif "오류" in f.name:
                desc = "오류 데이터 포함 (음수, 누락, 이상치)"
            elif "혼합" in f.name:
                desc = "혼합 형식 (한영 혼용, 콤마 포함)"

            files["messy"].append({
                "name": f.name,
                "path": str(f.relative_to(sample_dir.parent)),
                "description": desc
            })

    return JSONResponse({
        "success": True,
        "files": files,
        "demo_scenario": {
            "step1": "깔끔한 데이터 (매출전표_202501.xlsx) 분석 → '이건 당연히 됩니다'",
            "step2": "더존 스타일 데이터 분석 → '컬럼명이 달라도 AI가 자동 매핑'",
            "step3": "SAP 스타일 데이터 분석 → '영문도 자동 인식'",
            "step4": "오류 포함 데이터 분석 → '이상치도 자동 감지!'"
        }
    })
