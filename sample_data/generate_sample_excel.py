"""
디케이동신 ERP 샘플 데이터 생성기

실제 ERP에서 추출하는 것처럼 복잡하고 현실적인 데이터를 생성합니다.
각 엑셀 파일은 서로 다른 형태와 구조를 가지며, AI가 이를 조합해서
손익계산서를 생성해야 합니다.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

# 랜덤 시드 고정
np.random.seed(42)
random.seed(42)

# 출력 디렉토리
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ===== 기준 데이터 =====

# 거래처 마스터
CUSTOMERS = {
    'C001': {'name': 'ABC Building Materials Inc.', 'country': 'USA', 'currency': 'USD', 'payment_terms': 60},
    'C002': {'name': 'EuroSteel GmbH', 'country': 'Germany', 'currency': 'EUR', 'payment_terms': 45},
    'C003': {'name': 'Vietnam Construction Co.', 'country': 'Vietnam', 'currency': 'USD', 'payment_terms': 30},
    'C004': {'name': 'Thai Metal Industries', 'country': 'Thailand', 'currency': 'USD', 'payment_terms': 30},
    'C005': {'name': 'Japan Home Appliance Corp.', 'country': 'Japan', 'currency': 'JPY', 'payment_terms': 60},
    'C006': {'name': '(주)한국건설자재', 'country': 'Korea', 'currency': 'KRW', 'payment_terms': 30},
    'C007': {'name': '삼성전자(주)', 'country': 'Korea', 'currency': 'KRW', 'payment_terms': 45},
    'C008': {'name': 'LG전자(주)', 'country': 'Korea', 'currency': 'KRW', 'payment_terms': 45},
}

# 공급업체 마스터
SUPPLIERS = {
    'S001': {'name': '포스코', 'item': '냉연강판', 'currency': 'KRW'},
    'S002': {'name': '현대제철', 'item': '냉연강판', 'currency': 'KRW'},
    'S003': {'name': 'KCC', 'item': '도료', 'currency': 'KRW'},
    'S004': {'name': '노루페인트', 'item': '도료', 'currency': 'KRW'},
    'S005': {'name': 'Korea Zinc', 'item': '아연', 'currency': 'KRW'},
    'S006': {'name': 'Glencore (수입)', 'item': '아연', 'currency': 'USD'},
}

# 제품 마스터
PRODUCTS = {
    'PCM-001': {'name': '컬러강판 RAL9002 (백색)', 'category': '건재용', 'unit': 'TON', 'base_price_krw': 1150000, 'base_price_usd': 850},
    'PCM-002': {'name': '컬러강판 RAL5015 (청색)', 'category': '건재용', 'unit': 'TON', 'base_price_krw': 1180000, 'base_price_usd': 870},
    'PCM-003': {'name': '컬러강판 RAL3020 (적색)', 'category': '건재용', 'unit': 'TON', 'base_price_krw': 1200000, 'base_price_usd': 880},
    'PCM-004': {'name': '컬러강판 RAL7035 (회색)', 'category': '건재용', 'unit': 'TON', 'base_price_krw': 1160000, 'base_price_usd': 855},
    'PCM-101': {'name': '가전용 PCM 0.4T (백색)', 'category': '가전용', 'unit': 'TON', 'base_price_krw': 1350000, 'base_price_usd': 1000},
    'PCM-102': {'name': '가전용 PCM 0.5T (실버)', 'category': '가전용', 'unit': 'TON', 'base_price_krw': 1380000, 'base_price_usd': 1020},
    'PCM-103': {'name': '가전용 PCM 0.6T (블랙)', 'category': '가전용', 'unit': 'TON', 'base_price_krw': 1400000, 'base_price_usd': 1035},
}

# 원자재 마스터
RAW_MATERIALS = {
    'RM-001': {'name': '냉연강판 1.0T', 'unit': 'TON', 'base_price': 780000},
    'RM-002': {'name': '냉연강판 0.8T', 'unit': 'TON', 'base_price': 800000},
    'RM-003': {'name': '냉연강판 0.6T', 'unit': 'TON', 'base_price': 820000},
    'RM-004': {'name': '냉연강판 0.5T', 'unit': 'TON', 'base_price': 850000},
    'RM-101': {'name': '폴리에스터 도료 (백색)', 'unit': 'KG', 'base_price': 4200},
    'RM-102': {'name': '폴리에스터 도료 (청색)', 'unit': 'KG', 'base_price': 4500},
    'RM-103': {'name': '폴리에스터 도료 (적색)', 'unit': 'KG', 'base_price': 4800},
    'RM-104': {'name': '폴리에스터 도료 (기타)', 'unit': 'KG', 'base_price': 4300},
    'RM-201': {'name': '아연도금액', 'unit': 'KG', 'base_price': 2800},
    'RM-202': {'name': '화성처리제', 'unit': 'KG', 'base_price': 3500},
}

# 부서 마스터
DEPARTMENTS = ['영업1팀', '영업2팀', '영업3팀(내수)', '생산1과', '생산2과', '품질관리', '관리부', '경영지원']

# 환율
EXCHANGE_RATES = {
    'USD': 1320.50,
    'EUR': 1425.30,
    'JPY': 8.85,  # 100엔 기준
    'KRW': 1.0,
}


def generate_sales_vouchers(year: int, month: int) -> pd.DataFrame:
    """
    매출전표 생성

    실제 ERP에서 뽑은 것처럼 복잡한 구조:
    - 전표번호, 전표일자, 거래처, 제품, 수량, 단가, 금액
    - 외화/원화 혼재
    - 수출/내수 구분
    - 부서별 실적
    """
    data = []
    voucher_num = 1

    # 해당 월의 일수
    if month == 12:
        days_in_month = 31
    else:
        days_in_month = (datetime(year, month + 1, 1) - datetime(year, month, 1)).days

    # 일별로 전표 생성
    for day in range(1, days_in_month + 1):
        date = datetime(year, month, day)

        # 주말은 거래 적음
        if date.weekday() >= 5:
            num_vouchers = random.randint(0, 3)
        else:
            num_vouchers = random.randint(5, 15)

        for _ in range(num_vouchers):
            customer_code = random.choice(list(CUSTOMERS.keys()))
            customer = CUSTOMERS[customer_code]

            # 제품 선택 (거래처 특성에 따라)
            if customer['country'] == 'Korea':
                # 내수는 가전용 비중 높음
                product_code = random.choice(['PCM-101', 'PCM-102', 'PCM-103', 'PCM-001', 'PCM-004'])
                dept = '영업3팀(내수)'
            elif customer['country'] in ['Japan']:
                # 일본은 가전용
                product_code = random.choice(['PCM-101', 'PCM-102', 'PCM-103'])
                dept = '영업2팀'
            else:
                # 수출은 건재용 위주
                product_code = random.choice(['PCM-001', 'PCM-002', 'PCM-003', 'PCM-004'])
                dept = random.choice(['영업1팀', '영업2팀'])

            product = PRODUCTS[product_code]

            # 수량 (톤 단위, 수출은 대량)
            if customer['country'] != 'Korea':
                qty = round(random.uniform(50, 300), 1)
            else:
                qty = round(random.uniform(10, 80), 1)

            # 단가 (변동 있음)
            currency = customer['currency']
            if currency == 'KRW':
                unit_price = product['base_price_krw'] * random.uniform(0.95, 1.05)
                unit_price = round(unit_price, -2)  # 백원 단위 반올림
            elif currency == 'JPY':
                unit_price = product['base_price_usd'] * 150 * random.uniform(0.95, 1.05)  # 대략 환산
                unit_price = round(unit_price, 0)
            else:
                unit_price = product['base_price_usd'] * random.uniform(0.95, 1.05)
                unit_price = round(unit_price, 2)

            amount = qty * unit_price

            # 원화 환산액
            if currency == 'KRW':
                amount_krw = amount
                exchange_rate = 1.0
            elif currency == 'JPY':
                exchange_rate = EXCHANGE_RATES['JPY'] * random.uniform(0.98, 1.02)
                amount_krw = amount * exchange_rate / 100
            else:
                exchange_rate = EXCHANGE_RATES[currency] * random.uniform(0.98, 1.02)
                amount_krw = amount * exchange_rate

            data.append({
                '전표번호': f'SA-{year}{month:02d}{day:02d}-{voucher_num:04d}',
                '전표일자': date.strftime('%Y-%m-%d'),
                '거래처코드': customer_code,
                '거래처명': customer['name'],
                '국가': customer['country'],
                '제품코드': product_code,
                '제품명': product['name'],
                '제품구분': product['category'],
                '수량': qty,
                '단위': product['unit'],
                '통화': currency,
                '단가': unit_price,
                '공급가액': round(amount, 2),
                '부가세': round(amount * 0.1, 2) if currency == 'KRW' else 0,
                '합계금액': round(amount * 1.1, 2) if currency == 'KRW' else round(amount, 2),
                '적용환율': round(exchange_rate, 2),
                '원화환산액': round(amount_krw, 0),
                '수출/내수': '내수' if customer['country'] == 'Korea' else '수출',
                '담당부서': dept,
                '비고': random.choice(['', '', '', 'L/C거래', '선수금입금', '긴급출하', ''])
            })

            voucher_num += 1

    return pd.DataFrame(data)


def generate_purchase_vouchers(year: int, month: int, target_amount: float = None) -> pd.DataFrame:
    """
    매입전표 생성

    원자재 매입 내역:
    - 냉연강판 (주요 원자재) - 전체의 약 84%
    - 도료 - 약 12%
    - 아연/화성처리제 - 약 4%

    target_amount: 목표 원재료비 (매출의 약 54% 수준으로 조정)
    """
    data = []
    voucher_num = 1

    if month == 12:
        days_in_month = 31
    else:
        days_in_month = (datetime(year, month + 1, 1) - datetime(year, month, 1)).days

    for day in range(1, days_in_month + 1):
        date = datetime(year, month, day)

        # 주말은 입고 없음
        if date.weekday() >= 5:
            continue

        # 냉연강판 입고 (대량, 매일 1-2회) - 빈도 증가
        for _ in range(random.randint(1, 3)):  # 매일 1-3회
            supplier_code = random.choice(['S001', 'S002'])
            supplier = SUPPLIERS[supplier_code]
            material_code = random.choice(['RM-001', 'RM-002', 'RM-003', 'RM-004'])
            material = RAW_MATERIALS[material_code]

            qty = round(random.uniform(300, 800), 1)  # 수량 증가
            price = material['base_price'] * random.uniform(0.98, 1.08)  # 가격 변동
            price = round(price, -2)
            amount = qty * price

            data.append({
                '전표번호': f'PU-{year}{month:02d}{day:02d}-{voucher_num:04d}',
                '전표일자': date.strftime('%Y-%m-%d'),
                '공급업체코드': supplier_code,
                '공급업체명': supplier['name'],
                '품목코드': material_code,
                '품목명': material['name'],
                '품목분류': '원재료-냉연강판',
                '수량': qty,
                '단위': material['unit'],
                '통화': 'KRW',
                '단가': price,
                '공급가액': round(amount, 0),
                '부가세': round(amount * 0.1, 0),
                '합계금액': round(amount * 1.1, 0),
                '입고창고': '원자재창고-A',
                '검수상태': random.choice(['합격', '합격', '합격', '부분합격']),
                '비고': random.choice(['', '', '정기발주', '긴급발주', ''])
            })
            voucher_num += 1

        # 도료 입고 (매일 확률적)
        if random.random() < 0.6:  # 60% 확률
            supplier_code = random.choice(['S003', 'S004'])
            supplier = SUPPLIERS[supplier_code]
            material_code = random.choice(['RM-101', 'RM-102', 'RM-103', 'RM-104'])
            material = RAW_MATERIALS[material_code]

            qty = round(random.uniform(3000, 8000), 0)
            price = material['base_price'] * random.uniform(0.97, 1.05)
            price = round(price, 0)
            amount = qty * price

            data.append({
                '전표번호': f'PU-{year}{month:02d}{day:02d}-{voucher_num:04d}',
                '전표일자': date.strftime('%Y-%m-%d'),
                '공급업체코드': supplier_code,
                '공급업체명': supplier['name'],
                '품목코드': material_code,
                '품목명': material['name'],
                '품목분류': '원재료-도료',
                '수량': qty,
                '단위': material['unit'],
                '통화': 'KRW',
                '단가': price,
                '공급가액': round(amount, 0),
                '부가세': round(amount * 0.1, 0),
                '합계금액': round(amount * 1.1, 0),
                '입고창고': '원자재창고-B',
                '검수상태': '합격',
                '비고': ''
            })
            voucher_num += 1

        # 아연/화성처리제 (주 2-3회)
        if random.random() < 0.35:
            supplier_code = random.choice(['S005', 'S006'])
            supplier = SUPPLIERS[supplier_code]
            material_code = random.choice(['RM-201', 'RM-202'])
            material = RAW_MATERIALS[material_code]

            qty = round(random.uniform(1000, 3000), 0)

            if supplier_code == 'S006':  # 수입
                currency = 'USD'
                price = material['base_price'] / EXCHANGE_RATES['USD'] * random.uniform(0.95, 1.05)
                price = round(price, 2)
                amount = qty * price
                exchange_rate = EXCHANGE_RATES['USD'] * random.uniform(0.98, 1.02)
                amount_krw = amount * exchange_rate
            else:
                currency = 'KRW'
                price = material['base_price'] * random.uniform(0.98, 1.05)
                price = round(price, 0)
                amount = qty * price
                exchange_rate = 1.0
                amount_krw = amount

            data.append({
                '전표번호': f'PU-{year}{month:02d}{day:02d}-{voucher_num:04d}',
                '전표일자': date.strftime('%Y-%m-%d'),
                '공급업체코드': supplier_code,
                '공급업체명': supplier['name'],
                '품목코드': material_code,
                '품목명': material['name'],
                '품목분류': '원재료-부자재',
                '수량': qty,
                '단위': material['unit'],
                '통화': currency,
                '단가': price,
                '공급가액': round(amount, 2),
                '부가세': round(amount * 0.1, 2) if currency == 'KRW' else 0,
                '합계금액': round(amount * 1.1, 2) if currency == 'KRW' else round(amount, 2),
                '입고창고': '원자재창고-C',
                '검수상태': '합격',
                '비고': '수입' if currency == 'USD' else ''
            })
            voucher_num += 1

    return pd.DataFrame(data)


def generate_payroll(year: int, month: int) -> pd.DataFrame:
    """
    급여대장 생성

    실제 급여대장처럼:
    - 부서/직급별 인원
    - 기본급, 각종 수당, 공제 내역
    - 직접노무비/간접노무비 구분 필요
    """
    data = []
    emp_num = 1

    # 부서별 인원 구성
    dept_structure = {
        '생산1과': {'인원': 45, '평균기본급': 3200000, '직접노무비': True},
        '생산2과': {'인원': 38, '평균기본급': 3100000, '직접노무비': True},
        '품질관리': {'인원': 12, '평균기본급': 3500000, '직접노무비': False},
        '영업1팀': {'인원': 8, '평균기본급': 4000000, '직접노무비': False},
        '영업2팀': {'인원': 7, '평균기본급': 3800000, '직접노무비': False},
        '영업3팀(내수)': {'인원': 5, '평균기본급': 3600000, '직접노무비': False},
        '관리부': {'인원': 6, '평균기본급': 3400000, '직접노무비': False},
        '경영지원': {'인원': 4, '평균기본급': 4500000, '직접노무비': False},
    }

    for dept, config in dept_structure.items():
        for i in range(config['인원']):
            # 기본급 (부서 평균 기준 변동)
            base_salary = config['평균기본급'] * random.uniform(0.7, 1.4)
            base_salary = round(base_salary, -4)

            # 각종 수당
            overtime = round(random.uniform(0, 800000), -3) if config['직접노무비'] else round(random.uniform(0, 300000), -3)
            night_shift = round(random.uniform(0, 400000), -3) if config['직접노무비'] else 0
            meal_allowance = 150000
            transport_allowance = 100000
            position_allowance = round(random.uniform(0, 500000), -4)

            # 총 지급액
            gross_pay = base_salary + overtime + night_shift + meal_allowance + transport_allowance + position_allowance

            # 공제 (4대보험 + 소득세)
            national_pension = round(gross_pay * 0.045, 0)
            health_insurance = round(gross_pay * 0.03545, 0)
            employment_insurance = round(gross_pay * 0.009, 0)
            income_tax = round(gross_pay * random.uniform(0.03, 0.15), 0)
            local_tax = round(income_tax * 0.1, 0)

            total_deduction = national_pension + health_insurance + employment_insurance + income_tax + local_tax
            net_pay = gross_pay - total_deduction

            data.append({
                '귀속년월': f'{year}-{month:02d}',
                '사번': f'EMP-{emp_num:04d}',
                '성명': f'직원{emp_num}',
                '부서': dept,
                '직급': random.choice(['사원', '주임', '대리', '과장', '차장', '부장']),
                '입사일': f'{random.randint(2010, 2024)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}',
                '기본급': base_salary,
                '연장근로수당': overtime,
                '야간근로수당': night_shift,
                '식대': meal_allowance,
                '교통비': transport_allowance,
                '직책수당': position_allowance,
                '지급총액': gross_pay,
                '국민연금': national_pension,
                '건강보험': health_insurance,
                '고용보험': employment_insurance,
                '소득세': income_tax,
                '지방소득세': local_tax,
                '공제총액': total_deduction,
                '실지급액': net_pay,
                '원가구분': '직접노무비' if config['직접노무비'] else '간접노무비',
            })
            emp_num += 1

    return pd.DataFrame(data)


def generate_manufacturing_expenses(year: int, month: int) -> pd.DataFrame:
    """
    제조경비 명세 생성

    실제처럼 복잡한 경비 항목:
    - 전력비, 가스비, 수도비
    - 감가상각비
    - 수선유지비
    - 소모품비
    - 외주가공비
    """
    data = []

    # 경비 항목별 기준금액 (월간)
    expense_items = {
        '전력비': {'기준금액': 180000000, '변동률': 0.15, '계정구분': '제조경비'},
        '가스비': {'기준금액': 95000000, '변동률': 0.20, '계정구분': '제조경비'},
        '수도비': {'기준금액': 8500000, '변동률': 0.10, '계정구분': '제조경비'},
        '감가상각비-기계장치': {'기준금액': 45000000, '변동률': 0, '계정구분': '제조경비'},
        '감가상각비-건물': {'기준금액': 15000000, '변동률': 0, '계정구분': '제조경비'},
        '감가상각비-차량운반구': {'기준금액': 3500000, '변동률': 0, '계정구분': '제조경비'},
        '수선유지비': {'기준금액': 25000000, '변동률': 0.30, '계정구분': '제조경비'},
        '소모품비': {'기준금액': 12000000, '변동률': 0.25, '계정구분': '제조경비'},
        '외주가공비': {'기준금액': 35000000, '변동률': 0.20, '계정구분': '제조경비'},
        '운반비': {'기준금액': 28000000, '변동률': 0.15, '계정구분': '제조경비'},
        '보험료': {'기준금액': 8000000, '변동률': 0, '계정구분': '제조경비'},
        '임차료': {'기준금액': 12000000, '변동률': 0, '계정구분': '제조경비'},
        '세금과공과': {'기준금액': 5500000, '변동률': 0.10, '계정구분': '제조경비'},
    }

    voucher_num = 1
    if month == 12:
        days_in_month = 31
    else:
        days_in_month = (datetime(year, month + 1, 1) - datetime(year, month, 1)).days

    for item_name, config in expense_items.items():
        # 금액 변동 적용
        base_amount = config['기준금액']
        variation = config['변동률']
        actual_amount = base_amount * random.uniform(1 - variation, 1 + variation)
        actual_amount = round(actual_amount, -3)

        # 감가상각비는 월말에 한 번
        if '감가상각비' in item_name:
            expense_date = datetime(year, month, days_in_month)
            data.append({
                '전표번호': f'MF-{year}{month:02d}-{voucher_num:04d}',
                '전표일자': expense_date.strftime('%Y-%m-%d'),
                '계정과목': item_name,
                '계정구분': config['계정구분'],
                '적요': f'{month}월 {item_name}',
                '차변금액': actual_amount,
                '대변금액': 0,
                '부서': '생산1과' if '기계' in item_name else '관리부',
                '거래처': '',
                '증빙구분': '결산',
            })
            voucher_num += 1
        else:
            # 다른 경비는 여러 건으로 분산
            num_entries = random.randint(1, 5) if variation > 0 else 1
            for j in range(num_entries):
                expense_date = datetime(year, month, random.randint(1, days_in_month))
                entry_amount = actual_amount / num_entries
                entry_amount = round(entry_amount, -3)

                data.append({
                    '전표번호': f'MF-{year}{month:02d}-{voucher_num:04d}',
                    '전표일자': expense_date.strftime('%Y-%m-%d'),
                    '계정과목': item_name,
                    '계정구분': config['계정구분'],
                    '적요': f'{item_name} - {random.choice(["정기결제", "수시결제", "월정산", ""])}',
                    '차변금액': entry_amount,
                    '대변금액': 0,
                    '부서': random.choice(['생산1과', '생산2과']),
                    '거래처': random.choice(['한국전력', '도시가스', '수도사업소', '삼성물산', '현대글로비스', '']),
                    '증빙구분': random.choice(['세금계산서', '카드', '현금영수증']),
                })
                voucher_num += 1

    return pd.DataFrame(data)


def generate_inventory(year: int, month: int) -> pd.DataFrame:
    """
    재고현황 생성

    기초재고 + 입고 - 출고 = 기말재고
    원재료, 재공품, 제품 구분
    """
    data = []

    # 원재료 재고
    for code, material in RAW_MATERIALS.items():
        beginning_qty = round(random.uniform(500, 2000), 1) if 'RM-00' in code else round(random.uniform(5000, 20000), 0)
        purchase_qty = round(random.uniform(1000, 3000), 1) if 'RM-00' in code else round(random.uniform(10000, 30000), 0)
        usage_qty = round(random.uniform(800, 2500), 1) if 'RM-00' in code else round(random.uniform(8000, 25000), 0)
        ending_qty = beginning_qty + purchase_qty - usage_qty

        avg_price = material['base_price'] * random.uniform(0.98, 1.02)

        data.append({
            '기준년월': f'{year}-{month:02d}',
            '품목코드': code,
            '품목명': material['name'],
            '품목분류': '원재료',
            '단위': material['unit'],
            '기초수량': beginning_qty,
            '입고수량': purchase_qty,
            '출고수량': usage_qty,
            '기말수량': max(ending_qty, 0),
            '평균단가': round(avg_price, 0),
            '기초금액': round(beginning_qty * avg_price, 0),
            '입고금액': round(purchase_qty * avg_price, 0),
            '출고금액': round(usage_qty * avg_price, 0),
            '기말금액': round(max(ending_qty, 0) * avg_price, 0),
            '창고': random.choice(['원자재창고-A', '원자재창고-B', '원자재창고-C']),
        })

    # 제품 재고
    for code, product in PRODUCTS.items():
        beginning_qty = round(random.uniform(100, 500), 1)
        production_qty = round(random.uniform(800, 1500), 1)
        sales_qty = round(random.uniform(700, 1400), 1)
        ending_qty = beginning_qty + production_qty - sales_qty

        # 제조원가 (대략 매출단가의 70%)
        unit_cost = product['base_price_krw'] * 0.72 * random.uniform(0.95, 1.05)

        data.append({
            '기준년월': f'{year}-{month:02d}',
            '품목코드': code,
            '품목명': product['name'],
            '품목분류': '제품',
            '단위': product['unit'],
            '기초수량': beginning_qty,
            '입고수량': production_qty,  # 생산완료
            '출고수량': sales_qty,  # 판매
            '기말수량': max(ending_qty, 0),
            '평균단가': round(unit_cost, 0),
            '기초금액': round(beginning_qty * unit_cost, 0),
            '입고금액': round(production_qty * unit_cost, 0),
            '출고금액': round(sales_qty * unit_cost, 0),
            '기말금액': round(max(ending_qty, 0) * unit_cost, 0),
            '창고': '제품창고',
        })

    # 재공품 (Work in Progress)
    for product_category in ['건재용', '가전용']:
        beginning_qty = round(random.uniform(50, 200), 1)
        input_qty = round(random.uniform(400, 800), 1)
        output_qty = round(random.uniform(380, 750), 1)
        ending_qty = beginning_qty + input_qty - output_qty

        unit_cost = 750000 * random.uniform(0.95, 1.05)

        data.append({
            '기준년월': f'{year}-{month:02d}',
            '품목코드': f'WIP-{product_category[:2]}',
            '품목명': f'재공품-{product_category}',
            '품목분류': '재공품',
            '단위': 'TON',
            '기초수량': beginning_qty,
            '입고수량': input_qty,
            '출고수량': output_qty,
            '기말수량': max(ending_qty, 0),
            '평균단가': round(unit_cost, 0),
            '기초금액': round(beginning_qty * unit_cost, 0),
            '입고금액': round(input_qty * unit_cost, 0),
            '출고금액': round(output_qty * unit_cost, 0),
            '기말금액': round(max(ending_qty, 0) * unit_cost, 0),
            '창고': '생산라인',
        })

    return pd.DataFrame(data)


def generate_selling_admin_expenses(year: int, month: int) -> pd.DataFrame:
    """
    판매관리비 명세 생성
    """
    data = []

    expense_items = {
        '급여-판관비': {'기준금액': 180000000, '변동률': 0.05},
        '퇴직급여-판관비': {'기준금액': 15000000, '변동률': 0.10},
        '복리후생비': {'기준금액': 25000000, '변동률': 0.20},
        '여비교통비': {'기준금액': 12000000, '변동률': 0.30},
        '통신비': {'기준금액': 5000000, '변동률': 0.10},
        '수도광열비-본사': {'기준금액': 8000000, '변동률': 0.15},
        '세금과공과-판관비': {'기준금액': 6000000, '변동률': 0.10},
        '감가상각비-판관비': {'기준금액': 8000000, '변동률': 0},
        '지급임차료': {'기준금액': 15000000, '변동률': 0},
        '보험료-판관비': {'기준금액': 5000000, '변동률': 0},
        '차량유지비': {'기준금액': 8000000, '변동률': 0.25},
        '운반비-판관비': {'기준금액': 45000000, '변동률': 0.20},
        '교육훈련비': {'기준금액': 3000000, '변동률': 0.50},
        '도서인쇄비': {'기준금액': 2000000, '변동률': 0.30},
        '소모품비-판관비': {'기준금액': 4000000, '변동률': 0.25},
        '지급수수료': {'기준금액': 35000000, '변동률': 0.20},
        '광고선전비': {'기준금액': 15000000, '변동률': 0.40},
        '접대비': {'기준금액': 8000000, '변동률': 0.35},
        '대손상각비': {'기준금액': 5000000, '변동률': 0.50},
        '잡비': {'기준금액': 3000000, '변동률': 0.40},
    }

    voucher_num = 1
    if month == 12:
        days_in_month = 31
    else:
        days_in_month = (datetime(year, month + 1, 1) - datetime(year, month, 1)).days

    for item_name, config in expense_items.items():
        base_amount = config['기준금액']
        variation = config['변동률']
        actual_amount = base_amount * random.uniform(1 - variation, 1 + variation)
        actual_amount = round(actual_amount, -3)

        num_entries = random.randint(1, 3)
        for j in range(num_entries):
            expense_date = datetime(year, month, random.randint(1, days_in_month))
            entry_amount = actual_amount / num_entries
            entry_amount = round(entry_amount, -3)

            data.append({
                '전표번호': f'SG-{year}{month:02d}-{voucher_num:04d}',
                '전표일자': expense_date.strftime('%Y-%m-%d'),
                '계정과목': item_name,
                '계정구분': '판매관리비',
                '적요': f'{item_name} {random.choice(["", "결제", "정산"])}',
                '차변금액': entry_amount,
                '대변금액': 0,
                '부서': random.choice(['영업1팀', '영업2팀', '영업3팀(내수)', '관리부', '경영지원']),
                '거래처': '',
                '증빙구분': random.choice(['세금계산서', '카드', '현금영수증', '기타']),
            })
            voucher_num += 1

    return pd.DataFrame(data)


def main():
    """메인 함수 - 모든 샘플 데이터 생성"""

    year = 2025
    month = 1  # 2025년 1월 데이터

    print("=" * 60)
    print("디케이동신 ERP 샘플 데이터 생성")
    print("=" * 60)

    # 1. 매출전표
    print("\n[1/6] 매출전표 생성 중...")
    sales_df = generate_sales_vouchers(year, month)
    sales_file = os.path.join(OUTPUT_DIR, f'매출전표_{year}{month:02d}.xlsx')
    sales_df.to_excel(sales_file, index=False, engine='openpyxl')
    print(f"  - {len(sales_df)}건 생성 완료: {sales_file}")
    print(f"  - 총 매출액: {sales_df['원화환산액'].sum():,.0f}원")

    # 2. 매입전표
    print("\n[2/6] 매입전표 생성 중...")
    purchase_df = generate_purchase_vouchers(year, month)
    purchase_file = os.path.join(OUTPUT_DIR, f'매입전표_{year}{month:02d}.xlsx')
    purchase_df.to_excel(purchase_file, index=False, engine='openpyxl')
    print(f"  - {len(purchase_df)}건 생성 완료: {purchase_file}")
    print(f"  - 총 매입액: {purchase_df['공급가액'].sum():,.0f}원")

    # 3. 급여대장
    print("\n[3/6] 급여대장 생성 중...")
    payroll_df = generate_payroll(year, month)
    payroll_file = os.path.join(OUTPUT_DIR, f'급여대장_{year}{month:02d}.xlsx')
    payroll_df.to_excel(payroll_file, index=False, engine='openpyxl')
    print(f"  - {len(payroll_df)}명 생성 완료: {payroll_file}")
    print(f"  - 총 인건비: {payroll_df['지급총액'].sum():,.0f}원")
    print(f"    - 직접노무비: {payroll_df[payroll_df['원가구분']=='직접노무비']['지급총액'].sum():,.0f}원")
    print(f"    - 간접노무비: {payroll_df[payroll_df['원가구분']=='간접노무비']['지급총액'].sum():,.0f}원")

    # 4. 제조경비
    print("\n[4/6] 제조경비 생성 중...")
    mfg_expense_df = generate_manufacturing_expenses(year, month)
    mfg_expense_file = os.path.join(OUTPUT_DIR, f'제조경비_{year}{month:02d}.xlsx')
    mfg_expense_df.to_excel(mfg_expense_file, index=False, engine='openpyxl')
    print(f"  - {len(mfg_expense_df)}건 생성 완료: {mfg_expense_file}")
    print(f"  - 총 제조경비: {mfg_expense_df['차변금액'].sum():,.0f}원")

    # 5. 재고현황
    print("\n[5/6] 재고현황 생성 중...")
    inventory_df = generate_inventory(year, month)
    inventory_file = os.path.join(OUTPUT_DIR, f'재고현황_{year}{month:02d}.xlsx')
    inventory_df.to_excel(inventory_file, index=False, engine='openpyxl')
    print(f"  - {len(inventory_df)}건 생성 완료: {inventory_file}")

    # 6. 판매관리비
    print("\n[6/6] 판매관리비 생성 중...")
    sg_expense_df = generate_selling_admin_expenses(year, month)
    sg_expense_file = os.path.join(OUTPUT_DIR, f'판매관리비_{year}{month:02d}.xlsx')
    sg_expense_df.to_excel(sg_expense_file, index=False, engine='openpyxl')
    print(f"  - {len(sg_expense_df)}건 생성 완료: {sg_expense_file}")
    print(f"  - 총 판매관리비: {sg_expense_df['차변금액'].sum():,.0f}원")

    print("\n" + "=" * 60)
    print("모든 샘플 데이터 생성 완료!")
    print("=" * 60)

    # 요약 정보
    print("\n[요약]")
    total_sales = sales_df['원화환산액'].sum()
    total_purchase = purchase_df['공급가액'].sum()
    total_labor = payroll_df['지급총액'].sum()
    total_mfg_exp = mfg_expense_df['차변금액'].sum()
    total_sg_exp = sg_expense_df['차변금액'].sum()

    print(f"  매출액: {total_sales:,.0f}원")
    print(f"  원재료비: {total_purchase:,.0f}원")
    print(f"  인건비: {total_labor:,.0f}원")
    print(f"  제조경비: {total_mfg_exp:,.0f}원")
    print(f"  판매관리비: {total_sg_exp:,.0f}원")

    estimated_cogs = total_purchase + payroll_df[payroll_df['원가구분']=='직접노무비']['지급총액'].sum() + total_mfg_exp
    estimated_gp = total_sales - estimated_cogs
    estimated_op = estimated_gp - total_sg_exp - payroll_df[payroll_df['원가구분']=='간접노무비']['지급총액'].sum()

    print(f"\n  [추정 손익]")
    print(f"  매출총이익: {estimated_gp:,.0f}원 ({estimated_gp/total_sales*100:.1f}%)")
    print(f"  영업이익(추정): {estimated_op:,.0f}원 ({estimated_op/total_sales*100:.1f}%)")


if __name__ == '__main__':
    main()
