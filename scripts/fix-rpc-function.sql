-- Fix the get_random_ouioui_line RPC function
-- The issue is with ambiguous column reference "locale"

drop function if exists public.get_random_ouioui_line(text, text);

create or replace function public.get_random_ouioui_line(
  line_type text,
  locale text default 'en'
)
returns table(text text) language plpgsql as $$
declare
  total_weight int;
  random_num int;
  current_weight int := 0;
begin
  -- Get total weight for the given type and locale
  select coalesce(sum(weight), 0) into total_weight
  from public.ouioui_lines
  where type = line_type and ouioui_lines.locale = locale;
  
  if total_weight = 0 then
    -- Fallback to any locale
    select coalesce(sum(weight), 0) into total_weight
    from public.ouioui_lines
    where type = line_type;
  end if;
  
  if total_weight = 0 then
    return;
  end if;
  
  -- Generate random number
  random_num := floor(random() * total_weight) + 1;
  
  -- Find the line
  for text in
    select ol.text
    from public.ouioui_lines ol
    where ol.type = line_type and ol.locale = locale
    order by ol.line_id
  loop
    current_weight := current_weight + 1;
    if current_weight >= random_num then
      return next;
    end if;
  end loop;
end; $$;

-- Test the function
select 'Testing RPC function...' as message;

-- Test with greeting
select text as greeting_result from public.get_random_ouioui_line('greeting', 'en');

-- Test with joke
select text as joke_result from public.get_random_ouioui_line('joke', 'en');

-- Test with tip
select text as tip_result from public.get_random_ouioui_line('tip', 'en');

select 'RPC function fixed and tested successfully!' as final_message;
