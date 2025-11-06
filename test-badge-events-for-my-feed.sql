-- Test script to add events that will trigger badge awards and appear in My Feed
-- This script adds various user events that should result in badge awards

-- First, let's get a test user ID (you can replace this with an actual user ID)
-- For testing, we'll use the current authenticated user
DO $$
DECLARE
    v_user_id uuid;
    v_recipe_id bigint;
    v_event_id bigint;
BEGIN
    -- Get the current user (you may need to replace this with a specific user ID)
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found. Please replace auth.uid() with a specific user ID for testing.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with user ID: %', v_user_id;
    
    -- Test 1: Add a recipe_added event (should trigger recipe_maker badge)
    RAISE NOTICE 'Adding recipe_added event...';
    INSERT INTO public.user_events (user_id, type, meta)
    VALUES (
        v_user_id,
        'recipe_added',
        jsonb_build_object(
            'name', 'Test Recipe for Badge',
            'has_ingredients', true,
            'instructions_len', 150,
            'imported', false
        )
    )
    RETURNING event_id INTO v_event_id;
    RAISE NOTICE 'Created recipe_added event with ID: %', v_event_id;
    
    -- Test 2: Add a shopping_list_generated event (should trigger list_legend badge)
    RAISE NOTICE 'Adding shopping_list_generated event...';
    INSERT INTO public.user_events (user_id, type, meta)
    VALUES (
        v_user_id,
        'shopping_list_generated',
        jsonb_build_object(
            'list_size', 15,
            'categories', jsonb_build_array('proteins', 'vegetables', 'dairy')
        )
    )
    RETURNING event_id INTO v_event_id;
    RAISE NOTICE 'Created shopping_list_generated event with ID: %', v_event_id;
    
    -- Test 3: Add an ai_query event (should trigger chef_tony_apprentice badge)
    RAISE NOTICE 'Adding ai_query event...';
    INSERT INTO public.user_events (user_id, type, meta)
    VALUES (
        v_user_id,
        'ai_query',
        jsonb_build_object(
            'question_len', 45,
            'meaningful', true,
            'question', 'How do I make the perfect chocolate chip cookies?'
        )
    )
    RETURNING event_id INTO v_event_id;
    RAISE NOTICE 'Created ai_query event with ID: %', v_event_id;
    
    -- Test 4: Add a unit_conversion_used event (should trigger conversion_wizard badge)
    RAISE NOTICE 'Adding unit_conversion_used event...';
    INSERT INTO public.user_events (user_id, type, meta)
    VALUES (
        v_user_id,
        'unit_conversion_used',
        jsonb_build_object(
            'from_unit', 'cups',
            'to_unit', 'ml',
            'value', 2.5
        )
    )
    RETURNING event_id INTO v_event_id;
    RAISE NOTICE 'Created unit_conversion_used event with ID: %', v_event_id;
    
    -- Test 5: Add a recipe_cooked event with cuisine (should trigger cuisine_explorer badge)
    RAISE NOTICE 'Adding recipe_cooked event with cuisine...';
    INSERT INTO public.user_events (user_id, type, meta)
    VALUES (
        v_user_id,
        'recipe_cooked',
        jsonb_build_object(
            'cuisine', 'Italian',
            'ingredient_ids', jsonb_build_array(1, 2, 3, 4, 5),
            'tags', jsonb_build_array('pasta', 'comfort-food')
        )
    )
    RETURNING event_id INTO v_event_id;
    RAISE NOTICE 'Created recipe_cooked event with ID: %', v_event_id;
    
    RAISE NOTICE 'All test events created successfully!';
    
END $$;

-- Now let's trigger badge awarding for the test user
DO $$
DECLARE
    v_user_id uuid;
    v_awards jsonb;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found for badge awarding.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Triggering badge awards for user: %', v_user_id;
    
    -- Award badges based on the events we just created
    SELECT public.award_badges_for_user(v_user_id) INTO v_awards;
    
    IF v_awards IS NOT NULL AND jsonb_array_length(v_awards) > 0 THEN
        RAISE NOTICE 'Badges awarded: %', v_awards;
    ELSE
        RAISE NOTICE 'No new badges awarded (user may already have these badges)';
    END IF;
    
END $$;

-- Check what events are now in the user_events table
SELECT 
    event_id,
    type,
    meta,
    created_at
FROM public.user_events 
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- Check what the My Feed function returns
SELECT 
    event_id,
    kind,
    payload,
    created_at
FROM public.get_my_feed(auth.uid(), 10);

-- Success message
SELECT 'Test events created and badge awarding triggered! Check My Feed to see the results.' as message;
