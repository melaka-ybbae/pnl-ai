"""SQLite database models for budget data"""
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import os

Base = declarative_base()

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "budget", "budget.db")


class Budget(Base):
    """예산 마스터 테이블"""
    __tablename__ = 'budgets'

    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False)
    version = Column(String(50), default="기본")
    created_at = Column(Date, default=datetime.now)
    description = Column(String(200))

    items = relationship("BudgetItemDB", back_populates="budget", cascade="all, delete-orphan")


class BudgetItemDB(Base):
    """예산 상세 항목 테이블"""
    __tablename__ = 'budget_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    budget_id = Column(Integer, ForeignKey('budgets.id'), nullable=False)
    분류 = Column(String(50), nullable=False)
    계정과목 = Column(String(100), nullable=False)
    month_01 = Column(Float, default=0)
    month_02 = Column(Float, default=0)
    month_03 = Column(Float, default=0)
    month_04 = Column(Float, default=0)
    month_05 = Column(Float, default=0)
    month_06 = Column(Float, default=0)
    month_07 = Column(Float, default=0)
    month_08 = Column(Float, default=0)
    month_09 = Column(Float, default=0)
    month_10 = Column(Float, default=0)
    month_11 = Column(Float, default=0)
    month_12 = Column(Float, default=0)

    budget = relationship("Budget", back_populates="items")

    def get_month_amount(self, month: int) -> float:
        """월별 금액 조회"""
        return getattr(self, f"month_{month:02d}", 0)

    def get_yearly_total(self) -> float:
        """연간 합계"""
        return sum(getattr(self, f"month_{i:02d}", 0) for i in range(1, 13))


class RawMaterialPrice(Base):
    """원자재 시세 이력 테이블 (시뮬레이션용)"""
    __tablename__ = 'raw_material_prices'

    id = Column(Integer, primary_key=True, autoincrement=True)
    material_type = Column(String(50), nullable=False)  # 냉연강판, 도료, 아연
    price_date = Column(Date, nullable=False)
    unit_price = Column(Float, nullable=False)  # 원/kg 또는 원/L
    unit = Column(String(20), default="원/kg")
    source = Column(String(100))  # 데이터 출처


def get_engine():
    """데이터베이스 엔진 생성"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return create_engine(f"sqlite:///{DB_PATH}", echo=False)


def get_session():
    """데이터베이스 세션 생성"""
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session()


def init_db():
    """데이터베이스 초기화 (테이블 생성)"""
    engine = get_engine()
    Base.metadata.create_all(engine)
    return engine
