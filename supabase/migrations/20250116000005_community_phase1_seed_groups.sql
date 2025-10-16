-- Community Phase 1: Seed global groups
-- 05_seed_global_groups.sql

-- Insert 50 global groups with categories
insert into public.groups (name, slug, category, description, is_public)
values
-- Cuisines (1–20)
('Italian Cucina','cucina-italiana','cuisine','Classic & regional Italy',true),
('Chinese Regional Table','chinese-regions','cuisine','Sichuan, Cantonese, Xi''an & beyond',true),
('Japanese Washoku','washoku','cuisine','Home cooking, izakaya, ramen',true),
('Indian Subcontinent','indian-subcontinent','cuisine','North & South: biryani to dosa',true),
('Mexican Cocina','cocina-mexicana','cuisine','Moles, tacos, salsas',true),
('Thai Kitchen','thai-kitchen','cuisine','Curries, salads, street food',true),
('Korean Hansik','hansik','cuisine','BBQ, jjigae, banchan, kimchi',true),
('Greek Taverna','greek-taverna','cuisine','Mezze, seafood, village classics',true),
('Turkish Ocakbaşı','turkish-ocakbasi','cuisine','Grills, meze, breads',true),
('Vietnamese Bếp Việt','bep-viet','cuisine','Herbs, bowls, snacks',true),
('French Bistrot','french-bistrot','cuisine','Sauces, bistro mains, pastry',true),
('Spanish Tapas & Paella','spanish-tapas-paella','cuisine','Regional Spain',true),
('Caribbean Flavors','caribbean-flavors','cuisine','Islands, jerk, curries',true),
('Maghrebi & North Africa','maghrebi-north-africa','cuisine','Tagines, couscous, harissa',true),
('Ethiopian & Horn','ethiopian-horn','cuisine','Injera, wat, berbere',true),
('Middle Eastern Mezze','middle-eastern-mezze','cuisine','Levant & Gulf',true),
('Latin America (Non-Mexico)','latin-america','cuisine','Andean, Southern Cone, Brazil',true),
('Central & Eastern Europe','central-eastern-europe','cuisine','Pierogi, goulash, pickles',true),
('Filipino Kusina','filipino-kusina','cuisine','Adobo, sinigang, kakanin',true),
('Southern USA & Soul','southern-soul','cuisine','BBQ, greens, pies',true),

-- Cooking Focus (21–40)
('Artisan Bakers & Sourdough','artisan-bakers','focus','Levain, scoring, hydration',true),
('Pastry & Desserts','pastry-desserts','focus','Tarts, cakes, plated sweets',true),
('Grilling & BBQ','grilling-bbq','focus','Hot & fast, live fire',true),
('Smoking & Low-''n-Slow','smoking-low-slow','focus','Brisket, ribs, smoke science',true),
('Sous-Vide Lab','sous-vide-lab','focus','Temps, textures, finishing',true),
('Stocks, Sauces & Emulsions','sauces-emulsions','focus','Mother sauces to mayo',true),
('Soups & Stews','soups-stews','focus','Global bowls, pressure/slow cook',true),
('Pasta & Noodle Makers','pasta-noodles','focus','Fresh, extruded, hand-pulled',true),
('Dumplings, Buns & Wrappers','dumplings-buns','focus','Potstickers to momos',true),
('Fermentation Club','fermentation','focus','Koji, miso, pickles, sourdough',true),
('Pickling & Preserving','pickling-preserving','focus','Jams, chutneys, pantry craft',true),
('Charcuterie & Curing','charcuterie-curing','focus','Sausage, pâté, salumi',true),
('Seafood & Shellfish','seafood-shellfish','focus','Butchery, poach, grill',true),
('Game & Wild Foods','game-wild','focus','Venison, foraged sides',true),
('Plant-Based / Vegan','plant-based','focus','Veg techniques, proteins',true),
('Gluten-Free Cooking & Baking','gluten-free','focus','Flours, binders, texture',true),
('One-Pot & Weeknight','weeknight-one-pot','focus','Fast, minimal cleanup',true),
('Breakfast & Brunch','breakfast-brunch','focus','Eggs, waffles, spreads',true),
('Spice Blends & Rubs','spice-blends','focus','Toasting, grinding, balance',true),
('Plating & Food Styling','plating-styling','focus','Color, height, garnish',true),

-- Identity / Role / Interest (41–50)
('CIA Alumni Network','cia-alumni','identity','Share techniques & critiques',true),
('Professional Chefs','pro-chefs','identity','Service-tested dishes & ops',true),
('Home Cooks','home-cooks','identity','Crowd-pleasers, family favorites',true),
('Culinary Students','culinary-students','identity','Exams, skills, mise',true),
('R&D / Test Kitchen','test-kitchen','identity','Iteration logs, A/B tests',true),
('Meal Prep & Macro-Friendly','meal-prep-macros','identity','Batches, calories, swaps',true),
('Budget Cooking & Frugal Feasts','budget-cooking','identity','Cost per serving tips',true),
('Family Cooking & Kids','family-kitchen','identity','Picky eaters, safe tasks',true),
('Outdoor & Campfire','outdoor-campfire','identity','Dutch oven, backpacking meals',true),
('Food Science Nerds','food-science','identity','Starches, gels, Maillard',true)
on conflict (slug) do nothing;

-- Add comment for tracking
comment on table public.groups is 'Community groups seeded with 50 global groups across cuisine, focus, and identity categories';
