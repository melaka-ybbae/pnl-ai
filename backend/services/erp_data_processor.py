"""
ERP 데이터 처리 서비스

여러 개의 복잡한 ERP 엑셀 파일들을 파싱하고 조합하여
손익계산서를 자동으로 생성합니다.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
import json
import math


def sanitize_for_json(obj):
    """NaN, Infinity 등 JSON 비호환 값을 None으로 변환"""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.floating, np.integer)):
        val = float(obj)
        if math.isnan(val) or math.isinf(val):
            return None
        return val
    elif isinstance(obj, (datetime, pd.Timestamp)):
        return obj.isoformat() if pd.notna(obj) else None
    elif pd.isna(obj):
        return None
    return obj


class ERPDataProcessor:
    """ERP 원천 데이터 처리기"""

    def __init__(self):
        self.data = {
            'sales': None,          # 매출전표
            'purchases': None,      # 매입전표
            'payroll': None,        # 급여대장
            'mfg_expenses': None,   # 제조경비
            'inventory': None,      # 재고현황
            'sg_expenses': None,    # 판매관리비
        }
        self.period = None
        self.errors = []
        self.warnings = []

    def load_excel(self, file_path: str, data_type: str, column_mapping: Dict[str, str] = None) -> Dict[str, Any]:
        """
        엑셀 파일 로드 및 기본 검증

        Args:
            file_path: 엑셀 파일 경로
            data_type: 데이터 유형 (sales, purchases, payroll, mfg_expenses, inventory, sg_expenses)
            column_mapping: 스마트 파싱에서 전달받은 컬럼 매핑 (원본 -> 표준)
        """
        try:
            df = pd.read_excel(file_path, engine='openpyxl')

            # 기본 검증
            if df.empty:
                return {'success': False, 'error': '빈 파일입니다.'}

            # 컬럼 매핑이 제공된 경우 컬럼명 정규화
            if column_mapping:
                # 매핑 적용 (원본 컬럼 -> 표준 컬럼)
                rename_map = {}
                for orig_col in df.columns:
                    orig_col_str = str(orig_col).strip()
                    if orig_col_str in column_mapping:
                        rename_map[orig_col] = column_mapping[orig_col_str]

                if rename_map:
                    df = df.rename(columns=rename_map)

            # 필수 컬럼 검증 (컬럼명 유연하게 매칭)
            required_columns = self._get_required_columns(data_type)
            missing = []

            for req_col in required_columns:
                found = False
                # 정확히 일치하는지 확인
                if req_col in df.columns:
                    found = True
                else:
                    # 유사 컬럼 찾기 (대소문자 무시, 공백 무시)
                    for col in df.columns:
                        col_normalized = str(col).strip().lower().replace(' ', '').replace('_', '')
                        req_normalized = req_col.strip().lower().replace(' ', '').replace('_', '')
                        if col_normalized == req_normalized:
                            # 컬럼명 정규화
                            df = df.rename(columns={col: req_col})
                            found = True
                            break

                if not found:
                    # 유사 매핑 시도 (동의어 사전)
                    alt_col = self._find_alternative_column(req_col, df.columns, data_type)
                    if alt_col:
                        df = df.rename(columns={alt_col: req_col})
                        found = True

                if not found:
                    missing.append(req_col)

            if missing:
                return {
                    'success': False,
                    'error': f'필수 컬럼 누락: {", ".join(missing)}',
                    'found_columns': list(df.columns)
                }

            self.data[data_type] = df

            # NaN 값을 None으로 변환하여 JSON 호환성 확보
            preview_df = df.head(5).replace({np.nan: None, pd.NaT: None})
            preview = preview_df.to_dict('records')

            # datetime 객체를 문자열로 변환
            for row in preview:
                for key, value in row.items():
                    if isinstance(value, (datetime, pd.Timestamp)):
                        row[key] = value.strftime('%Y-%m-%d') if pd.notna(value) else None

            return {
                'success': True,
                'data_type': data_type,
                'rows': len(df),
                'columns': list(df.columns),
                'preview': preview
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _find_alternative_column(self, required_col: str, available_cols: List[str], data_type: str) -> Optional[str]:
        """필수 컬럼의 대안 컬럼 찾기 (동의어 매핑)"""
        # 동의어 사전 (필수컬럼 -> 가능한 대안들)
        synonyms = {
            # 매출 관련
            '전표일자': ['일자', '날짜', '거래일', '매출일자', '판매일', 'Date', 'BUDAT', 'date', '작성일'],
            '거래처명': ['고객명', '거래처', '바이어', 'Customer', 'Customer Name', 'KUNNR', 'customer', '매출처', '거래선명'],
            '제품명': ['품목명', '상품명', '품명', 'Product', 'Product Name', 'Material', 'MATNR', '제품'],
            '수량': ['판매수량', 'Quantity', 'QTY', 'qty', '매출수량', 'FKIMG', '판매량', '입고QTY', '입고수량', '매입수량'],
            '원화환산액': ['매출금액', '금액', '원화금액', 'Amount', 'NETWR', '매출액', '원화매출', '판매금액', 'DMBTR', 'Local Amount'],
            # 매입 관련
            '공급업체명': ['거래처명', '공급처', '업체명', 'Vendor', 'Supplier', 'LIFNR', '매입처'],
            '품목명': ['제품명', '상품명', '품명', 'Material', 'Product', '원자재명'],
            '공급가액': ['매입금액', '금액', 'Amount', 'NETWR', '공급가', '구매금액', '매입가액', 'Purchase Amount'],
            # 급여 관련
            '부서': ['소속부서', '부서명', 'Department', 'Dept', '소속'],
            '기본급': ['급여', '월급', 'Base Salary', '기본월급'],
            '지급총액': ['총지급액', '급여총액', 'Total Pay', '총급여'],
            '원가구분': ['노무비구분', '급여구분', '구분'],
            # 경비 관련
            '계정과목': ['계정', '비용항목', 'Account', '경비항목'],
            '차변금액': ['금액', '지출금액', 'Debit', '발생금액', '비용금액'],
            # 재고 관련
            '품목분류': ['분류', '재고구분', 'Category', '품목구분'],
            '기초금액': ['기초재고금액', '기초재고', 'Opening', '월초금액'],
            '기말금액': ['기말재고금액', '기말재고', 'Closing', '월말금액'],
            # 제품 구분 관련
            '제품구분': ['제품분류', '품목구분', '제품군', '제품카테고리', 'Product Category', 'Category', '용도구분', '용도'],
            '수출/내수': ['수출내수', '내수수출', '수출구분', 'Export/Domestic', '구분'],
        }

        alts = synonyms.get(required_col, [])

        for col in available_cols:
            col_str = str(col).strip()
            col_lower = col_str.lower()

            for alt in alts:
                if col_str == alt or col_lower == alt.lower():
                    return col

        return None

    def _get_required_columns(self, data_type: str) -> List[str]:
        """데이터 유형별 필수 컬럼"""
        columns_map = {
            'sales': ['전표일자', '거래처명', '제품명', '수량', '원화환산액'],
            'purchases': ['전표일자', '공급업체명', '품목명', '수량', '공급가액'],
            'payroll': ['부서', '기본급', '지급총액', '원가구분'],
            'mfg_expenses': ['전표일자', '계정과목', '차변금액'],
            'inventory': ['품목명', '품목분류', '기초금액', '기말금액'],
            'sg_expenses': ['전표일자', '계정과목', '차변금액'],
        }
        return columns_map.get(data_type, [])

    def process_sales(self) -> Dict[str, Any]:
        """매출 데이터 처리"""
        if self.data['sales'] is None:
            return {'error': '매출전표 데이터가 없습니다.'}

        df = self.data['sales'].copy()

        # 총 매출액
        total_sales = df['원화환산액'].sum()

        # 수출/내수 구분 (컬럼이 있는 경우에만)
        export_sales = 0
        domestic_sales = 0
        # 수출/내수 컬럼 찾기 (동의어 포함)
        export_domestic_col = None
        for col in df.columns:
            col_str = str(col).strip()
            if col_str in ['수출/내수', '수출내수', '내수수출', '수출구분', 'Export/Domestic', '구분']:
                export_domestic_col = col
                break

        if export_domestic_col:
            export_sales = df[df[export_domestic_col] == '수출']['원화환산액'].sum()
            domestic_sales = df[df[export_domestic_col] == '내수']['원화환산액'].sum()
        else:
            # 컬럼이 없으면 전체를 내수로 처리
            domestic_sales = total_sales

        # 제품구분별 (컬럼이 있는 경우에만)
        by_category = {}
        # 제품구분 컬럼 찾기 (동의어 포함)
        product_category_col = None
        for col in df.columns:
            col_str = str(col).strip()
            if col_str in ['제품구분', '제품분류', '품목구분', '제품군', '제품카테고리', 'Product Category', 'Category', '용도구분', '용도']:
                product_category_col = col
                break

        if product_category_col:
            by_category = df.groupby(product_category_col)['원화환산액'].sum().to_dict()

        # 거래처별 Top 10
        by_customer = df.groupby('거래처명')['원화환산액'].sum().sort_values(ascending=False).head(10).to_dict()

        # 일별 추이 (다양한 날짜 형식 지원)
        daily_trend = {}
        try:
            # 다양한 날짜 형식 파싱 시도
            df['전표일자_parsed'] = pd.to_datetime(df['전표일자'], format='%Y-%m-%d', errors='coerce')
            if df['전표일자_parsed'].isna().all():
                # DD.MM.YYYY 형식 (유럽/SAP 형식)
                df['전표일자_parsed'] = pd.to_datetime(df['전표일자'], format='%d.%m.%Y', errors='coerce')
            if df['전표일자_parsed'].isna().all():
                # 자동 추론
                df['전표일자_parsed'] = pd.to_datetime(df['전표일자'], errors='coerce')

            if not df['전표일자_parsed'].isna().all():
                daily_trend = df.groupby(df['전표일자_parsed'].dt.date)['원화환산액'].sum().to_dict()
                daily_trend = {str(k): v for k, v in daily_trend.items()}
        except Exception:
            pass

        return {
            'total': total_sales,
            'export': export_sales,
            'domestic': domestic_sales,
            'by_category': by_category,
            'by_customer': by_customer,
            'daily_trend': daily_trend,
            'transaction_count': len(df)
        }

    def process_purchases(self) -> Dict[str, Any]:
        """매입 데이터 처리 (원재료비)"""
        if self.data['purchases'] is None:
            return {'error': '매입전표 데이터가 없습니다.'}

        df = self.data['purchases'].copy()

        total_purchases = df['공급가액'].sum()

        # 품목분류별 (컬럼이 있는 경우에만)
        by_category = {}
        if '품목분류' in df.columns:
            by_category = df.groupby('품목분류')['공급가액'].sum().to_dict()

        # 공급업체별
        by_supplier = df.groupby('공급업체명')['공급가액'].sum().to_dict()

        return {
            'total': total_purchases,
            'by_category': by_category,
            'by_supplier': by_supplier,
            'transaction_count': len(df)
        }

    def process_payroll(self) -> Dict[str, Any]:
        """급여 데이터 처리"""
        if self.data['payroll'] is None:
            return {'error': '급여대장 데이터가 없습니다.'}

        df = self.data['payroll']

        total_payroll = df['지급총액'].sum()

        # 직접노무비 vs 간접노무비
        direct_labor = df[df['원가구분'] == '직접노무비']['지급총액'].sum()
        indirect_labor = df[df['원가구분'] == '간접노무비']['지급총액'].sum()

        # 부서별
        by_dept = df.groupby('부서')['지급총액'].sum().to_dict()

        return {
            'total': total_payroll,
            'direct_labor': direct_labor,
            'indirect_labor': indirect_labor,
            'by_department': by_dept,
            'employee_count': len(df)
        }

    def process_manufacturing_expenses(self) -> Dict[str, Any]:
        """제조경비 처리"""
        if self.data['mfg_expenses'] is None:
            return {'error': '제조경비 데이터가 없습니다.'}

        df = self.data['mfg_expenses']

        total = df['차변금액'].sum()

        # 계정과목별
        by_account = df.groupby('계정과목')['차변금액'].sum().to_dict()

        return {
            'total': total,
            'by_account': by_account,
            'transaction_count': len(df)
        }

    def process_inventory(self) -> Dict[str, Any]:
        """재고 데이터 처리"""
        if self.data['inventory'] is None:
            return {'error': '재고현황 데이터가 없습니다.'}

        df = self.data['inventory']

        # 품목분류별 재고
        by_type = df.groupby('품목분류').agg({
            '기초금액': 'sum',
            '기말금액': 'sum',
            '입고금액': 'sum',
            '출고금액': 'sum'
        }).to_dict('index')

        # 원재료 재고 변동
        raw_material = df[df['품목분류'] == '원재료']
        rm_beginning = raw_material['기초금액'].sum()
        rm_ending = raw_material['기말금액'].sum()

        # 제품 재고 변동
        products = df[df['품목분류'] == '제품']
        prod_beginning = products['기초금액'].sum()
        prod_ending = products['기말금액'].sum()

        # 재공품 재고 변동
        wip = df[df['품목분류'] == '재공품']
        wip_beginning = wip['기초금액'].sum()
        wip_ending = wip['기말금액'].sum()

        return {
            'by_type': by_type,
            'raw_material': {
                'beginning': rm_beginning,
                'ending': rm_ending,
                'change': rm_ending - rm_beginning
            },
            'products': {
                'beginning': prod_beginning,
                'ending': prod_ending,
                'change': prod_ending - prod_beginning
            },
            'work_in_progress': {
                'beginning': wip_beginning,
                'ending': wip_ending,
                'change': wip_ending - wip_beginning
            }
        }

    def process_selling_admin_expenses(self) -> Dict[str, Any]:
        """판매관리비 처리"""
        if self.data['sg_expenses'] is None:
            return {'error': '판매관리비 데이터가 없습니다.'}

        df = self.data['sg_expenses']

        total = df['차변금액'].sum()

        # 계정과목별
        by_account = df.groupby('계정과목')['차변금액'].sum().to_dict()

        return {
            'total': total,
            'by_account': by_account,
            'transaction_count': len(df)
        }

    def generate_income_statement(self) -> Dict[str, Any]:
        """
        손익계산서 자동 생성

        원천 데이터를 조합하여 손익계산서 형태로 변환
        """
        result = {
            'period': self.period or datetime.now().strftime('%Y-%m'),
            'generated_at': datetime.now().isoformat(),
            'data_sources': [],
            'income_statement': {},
            'details': {},
            'errors': self.errors,
            'warnings': self.warnings
        }

        # 데이터 소스 확인
        for key, df in self.data.items():
            if df is not None:
                result['data_sources'].append({
                    'type': key,
                    'rows': len(df),
                    'status': 'loaded'
                })

        # 매출 처리
        sales_result = self.process_sales()
        if 'error' not in sales_result:
            total_revenue = sales_result['total']
        else:
            total_revenue = 0
            self.errors.append(sales_result['error'])

        # 매입 처리 (원재료비)
        purchase_result = self.process_purchases()
        if 'error' not in purchase_result:
            raw_material_cost = purchase_result['total']
        else:
            raw_material_cost = 0
            self.errors.append(purchase_result['error'])

        # 급여 처리
        payroll_result = self.process_payroll()
        if 'error' not in payroll_result:
            direct_labor = payroll_result['direct_labor']
            indirect_labor = payroll_result['indirect_labor']
        else:
            direct_labor = 0
            indirect_labor = 0
            self.errors.append(payroll_result['error'])

        # 제조경비 처리
        mfg_result = self.process_manufacturing_expenses()
        if 'error' not in mfg_result:
            manufacturing_overhead = mfg_result['total']
        else:
            manufacturing_overhead = 0
            self.errors.append(mfg_result['error'])

        # 재고 처리
        inventory_result = self.process_inventory()
        if 'error' not in inventory_result:
            rm_change = inventory_result['raw_material']['change']
            wip_change = inventory_result['work_in_progress']['change']
            prod_change = inventory_result['products']['change']
        else:
            rm_change = 0
            wip_change = 0
            prod_change = 0
            self.warnings.append('재고 데이터 없음 - 재고 변동 미반영')

        # 판매관리비 처리
        sg_result = self.process_selling_admin_expenses()
        if 'error' not in sg_result:
            selling_admin_expenses = sg_result['total']
        else:
            selling_admin_expenses = 0
            self.errors.append(sg_result['error'])

        # ===== 손익계산서 산출 =====

        # 1. 당기제품제조원가 계산
        # = 기초원재료 + 당기매입 - 기말원재료 + 직접노무비 + 제조경비 + 기초재공품 - 기말재공품
        total_manufacturing_cost = (
            raw_material_cost  # 원재료 사용액 (매입 기준, 재고 변동 조정)
            - rm_change  # 원재료 재고 증가분 차감
            + direct_labor  # 직접노무비
            + manufacturing_overhead  # 제조경비
            - wip_change  # 재공품 재고 증가분 차감
        )

        # 2. 매출원가 계산
        # = 기초제품 + 당기제품제조원가 - 기말제품
        cost_of_goods_sold = total_manufacturing_cost - prod_change

        # 3. 매출총이익
        gross_profit = total_revenue - cost_of_goods_sold

        # 4. 판매비와관리비 (간접노무비 포함)
        total_sg_expenses = selling_admin_expenses + indirect_labor

        # 5. 영업이익
        operating_profit = gross_profit - total_sg_expenses

        # 손익계산서 구조화
        result['income_statement'] = {
            'revenue': {
                'total': total_revenue,
                'export': sales_result.get('export', 0) if 'error' not in sales_result else 0,
                'domestic': sales_result.get('domestic', 0) if 'error' not in sales_result else 0,
                'by_category': sales_result.get('by_category', {}) if 'error' not in sales_result else {},
            },
            'cost_of_goods_sold': {
                'total': cost_of_goods_sold,
                'breakdown': {
                    'raw_materials': raw_material_cost - rm_change,
                    'direct_labor': direct_labor,
                    'manufacturing_overhead': manufacturing_overhead,
                    'inventory_adjustment': -(wip_change + prod_change)
                }
            },
            'gross_profit': gross_profit,
            'selling_admin_expenses': {
                'total': total_sg_expenses,
                'breakdown': {
                    'sg_expenses': selling_admin_expenses,
                    'indirect_labor': indirect_labor
                }
            },
            'operating_profit': operating_profit,
            'ratios': {
                'cost_ratio': round(cost_of_goods_sold / total_revenue * 100, 2) if total_revenue > 0 else 0,
                'gross_margin': round(gross_profit / total_revenue * 100, 2) if total_revenue > 0 else 0,
                'operating_margin': round(operating_profit / total_revenue * 100, 2) if total_revenue > 0 else 0,
            }
        }

        # 상세 데이터
        result['details'] = {
            'sales': sales_result if 'error' not in sales_result else None,
            'purchases': purchase_result if 'error' not in purchase_result else None,
            'payroll': payroll_result if 'error' not in payroll_result else None,
            'manufacturing_expenses': mfg_result if 'error' not in mfg_result else None,
            'inventory': inventory_result if 'error' not in inventory_result else None,
            'selling_admin_expenses': sg_result if 'error' not in sg_result else None,
        }

        # JSON 호환을 위해 NaN/Infinity 값 정리
        return sanitize_for_json(result)

    def generate_ai_analysis_prompt(self, income_statement: Dict) -> str:
        """AI 분석용 프롬프트 생성"""
        is_data = income_statement['income_statement']

        prompt = f"""당신은 제조업 재무 분석 전문가입니다.

아래 손익계산서 데이터를 분석하고, 경영진을 위한 인사이트를 제공해주세요.

## 손익계산서 (단위: 원)

| 항목 | 금액 | 비율 |
|------|------|------|
| **매출액** | {is_data['revenue']['total']:,.0f} | 100% |
| - 수출 | {is_data['revenue']['export']:,.0f} | {is_data['revenue']['export']/is_data['revenue']['total']*100:.1f}% |
| - 내수 | {is_data['revenue']['domestic']:,.0f} | {is_data['revenue']['domestic']/is_data['revenue']['total']*100:.1f}% |
| **매출원가** | {is_data['cost_of_goods_sold']['total']:,.0f} | {is_data['ratios']['cost_ratio']}% |
| - 원재료비 | {is_data['cost_of_goods_sold']['breakdown']['raw_materials']:,.0f} | |
| - 직접노무비 | {is_data['cost_of_goods_sold']['breakdown']['direct_labor']:,.0f} | |
| - 제조경비 | {is_data['cost_of_goods_sold']['breakdown']['manufacturing_overhead']:,.0f} | |
| **매출총이익** | {is_data['gross_profit']:,.0f} | {is_data['ratios']['gross_margin']}% |
| **판매관리비** | {is_data['selling_admin_expenses']['total']:,.0f} | |
| **영업이익** | {is_data['operating_profit']:,.0f} | {is_data['ratios']['operating_margin']}% |

## 분석 요청사항

다음 JSON 형식으로 분석 결과를 제공해주세요:

{{
  "summary": "2-3문장 핵심 요약",
  "key_findings": [
    {{"category": "매출", "finding": "발견 내용", "impact": "영향", "severity": "high/medium/low"}},
    ...
  ],
  "cost_analysis": {{
    "raw_material_ratio": "원재료비 비중 분석",
    "labor_efficiency": "노무비 효율성 분석",
    "overhead_assessment": "제조경비 평가"
  }},
  "profitability_assessment": {{
    "gross_margin_evaluation": "매출총이익률 평가 (업계 평균 대비)",
    "operating_margin_evaluation": "영업이익률 평가"
  }},
  "recommendations": [
    {{"priority": "high/medium/low", "action": "권장 조치", "expected_impact": "예상 효과"}}
  ],
  "risk_factors": ["리스크 요인들"],
  "opportunities": ["개선 기회들"]
}}

JSON만 출력하고 다른 설명은 하지 마세요."""

        return prompt


# 싱글톤 인스턴스
erp_processor = ERPDataProcessor()
