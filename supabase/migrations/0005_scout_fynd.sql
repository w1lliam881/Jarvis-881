-- 0005: Fynd som du lämnar till Scout att bedöma (länk och/eller skärmbild). Går att köra flera gånger.
alter table public.agent_media drop constraint if exists agent_media_kind_check;
alter table public.agent_media add constraint agent_media_kind_check check (kind in ('scout-ref', 'clip-frame', 'scout-fynd'));
-- En fynd-rad kan vara bara en länk (data = '') eller en skärmbild
alter table public.agent_media drop constraint if exists agent_media_data_check;
alter table public.agent_media add constraint agent_media_data_check check ((data = '' or data like 'data:image/%') and length(data) < 400000);
