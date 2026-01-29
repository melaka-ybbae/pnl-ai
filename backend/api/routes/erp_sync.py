"""ERP 데이터 동기화 API routes"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import uuid
import json
from datetime import datetime
from pathlib import Path
import anthropic
from dotenv import load_dotenv

from backend.services.erp_data_processor import ERPDataProcessor
from backend.models.schemas import ProfitLossData, AccountItem
import backend.api.routes.data as data_module

router = APIRouter(prefix="/api/erp-sync", tags=["ERP동기화"])

# 업로드 디렉토리
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "uploads" / "erp_data"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# API 키 로드
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")


def get_claude_client():
    """Claude API 클라이언트 생성"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        return anthropic.Anthropic(api_key=api_key)
    return None


# 세션별 프로세서 저장
processors: dict[str, ERPDataProcessor] = {}


def _save_to_current_data(result: dict):
    """
    ERP 손익계산서 결과를 전역 데이터 저장소에 저장
    Analysis, Simulation, Reports 페이지에서 사용할 수 있도록 함
    """
    income_statement = result.get('income_statement', {})
    if not income_statement:
        return

    current_month = datetime.now().strftime('%Y년 %m월')
    periods = [current_month]

    items = []

    # 매출액 - 제품구분별로 저장 (건재용, 가전용 등)
    revenue = income_statement.get('revenue', {})
    by_category = revenue.get('by_category', {})

    if by_category:
        # 제품구분별 매출이 있으면 사용
        for category, amount in by_category.items():
            items.append(AccountItem(분류='매출액', 계정과목=f'{category}매출', 금액={current_month: amount}))
    else:
        # 없으면 수출/내수로 저장
        items.append(AccountItem(분류='매출액', 계정과목='수출매출', 금액={current_month: revenue.get('export', 0)}))
        items.append(AccountItem(분류='매출액', 계정과목='내수매출', 금액={current_month: revenue.get('domestic', 0)}))

    # 매출원가
    cogs = income_statement.get('cost_of_goods_sold', {}).get('breakdown', {})
    items.append(AccountItem(분류='매출원가', 계정과목='원재료비', 금액={current_month: cogs.get('raw_materials', 0)}))
    items.append(AccountItem(분류='매출원가', 계정과목='직접노무비', 금액={current_month: cogs.get('direct_labor', 0)}))
    items.append(AccountItem(분류='매출원가', 계정과목='제조경비', 금액={current_month: cogs.get('manufacturing_overhead', 0)}))
    items.append(AccountItem(분류='매출원가', 계정과목='재고자산조정', 금액={current_month: cogs.get('inventory_adjustment', 0)}))

    # 판매관리비
    sga = income_statement.get('selling_admin_expenses', {}).get('breakdown', {})
    items.append(AccountItem(분류='판매관리비', 계정과목='판매관리비', 금액={current_month: sga.get('sg_expenses', 0)}))
    items.append(AccountItem(분류='판매관리비', 계정과목='간접노무비', 금액={current_month: sga.get('indirect_labor', 0)}))

    # ProfitLossData 생성 및 저장
    profit_loss_data = ProfitLossData(periods=periods, items=items)
    data_module._current_data = profit_loss_data


@router.post("/upload")
async def upload_erp_file(
    file: UploadFile = File(...),
    data_type: str = Form(..., description="데이터 유형: sales, purchases, payroll, mfg_expenses, inventory, sg_expenses"),
    session_id: str = Form(None, description="세션 ID (없으면 새로 생성)"),
    column_mapping: str = Form(None, description="JSON 형태의 컬럼 매핑 (스마트 파싱 결과)")
):
    """
    ERP 엑셀 파일 업로드

    여러 개의 엑셀 파일을 순차적으로 업로드하여 손익계산서 생성에 필요한 데이터를 수집합니다.

    데이터 유형:
    - sales: 매출전표
    - purchases: 매입전표
    - payroll: 급여대장
    - mfg_expenses: 제조경비
    - inventory: 재고현황
    - sg_expenses: 판매관리비
    """
    try:
        # 파일 확장자 검증
        allowed_extensions = ['.xlsx', '.xls']
        ext = Path(file.filename).suffix.lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다. 지원: {allowed_extensions}"
            )

        # 데이터 유형 검증
        valid_types = ['sales', 'purchases', 'payroll', 'mfg_expenses', 'inventory', 'sg_expenses']
        if data_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"잘못된 데이터 유형입니다. 지원: {valid_types}"
            )

        # 컬럼 매핑 파싱
        col_mapping = None
        if column_mapping:
            try:
                col_mapping = json.loads(column_mapping)
            except json.JSONDecodeError:
                pass

        # 세션 관리
        if not session_id:
            session_id = str(uuid.uuid4())

        if session_id not in processors:
            processors[session_id] = ERPDataProcessor()

        processor = processors[session_id]

        # 파일 저장
        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{data_type}_{file_id}{ext}"

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # 엑셀 로드 및 파싱 (컬럼 매핑 전달)
        load_result = processor.load_excel(str(file_path), data_type, col_mapping)

        if not load_result['success']:
            return JSONResponse({
                "success": False,
                "session_id": session_id,
                "error": load_result['error'],
                "found_columns": load_result.get('found_columns', [])
            }, status_code=400)

        # 현재 세션 상태
        loaded_types = [k for k, v in processor.data.items() if v is not None]

        return JSONResponse({
            "success": True,
            "session_id": session_id,
            "data_type": data_type,
            "file_name": file.filename,
            "rows": load_result['rows'],
            "columns": load_result['columns'],
            "preview": load_result['preview'],
            "loaded_data_types": loaded_types,
            "remaining_types": [t for t in valid_types if t not in loaded_types]
        })

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/session/{session_id}/status")
async def get_session_status(session_id: str):
    """세션 상태 조회"""
    if session_id not in processors:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    processor = processors[session_id]

    loaded = {}
    for key, df in processor.data.items():
        if df is not None:
            loaded[key] = {
                'rows': len(df),
                'columns': list(df.columns)
            }

    required = ['sales', 'purchases', 'payroll', 'mfg_expenses', 'inventory', 'sg_expenses']
    missing = [t for t in required if t not in loaded]

    return JSONResponse({
        "success": True,
        "session_id": session_id,
        "loaded_data": loaded,
        "missing_data": missing,
        "ready_for_processing": len(missing) == 0,
        "minimum_required": ['sales', 'purchases'],  # 최소 필수
        "can_generate_basic": 'sales' in loaded and 'purchases' in loaded
    })


@router.post("/session/{session_id}/generate")
async def generate_income_statement(
    session_id: str,
    include_ai: bool = True
):
    """
    손익계산서 생성

    업로드된 ERP 데이터를 조합하여 손익계산서를 자동 생성합니다.
    AI 분석 옵션을 활성화하면 Claude가 분석 코멘트를 추가합니다.
    """
    if session_id not in processors:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    processor = processors[session_id]

    # 최소 데이터 확인
    if processor.data['sales'] is None:
        raise HTTPException(status_code=400, detail="매출전표 데이터가 필요합니다.")

    try:
        # 손익계산서 생성
        result = processor.generate_income_statement()

        # AI 분석
        ai_analysis = None
        if include_ai:
            client = get_claude_client()
            if client:
                try:
                    prompt = processor.generate_ai_analysis_prompt(result)

                    message = client.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=2000,
                        messages=[{"role": "user", "content": prompt}]
                    )

                    response_text = message.content[0].text

                    # JSON 파싱
                    try:
                        if "```json" in response_text:
                            json_str = response_text.split("```json")[1].split("```")[0]
                        elif "```" in response_text:
                            json_str = response_text.split("```")[1].split("```")[0]
                        else:
                            json_str = response_text

                        ai_analysis = json.loads(json_str.strip())
                    except json.JSONDecodeError:
                        ai_analysis = {
                            "raw_response": response_text,
                            "parse_error": "JSON 파싱 실패"
                        }

                except Exception as e:
                    ai_analysis = {"error": str(e)}

        result['ai_analysis'] = ai_analysis

        # 생성된 손익계산서를 전역 데이터 저장소에 저장 (Analysis/Simulation/Reports 페이지에서 사용)
        try:
            _save_to_current_data(result)
        except Exception as save_error:
            # 저장 실패해도 결과는 반환
            print(f"Warning: Failed to save to current_data: {save_error}")

        return JSONResponse({
            "success": True,
            "session_id": session_id,
            "result": result
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """세션 삭제"""
    if session_id in processors:
        del processors[session_id]
        return JSONResponse({"success": True, "message": "세션이 삭제되었습니다."})
    else:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")


@router.post("/quick-generate")
async def quick_generate(
    sales_file: UploadFile = File(..., description="매출전표"),
    purchases_file: UploadFile = File(..., description="매입전표"),
    payroll_file: UploadFile = File(None, description="급여대장"),
    mfg_expenses_file: UploadFile = File(None, description="제조경비"),
    inventory_file: UploadFile = File(None, description="재고현황"),
    sg_expenses_file: UploadFile = File(None, description="판매관리비"),
    include_ai: bool = True
):
    """
    빠른 손익계산서 생성

    모든 파일을 한 번에 업로드하여 손익계산서를 즉시 생성합니다.
    최소 매출전표와 매입전표가 필요합니다.
    """
    try:
        processor = ERPDataProcessor()

        # 파일 매핑
        files_map = {
            'sales': sales_file,
            'purchases': purchases_file,
            'payroll': payroll_file,
            'mfg_expenses': mfg_expenses_file,
            'inventory': inventory_file,
            'sg_expenses': sg_expenses_file,
        }

        loaded_files = []
        errors = []

        for data_type, file in files_map.items():
            if file is None:
                continue

            # 파일 저장
            ext = Path(file.filename).suffix.lower()
            file_id = str(uuid.uuid4())
            file_path = UPLOAD_DIR / f"{data_type}_{file_id}{ext}"

            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)

            # 로드
            load_result = processor.load_excel(str(file_path), data_type)

            if load_result['success']:
                loaded_files.append({
                    'type': data_type,
                    'file': file.filename,
                    'rows': load_result['rows']
                })
            else:
                errors.append({
                    'type': data_type,
                    'file': file.filename,
                    'error': load_result['error']
                })

        # 최소 데이터 확인
        if processor.data['sales'] is None:
            return JSONResponse({
                "success": False,
                "error": "매출전표 파일이 필요합니다.",
                "loaded_files": loaded_files,
                "errors": errors
            }, status_code=400)

        # 손익계산서 생성
        result = processor.generate_income_statement()

        # AI 분석
        ai_analysis = None
        if include_ai:
            client = get_claude_client()
            if client:
                try:
                    prompt = processor.generate_ai_analysis_prompt(result)

                    message = client.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=2000,
                        messages=[{"role": "user", "content": prompt}]
                    )

                    response_text = message.content[0].text

                    try:
                        if "```json" in response_text:
                            json_str = response_text.split("```json")[1].split("```")[0]
                        elif "```" in response_text:
                            json_str = response_text.split("```")[1].split("```")[0]
                        else:
                            json_str = response_text

                        ai_analysis = json.loads(json_str.strip())
                    except json.JSONDecodeError:
                        ai_analysis = {
                            "raw_response": response_text,
                            "parse_error": "JSON 파싱 실패"
                        }

                except Exception as e:
                    ai_analysis = {"error": str(e)}

        result['ai_analysis'] = ai_analysis

        return JSONResponse({
            "success": True,
            "loaded_files": loaded_files,
            "errors": errors,
            "result": result
        })

    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


@router.get("/template-info")
async def get_template_info():
    """
    엑셀 템플릿 정보 조회

    각 데이터 유형별로 필요한 컬럼과 설명을 반환합니다.
    """
    templates = {
        "sales": {
            "name": "매출전표",
            "description": "일별 매출 거래 내역",
            "required_columns": ["전표일자", "거래처명", "제품명", "수량", "원화환산액"],
            "optional_columns": ["전표번호", "거래처코드", "제품코드", "제품구분", "단위", "통화", "단가", "공급가액", "부가세", "합계금액", "적용환율", "수출/내수", "담당부서", "비고"],
            "example": {
                "전표일자": "2025-01-15",
                "거래처명": "ABC Building Materials Inc.",
                "제품명": "컬러강판 RAL9002",
                "수량": 100,
                "원화환산액": 115000000
            }
        },
        "purchases": {
            "name": "매입전표",
            "description": "원자재/부자재 매입 내역",
            "required_columns": ["전표일자", "공급업체명", "품목명", "수량", "공급가액"],
            "optional_columns": ["전표번호", "공급업체코드", "품목코드", "품목분류", "단위", "통화", "단가", "부가세", "합계금액", "입고창고", "검수상태", "비고"],
            "example": {
                "전표일자": "2025-01-10",
                "공급업체명": "포스코",
                "품목명": "냉연강판 1.0T",
                "수량": 500,
                "공급가액": 400000000
            }
        },
        "payroll": {
            "name": "급여대장",
            "description": "직원별 급여 내역",
            "required_columns": ["부서", "기본급", "지급총액", "원가구분"],
            "optional_columns": ["귀속년월", "사번", "성명", "직급", "입사일", "연장근로수당", "야간근로수당", "식대", "교통비", "직책수당", "국민연금", "건강보험", "고용보험", "소득세", "지방소득세", "공제총액", "실지급액"],
            "note": "원가구분: '직접노무비' 또는 '간접노무비'로 구분",
            "example": {
                "부서": "생산1과",
                "기본급": 3500000,
                "지급총액": 4200000,
                "원가구분": "직접노무비"
            }
        },
        "mfg_expenses": {
            "name": "제조경비",
            "description": "제조 관련 경비 내역",
            "required_columns": ["전표일자", "계정과목", "차변금액"],
            "optional_columns": ["전표번호", "계정구분", "적요", "대변금액", "부서", "거래처", "증빙구분"],
            "common_accounts": ["전력비", "가스비", "수도비", "감가상각비", "수선유지비", "소모품비", "외주가공비", "운반비", "보험료", "임차료"],
            "example": {
                "전표일자": "2025-01-31",
                "계정과목": "전력비",
                "차변금액": 45000000
            }
        },
        "inventory": {
            "name": "재고현황",
            "description": "월말 재고 현황",
            "required_columns": ["품목명", "품목분류", "기초금액", "기말금액"],
            "optional_columns": ["기준년월", "품목코드", "단위", "기초수량", "입고수량", "출고수량", "기말수량", "평균단가", "입고금액", "출고금액", "창고"],
            "note": "품목분류: '원재료', '재공품', '제품'으로 구분",
            "example": {
                "품목명": "냉연강판 1.0T",
                "품목분류": "원재료",
                "기초금액": 500000000,
                "기말금액": 480000000
            }
        },
        "sg_expenses": {
            "name": "판매관리비",
            "description": "판매 및 관리 비용 내역",
            "required_columns": ["전표일자", "계정과목", "차변금액"],
            "optional_columns": ["전표번호", "계정구분", "적요", "대변금액", "부서", "거래처", "증빙구분"],
            "common_accounts": ["급여", "퇴직급여", "복리후생비", "여비교통비", "통신비", "수도광열비", "세금과공과", "감가상각비", "지급임차료", "보험료", "차량유지비", "운반비", "교육훈련비", "도서인쇄비", "소모품비", "지급수수료", "광고선전비", "접대비", "대손상각비", "잡비"],
            "example": {
                "전표일자": "2025-01-15",
                "계정과목": "운반비",
                "차변금액": 15000000
            }
        }
    }

    return JSONResponse({
        "success": True,
        "templates": templates,
        "minimum_required": ["sales", "purchases"],
        "recommended": ["sales", "purchases", "payroll", "mfg_expenses"],
        "full_analysis": ["sales", "purchases", "payroll", "mfg_expenses", "inventory", "sg_expenses"]
    })
