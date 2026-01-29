"""Trade Documents API routes"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
import os
import uuid
from datetime import date
from pathlib import Path

from backend.services.document_ocr import document_ocr_service
from backend.models.enums import DocumentType, DocumentStatus

router = APIRouter(prefix="/api/documents", tags=["무역서류"])

# 업로드 디렉토리 설정
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "uploads" / "documents"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload/invoice")
async def upload_commercial_invoice(
    file: UploadFile = File(...),
    auto_parse: bool = Query(True, description="자동 OCR 파싱 여부")
):
    """
    Commercial Invoice 업로드 및 OCR 파싱

    PDF 또는 이미지 파일을 업로드하면 AI가 자동으로 내용을 파싱합니다.
    """
    try:
        # 파일 확장자 검증
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        ext = Path(file.filename).suffix.lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다. 지원: {allowed_extensions}"
            )

        # 파일 저장
        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"invoice_{file_id}{ext}"

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        result = {
            "success": True,
            "file_id": file_id,
            "file_path": str(file_path),
            "original_name": file.filename,
            "doc_type": DocumentType.INVOICE.value,
            "status": DocumentStatus.UPLOADED.value
        }

        # 자동 파싱
        if auto_parse:
            parse_result = await document_ocr_service.parse_commercial_invoice(str(file_path))
            result["parsed"] = parse_result
            result["status"] = DocumentStatus.PARSED.value if parse_result.get("success") else DocumentStatus.ERROR.value

        return JSONResponse(result)

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/upload/bl")
async def upload_bill_of_lading(
    file: UploadFile = File(...),
    auto_parse: bool = Query(True, description="자동 OCR 파싱 여부")
):
    """
    Bill of Lading (선하증권) 업로드 및 OCR 파싱
    """
    try:
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        ext = Path(file.filename).suffix.lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다. 지원: {allowed_extensions}"
            )

        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"bl_{file_id}{ext}"

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        result = {
            "success": True,
            "file_id": file_id,
            "file_path": str(file_path),
            "original_name": file.filename,
            "doc_type": DocumentType.BL.value,
            "status": DocumentStatus.UPLOADED.value
        }

        if auto_parse:
            parse_result = await document_ocr_service.parse_bill_of_lading(str(file_path))
            result["parsed"] = parse_result
            result["status"] = DocumentStatus.PARSED.value if parse_result.get("success") else DocumentStatus.ERROR.value

        return JSONResponse(result)

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/upload/packing-list")
async def upload_packing_list(
    file: UploadFile = File(...),
    auto_parse: bool = Query(True, description="자동 OCR 파싱 여부")
):
    """
    Packing List 업로드 및 OCR 파싱
    """
    try:
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        ext = Path(file.filename).suffix.lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다. 지원: {allowed_extensions}"
            )

        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"packing_{file_id}{ext}"

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        result = {
            "success": True,
            "file_id": file_id,
            "file_path": str(file_path),
            "original_name": file.filename,
            "doc_type": DocumentType.PACKING_LIST.value,
            "status": DocumentStatus.UPLOADED.value
        }

        if auto_parse:
            parse_result = await document_ocr_service.parse_packing_list(str(file_path))
            result["parsed"] = parse_result
            result["status"] = DocumentStatus.PARSED.value if parse_result.get("success") else DocumentStatus.ERROR.value

        return JSONResponse(result)

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/compare")
async def compare_documents(
    invoice_data: dict,
    bl_data: dict,
    packing_list_data: Optional[dict] = None
):
    """
    서류 간 데이터 대사

    Invoice, B/L, Packing List 간 데이터를 비교하여 불일치를 탐지합니다.
    """
    try:
        result = await document_ocr_service.compare_documents(
            invoice_data=invoice_data,
            bl_data=bl_data,
            packing_list_data=packing_list_data
        )
        return JSONResponse(result)

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/confirm/{file_id}")
async def confirm_document(
    file_id: str,
    confirmed_data: dict
):
    """
    파싱 결과 확정

    사용자가 검토/수정한 데이터를 확정하고 DB에 저장합니다.
    """
    try:
        # TODO: DB에 저장 로직 추가
        return JSONResponse({
            "success": True,
            "message": "서류가 확정되었습니다.",
            "file_id": file_id,
            "status": DocumentStatus.CONFIRMED.value
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/list")
async def list_documents(
    doc_type: Optional[str] = Query(None, description="서류 유형 필터"),
    status: Optional[str] = Query(None, description="상태 필터"),
    limit: int = Query(50, description="조회 건수")
):
    """
    업로드된 서류 목록 조회
    """
    try:
        # TODO: DB에서 조회 로직 추가
        # 현재는 샘플 데이터 반환
        sample_docs = [
            {
                "file_id": "sample-001",
                "doc_type": "invoice",
                "original_name": "INV-2025-001.pdf",
                "upload_date": "2025-01-15",
                "status": "confirmed",
                "reference_no": "INV-2025-001"
            },
            {
                "file_id": "sample-002",
                "doc_type": "bl",
                "original_name": "BL-MSKU1234567.pdf",
                "upload_date": "2025-01-20",
                "status": "parsed",
                "reference_no": "MSKU1234567"
            }
        ]

        return JSONResponse({
            "success": True,
            "data": sample_docs,
            "total": len(sample_docs)
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/upload/lc")
async def upload_letter_of_credit(
    file: UploadFile = File(...),
    auto_parse: bool = Query(True, description="자동 OCR 파싱 여부")
):
    """
    L/C (Letter of Credit, 신용장) 업로드 및 파싱

    - 신용장 조건 추출
    - 주요 조항 자동 파싱
    """
    try:
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        ext = Path(file.filename).suffix.lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다. 지원: {allowed_extensions}"
            )

        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"lc_{file_id}{ext}"

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        result = {
            "success": True,
            "file_id": file_id,
            "file_path": str(file_path),
            "original_name": file.filename,
            "doc_type": "lc",
            "status": "uploaded"
        }

        # 자동 파싱
        if auto_parse:
            # TODO: L/C OCR 파싱 구현
            result["parsed"] = {
                "lc_no": "LC-2025-001",
                "issuing_bank": "Bank of America",
                "applicant": "ABC Corp",
                "beneficiary": "DK Dongshin",
                "amount": 500000.00,
                "currency": "USD",
                "expiry_date": "2025-06-30",
                "latest_shipment_date": "2025-05-31",
                "partial_shipment": "allowed",
                "transhipment": "allowed",
                "payment_terms": "sight"
            }
            result["status"] = "parsed"

        return JSONResponse(result)

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.post("/lc-review")
async def review_lc_conditions(lc_data: dict):
    """
    [AI] L/C 조건 검토

    - 신용장 조건 분석
    - 리스크 요인 식별
    - 준수 사항 체크리스트
    """
    try:
        # TODO: AI 서비스 호출
        # from backend.services.ai_analysis import ai_analyzer
        # review_result = await ai_analyzer.review_lc(lc_data)

        # 샘플 응답
        review_result = {
            "success": True,
            "lc_no": lc_data.get("lc_no", ""),
            "risk_level": "medium",
            "findings": [
                {
                    "category": "shipment_terms",
                    "severity": "medium",
                    "item": "선적일자",
                    "condition": "Latest Shipment: 2025-05-31",
                    "comment": "선적일까지 4개월입니다. 생산 일정 확인이 필요합니다.",
                    "action_required": True
                },
                {
                    "category": "payment_terms",
                    "severity": "low",
                    "item": "결제 조건",
                    "condition": "At Sight",
                    "comment": "즉시 결제 조건으로 유리합니다.",
                    "action_required": False
                },
                {
                    "category": "documents",
                    "severity": "high",
                    "item": "제출 서류",
                    "condition": "Commercial Invoice, B/L, Packing List, Certificate of Origin",
                    "comment": "원산지증명서가 필요합니다. 발급 가능 여부 확인 필요.",
                    "action_required": True
                }
            ],
            "checklist": [
                {"item": "유효기간 확인", "status": "ok", "comment": "6개월 유효"},
                {"item": "금액 확인", "status": "ok", "comment": "계약 금액과 일치"},
                {"item": "선적항/도착항", "status": "pending", "comment": "확인 필요"},
                {"item": "분할 선적 가능 여부", "status": "ok", "comment": "허용"},
                {"item": "환적 가능 여부", "status": "ok", "comment": "허용"}
            ],
            "recommendations": [
                "선적일자가 촉박하므로 생산 계획을 즉시 수립하세요.",
                "원산지증명서 발급을 준비하세요.",
                "모든 서류는 L/C 조건과 정확히 일치해야 합니다."
            ]
        }

        return JSONResponse(review_result)

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/{file_id}")
async def get_document_detail(file_id: str):
    """
    서류 상세 조회
    """
    try:
        # TODO: DB에서 조회

        # 샘플 응답
        return JSONResponse({
            "success": True,
            "data": {
                "file_id": file_id,
                "doc_type": "invoice",
                "original_name": "INV-2025-001.pdf",
                "upload_date": "2025-01-15",
                "status": "confirmed",
                "parsed_data": {
                    "invoice_no": "INV-2025-001",
                    "customer": "ABC Corp",
                    "date": "2025-01-10",
                    "amount": 50000.00,
                    "currency": "USD"
                }
            }
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)
