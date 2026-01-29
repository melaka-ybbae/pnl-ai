"""SQLite database models for budget data and trade documents"""
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Boolean, Text, JSON, create_engine
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


# ============ 무역 관련 데이터베이스 모델 ============

class InvoiceModel(Base):
    """Commercial Invoice 테이블"""
    __tablename__ = 'invoices'

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_no = Column(String(50), unique=True, nullable=False, index=True)
    date = Column(Date, nullable=False)
    customer = Column(String(200), nullable=False, index=True)
    country = Column(String(100), nullable=False)
    currency = Column(String(3), default="USD")  # USD, KRW, EUR 등
    total = Column(Float, nullable=False)
    payment_terms = Column(String(100))  # T/T, L/C 등
    status = Column(String(20), default="pending")  # pending, partial, paid, overdue
    incoterms = Column(String(20))  # FOB, CIF, CFR 등
    remarks = Column(Text)
    created_at = Column(Date, default=datetime.now)

    # Relationships
    items = relationship("InvoiceItemModel", back_populates="invoice", cascade="all, delete-orphan")
    bl = relationship("BLModel", back_populates="invoice", uselist=False)
    ar = relationship("ARModel", back_populates="invoice", uselist=False)


class InvoiceItemModel(Base):
    """Invoice 품목 테이블"""
    __tablename__ = 'invoice_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False)
    product = Column(String(200), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)  # MT, KG, PCS 등
    unit_price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    hs_code = Column(String(20))  # HS Code

    invoice = relationship("InvoiceModel", back_populates="items")


class BLModel(Base):
    """Bill of Lading (선하증권) 테이블"""
    __tablename__ = 'bills_of_lading'

    id = Column(Integer, primary_key=True, autoincrement=True)
    bl_no = Column(String(50), unique=True, nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False, index=True)
    shipper = Column(String(200), nullable=False)
    consignee = Column(String(200), nullable=False)
    vessel = Column(String(200), nullable=False)
    port_of_loading = Column(String(100), nullable=False)
    port_of_discharge = Column(String(100), nullable=False)
    ship_date = Column(Date, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    weight = Column(Float)  # KG
    container_no = Column(String(50))
    created_at = Column(Date, default=datetime.now)

    invoice = relationship("InvoiceModel", back_populates="bl")


class ARModel(Base):
    """매출채권 (Account Receivable) 테이블"""
    __tablename__ = 'accounts_receivable'

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False, unique=True, index=True)
    customer = Column(String(200), nullable=False, index=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    amount_usd = Column(Float, nullable=False)
    amount_krw = Column(Float)
    exchange_rate = Column(Float)
    paid = Column(Boolean, default=False)
    paid_date = Column(Date)
    days_overdue = Column(Integer, default=0)
    status = Column(String(20), default="pending")  # pending, partial, paid, overdue
    created_at = Column(Date, default=datetime.now)

    invoice = relationship("InvoiceModel", back_populates="ar")


class APModel(Base):
    """매입채무 (Account Payable) 테이블"""
    __tablename__ = 'accounts_payable'

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_no = Column(String(50), nullable=False, index=True)
    supplier = Column(String(200), nullable=False, index=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    amount_usd = Column(Float, nullable=False)
    amount_krw = Column(Float)
    exchange_rate = Column(Float)
    paid = Column(Boolean, default=False)
    paid_date = Column(Date)
    days_overdue = Column(Integer, default=0)
    status = Column(String(20), default="pending")  # pending, partial, paid, overdue
    created_at = Column(Date, default=datetime.now)


class ExchangeRateModel(Base):
    """환율 정보 테이블"""
    __tablename__ = 'exchange_rates'

    id = Column(Integer, primary_key=True, autoincrement=True)
    currency = Column(String(3), nullable=False, index=True)  # USD, EUR, JPY 등
    rate = Column(Float, nullable=False)  # 대 KRW 환율
    date = Column(Date, nullable=False, index=True)
    source = Column(String(100), default="한국은행")
    created_at = Column(Date, default=datetime.now)


class TradeDocumentModel(Base):
    """무역 서류 관리 테이블"""
    __tablename__ = 'trade_documents'

    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_type = Column(String(20), nullable=False, index=True)  # invoice, bl, packing_list, lc
    file_path = Column(String(500), nullable=False)
    upload_date = Column(Date, nullable=False, default=datetime.now)
    parsed_data = Column(JSON)  # 파싱된 데이터 (JSON 형태)
    status = Column(String(20), default="uploaded")  # uploaded, parsed, confirmed, error
    reference_no = Column(String(50), index=True)  # 송장번호, B/L번호 등
    notes = Column(Text)
    created_at = Column(Date, default=datetime.now)
