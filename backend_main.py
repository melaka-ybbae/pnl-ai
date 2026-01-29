from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import anthropic
import io
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def analyze_profit_loss(df):
    """손익 데이터 분석"""
    
    # 월 컬럼 찾기
    month_cols = [col for col in df.columns if '년' in col and '월' in col]
    if len(month_cols) < 2:
        month_cols = [col for col in df.columns if col not in ['분류', '계정과목']]
    
    prev_month = month_cols[0]
    curr_month = month_cols[1]
    
    # 분류별 합계 계산
    summary = {}
    for 분류 in df['분류'].unique():
        분류_df = df[df['분류'] == 분류]
        summary[분류] = {
            'prev': int(분류_df[prev_month].sum()),
            'curr': int(분류_df[curr_month].sum()),
        }
    
    # 손익계산
    매출_prev = summary.get('매출', {}).get('prev', 0)
    매출_curr = summary.get('매출', {}).get('curr', 0)
    원가_prev = summary.get('매출원가', {}).get('prev', 0)
    원가_curr = summary.get('매출원가', {}).get('curr', 0)
    판관비_prev = summary.get('판매관리비', {}).get('prev', 0)
    판관비_curr = summary.get('판매관리비', {}).get('curr', 0)
    
    매출총이익_prev = 매출_prev - 원가_prev
    매출총이익_curr = 매출_curr - 원가_curr
    영업이익_prev = 매출총이익_prev - 판관비_prev
    영업이익_curr = 매출총이익_curr - 판관비_curr
    
    # 상세 내역
    details = []
    for _, row in df.iterrows():
        prev_val = int(row[prev_month])
        curr_val = int(row[curr_month])
        change = curr_val - prev_val
        change_rate = (change / prev_val * 100) if prev_val != 0 else 0
        details.append({
            '분류': row['분류'],
            '계정과목': row['계정과목'],
            'prev': prev_val,
            'curr': curr_val,
            'change': change,
            'change_rate': round(change_rate, 1)
        })
    
    return {
        'prev_month': prev_month,
        'curr_month': curr_month,
        'summary': {
            '매출액': {'prev': 매출_prev, 'curr': 매출_curr},
            '매출원가': {'prev': 원가_prev, 'curr': 원가_curr},
            '매출총이익': {'prev': 매출총이익_prev, 'curr': 매출총이익_curr},
            '판매관리비': {'prev': 판관비_prev, 'curr': 판관비_curr},
            '영업이익': {'prev': 영업이익_prev, 'curr': 영업이익_curr},
        },
        'details': details
    }

def generate_ai_analysis(analysis_data, df):
    """Claude API로 분석 코멘트 생성"""
    
    client = anthropic.Anthropic()
    
    # 주요 변동 항목 추출
    significant_changes = [d for d in analysis_data['details'] if abs(d['change_rate']) > 5]
    significant_changes.sort(key=lambda x: abs(x['change']), reverse=True)
    
    prompt = f"""당신은 제조업 재무 분석 전문가입니다. 아래 손익 데이터를 분석하고 경영진 보고용 코멘트를 작성해주세요.

## 손익 요약
- 기간: {analysis_data['prev_month']} vs {analysis_data['curr_month']}
- 매출액: {analysis_data['summary']['매출액']['prev']:,}원 → {analysis_data['summary']['매출액']['curr']:,}원
- 매출원가: {analysis_data['summary']['매출원가']['prev']:,}원 → {analysis_data['summary']['매출원가']['curr']:,}원
- 매출총이익: {analysis_data['summary']['매출총이익']['prev']:,}원 → {analysis_data['summary']['매출총이익']['curr']:,}원
- 영업이익: {analysis_data['summary']['영업이익']['prev']:,}원 → {analysis_data['summary']['영업이익']['curr']:,}원

## 주요 변동 항목 (5% 이상 변동)
{json.dumps(significant_changes[:10], ensure_ascii=False, indent=2)}

## 요청사항
1. 전월 대비 손익 변동 요약 (2-3문장)
2. 주요 증감 원인 분석 (항목별로)
3. 경영진 주의 필요 사항
4. 개선 제안

한국어로 작성하고, 구체적인 수치를 인용해주세요. 마크다운 형식으로 작성해주세요."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return message.content[0].text

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # 분석 실행
        analysis = analyze_profit_loss(df)
        
        # AI 코멘트 생성
        ai_comment = generate_ai_analysis(analysis, df)
        
        return JSONResponse({
            "success": True,
            "analysis": analysis,
            "ai_comment": ai_comment
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
