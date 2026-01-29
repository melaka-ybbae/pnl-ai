"""Excel data loader service for P&L data"""
import pandas as pd
import io
import re
from typing import List, Tuple, Optional
from fastapi import UploadFile

from backend.models.schemas import ProfitLossData, AccountItem, UploadResponse


class ExcelDataLoader:
    """엑셀 손익 데이터 파서"""

    # 필수 컬럼
    REQUIRED_COLUMNS = ['분류', '계정과목']

    # 유효한 분류 값
    VALID_CATEGORIES = ['매출', '매출원가', '판매관리비', '영업외손익']

    def __init__(self):
        self.warnings: List[str] = []

    async def parse_excel(self, file: UploadFile) -> Tuple[Optional[ProfitLossData], List[str]]:
        """
        엑셀 파일을 파싱하여 ProfitLossData 객체 반환

        Returns:
            Tuple[ProfitLossData, List[str]]: 파싱된 데이터와 경고 메시지 목록
        """
        self.warnings = []

        try:
            # 파일 읽기
            contents = await file.read()

            # 먼저 기본으로 읽어보기
            df = pd.read_excel(io.BytesIO(contents))

            # 첫 번째 컬럼이 '분류'가 아니면 제목 행이 있는 것으로 판단
            if '분류' not in df.columns:
                # 헤더 행 찾기 (최대 10행까지 검색)
                contents_copy = io.BytesIO(contents)
                for skip in range(10):
                    contents_copy.seek(0)
                    df_test = pd.read_excel(io.BytesIO(contents), header=skip)
                    if '분류' in df_test.columns and '계정과목' in df_test.columns:
                        df = df_test
                        break

            # 데이터 검증
            validation_errors = self._validate_data(df)
            if validation_errors:
                return None, validation_errors

            # 월 컬럼 추출
            periods = self._extract_periods(df)
            if not periods:
                return None, ["월 데이터 컬럼을 찾을 수 없습니다. (예: '2025년 1월')"]

            # 데이터 변환
            items = self._convert_to_items(df, periods)

            # 데이터 품질 검증
            self._check_data_quality(items, periods)

            return ProfitLossData(periods=periods, items=items), self.warnings

        except Exception as e:
            return None, [f"파일 처리 중 오류 발생: {str(e)}"]

    def _validate_data(self, df: pd.DataFrame) -> List[str]:
        """데이터 무결성 검증"""
        errors = []

        # 필수 컬럼 확인
        for col in self.REQUIRED_COLUMNS:
            if col not in df.columns:
                errors.append(f"필수 컬럼 '{col}'이 없습니다.")

        if errors:
            return errors

        # 빈 데이터 확인
        if df.empty:
            errors.append("데이터가 비어 있습니다.")
            return errors

        # 분류 값 검증
        invalid_categories = set(df['분류'].unique()) - set(self.VALID_CATEGORIES)
        if invalid_categories:
            self.warnings.append(f"알 수 없는 분류 값이 있습니다: {invalid_categories}")

        return errors

    def _extract_periods(self, df: pd.DataFrame) -> List[str]:
        """월 컬럼 추출 (예: '2025년 1월', '2025년 2월')"""
        periods = []

        # 정규식 패턴: YYYY년 MM월
        pattern = re.compile(r'\d{4}년\s*\d{1,2}월')

        for col in df.columns:
            if pattern.match(str(col)):
                periods.append(col)

        # 날짜순 정렬
        periods.sort(key=lambda x: (
            int(re.search(r'(\d{4})년', x).group(1)),
            int(re.search(r'(\d{1,2})월', x).group(1))
        ))

        return periods

    def _convert_to_items(self, df: pd.DataFrame, periods: List[str]) -> List[AccountItem]:
        """DataFrame을 AccountItem 리스트로 변환"""
        items = []

        for _, row in df.iterrows():
            금액 = {}
            for period in periods:
                value = row[period]
                # NaN 처리
                if pd.isna(value):
                    value = 0
                금액[period] = float(value)

            items.append(AccountItem(
                분류=row['분류'],
                계정과목=row['계정과목'],
                금액=금액
            ))

        return items

    def _check_data_quality(self, items: List[AccountItem], periods: List[str]):
        """데이터 품질 검증 및 경고"""

        # 매출 데이터 확인
        매출_items = [item for item in items if item.분류 in ('매출', '매출액')]
        if not 매출_items:
            self.warnings.append("매출 데이터가 없습니다.")

        # 음수 매출 확인
        for item in 매출_items:
            for period, amount in item.금액.items():
                if amount < 0:
                    self.warnings.append(f"'{item.계정과목}'의 {period} 매출이 음수입니다: {amount:,.0f}원")

        # 매출원가 데이터 확인
        원가_items = [item for item in items if item.분류 == '매출원가']
        if not 원가_items:
            self.warnings.append("매출원가 데이터가 없습니다.")

        # 매출 대비 원가 비율 확인
        for period in periods:
            매출_합계 = sum(item.금액.get(period, 0) for item in 매출_items)
            원가_합계 = sum(item.금액.get(period, 0) for item in 원가_items)

            if 매출_합계 > 0:
                원가율 = (원가_합계 / 매출_합계) * 100
                if 원가율 > 90:
                    self.warnings.append(f"{period} 매출원가율이 {원가율:.1f}%로 높습니다.")

    def parse_budget_excel(self, file: UploadFile) -> Tuple[Optional[dict], List[str]]:
        """예산 엑셀 파일 파싱"""
        # 예산 파일 파싱 로직 (구조가 다를 수 있음)
        pass


# 싱글톤 인스턴스
data_loader = ExcelDataLoader()
