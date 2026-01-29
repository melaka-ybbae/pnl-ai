"""AI OCR service for trade document parsing using Claude Vision API"""
import anthropic
import base64
import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).parent.parent.parent
ENV_FILE = PROJECT_ROOT / ".env"


def get_api_key():
    """API 키를 가져옴"""
    load_dotenv(ENV_FILE, override=True)
    return os.getenv("ANTHROPIC_API_KEY")


class DocumentOCRService:
    """Claude Vision API 기반 무역 서류 OCR 서비스"""

    def __init__(self):
        self.model = "claude-sonnet-4-20250514"

    def _create_client(self):
        """매번 새로운 클라이언트 생성"""
        api_key = get_api_key()
        if api_key:
            return anthropic.Anthropic(api_key=api_key)
        return None

    def _encode_image(self, file_path: str) -> tuple[str, str]:
        """이미지를 base64로 인코딩"""
        with open(file_path, "rb") as f:
            data = base64.standard_b64encode(f.read()).decode("utf-8")

        ext = Path(file_path).suffix.lower()
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".pdf": "application/pdf"
        }
        media_type = media_types.get(ext, "image/jpeg")
        return data, media_type

    async def parse_commercial_invoice(self, file_path: str) -> Dict[str, Any]:
        """Commercial Invoice 파싱"""
        client = self._create_client()
        if not client:
            return {"success": False, "error": "API key not configured"}

        try:
            image_data, media_type = self._encode_image(file_path)

            prompt = """당신은 무역 서류 분석 전문가입니다.
첨부된 Commercial Invoice 이미지에서 다음 정보를 JSON 형식으로 추출하세요.
누락된 정보는 null로 표시하세요.

추출 항목:
- invoice_no: 인보이스 번호
- date: 발행일 (YYYY-MM-DD 형식)
- customer: 바이어/수입자명
- customer_address: 바이어 주소
- country: 바이어 국가
- currency: 통화 (USD, EUR, JPY 등)
- items: 품목 배열 [{"product": 제품명, "quantity": 수량, "unit": 단위, "unit_price": 단가, "amount": 금액}]
- total: 총금액
- payment_terms: 결제조건
- incoterms: 인코텀즈 (FOB, CIF 등)
- origin: 원산지

JSON만 출력하고 다른 설명은 하지 마세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )

            response_text = message.content[0].text
            # JSON 파싱 시도
            try:
                # JSON 블록 추출
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                else:
                    json_str = response_text

                parsed_data = json.loads(json_str.strip())
                return {
                    "success": True,
                    "document_type": "commercial_invoice",
                    "data": parsed_data,
                    "raw_response": response_text
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "document_type": "commercial_invoice",
                    "data": None,
                    "raw_response": response_text,
                    "parse_error": "JSON 파싱 실패 - 수동 확인 필요"
                }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def parse_bill_of_lading(self, file_path: str) -> Dict[str, Any]:
        """Bill of Lading (B/L) 파싱"""
        client = self._create_client()
        if not client:
            return {"success": False, "error": "API key not configured"}

        try:
            image_data, media_type = self._encode_image(file_path)

            prompt = """당신은 무역 서류 분석 전문가입니다.
첨부된 Bill of Lading (선하증권) 이미지에서 다음 정보를 JSON 형식으로 추출하세요.
누락된 정보는 null로 표시하세요.

추출 항목:
- bl_no: B/L 번호
- shipper: 송하인 (수출자)
- consignee: 수하인 (수입자)
- notify_party: 통지처
- vessel: 선박명
- voyage_no: 항차번호
- port_of_loading: 선적항
- port_of_discharge: 양륙항
- ship_date: 선적일 (YYYY-MM-DD)
- cargo_description: 화물 설명
- quantity: 수량
- unit: 단위
- gross_weight: 총중량
- measurement: 용적
- container_no: 컨테이너 번호
- seal_no: 씰 번호
- freight: 운임 (Prepaid/Collect)

JSON만 출력하고 다른 설명은 하지 마세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )

            response_text = message.content[0].text
            try:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                else:
                    json_str = response_text

                parsed_data = json.loads(json_str.strip())
                return {
                    "success": True,
                    "document_type": "bill_of_lading",
                    "data": parsed_data,
                    "raw_response": response_text
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "document_type": "bill_of_lading",
                    "data": None,
                    "raw_response": response_text,
                    "parse_error": "JSON 파싱 실패 - 수동 확인 필요"
                }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def parse_packing_list(self, file_path: str) -> Dict[str, Any]:
        """Packing List 파싱"""
        client = self._create_client()
        if not client:
            return {"success": False, "error": "API key not configured"}

        try:
            image_data, media_type = self._encode_image(file_path)

            prompt = """당신은 무역 서류 분석 전문가입니다.
첨부된 Packing List 이미지에서 다음 정보를 JSON 형식으로 추출하세요.
누락된 정보는 null로 표시하세요.

추출 항목:
- packing_list_no: 패킹리스트 번호
- invoice_ref: 관련 인보이스 번호
- date: 작성일 (YYYY-MM-DD)
- shipper: 송하인
- consignee: 수하인
- items: 품목 배열 [{"product": 제품명, "quantity": 수량, "unit": 단위, "net_weight": 순중량, "gross_weight": 총중량, "measurement": 용적, "carton_no": 박스번호}]
- total_packages: 총 포장 수
- total_net_weight: 총 순중량
- total_gross_weight: 총 총중량
- total_measurement: 총 용적

JSON만 출력하고 다른 설명은 하지 마세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )

            response_text = message.content[0].text
            try:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                else:
                    json_str = response_text

                parsed_data = json.loads(json_str.strip())
                return {
                    "success": True,
                    "document_type": "packing_list",
                    "data": parsed_data,
                    "raw_response": response_text
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "document_type": "packing_list",
                    "data": None,
                    "raw_response": response_text,
                    "parse_error": "JSON 파싱 실패 - 수동 확인 필요"
                }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def compare_documents(
        self,
        invoice_data: Dict,
        bl_data: Dict,
        packing_list_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """서류 간 데이터 대사 및 불일치 탐지"""
        client = self._create_client()
        if not client:
            return {"success": False, "error": "API key not configured"}

        try:
            docs = {
                "invoice": invoice_data,
                "bill_of_lading": bl_data
            }
            if packing_list_data:
                docs["packing_list"] = packing_list_data

            prompt = f"""당신은 무역 서류 검토 전문가입니다.
아래 서류들의 데이터를 비교하여 불일치 항목을 찾고 원인을 추론하세요.

[서류 데이터]
{json.dumps(docs, ensure_ascii=False, indent=2)}

다음 JSON 형식으로 분석 결과를 출력하세요:
{{
  "match_status": "일치" 또는 "불일치",
  "discrepancies": [
    {{
      "field": "불일치 항목명",
      "invoice_value": "인보이스 값",
      "bl_value": "B/L 값",
      "packing_list_value": "패킹리스트 값 (있는 경우)",
      "difference": "차이 설명",
      "severity": "high/medium/low",
      "possible_cause": "추정 원인"
    }}
  ],
  "critical_issues": ["심각한 문제 목록"],
  "recommendations": ["권장 조치사항"],
  "summary": "종합 평가 (2-3문장)"
}}

JSON만 출력하고 다른 설명은 하지 마세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text
            try:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                else:
                    json_str = response_text

                comparison_result = json.loads(json_str.strip())
                return {
                    "success": True,
                    "comparison": comparison_result
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "comparison": None,
                    "raw_response": response_text,
                    "parse_error": "JSON 파싱 실패"
                }

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def analyze_ar_risk(self, ar_data: list) -> Dict[str, Any]:
        """외상매출금 리스크 분석"""
        client = self._create_client()
        if not client:
            return {"success": False, "error": "API key not configured"}

        try:
            prompt = f"""당신은 신용 리스크 분석 전문가입니다.
아래 외상매출금(Account Receivable) 데이터를 분석하여 리스크를 평가하세요.

[AR 데이터]
{json.dumps(ar_data, ensure_ascii=False, indent=2)}

다음 JSON 형식으로 분석 결과를 출력하세요:
{{
  "total_outstanding_usd": 총 미수금 (USD),
  "total_outstanding_krw": 총 미수금 (KRW),
  "overdue_amount_usd": 연체 금액 (USD),
  "overdue_ratio": 연체 비율 (%),
  "aging_analysis": {{
    "current": 금액,
    "30_days": 금액,
    "60_days": 금액,
    "90_days_plus": 금액
  }},
  "high_risk_customers": [
    {{
      "customer": "거래처명",
      "outstanding_usd": 미수금액,
      "days_overdue": 연체일수,
      "risk_reason": "리스크 사유"
    }}
  ],
  "recommendations": ["권장 조치사항"],
  "summary": "종합 평가 (2-3문장)"
}}

JSON만 출력하고 다른 설명은 하지 마세요."""

            message = client.messages.create(
                model=self.model,
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text
            try:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                else:
                    json_str = response_text

                analysis_result = json.loads(json_str.strip())
                return {
                    "success": True,
                    "analysis": analysis_result
                }
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "analysis": None,
                    "raw_response": response_text,
                    "parse_error": "JSON 파싱 실패"
                }

        except Exception as e:
            return {"success": False, "error": str(e)}


# 싱글톤 인스턴스
document_ocr_service = DocumentOCRService()
