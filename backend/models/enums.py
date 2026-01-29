"""Enum definitions for P&L analysis system"""
from enum import Enum


class 분류Type(str, Enum):
    """손익계산서 분류"""
    매출 = "매출"
    매출원가 = "매출원가"
    판매관리비 = "판매관리비"
    영업외손익 = "영업외손익"


class 제품군(str, Enum):
    """컬러강판 제품군"""
    건재용 = "건재용"
    가전용 = "가전용"
    기타 = "기타"


class 원자재Type(str, Enum):
    """주요 원자재 종류"""
    냉연강판 = "냉연강판"  # 주요 원재료 (비중 60-70%)
    도료 = "도료"          # 코팅 재료 (비중 15-20%)
    아연 = "아연"          # 도금 재료


class ReportType(str, Enum):
    """보고서 유형"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class ExportFormat(str, Enum):
    """내보내기 형식"""
    PDF = "pdf"
    EXCEL = "excel"
