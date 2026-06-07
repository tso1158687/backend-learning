# SQL 學習筆記

## 目錄
- [資料型別](#資料型別)
- [建立與管理表格](#建立與管理表格)
- [查詢資料 SELECT](#查詢資料-select)
- [新增資料 INSERT](#新增資料-insert)
- [修改資料 UPDATE](#修改資料-update)
- [刪除資料 DELETE](#刪除資料-delete)
- [NULL 處理](#null-處理)
- [型別轉換](#型別轉換)
- [Foreign Key 關聯](#foreign-key-關聯)
- [注意事項與地雷](#注意事項與地雷)

---

## 資料型別

| SQL 型別 | 對應 TS 型別 | 說明 |
|---------|------------|------|
| `INT` | `number` | 整數 |
| `NUMERIC(10,2)` | `number` | 精確小數，金錢用這個 |
| `FLOAT` | `number` | 近似小數，有精度誤差，避免用在金錢 |
| `VARCHAR(n)` | `string` | 字串，最多 n 字元 |
| `TEXT` | `string` | 字串，無長度限制 |
| `BOOLEAN` | `boolean` | `true` / `false` |
| `TIMESTAMP` | `Date` | 日期 + 時間 |
| `DATE` | `Date` | 只有日期 |
| `SERIAL` | 自動遞增數字 | 常用於 id，產生 1, 2, 3... |
| `UUID` | `string` | 唯一識別碼，比 SERIAL 更安全 |

### UUID（推薦用於 id 欄位）
```sql
-- PostgreSQL 13+ 內建，不需要安裝套件
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

---

## 建立與管理表格

### CREATE TABLE
```sql
CREATE TABLE users (
  id         UUID        PRIMARY KEY  DEFAULT gen_random_uuid(),
  name       VARCHAR(50) NOT NULL,
  email      VARCHAR(200) NOT NULL UNIQUE,
  age        INT          CHECK (age >= 0),
  is_active  BOOLEAN      DEFAULT true,
  created_at TIMESTAMP    DEFAULT NOW()
);
```

### 欄位約束（Constraints）

| 約束 | 說明 |
|------|------|
| `PRIMARY KEY` | 唯一識別，不能重複、不能 NULL |
| `NOT NULL` | 必填欄位 |
| `DEFAULT 值` | 沒填時的預設值 |
| `UNIQUE` | 整張表不能有重複值 |
| `CHECK (條件)` | 自訂驗證，類似表單驗證 |

### ALTER TABLE — 修改表格結構
```sql
-- 新增欄位
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- 刪除欄位
ALTER TABLE users DROP COLUMN phone;

-- 修改欄位型別
ALTER TABLE users ALTER COLUMN name TYPE TEXT;

-- 設定 NOT NULL
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- 新增 UNIQUE 限制
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
```

### DROP TABLE — 刪除表格
```sql
DROP TABLE products;             -- 直接刪
DROP TABLE IF EXISTS products;   -- 存在才刪（安全寫法）
```

### 查看表格欄位結構
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users';
```

---

## 查詢資料 SELECT

### 基本語法（順序不能亂）
```sql
SELECT   欄位
FROM     表格
WHERE    條件
ORDER BY 排序
LIMIT    筆數
OFFSET   跳過幾筆;
```

### 範例
```sql
-- 查所有欄位
SELECT * FROM users;

-- 查特定欄位
SELECT name, email FROM users;

-- 欄位取別名
SELECT name AS 使用者名稱, email AS 信箱 FROM users;
```

### WHERE 條件

| 運算子 | 說明 | 範例 |
|--------|------|------|
| `=` | 等於 | `age = 28` |
| `!=` / `<>` | 不等於 | `age != 28` |
| `>` / `<` | 大於 / 小於 | `age > 25` |
| `>=` / `<=` | 大於等於 / 小於等於 | `age >= 18` |
| `AND` | 且 | `age > 20 AND is_active = true` |
| `OR` | 或 | `age < 20 OR age > 60` |
| `IS NULL` | 是空值 | `age IS NULL` |
| `IS NOT NULL` | 不是空值 | `age IS NOT NULL` |

```sql
-- 括號避免 AND/OR 優先順序混淆（好習慣）
SELECT * FROM users
WHERE is_active = true AND (age > 30 OR age < 25);
```

### ORDER BY 排序
```sql
SELECT * FROM users ORDER BY age ASC;   -- 升冪（預設）
SELECT * FROM users ORDER BY age DESC;  -- 降冪

-- NULL 的處理
SELECT * FROM users ORDER BY age DESC NULLS LAST;   -- NULL 排最後
SELECT * FROM users ORDER BY age ASC  NULLS FIRST;  -- NULL 排最前
```

### LIMIT / OFFSET 分頁
```sql
SELECT * FROM users LIMIT 10;            -- 取前 10 筆
SELECT * FROM users LIMIT 10 OFFSET 20; -- 跳過 20 筆，取 10 筆（第 3 頁）
```

---

## 新增資料 INSERT

```sql
-- 新增一筆
INSERT INTO users (name, email, age)
VALUES ('Alice', 'alice@example.com', 28);

-- 新增多筆
INSERT INTO users (name, email, age)
VALUES
  ('Bob',   'bob@example.com',   34),
  ('Carol', 'carol@example.com', 22);

-- 新增後回傳結果（PostgreSQL 特有）
INSERT INTO users (name, email, age)
VALUES ('David', 'david@example.com', 30)
RETURNING *;

-- 只回傳特定欄位
INSERT INTO users (name, email)
VALUES ('Eve', 'eve@example.com')
RETURNING id, name;
```

---

## 修改資料 UPDATE

```sql
-- 基本語法
UPDATE users
SET age = 29
WHERE name = 'Alice';

-- 修改多個欄位
UPDATE users
SET age = 35, is_active = false
WHERE name = 'Bob';

-- 修改後回傳結果
UPDATE users
SET age = 30
WHERE name = 'Alice'
RETURNING id, name, age;
```

> ⚠️ **一定要加 WHERE！** 沒有 WHERE 會修改整張表所有資料。

---

## 刪除資料 DELETE

```sql
-- 刪除特定資料
DELETE FROM users WHERE name = 'David';

-- 清空整張表（結構保留）
DELETE FROM users;

-- 更快速清空（不可回滾）
TRUNCATE TABLE users;
```

> ⚠️ **一定要加 WHERE！** 沒有 WHERE 會刪掉所有資料。
> ✅ **好習慣**：DELETE 前先用 SELECT 確認要刪的範圍。

---

## NULL 處理

```sql
-- 找出 NULL
SELECT * FROM users WHERE age IS NULL;

-- 找出非 NULL
SELECT * FROM users WHERE age IS NOT NULL;

-- COALESCE：NULL 給預設值（類似 JS 的 ?? 運算子）
SELECT name, COALESCE(age, 0) AS age FROM users;
-- 等同於 JS：const age = user.age ?? 0
```

---

## 型別轉換

```sql
-- CAST 語法
SELECT CAST(age AS TEXT) FROM users;

-- PostgreSQL 簡寫（推薦）
SELECT age::TEXT FROM users;
SELECT '123'::INT;
```

---

## JOIN

### INNER JOIN
只回傳兩邊都有對應資料的結果。
```sql
SELECT t.title, u.name
FROM tasks t
INNER JOIN users u ON t.user_id = u.id;
```

### LEFT JOIN
左邊的表全部保留，右邊沒有對應的補 NULL。
```sql
SELECT u.name, t.title
FROM users u
LEFT JOIN tasks t ON u.id = t.user_id;
```

找出「沒有任何 task」的 user：
```sql
SELECT u.name
FROM users u
LEFT JOIN tasks t ON u.id = t.user_id
WHERE t.id IS NULL;
```

> `RIGHT JOIN` 實務上很少用，把表格順序對調就等於 LEFT JOIN。

---

## 聚合函數

| 函數 | 說明 |
|------|------|
| `COUNT(*)` | 計算所有筆數（含 NULL）|
| `COUNT(欄位)` | 計算非 NULL 的筆數 |
| `SUM(欄位)` | 加總 |
| `AVG(欄位)` | 平均 |
| `MAX(欄位)` | 最大值 |
| `MIN(欄位)` | 最小值 |

### GROUP BY
```sql
-- 每個 user 各有幾筆 task
SELECT u.name, COUNT(t.id) AS task_count
FROM users u
INNER JOIN tasks t ON t.user_id = u.id
GROUP BY u.id, u.name;
```

> 規則：SELECT 裡出現的欄位，要嘛在 GROUP BY 裡，要嘛是聚合函數。

### HAVING
對分組結果篩選（WHERE 是篩選原始資料，HAVING 是篩選分組後的結果）：
```sql
SELECT u.name, COUNT(t.id) AS task_count
FROM users u
INNER JOIN tasks t ON t.user_id = u.id
GROUP BY u.id, u.name
HAVING COUNT(t.id) > 1;
```

### FILTER（PostgreSQL 專有）
```sql
SELECT
  COUNT(*) FILTER (WHERE is_done = true)  AS 已完成,
  COUNT(*) FILTER (WHERE is_done = false) AS 未完成
FROM tasks;
```

---

## 子查詢（Subquery）

### IN / NOT IN
```sql
SELECT * FROM users
WHERE id IN (
  SELECT user_id FROM tasks WHERE is_done = false
);
```

### EXISTS / NOT EXISTS
只要找到第一筆就停止，效能比 IN 好：
```sql
SELECT * FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t WHERE t.user_id = u.id
);
```

### Scalar Subquery（放在 SELECT 裡當欄位）
```sql
SELECT *,
  (SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id) AS task_count
FROM users u;
```

---

## 多對多關係（M:N）

需要一張**中介表（Junction Table）**：

```sql
-- 一篇文章可以有多個標籤，一個標籤可以屬於多篇文章
CREATE TABLE post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)  -- 複合主鍵，防止重複
);
```

---

## Foreign Key 關聯

讓兩張表之間有真實的關係，資料庫層級強制保證一致性。

```sql
-- 建立有 Foreign Key 的表格
CREATE TABLE tasks (
  id          UUID        PRIMARY KEY  DEFAULT gen_random_uuid(),
  title       VARCHAR(50) NOT NULL,
  description TEXT,
  is_done     BOOLEAN     DEFAULT false,
  due_at      TIMESTAMP,
  created_at  TIMESTAMP   DEFAULT NOW(),

  -- user_id 必須對應到 users.id 裡存在的值
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
```

### ON DELETE 行為

| 選項 | 說明 |
|------|------|
| `ON DELETE CASCADE` | 主表資料刪掉，關聯資料也一起刪 |
| `ON DELETE SET NULL` | 主表資料刪掉，foreign key 欄位變 NULL |
| `ON DELETE RESTRICT` | 有關聯資料存在時，禁止刪除主表（預設）|

> ⚠️ **建表順序**：被參考的表（users）要先建，再建參考它的表（tasks）。

---

## 注意事項與地雷

| 地雷 | 說明 |
|------|------|
| `WHERE age = NULL` | ❌ 無效！要用 `IS NULL` |
| `UPDATE` 沒有 `WHERE` | 💥 整張表都會被修改 |
| `DELETE` 沒有 `WHERE` | 💥 整張表資料全部刪掉 |
| `VALUE` vs `VALUES` | `INSERT` 一定要用 `VALUES`（有 S）|
| 保留字當欄位名 | `user`、`create`、`table` 不能當欄位名稱 |
| 金錢用 `FLOAT` | 有精度誤差，要用 `NUMERIC(10,2)` |
| `SERIAL` id | 連續數字有安全疑慮，考慮用 `UUID` |

---

## 註解語法

```sql
-- 單行註解

/*
  多行註解
*/
```

快捷鍵（DBeaver / 跟 VS Code 相同）：
- 單行：`⌘ + /`
- 多行：`⌘ + Shift + /`
