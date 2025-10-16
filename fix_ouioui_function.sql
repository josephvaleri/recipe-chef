-- Fix the get_random_ouioui_line function to work more reliably
-- The current function has complex weighted logic that might be failing

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_random_ouioui_line(text, text);

-- Create a simpler, more reliable function
CREATE OR REPLACE FUNCTION public.get_random_ouioui_line(
  p_line_type text,
  p_locale text default 'en'
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result_text text;
BEGIN
  -- Try to get a random line of the specified type and locale
  SELECT text INTO result_text
  FROM public.ouioui_lines
  WHERE type = p_line_type AND locale = p_locale
  ORDER BY random()
  LIMIT 1;
  
  -- If no result found for the specific locale, try any locale
  IF result_text IS NULL THEN
    SELECT text INTO result_text
    FROM public.ouioui_lines
    WHERE type = p_line_type
    ORDER BY random()
    LIMIT 1;
  END IF;
  
  -- If still no result, return a fallback message
  IF result_text IS NULL THEN
    CASE p_line_type
      WHEN 'greeting' THEN result_text := 'Bonjour! Welcome to Recipe Chef!';
      WHEN 'joke' THEN result_text := 'Why don''t eggs tell jokes? They''d crack each other up!';
      WHEN 'tip' THEN result_text := 'Always taste your food while cooking - your palate is your best guide!';
      ELSE result_text := 'Hello from Chef Tony!';
    END CASE;
  END IF;
  
  RETURN result_text;
END;
$$;

-- Test the function
SELECT public.get_random_ouioui_line('greeting', 'en') as greeting;
SELECT public.get_random_ouioui_line('joke', 'en') as joke;
SELECT public.get_random_ouioui_line('tip', 'en') as tip;
