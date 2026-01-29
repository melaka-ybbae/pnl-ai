"""
AI 스마트 파서

복잡하고 지저분한 엑셀 데이터를 AI가 자동으로 인식하고 매핑합니다.
- 다양한 컬럼명 자동 인식
- 날짜/숫자 형식 자동 변환
- 이상치/오류 감지
- 데이터 품질 점수 산출
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json
import os
import anthropic
from dotenv import load_dotenv
from pathlib import Path

# API 키 로드
PROJECT_ROOT = Path(__file__).parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")


class AISmartParser:
    """AI 기반 스마트 엑셀 파서"""

    # 표준 컬럼명과 가능한 변형들
    COLUMN_MAPPINGS = {
        # 매출전표
        'sales': {
            '전표일자': ['전표일자', '일자', '날짜', 'Date', 'date', '거래일', '거래일자',
                       'Transaction Date', 'BUDAT', '전표날짜', '매출일자', '매출일'],
            '전표번호': ['전표번호', '번호', 'No', 'no', 'Document No', 'BELNR',
                       '문서번호', '매출번호', 'Invoice No', 'Voucher No'],
            '거래처코드': ['거래처코드', '고객코드', 'Customer Code', 'KUNNR',
                        'Cust Code', '거래선코드', 'BP Code'],
            '거래처명': ['거래처명', '고객명', '거래처', 'Customer', 'Customer Name',
                       'NAME1', '거래선명', 'BP Name', '매출처', '판매처'],
            '제품코드': ['제품코드', '품목코드', 'Item Code', 'MATNR', 'Product Code',
                       '상품코드', 'SKU', 'Material'],
            '제품명': ['제품명', '품목명', '품명', 'Item', 'Product', 'Product Name',
                      'MAKTX', '상품명', 'Description', '품목'],
            '수량': ['수량', 'Qty', 'Quantity', 'MENGE', '판매수량', 'Sales Qty',
                    '매출수량', 'Amount', '개수'],
            '단위': ['단위', 'Unit', 'UOM', 'MEINS', '수량단위'],
            '단가': ['단가', 'Price', 'Unit Price', '판매단가', 'NETPR'],
            '공급가액': ['공급가액', '금액', 'Amount', 'Net Amount', 'NETWR',
                       '매출액', 'Sales Amount', '판매금액', '공급가'],
            '부가세': ['부가세', 'VAT', 'Tax', '세금', 'MWSBP', '부가가치세'],
            '합계금액': ['합계금액', '합계', 'Total', 'Total Amount', '총액',
                       '총금액', 'Grand Total'],
            '통화': ['통화', 'Currency', 'WAERK', '화폐', 'Curr'],
            '환율': ['환율', 'Exchange Rate', 'Rate', 'KURRF', 'FX Rate'],
            '원화환산액': ['원화환산액', '원화금액', 'KRW Amount', '원화',
                        '환산금액', 'Local Amount', '원화매출', 'DMBTR', 'Local Currency Amount'],
            '수출/내수': ['수출/내수', '내수/수출', 'Export/Domestic', '구분',
                        '거래구분', 'Type', '매출구분'],
            '제품구분': ['제품구분', '품목구분', '제품분류', 'Category',
                       'Product Type', '분류'],
        },
        # 매입전표
        'purchases': {
            '전표일자': ['전표일자', '일자', '날짜', 'Date', '매입일자', '입고일자',
                       'PO Date', 'Receipt Date', 'BUDAT'],
            '전표번호': ['전표번호', '매입번호', 'PO No', 'Receipt No', 'BELNR'],
            '공급업체코드': ['공급업체코드', '업체코드', 'Vendor Code', 'LIFNR',
                          'Supplier Code', '거래처코드'],
            '공급업체명': ['공급업체명', '업체명', '공급업체', 'Vendor', 'Vendor Name',
                        'Supplier', 'Supplier Name', 'NAME1', '거래처명'],
            '품목코드': ['품목코드', '자재코드', 'Material Code', 'MATNR',
                       'Item Code', '원자재코드'],
            '품목명': ['품목명', '자재명', 'Material', 'Material Name', 'MAKTX',
                      'Item', 'Description', '원자재명'],
            '품목분류': ['품목분류', '자재분류', 'Material Type', 'Category',
                       '분류', 'Type'],
            '수량': ['수량', 'Qty', 'Quantity', 'MENGE', '입고수량',
                    'Receipt Qty', '매입수량', '입고QTY', 'QTY', '구매수량'],
            '단위': ['단위', 'Unit', 'UOM', 'MEINS'],
            '단가': ['단가', 'Price', 'Unit Price', 'NETPR', '매입단가'],
            '공급가액': ['공급가액', '금액', 'Amount', 'Net Amount', 'NETWR',
                       '매입금액', 'Purchase Amount', '매입액', '구매금액', '매입가액'],
            '부가세': ['부가세', 'VAT', 'Tax', 'MWSBP'],
            '합계금액': ['합계금액', '합계', 'Total', '총액'],
        },
        # 급여대장
        'payroll': {
            '사번': ['사번', '직원번호', 'Employee No', 'Emp No', 'PERNR', 'ID'],
            '성명': ['성명', '이름', 'Name', 'Employee Name', 'ENAME', '직원명'],
            '부서': ['부서', '부서명', 'Department', 'Dept', 'ORGEH', '소속'],
            '직급': ['직급', '직위', 'Position', 'Title', 'PLANS', '직책'],
            '기본급': ['기본급', 'Base Salary', 'Basic Pay', 'BETRG', '본봉'],
            '수당': ['수당', 'Allowance', '제수당', 'Benefits'],
            '공제액': ['공제액', 'Deduction', '공제', '차감액'],
            '지급총액': ['지급총액', '실지급액', 'Net Pay', 'Total Pay',
                       '지급액', '급여총액', 'Gross Pay'],
            '원가구분': ['원가구분', '원가분류', 'Cost Type', '노무비구분',
                       '직접/간접', 'Labor Type'],
        }
    }

    # 이상치 감지 규칙
    ANOMALY_RULES = {
        'sales': {
            '수량': {'min': 0, 'max': 100000, 'type': 'numeric'},
            '단가': {'min': 0, 'max': 100000000, 'type': 'numeric'},
            '공급가액': {'min': 0, 'max': 10000000000, 'type': 'numeric'},
            '원화환산액': {'min': 0, 'max': 10000000000, 'type': 'numeric'},
        },
        'purchases': {
            '수량': {'min': 0, 'max': 100000, 'type': 'numeric'},
            '단가': {'min': 0, 'max': 100000000, 'type': 'numeric'},
            '공급가액': {'min': 0, 'max': 10000000000, 'type': 'numeric'},
        },
        'payroll': {
            '기본급': {'min': 0, 'max': 100000000, 'type': 'numeric'},
            '지급총액': {'min': 0, 'max': 200000000, 'type': 'numeric'},
        }
    }

    def __init__(self):
        self.client = self._get_claude_client()
        self.mapping_results = {}
        self.anomalies = []
        self.warnings = []

    def _get_claude_client(self):
        """Claude API 클라이언트"""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            return anthropic.Anthropic(api_key=api_key)
        return None

    def analyze_excel(self, file_path: str, data_type: str) -> Dict[str, Any]:
        """
        엑셀 파일을 분석하고 스마트 파싱 수행

        Returns:
            - success: 성공 여부
            - original_columns: 원본 컬럼명
            - mapped_columns: 매핑된 표준 컬럼명
            - mapping_confidence: 매핑 신뢰도
            - anomalies: 감지된 이상치
            - warnings: 경고 사항
            - data_quality_score: 데이터 품질 점수
            - parsed_data: 파싱된 데이터
        """
        try:
            # 엑셀 로드
            df = pd.read_excel(file_path, engine='openpyxl')

            if df.empty:
                return {'success': False, 'error': '빈 파일입니다.'}

            original_columns = list(df.columns)

            # 1단계: 규칙 기반 컬럼 매핑
            rule_based_mapping = self._rule_based_column_mapping(original_columns, data_type)

            # 2단계: 매핑되지 않은 컬럼이 있으면 AI 분석
            unmapped = [col for col in original_columns if col not in rule_based_mapping]
            ai_mapping = {}

            if unmapped and self.client:
                ai_mapping = self._ai_column_mapping(unmapped, data_type, df.head(3))

            # 최종 매핑 결합
            final_mapping = {**rule_based_mapping, **ai_mapping}

            # 3단계: 컬럼명 변환
            df_mapped = df.rename(columns=final_mapping)

            # 4단계: 데이터 타입 정규화
            df_normalized, type_warnings = self._normalize_data_types(df_mapped, data_type)
            self.warnings.extend(type_warnings)

            # 5단계: 이상치 감지
            anomalies = self._detect_anomalies(df_normalized, data_type)

            # 6단계: 데이터 품질 점수 계산
            quality_score = self._calculate_quality_score(
                original_columns, final_mapping, anomalies, data_type
            )

            # 매핑 신뢰도 계산
            mapping_confidence = self._calculate_mapping_confidence(
                original_columns, final_mapping, data_type
            )

            return {
                'success': True,
                'original_columns': original_columns,
                'mapped_columns': final_mapping,
                'mapping_confidence': mapping_confidence,
                'anomalies': anomalies,
                'warnings': self.warnings,
                'data_quality_score': quality_score,
                'row_count': len(df_normalized),
                'parsed_preview': df_normalized.head(5).to_dict('records'),
                'data': df_normalized
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _rule_based_column_mapping(self, columns: List[str], data_type: str) -> Dict[str, str]:
        """규칙 기반 컬럼 매핑"""
        mapping = {}
        column_defs = self.COLUMN_MAPPINGS.get(data_type, {})

        for col in columns:
            col_lower = col.lower().strip()
            col_no_space = col_lower.replace(' ', '').replace('_', '')

            for standard_name, variations in column_defs.items():
                for var in variations:
                    var_lower = var.lower().strip()
                    var_no_space = var_lower.replace(' ', '').replace('_', '')

                    # 정확히 일치하거나 공백/언더스코어 무시하고 일치
                    if col_lower == var_lower or col_no_space == var_no_space:
                        mapping[col] = standard_name
                        break

                if col in mapping:
                    break

        return mapping

    def _ai_column_mapping(self, unmapped_columns: List[str],
                           data_type: str, sample_data: pd.DataFrame) -> Dict[str, str]:
        """AI 기반 컬럼 매핑"""
        if not self.client:
            return {}

        # 표준 컬럼 목록
        standard_columns = list(self.COLUMN_MAPPINGS.get(data_type, {}).keys())

        # 샘플 데이터 준비
        sample_str = sample_data[unmapped_columns].to_string() if len(unmapped_columns) > 0 else ""

        prompt = f"""엑셀 파일의 컬럼명을 표준 컬럼명으로 매핑해주세요.

## 매핑되지 않은 컬럼명:
{unmapped_columns}

## 해당 컬럼의 샘플 데이터:
{sample_str}

## 표준 컬럼명 목록 ({data_type}):
{standard_columns}

## 응답 형식 (JSON만):
{{
  "원본컬럼명1": "표준컬럼명",
  "원본컬럼명2": "표준컬럼명",
  ...
}}

매핑이 불확실한 컬럼은 null로 표시하세요.
JSON만 응답하세요."""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text

            # JSON 추출
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text

            mapping = json.loads(json_str.strip())

            # null 값 제거
            return {k: v for k, v in mapping.items() if v is not None}

        except Exception as e:
            self.warnings.append(f"AI 컬럼 매핑 실패: {str(e)}")
            return {}

    def _normalize_data_types(self, df: pd.DataFrame, data_type: str) -> Tuple[pd.DataFrame, List[str]]:
        """데이터 타입 정규화"""
        warnings = []
        df = df.copy()

        # 날짜 컬럼 정규화
        date_columns = ['전표일자', '일자', '날짜']
        for col in date_columns:
            if col in df.columns:
                try:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                    null_count = df[col].isna().sum()
                    if null_count > 0:
                        warnings.append(f"'{col}' 컬럼에서 {null_count}개의 날짜 변환 실패")
                except Exception as e:
                    warnings.append(f"'{col}' 날짜 변환 오류: {str(e)}")

        # 숫자 컬럼 정규화
        numeric_columns = ['수량', '단가', '공급가액', '부가세', '합계금액',
                          '원화환산액', '기본급', '지급총액', '환율']
        for col in numeric_columns:
            if col in df.columns:
                try:
                    # 문자열이면 숫자로 변환 (콤마 제거)
                    if df[col].dtype == object:
                        df[col] = df[col].astype(str).str.replace(',', '').str.replace(' ', '')
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                except Exception as e:
                    warnings.append(f"'{col}' 숫자 변환 오류: {str(e)}")

        return df, warnings

    def _detect_anomalies(self, df: pd.DataFrame, data_type: str) -> List[Dict[str, Any]]:
        """이상치 감지"""
        anomalies = []
        rules = self.ANOMALY_RULES.get(data_type, {})

        # 중복 컬럼 처리를 위해 컬럼 리스트로 변환
        df_cols = list(df.columns)

        for col, rule in rules.items():
            if col not in df_cols:
                continue

            # 중복 컬럼인 경우 첫 번째 컬럼만 사용
            col_data = df.iloc[:, df_cols.index(col)] if df_cols.count(col) > 1 else df[col]

            if rule['type'] == 'numeric':
                # 음수 값 체크
                negative_mask = col_data < 0
                if negative_mask.any():
                    negative_rows = col_data[negative_mask].index.tolist()
                    anomalies.append({
                        'type': 'negative_value',
                        'column': col,
                        'severity': 'high',
                        'message': f"'{col}'에 음수 값이 {len(negative_rows)}건 있습니다",
                        'rows': negative_rows[:10],  # 최대 10개만 표시
                        'sample_values': col_data.loc[negative_rows[:5]].tolist()
                    })

                # 범위 초과 체크
                too_high = col_data > rule['max']
                if too_high.any():
                    high_rows = col_data[too_high].index.tolist()
                    anomalies.append({
                        'type': 'value_too_high',
                        'column': col,
                        'severity': 'medium',
                        'message': f"'{col}'에 비정상적으로 큰 값이 {len(high_rows)}건 있습니다",
                        'rows': high_rows[:10],
                        'sample_values': col_data.loc[high_rows[:5]].tolist()
                    })

                # 0 값 체크 (단가, 금액 등에서 의심스러움)
                if col in ['단가', '공급가액', '원화환산액']:
                    zero_mask = col_data == 0
                    if zero_mask.any():
                        zero_rows = col_data[zero_mask].index.tolist()
                        anomalies.append({
                            'type': 'zero_value',
                            'column': col,
                            'severity': 'low',
                            'message': f"'{col}'에 0 값이 {len(zero_rows)}건 있습니다 (확인 필요)",
                            'rows': zero_rows[:10]
                        })

        # 필수 컬럼 누락 체크
        required_columns = {
            'sales': ['전표일자', '거래처명', '제품명', '원화환산액'],
            'purchases': ['전표일자', '공급업체명', '품목명', '공급가액'],
            'payroll': ['부서', '기본급', '지급총액', '원가구분']
        }

        for col in required_columns.get(data_type, []):
            if col not in df_cols:
                anomalies.append({
                    'type': 'missing_column',
                    'column': col,
                    'severity': 'high',
                    'message': f"필수 컬럼 '{col}'이(가) 누락되었습니다"
                })
            else:
                # 중복 컬럼인 경우 첫 번째 컬럼만 사용
                col_data = df.iloc[:, df_cols.index(col)] if df_cols.count(col) > 1 else df[col]
                if col_data.isna().sum() > len(df) * 0.1:  # 10% 이상 누락
                    null_pct = col_data.isna().sum() / len(df) * 100
                    anomalies.append({
                        'type': 'missing_values',
                        'column': col,
                        'severity': 'medium',
                        'message': f"'{col}'에 {null_pct:.1f}%의 빈 값이 있습니다"
                    })

        return anomalies

    def _calculate_quality_score(self, original_columns: List[str],
                                  mapping: Dict[str, str],
                                  anomalies: List[Dict],
                                  data_type: str) -> Dict[str, Any]:
        """데이터 품질 점수 계산"""
        score = 100
        details = []

        # 컬럼 매핑률
        mapping_rate = len(mapping) / len(original_columns) * 100 if original_columns else 0
        if mapping_rate < 80:
            penalty = (80 - mapping_rate) * 0.3
            score -= penalty
            details.append(f"컬럼 매핑률 {mapping_rate:.1f}% (-{penalty:.1f}점)")

        # 이상치 감점
        high_severity = len([a for a in anomalies if a['severity'] == 'high'])
        medium_severity = len([a for a in anomalies if a['severity'] == 'medium'])
        low_severity = len([a for a in anomalies if a['severity'] == 'low'])

        if high_severity > 0:
            penalty = high_severity * 10
            score -= penalty
            details.append(f"심각한 이상치 {high_severity}건 (-{penalty}점)")

        if medium_severity > 0:
            penalty = medium_severity * 5
            score -= penalty
            details.append(f"중간 이상치 {medium_severity}건 (-{penalty}점)")

        if low_severity > 0:
            penalty = low_severity * 2
            score -= penalty
            details.append(f"경미한 이상치 {low_severity}건 (-{penalty}점)")

        score = max(0, min(100, score))

        # 등급 판정
        if score >= 90:
            grade = 'A'
            grade_text = '우수'
        elif score >= 70:
            grade = 'B'
            grade_text = '양호'
        elif score >= 50:
            grade = 'C'
            grade_text = '보통'
        else:
            grade = 'D'
            grade_text = '주의필요'

        return {
            'score': round(score, 1),
            'grade': grade,
            'grade_text': grade_text,
            'details': details,
            'mapping_rate': round(mapping_rate, 1),
            'anomaly_count': {
                'high': high_severity,
                'medium': medium_severity,
                'low': low_severity
            }
        }

    def _calculate_mapping_confidence(self, original_columns: List[str],
                                       mapping: Dict[str, str],
                                       data_type: str) -> Dict[str, Any]:
        """매핑 신뢰도 계산"""
        confidence_details = []

        for orig_col, mapped_col in mapping.items():
            # 정확히 일치하면 100%
            variations = self.COLUMN_MAPPINGS.get(data_type, {}).get(mapped_col, [])

            if orig_col in variations:
                conf = 100
                method = 'exact_match'
            elif orig_col.lower() in [v.lower() for v in variations]:
                conf = 95
                method = 'case_insensitive'
            else:
                conf = 75  # AI 추론
                method = 'ai_inference'

            confidence_details.append({
                'original': orig_col,
                'mapped': mapped_col,
                'confidence': conf,
                'method': method
            })

        avg_confidence = sum(d['confidence'] for d in confidence_details) / len(confidence_details) if confidence_details else 0

        return {
            'average': round(avg_confidence, 1),
            'details': confidence_details
        }
