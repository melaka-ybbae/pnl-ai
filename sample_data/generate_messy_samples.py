"""
지저분한 샘플 데이터 생성기

데모용으로 다양한 형식의 엑셀 파일을 생성합니다:
1. 더존 ERP 스타일 (한글, 다른 컬럼명)
2. SAP 스타일 (영문, 코드 기반)
3. 자체 양식 (회사별 커스텀 컬럼명)
4. 오류 포함 데이터 (이상치, 누락, 형식 오류)
"""

import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from pathlib import Path


def generate_douzone_style_sales():
    """
    더존 iCUBE 스타일 매출전표

    특징:
    - 한글 컬럼명이지만 약간 다름
    - 날짜 형식: YYYY-MM-DD
    - 금액에 콤마 없음
    """
    data = []

    customers = [
        {'code': 'C001', 'name': 'ABC건자재(주)', 'country': 'USA'},
        {'code': 'C002', 'name': '유로스틸 GmbH', 'country': 'Germany'},
        {'code': 'C003', 'name': '베트남건설', 'country': 'Vietnam'},
        {'code': 'C004', 'name': '(주)한국철강', 'country': 'Korea'},
    ]

    products = [
        {'code': 'PCM-001', 'name': '컬러강판 RAL9002', 'category': '건재용'},
        {'code': 'PCM-002', 'name': '컬러강판 RAL5015', 'category': '건재용'},
        {'code': 'PCM-003', 'name': '가전용PCM WHITE', 'category': '가전용'},
    ]

    for i in range(50):
        date = datetime(2025, 1, 1) + timedelta(days=random.randint(0, 30))
        customer = random.choice(customers)
        product = random.choice(products)

        qty = random.randint(10, 100)
        price = random.randint(800000, 950000)
        amount = qty * price

        is_export = customer['country'] != 'Korea'
        fx_rate = random.uniform(1300, 1350) if is_export else 1

        data.append({
            '매출일자': date.strftime('%Y-%m-%d'),  # 다른 컬럼명
            '전표No': f'SL-{date.strftime("%Y%m%d")}-{i+1:04d}',  # 다른 컬럼명
            '거래선코드': customer['code'],  # 다른 컬럼명
            '거래선명': customer['name'],  # 다른 컬럼명
            '품목Code': product['code'],
            '품명': product['name'],  # 다른 컬럼명
            '매출수량': qty,  # 다른 컬럼명
            'Unit': 'TON',
            '매출단가': price,  # 다른 컬럼명
            '매출금액': amount,  # 다른 컬럼명
            'VAT': int(amount * 0.1),
            '합계': int(amount * 1.1),
            '화폐': 'USD' if is_export else 'KRW',
            '환율적용': round(fx_rate, 2) if is_export else 1,
            '원화매출': int(amount * fx_rate) if is_export else amount,  # 다른 컬럼명
            '내수/수출': '수출' if is_export else '내수',  # 다른 컬럼명
            '품목분류': product['category'],  # 다른 컬럼명
        })

    return pd.DataFrame(data)


def generate_sap_style_sales():
    """
    SAP 스타일 매출전표

    특징:
    - 영문 컬럼명 (SAP 표준 필드명)
    - 날짜 형식: DD.MM.YYYY (유럽식)
    - 숫자에 천단위 구분자 없음
    """
    data = []

    for i in range(40):
        date = datetime(2025, 1, 1) + timedelta(days=random.randint(0, 30))

        qty = random.randint(10, 80)
        price = random.randint(800, 950)  # USD
        amount = qty * price

        data.append({
            'BUDAT': date.strftime('%d.%m.%Y'),  # SAP 날짜 형식
            'BELNR': f'{random.randint(1000000000, 9999999999)}',  # SAP 문서번호
            'KUNNR': f'{random.randint(100000, 999999)}',  # SAP 고객번호
            'NAME1': random.choice(['ABC Corp', 'Euro Steel', 'Vietnam Const', 'Korea Steel']),
            'MATNR': f'000000000{random.randint(1000, 9999)}',  # SAP 자재번호
            'MAKTX': random.choice(['PCM RAL9002', 'PCM RAL5015', 'PCM WHITE']),
            'MENGE': qty,
            'MEINS': 'TO',  # SAP 단위
            'NETPR': price,
            'NETWR': amount,
            'MWSBP': int(amount * 0.1),
            'WAERK': 'USD',
            'KURRF': round(random.uniform(1300, 1350), 2),
            'DMBTR': int(amount * random.uniform(1300, 1350)),  # 로컬 통화 금액
        })

    return pd.DataFrame(data)


def generate_custom_format_sales():
    """
    회사 자체 양식 매출전표

    특징:
    - 회사에서 만든 독자적인 컬럼명
    - 불필요한 컬럼 포함
    - 날짜 형식: YYYY/MM/DD
    """
    data = []

    for i in range(45):
        date = datetime(2025, 1, 1) + timedelta(days=random.randint(0, 30))

        qty = random.randint(15, 90)
        price = random.randint(850000, 920000)
        amount = qty * price
        fx_rate = random.uniform(1310, 1340)

        data.append({
            '작성일': date.strftime('%Y/%m/%d'),  # 자체 형식
            '문서번호': f'DK-{i+1:05d}',
            '담당자': random.choice(['김영업', '이수출', '박무역', '최판매']),  # 불필요 컬럼
            '승인자': random.choice(['팀장', '부장', '']),  # 불필요 컬럼
            '고객ID': f'CUST-{random.randint(100, 999)}',
            '고객회사명': random.choice(['ABC빌딩', '유럽철강', '베트남건설(주)', '국내건설']),
            'Item Code': f'PROD-{random.randint(1, 10):03d}',
            '상품설명': random.choice(['컬러강판 화이트', '컬러강판 블루', 'PCM 가전용']),
            'Q\'ty': qty,  # 특이한 표기
            '판매가(원)': price,  # 괄호 포함
            '매출총액': amount,
            '세금': int(amount * 0.1),
            '받을금액': int(amount * 1.1),  # 자체 용어
            '달러환율': round(fx_rate, 2),
            '원화정산액': int(amount),  # 자체 용어
            '거래형태': random.choice(['수출거래', '내수거래', '직수출', '국내판매']),  # 다른 값
            '제품TYPE': random.choice(['건자재', '가전', '기타']),  # 다른 표현
            '비고사항': random.choice(['', '긴급', 'L/C', '선수금']),
            '입력일시': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),  # 불필요
        })

    return pd.DataFrame(data)


def generate_error_data_sales():
    """
    오류 포함 매출전표

    의도적인 오류:
    - 음수 금액
    - 0 단가
    - 빈 값
    - 비정상적으로 큰 값
    - 잘못된 날짜 형식
    """
    data = []

    for i in range(60):
        date = datetime(2025, 1, 1) + timedelta(days=random.randint(0, 30))

        qty = random.randint(10, 100)
        price = random.randint(800000, 950000)
        amount = qty * price

        row = {
            '전표일자': date.strftime('%Y-%m-%d'),
            '전표번호': f'ERR-{i+1:04d}',
            '거래처코드': f'C{random.randint(1, 10):03d}',
            '거래처명': random.choice(['ABC Inc', 'DEF Corp', '', None]),  # 빈 값 포함
            '제품코드': f'P{random.randint(1, 5):03d}',
            '제품명': random.choice(['컬러강판A', '컬러강판B', '컬러강판C']),
            '수량': qty,
            '단위': 'TON',
            '단가': price,
            '공급가액': amount,
            '부가세': int(amount * 0.1),
            '합계금액': int(amount * 1.1),
            '통화': 'USD',
            '환율': round(random.uniform(1300, 1350), 2),
            '원화환산액': int(amount * random.uniform(1300, 1350)),
            '수출/내수': random.choice(['수출', '내수']),
            '제품구분': '건재용',
        }

        # 의도적 오류 삽입
        if i == 5:
            row['수량'] = -50  # 음수 수량
        elif i == 12:
            row['단가'] = 0  # 0 단가
        elif i == 18:
            row['공급가액'] = -10000000  # 음수 금액
        elif i == 25:
            row['전표일자'] = '2025/01/15'  # 다른 날짜 형식
        elif i == 32:
            row['전표일자'] = '25-01-20'  # 또 다른 형식
        elif i == 40:
            row['원화환산액'] = 99999999999999  # 비정상적으로 큰 값
        elif i == 45:
            row['거래처명'] = None  # null
        elif i == 50:
            row['수량'] = ''  # 빈 문자열

        data.append(row)

    return pd.DataFrame(data)


def generate_messy_purchases():
    """
    지저분한 매입전표

    특징:
    - 혼합된 컬럼명 (한글/영문 섞임)
    - 숫자에 콤마 포함
    - 날짜 형식 혼재
    """
    data = []

    suppliers = [
        'POSCO', '현대제철', '동국제강',
        '삼화페인트', 'KCC', '노루페인트',
        '고려아연', 'LG화학'
    ]

    materials = [
        ('냉연강판 0.5t', '원자재-강판'),
        ('냉연강판 0.6t', '원자재-강판'),
        ('폴리에스터 도료', '원자재-도료'),
        ('실리콘변성 도료', '원자재-도료'),
        ('아연괴', '원자재-아연'),
    ]

    for i in range(55):
        date = datetime(2025, 1, 1) + timedelta(days=random.randint(0, 30))
        supplier = random.choice(suppliers)
        material, category = random.choice(materials)

        qty = random.randint(50, 500)

        if '강판' in material:
            price = random.randint(780000, 850000)
        elif '도료' in material:
            price = random.randint(4000, 5000)
        else:
            price = random.randint(2500000, 3000000)

        amount = qty * price

        # 날짜 형식 랜덤
        date_formats = ['%Y-%m-%d', '%Y/%m/%d', '%d.%m.%Y', '%Y.%m.%d']
        date_str = date.strftime(random.choice(date_formats))

        row = {
            'Date': date_str,  # 영문
            '전표No.': f'PU-{i+1:04d}',  # 혼합
            'Vendor Code': f'V{random.randint(100, 999)}',  # 영문
            '업체명': supplier,  # 한글
            'Material': f'MAT-{random.randint(1000, 9999)}',  # 영문
            '자재명칭': material,  # 한글
            'Category': category,  # 영문
            '입고QTY': qty,  # 혼합
            'UOM': 'TON' if '강판' in material else 'KG',
            'Unit Price': f'{price:,}',  # 콤마 포함
            '매입가액': f'{amount:,}',  # 콤마 포함 + 다른 이름
            'Tax': f'{int(amount * 0.1):,}',
            'Total Amt': f'{int(amount * 1.1):,}',
        }

        # 일부 오류 삽입
        if i == 10:
            row['입고QTY'] = -100
        elif i == 25:
            row['Unit Price'] = '0'
        elif i == 40:
            row['업체명'] = ''

        data.append(row)

    return pd.DataFrame(data)


def main():
    """샘플 파일 생성"""
    output_dir = Path(__file__).parent / "messy_samples"
    output_dir.mkdir(exist_ok=True)

    # 1. 더존 스타일
    df = generate_douzone_style_sales()
    df.to_excel(output_dir / "매출전표_더존스타일.xlsx", index=False)
    print(f"✓ 매출전표_더존스타일.xlsx 생성 ({len(df)}건)")

    # 2. SAP 스타일
    df = generate_sap_style_sales()
    df.to_excel(output_dir / "매출전표_SAP스타일.xlsx", index=False)
    print(f"✓ 매출전표_SAP스타일.xlsx 생성 ({len(df)}건)")

    # 3. 자체 양식
    df = generate_custom_format_sales()
    df.to_excel(output_dir / "매출전표_자체양식.xlsx", index=False)
    print(f"✓ 매출전표_자체양식.xlsx 생성 ({len(df)}건)")

    # 4. 오류 데이터
    df = generate_error_data_sales()
    df.to_excel(output_dir / "매출전표_오류포함.xlsx", index=False)
    print(f"✓ 매출전표_오류포함.xlsx 생성 ({len(df)}건)")

    # 5. 지저분한 매입전표
    df = generate_messy_purchases()
    df.to_excel(output_dir / "매입전표_혼합형식.xlsx", index=False)
    print(f"✓ 매입전표_혼합형식.xlsx 생성 ({len(df)}건)")

    print(f"\n총 5개 파일이 {output_dir}에 생성되었습니다.")


if __name__ == "__main__":
    main()
