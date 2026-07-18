# NestJS 學習筆記

## 目錄
- [核心概念](#核心概念)
- [模組結構](#模組結構)
- [Prisma 整合](#prisma-整合)
- [環境變數](#環境變數)
- [DTO 與驗證](#dto-與驗證)
- [路由與參數](#路由與參數)
- [例外處理](#例外處理)
- [TypeScript 觀念釐清](#typescript-觀念釐清)
- [踩過的坑](#踩過的坑)

---

## 核心概念

| 概念 | 類比 | 職責 |
|------|------|------|
| **Module** | 功能模組的打包箱 | 把相關的 Controller / Service 組織在一起 |
| **Controller** | Angular 的 Component | 只負責路由、接收 HTTP 請求，不寫商業邏輯 |
| **Service** | Angular 的 Service | 商業邏輯、資料庫操作都寫這裡 |

```
請求進來
   ↓
Controller（路由對應到哪個方法）
   ↓
Service（實際做事：查資料庫、判斷邏輯）
   ↓
回傳結果
```

### 依賴注入（Dependency Injection）

NestJS 只用 constructor injection，沒有 Angular 新版的 `inject()`：

```ts
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
}
```

原因：NestJS 全部是 class-based 架構（Controller/Service/Module 都是 class），沒有 Angular 那種函式式 route guard 的場景，constructor injection 已經足夠。

---

## 模組結構

用 CLI 產生檔案，指令風格跟 Angular CLI 幾乎一樣：

```bash
npx nest generate module products
npx nest generate controller products
npx nest generate service products

# 縮寫
npx nest g module products
npx nest g service products
```

### CLI 也能產生一般 class（DTO 常用這招）

```bash
npx nest generate class products/dto/create-product.dto --no-spec --flat
```

- `--no-spec`：不要順便產生測試檔
- `--flat`：不要多產生一層跟檔名同名的資料夾

---

## Prisma 整合

### 專案裡連線資訊只放在一個地方：`.env`

```
DATABASE_URL="postgresql://user:pass@localhost:5432/ecommerce?schema=public"
```

拆解：
```
postgresql://user:pass@localhost:5432/ecommerce?schema=public
            ↑    ↑    ↑         ↑    ↑          ↑
           帳號  密碼  主機位址  port  資料庫名稱   schema
```

**永遠不要把帳密寫死在程式碼裡**：
- 會跟著程式碼進 git，等於公開密碼
- 不同環境（dev/test/prod）帳密不同，寫死無法切換
- 密碼要輪替時要重新部署程式碼

`.env` 要加進 `.gitignore`，並額外提供一份 `.env.example`（不含真實密碼）進版控，讓其他人知道專案需要哪些環境變數。

### PrismaService 封裝

```ts
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

用 `@Global()` 讓 `PrismaModule` 全域可用，其他 Module 不用重複 import：

```ts
// src/prisma/prisma.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Prisma 7 的重要變化（跟舊版教學不同，要注意）

- **不能再直接傳連線字串**，必須用 Driver Adapter（如 `@prisma/adapter-pg`）
- `datasourceUrl` 選項已被移除，改用 `adapter` 選項
- 新版 TS generator（`prisma-client`）預設輸出 ESM 語法，CJS 專案要在 schema.prisma 加 `moduleFormat = "cjs"`

### 回傳型別不用手動標註

Prisma 產生的型別會自動推導貫穿 Service/Controller，不需要手寫 interface/type 重複定義一次：

```ts
// ✅ 不需要標註回傳型別，TypeScript 自動從 findMany() 推導
findAll() {
  return this.prismaService.product.findMany();
}
```

如果真的需要自訂型別，只在**組合多個資料來源**、回傳形狀跟資料庫原生結構不同時才需要：

```ts
type ProductWithStock = Product & { availableStock: number };
```

单純的輸入型別交給 DTO 處理，不需要另外寫 `type CreateProduct = ...`。

---

## 環境變數

NestJS **不會自動載入 `.env`**，跟 Prisma CLI 不一樣，要自己接上 `@nestjs/config`：

```bash
npm install @nestjs/config
```

```ts
// app.module.ts
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
```

之後在任何 Service 用 `ConfigService` 讀取：

```ts
constructor(private configService: ConfigService) {}

someMethod() {
  const url = this.configService.get<string>('DATABASE_URL');
}
```

---

## DTO 與驗證

DTO（Data Transfer Object）定義「API 允許接收的資料形狀」，搭配 `class-validator` 做自動驗證。

```bash
npm install class-validator class-transformer
```

### 新增用的 DTO

```ts
// create-product.dto.ts
import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  price: number;
}
```

### 更新用的 DTO：用 PartialType 繼承，不要重寫

`PATCH` 是部分更新，所有欄位都要變成可選。用 `PartialType` 自動繼承驗證規則，不用整份重寫：

```bash
npm install @nestjs/mapped-types
```

```ts
// update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

### 全域啟用驗證（一定要做，不然裝飾器不會生效）

```ts
// main.ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // 自動剔除 DTO 沒定義的欄位
    forbidNonWhitelisted: true, // 有多餘欄位直接報 400，而不是默默剔除
  }),
);
```

---

## 路由與參數

```ts
@Controller('products')
export class ProductsController {
  @Get()
  findAll() {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {}
  // ParseUUIDPipe：格式不對的 id（如 "1"）直接擋在 Controller 層，回 400

  @Post()
  create(@Body() dto: CreateProductDto) {}

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {}
}
```

| 裝飾器 | 用途 |
|--------|------|
| `@Param('id')` | 抓路由參數（網址上的 `:id`）|
| `@Body()` | 抓請求的 JSON body |
| `@Query()` | 抓 query string（`?page=1`）|
| `ParseUUIDPipe` | 內建 Pipe，驗證並轉換成合法格式，不合法直接 400 |

---

## 例外處理

### NotFoundException 該放 Controller 還是 Service？

**放 Service。** 因為「這筆資料存不存在」是商業邏輯，不是路由該管的事。

```ts
// products.service.ts
async findOne(id: string) {
  const product = await this.prismaService.product.findUnique({ where: { id } });

  if (!product) {
    throw new NotFoundException(`Product with id ${id} not found`);
  }

  return product;
}
```

好處：之後如果多一個入口（GraphQL、排程工作）也要查商品，直接呼叫同一個 Service 方法，「找不到就丟例外」的規則不用重複寫。

### 兩種「找不到」的差異，要分開處理

```
情境 A：id 格式正確，但資料庫沒有 → findUnique 回傳 null → 手動判斷丟 404
情境 B：id 格式本身就錯（不是合法 UUID）→ Prisma 送 SQL 到資料庫直接失敗
        → PrismaClientKnownRequestError 沒被攔截 → NestJS 預設回 500
```

情境 B 要用 `ParseUUIDPipe` 在 Controller 層先擋掉，讓錯誤的輸入根本進不了 Service，回傳合理的 400 而不是 500。

---

## TypeScript 觀念釐清

### `return` Promise 不一定要 `async/await`

```ts
// 不需要 async/await，直接把 Promise 傳出去就好
findAll() {
  return this.prismaService.product.findMany();  // 回傳 Promise<Product[]>
}
```

NestJS 框架本身知道 Controller/Service 方法可能回傳 Promise，會自動幫你 `await`。

**但如果要對 resolve 後的「值」做判斷**，就必須加 `async/await`：

```ts
// ❌ 錯誤：product 是 Promise 物件，不是真正的資料，if 永遠不會是 false
findOne(id: string) {
  const product = this.prismaService.product.findUnique({ where: { id } });
  if (!product) { ... }  // 沒用，Promise 物件永遠是 truthy
}

// ✅ 正確：await 之後才是真正 resolve 出來的值
async findOne(id: string) {
  const product = await this.prismaService.product.findUnique({ where: { id } });
  if (!product) { throw new NotFoundException(...); }
}
```

判斷原則：**只是把 Promise 轉發出去 → 不用 await；要檢查/處理 resolve 後的值 → 一定要 await**。

### super() 之前不能用 this

```ts
// ❌ 錯誤：this 要等 super() 執行完才存在
constructor(private configService: ConfigService) {
  const adapter = new PrismaPg({
    connectionString: this.configService.get('DATABASE_URL'),  // this 還沒準備好
  });
  super({ adapter });
}

// ✅ 正確：super() 之前用「參數本身」，不要透過 this
constructor(private configService: ConfigService) {
  const adapter = new PrismaPg({
    connectionString: configService.get('DATABASE_URL'),  // 用參數，不加 this
  });
  super({ adapter });
}
```

`private configService: ConfigService` 是 TS 語法糖，等同：
```ts
private configService: ConfigService;
constructor(configService: ConfigService) {
  this.configService = configService;  // 這行會被自動塞到 super() 之後執行
}
```

在 `super()` 呼叫前，**參數變數本身**已經可以用，但 `this.屬性` 還不行。

### import type vs 一般 import

`isolatedModules: true` 模式下，只拿來當型別標註的 import 要明確標示：

```ts
// ❌ 曖昧：TS 不確定這是「型別」還是「值」
import { CreateProductDto } from './dto/create-product.dto';

// ✅ 明確：只用來標註型別，不會在執行期用到這個值
import type { CreateProductDto } from './dto/create-product.dto';
```

判斷原則：**程式碼裡有沒有真的用到這個 import 的「值」**（`new XXX()`、裝飾器 `@XXX()`）？
- 有 → 一般 `import`
- 只是拿來標註型別（如 `dto: CreateProductDto`）→ `import type`

> DTO 檔案本身內部的 `class-validator` 裝飾器 import（`@IsString()` 等）**不能**用 `import type`，因為那是運行時真的會執行的程式碼。

---

## 踩過的坑

### 1. Prisma 7 新版 generator 輸出 ESM 語法，跟 CJS 專案衝突

**症狀**：`ReferenceError: exports is not defined in ES module scope`

**原因**：Prisma 新版 TS generator 預設輸出的程式碼含有 `import.meta.url`（純 ESM 語法），但專案是 CJS，TypeScript 編譯時無法轉換這行，Node.js 偵測到 `import.meta` 就把整個檔案當成 ESM 載入，接著遇到 CJS 的 `exports.xxx =` 就爆炸。

**解法**：在 `schema.prisma` 的 generator 區塊加上：
```prisma
generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "cjs"
}
```

### 2. Prisma 7 不能直接傳連線字串

**症狀**：`datasourceUrl` 參數報錯「不存在於 PrismaClientOptions」

**原因**：Prisma 7 開始強制要求用 Driver Adapter 連接資料庫，`datasourceUrl` 是舊版（5/6）的選項，已被移除。

**解法**：安裝對應資料庫的 adapter：
```bash
npm install @prisma/adapter-pg pg
```
```ts
const adapter = new PrismaPg({ connectionString: ... });
super({ adapter });
```

### 3. Module 之間沒連起來，注入失敗

**症狀**：`UnknownDependenciesException`，找不到 PrismaService

**原因**：`PrismaModule` 沒有用 `@Global()`，其他 Module 又沒手動 `imports: [PrismaModule]`。

**解法**：`PrismaModule` 加 `@Global()`，一勞永逸讓全部 Module 都能用。

### 4. NestJS 不會自動載入 .env

**症狀**：`pg` 報錯 `client password must be a string`

**原因**：`main.ts` 沒有任何地方載入 `.env`，`process.env.DATABASE_URL` 是 `undefined`。

**解法**：裝 `@nestjs/config`，在 `app.module.ts` 加 `ConfigModule.forRoot({ isGlobal: true })`。

### 5. dist 資料夾忘記加進 .gitignore

`prisma init` 會重寫專案的 `.gitignore`，把 NestJS 預設就有的 `dist` 排除規則蓋掉。建置產物（`dist`、`node_modules`、`generated/prisma`）都不該進版控，能用指令重新產生的東西就不需要版控。
