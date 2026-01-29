# AI 프롬프트 템플릿

## 1. 서류 OCR 파싱

### Commercial Invoice 파싱
```
당신은 무역 서류 분석 전문가입니다.
첨부된 Commercial Invoice 이미지에서 다음 정보를 JSON 형식으로 추출하세요.

추출 항목:
- invoice_no: 인보이스 번호
- date: 발행일 (YYYY-MM-DD 형식)
- seller: 판매자 (수출자)
- buyer: 구매자 (바이어)
- buyer_country: 바이어 국가
- currency: 통화 (USD, EUR 등)
- items: 품목 배열
  - product: 품목명
  - quantity: 수량
  - unit: 단위 (TON, PCS 등)
  - unit_price: 단가
  - amount: 금액
- subtotal: 소계
- total: 총금액
- payment_terms: 결제조건 (T/T 30 days 등)
- incoterms: 인코텀즈 (FOB, CIF 등)

JSON 형식으로만 응답하세요. 추출할 수 없는 항목은 null로 표시하세요.
```

### B/L (선하증권) 파싱
```
당신은 무역 서류 분석 전문가입니다.
첨부된 Bill of Lading (선하증권) 이미지에서 다음 정보를 JSON 형식으로 추출하세요.

추출 항목:
- bl_no: B/L 번호
- shipper: 송하인 (수출자)
- consignee: 수하인 (바이어)
- notify_party: 통지처
- vessel_name: 선박명
- voyage_no: 항차번호
- port_of_loading: 선적항
- port_of_discharge: 양륙항
- ship_date: 선적일 (YYYY-MM-DD)
- container_no: 컨테이너 번호 (배열)
- quantity: 수량
- unit: 단위
- gross_weight: 총중량
- measurement: 용적

JSON 형식으로만 응답하세요.
```

### Packing List 파싱
```
당신은 무역 서류 분석 전문가입니다.
첨부된 Packing List 이미지에서 다음 정보를 JSON 형식으로 추출하세요.

추출 항목:
- invoice_ref: 관련 인보이스 번호
- date: 작성일
- items: 품목 배열
  - product: 품목명
  - quantity: 수량
  - packages: 포장 수
  - net_weight: 순중량
  - gross_weight: 총중량
  - dimensions: 규격 (LxWxH)
- total_packages: 총 포장 수
- total_net_weight: 총 순중량
- total_gross_weight: 총 총중량

JSON 형식으로만 응답하세요.
```

---

## 2. 손익 분석

### 손익 증감 원인 분석
```
당신은 제조업 재무 분석 전문가입니다.
아래 손익 데이터를 분석하고 증감 원인을 분석하세요.

[손익 데이터]
{손익_데이터_JSON}

[분석 요청]
1. 전월 대비 주요 증감 항목을 파악하세요 (5% 이상 변동)
2. 각 항목의 증감 원인을 추론하세요
3. 내부 요인과 외부 요인을 구분하세요

[출력 형식]
{
  "summary": "전체 요약 (2-3문장)",
  "major_changes": [
    {
      "item": "항목명",
      "prev_amount": 전월금액,
      "curr_amount": 당월금액,
      "change_rate": 변동률,
      "cause": "원인 분석",
      "factor_type": "internal" 또는 "external"
    }
  ],
  "risk_factors": ["리스크 요인1", "리스크 요인2"],
  "recommendations": ["권장사항1", "권장사항2"]
}
```

### 경영진용 손익 코멘트
```
당신은 제조업 CFO 보좌관입니다.
아래 손익 데이터를 바탕으로 경영진 보고용 코멘트를 작성하세요.

[손익 데이터]
{손익_데이터_JSON}

[작성 항목]
1. 핵심 요약 (3줄 이내)
   - 이번 달 실적 핵심 포인트
   
2. 주요 변동 사항
   - 매출 변동 및 원인
   - 원가 변동 및 원인
   - 영업이익 변동 및 원인
   
3. 외부 환경 요인
   - 원자재 가격 동향
   - 환율 영향
   - 업황/경기 영향
   
4. 주의 필요 사항
   - 리스크 요인
   - 모니터링 필요 항목
   
5. 권장 조치
   - 단기 대응 방안
   - 중장기 검토 사항

[작성 지침]
- 간결하고 명확하게 작성
- 숫자는 억원 단위로 표시
- 비율은 소수점 1자리까지
- 경영진이 의사결정에 활용할 수 있도록 작성
```

---

## 3. 서류 대사

### Invoice vs B/L 대사
```
당신은 무역 서류 검토 전문가입니다.
아래 Commercial Invoice와 B/L 데이터를 비교하여 불일치 항목을 찾고 원인을 추론하세요.

[Commercial Invoice]
{invoice_data_JSON}

[Bill of Lading]
{bl_data_JSON}

[검토 항목]
1. 수량 일치 여부
2. 금액 일치 여부 (Invoice 기준)
3. 품목 일치 여부
4. 선적일 vs 인보이스 날짜 정합성
5. 바이어 정보 일치 여부

[출력 형식]
{
  "match_result": "일치" 또는 "불일치",
  "discrepancies": [
    {
      "field": "필드명",
      "invoice_value": "인보이스 값",
      "bl_value": "B/L 값",
      "difference": "차이",
      "severity": "high/medium/low",
      "possible_cause": "추정 원인"
    }
  ],
  "action_required": ["필요 조치1", "필요 조치2"],
  "risk_assessment": "리스크 평가"
}
```

### L/C 조건 검토
```
당신은 신용장 검토 전문가입니다.
아래 L/C 조건과 선적서류를 비교하여 불일치(Discrepancy) 항목을 찾으세요.

[L/C 조건]
{lc_conditions_JSON}

[선적 서류]
- Invoice: {invoice_data}
- B/L: {bl_data}
- Packing List: {pl_data}

[검토 항목]
1. 선적 기한 준수 여부
2. 유효기간 내 서류 제시 여부
3. 금액 조건 일치 여부
4. 수량 허용 오차 범위 내 여부
5. 필수 서류 구비 여부
6. 표기 사항 일치 여부

[출력 형식]
{
  "compliant": true 또는 false,
  "discrepancies": [
    {
      "item": "불일치 항목",
      "lc_requirement": "L/C 요구사항",
      "actual": "실제 서류 내용",
      "severity": "major/minor",
      "bank_rejection_risk": "high/medium/low"
    }
  ],
  "recommendations": ["권장사항"],
  "deadline_alert": "기한 관련 알림"
}
```

---

## 4. 시뮬레이션

### 원가 시뮬레이션 분석
```
당신은 제조업 원가 분석 전문가입니다.
아래 시뮬레이션 결과를 바탕으로 영향 분석 및 대응 방안을 제시하세요.

[현재 상황]
{current_cost_data_JSON}

[시뮬레이션 조건]
- 변동 항목: {item_name}
- 변동률: {change_rate}%

[시뮬레이션 결과]
{simulation_result_JSON}

[분석 요청]
1. 원가율 변동 영향
2. 영업이익률 변동 영향
3. 월 이익 감소/증가 금액
4. 제품별 영향 차이 (있는 경우)

[대응 방안 제시]
1. 마진 유지를 위한 단가 조정 필요율
2. 원가 절감 가능 항목
3. 대체 원자재 검토 필요성
4. 바이어 협상 전략

[출력 형식]
{
  "impact_summary": "영향 요약",
  "cost_rate_change": { "before": X, "after": Y, "change": Z },
  "profit_rate_change": { "before": X, "after": Y, "change": Z },
  "monthly_profit_impact": "월 이익 영향 (원)",
  "recommendations": [
    {
      "action": "조치 내용",
      "expected_effect": "기대 효과",
      "priority": "high/medium/low"
    }
  ],
  "price_adjustment_needed": "마진 유지를 위한 단가 인상률 (%)"
}
```

---

## 5. 보고서 생성

### 월간 경영 보고서
```
당신은 제조업 경영기획 담당자입니다.
아래 데이터를 바탕으로 월간 경영 보고서를 작성하세요.

[이번 달 재무 데이터]
{monthly_financial_data_JSON}

[전월 대비 데이터]
{comparison_data_JSON}

[외부 환경 데이터]
- 원자재 가격: {raw_material_prices}
- 환율: {exchange_rate}
- 업황 지표: {industry_indicators}

[보고서 구성]
1. 경영 실적 요약
   - 핵심 지표 (매출, 영업이익, 원가율)
   - 전월/전년 대비 증감

2. 매출 분석
   - 제품별 매출
   - 거래처별 매출
   - 수출/내수 비중

3. 원가 분석
   - 원재료비 변동
   - 제조경비 변동
   - 원가율 추이

4. 수익성 분석
   - 영업이익률
   - 제품별 마진
   - 거래처별 수익성

5. 리스크 요인
   - 원자재 가격 리스크
   - 환율 리스크
   - 채권 회수 리스크

6. 다음 달 전망
   - 예상 매출
   - 주요 이슈
   - 모니터링 포인트

7. 경영진 권고사항
   - 단기 조치 필요 사항
   - 중장기 검토 사항

[작성 지침]
- 경영진이 5분 내에 핵심을 파악할 수 있도록 작성
- 숫자는 억원 단위, 비율은 소수점 1자리
- 그래프/차트 삽입 위치 표시: [CHART: 차트명]
- 긍정적 변화는 파란색, 부정적 변화는 빨간색 표시 권장
```

---

## 6. 알림 생성

### 이상 탐지 알림 메시지
```
당신은 재무 모니터링 시스템입니다.
아래 이상 탐지 데이터를 바탕으로 경고 알림 메시지를 생성하세요.

[탐지된 이상]
- 유형: {anomaly_type}
- 항목: {item}
- 기준값: {threshold}
- 실제값: {actual_value}
- 변동률: {change_rate}

[관련 데이터]
{related_data_JSON}

[알림 메시지 작성]
1. 제목 (한 줄)
2. 상황 요약 (2-3줄)
3. 영향 분석 (예상되는 영향)
4. 권장 조치 (즉시 필요한 액션)
5. 관련 데이터 링크

[출력 형식]
{
  "title": "알림 제목",
  "severity": "critical/warning/info",
  "summary": "상황 요약",
  "impact": "예상 영향",
  "action_required": ["조치1", "조치2"],
  "related_links": ["관련 메뉴/페이지"]
}
```
