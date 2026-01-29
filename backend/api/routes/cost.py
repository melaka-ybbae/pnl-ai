"""Cost Management API routes - 원가 관리"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional
import json
from pathlib import Path
from datetime import date, datetime

router = APIRouter(prefix="/api/cost", tags=["원가관리"])

# 샘플 데이터 경로
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def load_sample_data(filename: str):
    """샘플 데이터 로드"""
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


@router.get("/raw-materials")
async def get_raw_materials(
    material_type: Optional[str] = Query(None, description="원자재 유형 필터"),
    supplier: Optional[str] = Query(None, description="공급업체 필터"),
    limit: int = Query(50, description="조회 건수")
):
    """
    원자재 현황 조회

    - 강판, 코일, 부자재 등
    - 재고 수량, 단가
    - 공급업체별 현황
    """
    try:
        # 샘플 원자재 데이터
        raw_materials = [
            {
                "material_id": "RM-001",
                "material_name": "냉연강판 (CR Coil)",
                "material_type": "강판",
                "supplier": "POSCO",
                "unit_price": 850000,
                "currency": "KRW",
                "unit": "톤",
                "current_stock": 125.5,
                "min_stock": 50.0,
                "last_purchase_date": "2025-01-20",
                "last_purchase_price": 850000
            },
            {
                "material_id": "RM-002",
                "material_name": "아연도금강판 (GI Coil)",
                "material_type": "강판",
                "supplier": "현대제철",
                "unit_price": 920000,
                "currency": "KRW",
                "unit": "톤",
                "current_stock": 89.3,
                "min_stock": 40.0,
                "last_purchase_date": "2025-01-22",
                "last_purchase_price": 915000
            },
            {
                "material_id": "RM-003",
                "material_name": "도료 (Paint)",
                "material_type": "부자재",
                "supplier": "KCC",
                "unit_price": 12500,
                "currency": "KRW",
                "unit": "리터",
                "current_stock": 3200,
                "min_stock": 1000,
                "last_purchase_date": "2025-01-15",
                "last_purchase_price": 12300
            },
            {
                "material_id": "RM-004",
                "material_name": "포장재 (Packing)",
                "material_type": "부자재",
                "supplier": "동화기업",
                "unit_price": 850,
                "currency": "KRW",
                "unit": "개",
                "current_stock": 15000,
                "min_stock": 5000,
                "last_purchase_date": "2025-01-18",
                "last_purchase_price": 850
            }
        ]

        # 필터링
        filtered = raw_materials
        if material_type:
            filtered = [m for m in filtered if m["material_type"] == material_type]
        if supplier:
            filtered = [m for m in filtered if supplier.lower() in m["supplier"].lower()]

        # 재고 알림 체크
        low_stock = [m for m in filtered if m["current_stock"] < m["min_stock"]]

        return JSONResponse({
            "success": True,
            "data": {
                "materials": filtered[:limit],
                "summary": {
                    "total_count": len(filtered),
                    "low_stock_count": len(low_stock),
                    "total_value_krw": sum(m["unit_price"] * m["current_stock"] for m in filtered)
                },
                "low_stock_items": low_stock
            },
            "total": len(filtered)
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/analysis")
async def get_cost_analysis(
    year: Optional[int] = Query(None, description="연도"),
    month: Optional[int] = Query(None, description="월")
):
    """
    원가 분석

    - 제품별 원가 구성
    - 재료비, 노무비, 경비 분석
    - 원가율 추이
    """
    try:
        # 기본값: 현재 년월
        if not year:
            year = date.today().year
        if not month:
            month = date.today().month

        # 샘플 원가 분석 데이터
        cost_breakdown = {
            "period": f"{year}년 {month}월",
            "total_cost": 2065000000,
            "breakdown": {
                "raw_materials": {
                    "amount": 1450000000,
                    "ratio": 70.2,
                    "items": [
                        {"name": "강판", "amount": 1200000000, "ratio": 82.8},
                        {"name": "도료", "amount": 150000000, "ratio": 10.3},
                        {"name": "부자재", "amount": 100000000, "ratio": 6.9}
                    ]
                },
                "labor": {
                    "amount": 350000000,
                    "ratio": 17.0,
                    "items": [
                        {"name": "직접노무비", "amount": 280000000, "ratio": 80.0},
                        {"name": "간접노무비", "amount": 70000000, "ratio": 20.0}
                    ]
                },
                "overhead": {
                    "amount": 265000000,
                    "ratio": 12.8,
                    "items": [
                        {"name": "제조경비", "amount": 150000000, "ratio": 56.6},
                        {"name": "감가상각비", "amount": 80000000, "ratio": 30.2},
                        {"name": "기타", "amount": 35000000, "ratio": 13.2}
                    ]
                }
            },
            "cost_per_unit": {
                "average": 855000,
                "currency": "KRW",
                "unit": "톤"
            },
            "variance_analysis": {
                "vs_budget": {
                    "amount": -35000000,
                    "percentage": -1.7,
                    "status": "favorable"
                },
                "vs_previous_month": {
                    "amount": 25000000,
                    "percentage": 1.2,
                    "status": "unfavorable"
                }
            }
        }

        return JSONResponse({
            "success": True,
            "data": cost_breakdown
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/purchase/upload")
async def upload_purchase_invoice(
    file: UploadFile = File(...),
    supplier: str = Query(..., description="공급업체명"),
    material_type: str = Query("강판", description="원자재 유형")
):
    """
    수입 인보이스 업로드 및 OCR

    - 원자재 구매 인보이스
    - AI OCR 자동 파싱
    - 매입 데이터 등록
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
        # ocr_result = await document_ocr_service.parse_purchase_invoice(contents)

        # 임시 응답
        return JSONResponse({
            "success": True,
            "message": "구매 인보이스가 업로드되었습니다.",
            "data": {
                "filename": file.filename,
                "size": len(contents),
                "supplier": supplier,
                "material_type": material_type,
                "parsed_data": {
                    "invoice_no": "PI-2025-001",
                    "supplier": supplier,
                    "date": date.today().isoformat(),
                    "material": material_type,
                    "quantity": 50.0,
                    "unit_price": 850000,
                    "total_amount": 42500000,
                    "currency": "KRW"
                }
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/by-product/{product_code}")
async def get_cost_by_product(
    product_code: str,
    detail: bool = Query(False, description="상세 원가 구성 포함")
):
    """
    제품별 원가 조회
    """
    try:
        # 샘플 제품별 원가 데이터
        product_cost = {
            "product_code": product_code,
            "product_name": "컬러강판 0.5T x 1000W",
            "standard_cost": 875000,
            "actual_cost": 882000,
            "currency": "KRW",
            "unit": "톤"
        }

        if detail:
            product_cost["detail"] = {
                "raw_materials": {
                    "cr_coil": {
                        "quantity": 1.05,
                        "unit": "톤",
                        "unit_price": 850000,
                        "amount": 892500
                    },
                    "paint": {
                        "quantity": 15.0,
                        "unit": "리터",
                        "unit_price": 12500,
                        "amount": 187500
                    },
                    "others": {
                        "amount": 50000
                    }
                },
                "labor": {
                    "direct": 180000,
                    "indirect": 45000
                },
                "overhead": {
                    "manufacturing": 120000,
                    "depreciation": 80000,
                    "others": 30000
                },
                "total_breakdown": {
                    "materials": 1130000,
                    "labor": 225000,
                    "overhead": 230000,
                    "total": 1585000
                }
            }

        return JSONResponse({
            "success": True,
            "data": product_cost
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/variance")
async def get_cost_variance(
    year: int = Query(..., description="연도"),
    month: int = Query(..., description="월")
):
    """
    원가 차이 분석 (실제 vs 표준)
    """
    try:
        variance_analysis = {
            "period": f"{year}년 {month}월",
            "summary": {
                "standard_cost": 2100000000,
                "actual_cost": 2065000000,
                "variance": -35000000,
                "variance_percentage": -1.67,
                "status": "favorable"
            },
            "by_category": [
                {
                    "category": "재료비",
                    "standard": 1500000000,
                    "actual": 1450000000,
                    "variance": -50000000,
                    "variance_percentage": -3.33,
                    "status": "favorable",
                    "reason": "강판 단가 하락"
                },
                {
                    "category": "노무비",
                    "standard": 340000000,
                    "actual": 350000000,
                    "variance": 10000000,
                    "variance_percentage": 2.94,
                    "status": "unfavorable",
                    "reason": "야간작업 증가"
                },
                {
                    "category": "제조경비",
                    "standard": 260000000,
                    "actual": 265000000,
                    "variance": 5000000,
                    "variance_percentage": 1.92,
                    "status": "unfavorable",
                    "reason": "전력비 상승"
                }
            ]
        }

        return JSONResponse({
            "success": True,
            "data": variance_analysis
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/supplier-comparison")
async def get_supplier_comparison(material_type: str = Query("강판", description="원자재 유형")):
    """
    공급업체별 단가 비교
    """
    try:
        comparison = {
            "material_type": material_type,
            "suppliers": [
                {
                    "supplier": "POSCO",
                    "unit_price": 850000,
                    "quality_score": 95,
                    "delivery_score": 90,
                    "payment_terms": "Net 60",
                    "avg_lead_time": 7
                },
                {
                    "supplier": "현대제철",
                    "unit_price": 845000,
                    "quality_score": 92,
                    "delivery_score": 88,
                    "payment_terms": "Net 45",
                    "avg_lead_time": 5
                },
                {
                    "supplier": "동국제강",
                    "unit_price": 855000,
                    "quality_score": 90,
                    "delivery_score": 85,
                    "payment_terms": "Net 30",
                    "avg_lead_time": 10
                }
            ],
            "recommendation": {
                "best_price": "현대제철",
                "best_quality": "POSCO",
                "best_delivery": "POSCO"
            }
        }

        return JSONResponse({
            "success": True,
            "data": comparison
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
