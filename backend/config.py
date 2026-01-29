"""Configuration settings"""
import os
from pathlib import Path
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 프로젝트 루트 경로
PROJECT_ROOT = Path(__file__).parent.parent

# 데이터 디렉토리
DATA_DIR = PROJECT_ROOT / "data"
SAMPLE_DIR = DATA_DIR / "sample"
BUDGET_DIR = DATA_DIR / "budget"

# 데이터베이스 경로
DATABASE_PATH = BUDGET_DIR / "budget.db"

# API 설정
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8000))

# CORS 설정
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Claude API 설정 (환경변수에서 읽음)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# 분석 설정
SIGNIFICANT_CHANGE_THRESHOLD = 5.0  # 주요 변동 임계값 (%)
BUDGET_DEVIATION_THRESHOLD = 10.0   # 예산 이탈 임계값 (%)

# 컬러강판 원가 구조 기본값
DEFAULT_COST_WEIGHTS = {
    '냉연강판': 0.65,
    '도료': 0.18,
    '아연': 0.05,
    '전력비': 0.05,
    '가스비': 0.03,
    '기타': 0.04
}

# 제품군별 원가 배부 기준
PRODUCT_ALLOCATION_RATES = {
    '건재용': {'직접원가': 0.55, '간접원가': 0.50},
    '가전용': {'직접원가': 0.35, '간접원가': 0.40},
    '기타': {'직접원가': 0.10, '간접원가': 0.10},
}
