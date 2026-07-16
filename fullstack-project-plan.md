# 全端實作計劃 — 電商系統

## 目標
把 SQL 學習階段設計的電商資料庫結構，實際串接成一個可運作的全端應用。
重點在**後端練習**（NestJS 為主、Python FastAPI 為輔），前端 Angular 做到堪用即可。

## 技術選型
| 層 | 技術 |
|----|------|
| 主要後端 | NestJS + Prisma + PostgreSQL |
| 次要後端（同功能改寫）| Python + FastAPI + SQLAlchemy |
| 前端 | Angular（簡單堪用，不深究樣式）|
| 資料庫 | 沿用現有 Docker PostgreSQL（`postgres-learning`）|

## 專案範圍（沿用 Day 20-21 設計的資料表）
```
users, products, inventories, orders, order_items
```

---

## 階段總覽

| 階段 | 主題 | 狀態 |
|------|------|------|
| 階段 1 | NestJS + Prisma 基礎建置（環境已備妥，觀念待練習）| 🔄 進行中 |
| 階段 2 | 商品與庫存 API（CRUD） | 🔄 進行中 |
| 階段 3 | 訂單 API（含 Transaction） | 🔲 未開始 |
| 階段 4 | 認證與授權 | 🔲 未開始 |
| 階段 5 | Angular 前端串接 | 🔲 未開始 |
| 階段 6 | Python FastAPI 改寫練習 | 🔲 未開始 |

---

## 階段 1：NestJS + Prisma 基礎建置

- 安裝 NestJS CLI，建立專案骨架
- 安裝 Prisma，設定連線到既有的 `postgres-learning` container
- 用 `prisma db pull` 把現有資料表結構「反向產生」成 Prisma Schema
- 認識 NestJS 的核心概念：Module / Controller / Service
- 建立第一個測試用的 `GET /health` API

---

## 階段 2：商品與庫存 API

- `GET /products` — 列表（含分頁）
- `GET /products/:id` — 單筆詳情（含庫存資訊，練習 JOIN 概念在 Prisma 裡怎麼做，也就是 `include`）
- `POST /products` — 新增商品
- `PATCH /products/:id` — 修改商品
- `DELETE /products/:id` — 刪除商品
- 加上 DTO（Data Transfer Object）與驗證（class-validator）
- 練習 NestJS 的例外處理（Exception Filter），把資料庫錯誤轉成正確的 HTTP 狀態碼

---

## 階段 3：訂單 API（核心重點）

- `POST /orders` — 建立訂單
  - 這裡會用到 **Transaction**：扣庫存 + 建立訂單 + 建立訂單明細，要嘛全部成功要嘛全部失敗
  - 練習 Prisma 的 `$transaction`
  - 練習庫存不足時的錯誤處理（對應 SQL 學過的 CHECK constraint）
- `GET /orders/:id` — 查詢訂單詳情（含訂單明細與 price snapshot）
- `PATCH /orders/:id/status` — 更新訂單狀態（用 Prisma 對應 PostgreSQL 的 ENUM）

---

## 階段 4：認證與授權

- 使用者註冊 / 登入（JWT）
- 密碼雜湊（bcrypt）
- Guard 保護需要登入才能用的 API（e.g. 建立訂單）
- 練習「使用者只能看自己的訂單」這種資料存取限制

---

## 階段 5：Angular 前端串接

範圍刻意精簡，重點是打通前後端，不是做漂亮 UI：

- 商品列表頁（呼叫 `GET /products`）
- 商品詳情頁 + 加入購物車（前端 state 暫存即可，不用存資料庫）
- 送出訂單（呼叫 `POST /orders`）
- 登入頁面 + 儲存 JWT

---

## 階段 6：Python FastAPI 改寫練習

把階段 2、3 的 API 用 FastAPI 重新寫一次，感受差異：

| 對照項目 | NestJS | FastAPI |
|---------|--------|---------|
| ORM | Prisma | SQLAlchemy |
| 驗證 | class-validator + DTO | Pydantic model |
| 依賴注入 | 內建 DI 容器 | Depends() |
| Transaction | `$transaction` | `session.begin()` |

重點不是重做整個範圍，挑「商品 CRUD」+「訂單建立（含 Transaction）」這兩塊來對照實作即可，感受兩個框架設計哲學的差異。

---

## 進度筆記

### 階段 1 — NestJS + Prisma 基礎建置


---

### 階段 2 — 商品與庫存 API

- `GET /products` — 完成（Controller/Service 分離，回傳 Prisma `findMany()`）
- `GET /products/:id` — 完成
  - Service 用 `findUnique` + 手動 `NotFoundException`（id 存在但查無資料 → 404）
  - Controller 用 `ParseUUIDPipe` 擋掉格式不對的 id（→ 400，避免 Prisma 丟未處理例外變成 500）
  - 學到的關鍵觀念：`return` Promise 不需要 `async/await`（框架會自動 await），但要對 resolve 後的值做判斷時才需要


---

### 階段 3 — 訂單 API


---

### 階段 4 — 認證與授權


---

### 階段 5 — Angular 前端串接


---

### 階段 6 — Python FastAPI 改寫練習


---

## 狀態說明
- 🔲 未開始
- 🔄 進行中
- ✅ 已完成
