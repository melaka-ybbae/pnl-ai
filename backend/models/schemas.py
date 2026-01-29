"""Pydantic schemas for P&L analysis system"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date
from .enums import (
    분류Type, 제품군, ReportType, ExportFormat,
    DocumentType, DocumentStatus, PaymentStatus, CurrencyType
)


# ============ 기본 데이터 스키마 ============

class MonthlyAmount(BaseModel):
    """월별 금액 데이터"""
    year: int
    month: int
    amount: float


class AccountItem(BaseModel):
    """계정과목 항목"""
    분류: str
    계정과목: str
    금액: Dict[str, float]  # {"2025년 1월": 1000000, "2025년 2월": 1200000}


class ProfitLossData(BaseModel):
    """손익 데이터 전체 구조"""
    periods: List[str]  # ["2025년 1월", "2025년 2월"]
    items: List[AccountItem]


# ============ 분석 결과 스키마 ============

class PeriodSummary(BaseModel):
    """기간별 요약"""
    매출액: float = 0
    매출원가: float = 0
    매출총이익: float = 0
    판매관리비: float = 0
    영업이익: float = 0
    영업외수익: float = 0
    영업외비용: float = 0
    경상이익: float = 0


class ChangeDetail(BaseModel):
    """변동 상세"""
    분류: str
    계정과목: str
    기준금액: float
    비교금액: float
    변동액: float
    변동률: float


class MonthlyComparisonResult(BaseModel):
    """월간 비교 분석 결과"""
    기준월: str
    비교월: str
    기준_요약: PeriodSummary
    비교_요약: PeriodSummary
    변동_요약: Dict[str, Dict[str, float]]  # {"매출액": {"변동액": 100000, "변동률": 5.0}}
    주요변동항목: List[ChangeDetail]
    ai_comment: Optional[str] = None


class ProductCostResult(BaseModel):
    """제품별 원가 분석 결과"""
    제품군: str
    매출액: float
    직접원가: float
    간접원가배부: float
    총원가: float
    매출총이익: float
    매출총이익률: float


class ProductCostAnalysisResult(BaseModel):
    """제품별 원가 분석 전체 결과"""
    기간: str
    제품별_분석: List[ProductCostResult]
    원가구성비: Dict[str, float]  # {"원재료비": 70.5, "노무비": 10.2, ...}
    ai_comment: Optional[str] = None


# ============ 시뮬레이션 스키마 ============

class CostSimulationInput(BaseModel):
    """원가 시뮬레이션 입력"""
    냉연강판_변동률: float = Field(default=0.0, ge=-50.0, le=50.0)
    도료_변동률: float = Field(default=0.0, ge=-50.0, le=50.0)
    아연_변동률: float = Field(default=0.0, ge=-50.0, le=50.0)
    전력비_변동률: float = Field(default=0.0, ge=-50.0, le=50.0)
    가스비_변동률: float = Field(default=0.0, ge=-50.0, le=50.0)
    노무비_변동률: float = Field(default=0.0, ge=-30.0, le=30.0)


class CostSimulationResult(BaseModel):
    """원가 시뮬레이션 결과"""
    기준_매출원가: float
    예상_매출원가: float
    기준_영업이익: float
    예상_영업이익: float
    영업이익_변동액: float
    영업이익_변동률: float
    원가항목별_영향: Dict[str, float]
    ai_comment: Optional[str] = None


class SensitivityResult(BaseModel):
    """민감도 분석 결과"""
    항목: str
    영업이익_영향도: float  # 해당 항목 1% 변동 시 영업이익 변동률


# ============ 예산 스키마 ============

class BudgetItem(BaseModel):
    """예산 항목"""
    분류: str
    계정과목: str
    월별금액: Dict[str, float]  # {"1월": 1000000, "2월": 1200000, ...}


class BudgetData(BaseModel):
    """예산 데이터"""
    연도: int
    버전: str = "기본"
    항목: List[BudgetItem]


class BudgetComparisonResult(BaseModel):
    """예산 대비 실적 비교 결과"""
    기간: str
    예산_요약: PeriodSummary
    실적_요약: PeriodSummary
    달성률: Dict[str, float]  # {"매출액": 95.5, "영업이익": 102.3}
    주요이탈항목: List[ChangeDetail]
    누계_예산: PeriodSummary
    누계_실적: PeriodSummary
    누계_달성률: Dict[str, float]
    ai_comment: Optional[str] = None


# ============ 보고서 스키마 ============

class ReportRequest(BaseModel):
    """보고서 생성 요청"""
    report_type: ReportType = ReportType.MONTHLY
    export_format: ExportFormat
    기간: str
    포함_섹션: List[str] = ["요약", "월간분석", "제품별원가", "시뮬레이션"]
    include_ai_comment: bool = True


class ReportResponse(BaseModel):
    """보고서 생성 응답"""
    success: bool
    filename: str
    content_type: str
    message: Optional[str] = None


# ============ API 응답 스키마 ============

class AnalysisResponse(BaseModel):
    """분석 API 공통 응답"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None


class UploadResponse(BaseModel):
    """파일 업로드 응답"""
    success: bool
    message: str
    data: Optional[ProfitLossData] = None
    warnings: List[str] = []


# ============ ERP 연동 스키마 ============

class ERPConfig(BaseModel):
    """ERP 연동 설정"""
    erp_type: str  # "SAP", "Oracle", "Custom"
    base_url: str
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class ERPConnectionTest(BaseModel):
    """ERP 연결 테스트 결과"""
    success: bool
    message: str
    erp_version: Optional[str] = None


# ============ 무역 관련 스키마 ============

class InvoiceItem(BaseModel):
    """Commercial Invoice 품목"""
    product: str  # 제품명
    quantity: float  # 수량
    unit: str  # 단위 (MT, KG, PCS 등)
    unit_price: float  # 단가
    amount: float  # 금액
    hs_code: Optional[str] = None  # HS Code


class Invoice(BaseModel):
    """Commercial Invoice (송장)"""
    invoice_no: str  # 송장번호
    date: date  # 발행일
    customer: str  # 고객사명
    country: str  # 국가
    currency: CurrencyType  # 통화
    items: List[InvoiceItem]  # 품목 리스트
    total: float  # 총 금액
    payment_terms: str  # 결제 조건 (T/T, L/C 등)
    status: PaymentStatus = PaymentStatus.PENDING
    incoterms: Optional[str] = None  # FOB, CIF, CFR 등
    remarks: Optional[str] = None


class BillOfLading(BaseModel):
    """Bill of Lading (선하증권)"""
    bl_no: str  # B/L 번호
    invoice_ref: str  # 관련 송장번호
    shipper: str  # 송하인
    consignee: str  # 수하인
    vessel: str  # 선박명
    port_of_loading: str  # 선적항
    port_of_discharge: str  # 양하항
    ship_date: date  # 선적일
    quantity: float  # 수량
    unit: str  # 단위
    weight: Optional[float] = None  # 중량 (KG)
    container_no: Optional[str] = None  # 컨테이너 번호


class AccountReceivable(BaseModel):
    """매출채권 (수출대금 미수금)"""
    invoice_no: str  # 송장번호
    customer: str  # 고객사
    invoice_date: date  # 송장일자
    due_date: date  # 만기일
    amount_usd: float  # USD 금액
    amount_krw: Optional[float] = None  # KRW 환산금액
    exchange_rate: Optional[float] = None  # 적용환율
    paid: bool = False  # 회수 여부
    paid_date: Optional[date] = None  # 회수일
    days_overdue: int = 0  # 연체일수
    status: PaymentStatus = PaymentStatus.PENDING


class AccountPayable(BaseModel):
    """매입채무 (수입대금 미지급금)"""
    invoice_no: str  # 송장번호
    supplier: str  # 공급업체
    invoice_date: date  # 송장일자
    due_date: date  # 지급기한
    amount_usd: float  # USD 금액
    amount_krw: Optional[float] = None  # KRW 환산금액
    exchange_rate: Optional[float] = None  # 적용환율
    paid: bool = False  # 지급 여부
    paid_date: Optional[date] = None  # 지급일
    days_overdue: int = 0  # 연체일수
    status: PaymentStatus = PaymentStatus.PENDING


class ExchangeRate(BaseModel):
    """환율 정보"""
    currency: CurrencyType  # 통화
    rate: float  # 환율 (대 KRW)
    date: date  # 적용일자
    source: Optional[str] = "한국은행"  # 출처


class TradeDocument(BaseModel):
    """무역 서류 관리"""
    id: Optional[int] = None
    doc_type: DocumentType  # 서류 유형
    file_path: str  # 파일 경로
    upload_date: date  # 업로드 일자
    parsed_data: Optional[Dict[str, Any]] = None  # 파싱된 데이터 (JSON)
    status: DocumentStatus = DocumentStatus.UPLOADED
    reference_no: Optional[str] = None  # 참조번호 (송장번호, B/L번호 등)
    notes: Optional[str] = None


class ARAgingReport(BaseModel):
    """매출채권 연령분석 보고서"""
    기준일: date
    총매출채권: float
    당월: float  # 0-30일
    일개월: float  # 31-60일
    이개월: float  # 61-90일
    삼개월이상: float  # 90일 이상
    고객별_분석: List[Dict[str, Any]]  # 고객별 상세


class APAgingReport(BaseModel):
    """매입채무 연령분석 보고서"""
    기준일: date
    총매입채무: float
    당월: float  # 0-30일
    일개월: float  # 31-60일
    이개월: float  # 61-90일
    삼개월이상: float  # 90일 이상
    공급업체별_분석: List[Dict[str, Any]]  # 공급업체별 상세


class TradeStatistics(BaseModel):
    """무역 통계"""
    기간: str  # "2025년 1월"
    총수출액_USD: float
    총수출액_KRW: float
    총수입액_USD: float
    총수입액_KRW: float
    무역수지: float  # 수출-수입
    평균환율: float
    주요수출국: List[Dict[str, float]]  # [{"국가": "미국", "금액": 1000000}]
    주요수입국: List[Dict[str, float]]
