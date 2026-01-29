# 샘플 데이터 구조

## 회사 정보
- **회사명**: 디케이동신 (DK Dongshin)
- **업종**: 컬러강판(PCM) 제조
- **주요 제품**: 건재용 PCM, 가전용 PCM
- **주요 원자재**: 냉연강판, 도료, 아연
- **주요 바이어**: 미국, 유럽, 동남아 건자재/가전 업체

---

## 1. Commercial Invoice 샘플

```json
{
  "invoice_no": "INV-2025-0115",
  "date": "2025-01-15",
  "seller": {
    "name": "DK Dongshin Co., Ltd.",
    "address": "123 Industrial Complex, Busan, Korea",
    "tel": "+82-51-XXX-XXXX"
  },
  "buyer": {
    "name": "ABC Building Materials Inc.",
    "address": "456 Commerce St, Los Angeles, CA, USA",
    "country": "USA"
  },
  "currency": "USD",
  "items": [
    {
      "item_no": 1,
      "product": "Pre-painted Color Steel Coil (PCM) - RAL 9002",
      "specification": "0.5mm x 1,219mm",
      "quantity": 300,
      "unit": "TON",
      "unit_price": 850.00,
      "amount": 255000.00
    },
    {
      "item_no": 2,
      "product": "Pre-painted Color Steel Coil (PCM) - RAL 5015",
      "specification": "0.45mm x 1,219mm",
      "quantity": 200,
      "unit": "TON",
      "unit_price": 870.00,
      "amount": 174000.00
    }
  ],
  "subtotal": 429000.00,
  "freight": 0,
  "insurance": 0,
  "total": 429000.00,
  "payment_terms": "T/T 60 days after B/L date",
  "incoterms": "FOB Busan",
  "bank_info": {
    "bank": "Hana Bank",
    "account": "XXX-XXXXXX-XXX",
    "swift": "HNBNKRSE"
  }
}
```

---

## 2. B/L (선하증권) 샘플

```json
{
  "bl_no": "MSKU7654321",
  "shipper": {
    "name": "DK Dongshin Co., Ltd.",
    "address": "123 Industrial Complex, Busan, Korea"
  },
  "consignee": {
    "name": "ABC Building Materials Inc.",
    "address": "456 Commerce St, Los Angeles, CA, USA"
  },
  "notify_party": {
    "name": "ABC Building Materials Inc.",
    "address": "456 Commerce St, Los Angeles, CA, USA"
  },
  "vessel_name": "EVER GIVEN",
  "voyage_no": "025E",
  "port_of_loading": "Busan, Korea",
  "port_of_discharge": "Los Angeles, USA",
  "place_of_delivery": "Los Angeles, USA",
  "ship_date": "2025-01-20",
  "containers": [
    {
      "container_no": "MSCU1234567",
      "seal_no": "KR123456",
      "type": "40HC"
    },
    {
      "container_no": "MSCU1234568",
      "seal_no": "KR123457",
      "type": "40HC"
    }
  ],
  "cargo_description": "Pre-painted Color Steel Coil (PCM)",
  "quantity": 500,
  "unit": "TON",
  "gross_weight": "510,000 KGS",
  "measurement": "120 CBM",
  "freight": "PREPAID",
  "bl_type": "Original",
  "issued_at": "Busan, Korea",
  "issued_date": "2025-01-20"
}
```

---

## 3. Packing List 샘플

```json
{
  "invoice_ref": "INV-2025-0115",
  "date": "2025-01-18",
  "shipper": "DK Dongshin Co., Ltd.",
  "consignee": "ABC Building Materials Inc.",
  "items": [
    {
      "item_no": 1,
      "product": "PCM - RAL 9002",
      "coil_count": 15,
      "quantity": 300,
      "unit": "TON",
      "net_weight": "300,000 KGS",
      "gross_weight": "306,000 KGS",
      "container": "MSCU1234567"
    },
    {
      "item_no": 2,
      "product": "PCM - RAL 5015",
      "coil_count": 10,
      "quantity": 200,
      "unit": "TON",
      "net_weight": "200,000 KGS",
      "gross_weight": "204,000 KGS",
      "container": "MSCU1234568"
    }
  ],
  "total_coils": 25,
  "total_quantity": "500 TON",
  "total_net_weight": "500,000 KGS",
  "total_gross_weight": "510,000 KGS",
  "total_measurement": "120 CBM"
}
```

---

## 4. 손익 데이터 샘플

```json
{
  "company": "DK Dongshin",
  "period": {
    "current": "2025-01",
    "previous": "2024-12"
  },
  "income_statement": {
    "revenue": {
      "current": 4500000000,
      "previous": 4200000000,
      "breakdown": {
        "export_construction": { "current": 2700000000, "previous": 2500000000 },
        "export_appliance": { "current": 1350000000, "previous": 1300000000 },
        "domestic": { "current": 450000000, "previous": 400000000 }
      }
    },
    "cost_of_goods_sold": {
      "current": 3240000000,
      "previous": 2940000000,
      "breakdown": {
        "raw_materials": {
          "current": 2430000000,
          "previous": 2205000000,
          "detail": {
            "cold_rolled_steel": { "current": 2041200000, "previous": 1890000000 },
            "paint": { "current": 291600000, "previous": 236250000 },
            "zinc": { "current": 97200000, "previous": 78750000 }
          }
        },
        "labor": { "current": 486000000, "previous": 441000000 },
        "manufacturing_overhead": {
          "current": 324000000,
          "previous": 294000000,
          "detail": {
            "electricity": { "current": 162000000, "previous": 147000000 },
            "gas": { "current": 97200000, "previous": 88200000 },
            "depreciation": { "current": 64800000, "previous": 58800000 }
          }
        }
      }
    },
    "gross_profit": {
      "current": 1260000000,
      "previous": 1260000000
    },
    "selling_admin_expenses": {
      "current": 630000000,
      "previous": 588000000,
      "breakdown": {
        "salaries": { "current": 315000000, "previous": 294000000 },
        "logistics": { "current": 189000000, "previous": 176400000 },
        "marketing": { "current": 63000000, "previous": 58800000 },
        "other": { "current": 63000000, "previous": 58800000 }
      }
    },
    "operating_profit": {
      "current": 630000000,
      "previous": 672000000
    },
    "non_operating": {
      "interest_income": { "current": 9000000, "previous": 8400000 },
      "interest_expense": { "current": 45000000, "previous": 42000000 },
      "forex_gain_loss": { "current": -36000000, "previous": 21000000 }
    },
    "net_profit": {
      "current": 558000000,
      "previous": 659400000
    }
  },
  "ratios": {
    "cost_rate": { "current": 72.0, "previous": 70.0 },
    "gross_margin": { "current": 28.0, "previous": 30.0 },
    "operating_margin": { "current": 14.0, "previous": 16.0 },
    "net_margin": { "current": 12.4, "previous": 15.7 }
  }
}
```

---

## 5. 채권 데이터 샘플

```json
{
  "accounts_receivable": [
    {
      "invoice_no": "INV-2024-1201",
      "customer": "ABC Building Materials Inc.",
      "country": "USA",
      "invoice_date": "2024-12-01",
      "due_date": "2025-01-30",
      "amount_usd": 385000,
      "exchange_rate_at_invoice": 1300,
      "amount_krw": 500500000,
      "status": "outstanding",
      "days_outstanding": 59,
      "days_overdue": 0,
      "collection_status": "on_track"
    },
    {
      "invoice_no": "INV-2024-1115",
      "customer": "EuroSteel GmbH",
      "country": "Germany",
      "invoice_date": "2024-11-15",
      "due_date": "2025-01-14",
      "amount_eur": 280000,
      "exchange_rate_at_invoice": 1420,
      "amount_krw": 397600000,
      "status": "overdue",
      "days_outstanding": 75,
      "days_overdue": 15,
      "collection_status": "follow_up_needed"
    },
    {
      "invoice_no": "INV-2024-1001",
      "customer": "Vietnam Construction Co.",
      "country": "Vietnam",
      "invoice_date": "2024-10-01",
      "due_date": "2024-11-30",
      "amount_usd": 150000,
      "exchange_rate_at_invoice": 1280,
      "amount_krw": 192000000,
      "status": "overdue",
      "days_outstanding": 120,
      "days_overdue": 60,
      "collection_status": "at_risk"
    }
  ],
  "summary": {
    "total_outstanding": 1090100000,
    "current": 500500000,
    "overdue_1_30": 397600000,
    "overdue_31_60": 0,
    "overdue_61_90": 192000000,
    "overdue_90_plus": 0
  },
  "aging_analysis": {
    "current_pct": 45.9,
    "overdue_1_30_pct": 36.5,
    "overdue_31_60_pct": 0,
    "overdue_61_90_pct": 17.6,
    "overdue_90_plus_pct": 0
  }
}
```

---

## 6. 환율 데이터 샘플

```json
{
  "date": "2025-01-29",
  "rates": {
    "USD_KRW": {
      "current": 1320.50,
      "previous_day": 1315.20,
      "change": 5.30,
      "change_pct": 0.40,
      "month_ago": 1295.00,
      "year_ago": 1280.00
    },
    "EUR_KRW": {
      "current": 1425.30,
      "previous_day": 1420.80,
      "change": 4.50,
      "change_pct": 0.32,
      "month_ago": 1410.00,
      "year_ago": 1390.00
    },
    "JPY_KRW": {
      "current": 8.85,
      "previous_day": 8.82,
      "change": 0.03,
      "change_pct": 0.34,
      "month_ago": 8.70,
      "year_ago": 8.50
    }
  },
  "forex_exposure": {
    "usd_receivables": 535000,
    "usd_receivables_krw": 706567500,
    "eur_receivables": 280000,
    "eur_receivables_krw": 399084000,
    "total_exposure_krw": 1105651500,
    "unrealized_forex_gain_loss": -15451500
  }
}
```

---

## 7. 원자재 가격 데이터 샘플

```json
{
  "date": "2025-01-29",
  "raw_materials": {
    "cold_rolled_steel": {
      "name": "냉연강판",
      "unit": "TON",
      "current_price": 850000,
      "previous_month": 787000,
      "change": 63000,
      "change_pct": 8.0,
      "year_ago": 750000,
      "yoy_change_pct": 13.3,
      "source": "POSCO 기준가"
    },
    "paint": {
      "name": "도료",
      "unit": "KG",
      "current_price": 4500,
      "previous_month": 4200,
      "change": 300,
      "change_pct": 7.1,
      "year_ago": 4000,
      "yoy_change_pct": 12.5,
      "source": "국내 도료업체 평균"
    },
    "zinc": {
      "name": "아연",
      "unit": "TON",
      "current_price": 2800000,
      "previous_month": 2650000,
      "change": 150000,
      "change_pct": 5.7,
      "year_ago": 2500000,
      "yoy_change_pct": 12.0,
      "source": "LME 기준"
    }
  },
  "cost_impact": {
    "total_monthly_increase": 151200000,
    "breakdown": {
      "cold_rolled_steel": 126000000,
      "paint": 15000000,
      "zinc": 10200000
    },
    "impact_on_cost_rate": 2.1
  }
}
```

---

## 8. 시뮬레이션 결과 샘플

```json
{
  "simulation_type": "raw_material_price_change",
  "input": {
    "item": "cold_rolled_steel",
    "change_rate": 10.0
  },
  "baseline": {
    "monthly_revenue": 4500000000,
    "monthly_cogs": 3240000000,
    "cost_rate": 72.0,
    "gross_margin": 28.0,
    "operating_profit": 630000000,
    "operating_margin": 14.0
  },
  "simulated": {
    "monthly_revenue": 4500000000,
    "monthly_cogs": 3444120000,
    "cost_rate": 76.5,
    "gross_margin": 23.5,
    "operating_profit": 425880000,
    "operating_margin": 9.5
  },
  "impact": {
    "cogs_increase": 204120000,
    "cost_rate_change": 4.5,
    "gross_margin_change": -4.5,
    "operating_profit_decrease": 204120000,
    "operating_margin_change": -4.5
  },
  "recommendation": {
    "price_increase_needed": 4.5,
    "alternative_actions": [
      "제품 단가 4.5% 인상으로 마진 회복",
      "대체 원자재 검토 (중국산 냉연강판)",
      "제조 효율화로 노무비/경비 절감"
    ]
  }
}
```

---

## 데이터 연동 포맷

### ERP 연동 시 예상 포맷 (더존 iCUBE)

```json
{
  "erp_type": "douzone_icube",
  "sync_time": "2025-01-29T09:00:00+09:00",
  "data_type": "daily_sales",
  "records": [
    {
      "voucher_no": "SA-20250129-001",
      "voucher_date": "2025-01-29",
      "customer_code": "C001",
      "customer_name": "ABC Building Materials Inc.",
      "product_code": "PCM-001",
      "product_name": "컬러강판 RAL9002",
      "quantity": 50,
      "unit": "TON",
      "unit_price": 850000,
      "amount": 42500000,
      "currency": "KRW",
      "department": "영업1팀"
    }
  ]
}
```

### 엑셀 업로드 템플릿

| 전표일자 | 전표번호 | 거래처코드 | 거래처명 | 제품코드 | 제품명 | 수량 | 단위 | 단가 | 금액 | 통화 |
|----------|----------|------------|----------|----------|--------|------|------|------|------|------|
| 2025-01-29 | SA-001 | C001 | ABC Inc. | PCM-001 | 컬러강판 | 50 | TON | 850000 | 42500000 | KRW |
