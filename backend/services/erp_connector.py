"""ERP API connector interface (placeholder for future implementation)"""
from typing import Optional
from backend.models.schemas import ProfitLossData, ERPConfig, ERPConnectionTest


class ERPConnector:
    """
    ERP API 연동 인터페이스

    현재는 인터페이스만 정의하고, 실제 구현은 추후에 진행
    각 ERP 시스템(SAP, Oracle, 더존 등)에 맞게 구현 필요
    """

    def __init__(self, config: Optional[ERPConfig] = None):
        self.config = config
        self._connected = False

    async def connect(self, config: ERPConfig) -> ERPConnectionTest:
        """ERP 시스템에 연결"""
        self.config = config

        # TODO: 실제 ERP 연결 구현
        # 현재는 연결 테스트만 시뮬레이션

        return ERPConnectionTest(
            success=False,
            message="ERP 연동은 추후 구현 예정입니다. 현재는 엑셀 업로드를 이용해주세요.",
            erp_version=None
        )

    async def test_connection(self) -> ERPConnectionTest:
        """연결 상태 테스트"""
        if not self.config:
            return ERPConnectionTest(
                success=False,
                message="ERP 설정이 없습니다."
            )

        # TODO: 실제 연결 테스트 구현
        return ERPConnectionTest(
            success=False,
            message="ERP 연동은 추후 구현 예정입니다."
        )

    async def fetch_pnl_data(self, year: int, month: int) -> ProfitLossData:
        """ERP에서 손익 데이터 조회"""
        if not self._connected:
            raise ConnectionError("ERP에 연결되어 있지 않습니다.")

        # TODO: 실제 ERP API 호출 구현
        raise NotImplementedError("ERP 데이터 조회는 추후 구현 예정입니다.")

    async def fetch_budget_data(self, year: int) -> dict:
        """ERP에서 예산 데이터 조회"""
        if not self._connected:
            raise ConnectionError("ERP에 연결되어 있지 않습니다.")

        # TODO: 실제 ERP API 호출 구현
        raise NotImplementedError("ERP 예산 조회는 추후 구현 예정입니다.")

    def disconnect(self):
        """연결 해제"""
        self._connected = False
        self.config = None


# 싱글톤 인스턴스
erp_connector = ERPConnector()
