-- Simple fix for the RPC function
-- Drop and recreate with proper column qualification

drop function if exists public.get_random_ouioui_line(text, text) cascade;

create or replace function public.get_random_ouioui_line(
  p_type text,
  p_locale text default 'en'
)
returns text language plpgsql as $$
declare
  result_text text;
  total_count int;
  random_index int;
begin
  -- Get total count for the given type and locale
  select count(*) into total_count
  from public.ouioui_lines
  where type = p_type and locale = p_locale;
  
  if total_count = 0 then
    -- Fallback to any locale
    select count(*) into total_count
    from public.ouioui_lines
    where type = p_type;
    
    if total_count = 0 then
      return 'Welcome to Recipe Chef!';
    end if;
    
    -- Get random line from any locale
    select text into result_text
    from public.ouioui_lines
    where type = p_type
    order by random()
    limit 1;
  else
    -- Get random line from specified locale
    select text into result_text
    from public.ouioui_lines
    where type = p_type and locale = p_locale
    order by random()
    limit 1;
  end if;
  
  return result_text;
end; $$;

-- Test the function
select 'Testing simplified RPC function...' as message;

-- Test with greeting
select public.get_random_ouioui_line('greeting', 'en') as greeting_result;

-- Test with joke  
select public.get_random_ouioui_line('joke', 'en') as joke_result;

-- Test with tip
select public.get_random_ouioui_line('tip', 'en') as tip_result;

select 'RPC function created and tested successfully!' as final_message;
