# 爍宇企業管理系統 — 部署指南

使用 **GitHub + Supabase + Vercel** 部署，支援**多人即時同步**（行事曆、出勤、審核、報酬單等資料雲端共享）。

---

## 架構說明

| 服務 | 用途 |
|------|------|
| **GitHub** | 程式碼版本管理，推送後自動觸發 Vercel 部署 |
| **Supabase** | PostgreSQL 資料庫 + 帳號登入 + **Realtime 即時同步** |
| **Vercel** | 正式網站託管（Next.js） |

---

## 第一步：Supabase 設定

1. 前往 [supabase.com](https://supabase.com) 建立新專案
2. 進入 **SQL Editor**，貼上並執行 [`supabase/schema.sql`](supabase/schema.sql)
3. 進入 **Authentication → Providers → Email**：
   - 關閉 **Confirm email**（員工註冊後可直接登入）
4. 進入 **Database → Replication**，確認 `app_documents` 已啟用 Realtime  
   （若 SQL 執行失敗，可在此手動勾選）
5. 進入 **Project Settings → API**，複製：
   - `Project URL`
   - `anon public` key
   - `service_role` key（僅伺服器使用，勿公開）

---

## 第二步：建立管理員帳號

部署完成後，用以下指令建立第一個管理員（只需執行一次）：

```bash
curl -X POST https://你的網域.vercel.app/api/setup \
  -H "Content-Type: application/json" \
  -H "x-setup-secret: 你設定的SETUP_SECRET" \
  -d "{\"username\":\"admin\",\"name\":\"系統管理員\",\"password\":\"admin123\"}"
```

成功後用 `admin` / `admin123` 登入，再到「用戶管理」新增其他員工。

---

## 第三步：GitHub 推送

在專案資料夾執行：

```bash
git init
git add .
git commit -m "feat: Supabase 多人同步 + 部署設定"
```

到 GitHub 建立新 Repository（例如 `shuoyu-erp`），然後：

```bash
git remote add origin https://github.com/你的帳號/shuoyu-erp.git
git branch -M main
git push -u origin main
```

---

## 第四步：Vercel 部署

1. 前往 [vercel.com](https://vercel.com) 用 GitHub 登入
2. **Add New Project** → 選擇剛推送的 repo
3. Framework 選 **Next.js**（自動偵測）
4. 在 **Environment Variables** 加入：

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | service_role key |
| `SETUP_SECRET` | 自訂一組長密碼 | 首次建立管理員用 |

5. 點 **Deploy**，等待完成後取得正式網址（如 `https://shuoyu-erp.vercel.app`）

---

## 第五步：建立管理員並分發給員工

1. 用上面的 `curl` 指令建立管理員
2. 登入後到 **用戶管理** 新增員工帳號
3. 把網址傳給員工，各自用帳號密碼登入

---

## 多人同步說明

- 所有使用者登入後，資料從 Supabase 雲端載入
- 任一人修改行事曆、出勤、審核等，**其他人會即時看到更新**（Realtime）
- 未設定 Supabase 環境變數時，系統退回本機 `localStorage` 模式（僅單機測試用）

---

## 本機開發（連線雲端資料庫）

複製 `.env.local.example` 為 `.env.local`，填入 Supabase 金鑰後：

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

---

## 常見問題

**Q: 登入顯示帳號密碼錯誤？**  
確認已執行 `/api/setup` 建立管理員，且 Supabase Email 確認已關閉。

**Q: 資料沒有同步？**  
確認 `app_documents` 表已啟用 Realtime，且所有環境變數在 Vercel 已設定。

**Q: 新增員工失敗？**  
確認 `SUPABASE_SERVICE_ROLE_KEY` 已加入 Vercel 環境變數。
