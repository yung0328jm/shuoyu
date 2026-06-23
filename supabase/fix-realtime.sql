-- 若已部署過，在 Supabase SQL Editor 執行此檔以加強即時同步

alter table public.app_documents replica identity full;

-- 確認 Realtime 已啟用（若報錯表示已加入，可忽略）
alter publication supabase_realtime add table public.app_documents;
