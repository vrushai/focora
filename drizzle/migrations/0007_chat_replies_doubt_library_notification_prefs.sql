-- Reply threading for group chat
ALTER TABLE public.group_messages
  ADD COLUMN reply_to uuid REFERENCES public.group_messages(id) ON DELETE SET NULL;

-- Public doubt library students can browse without an account
CREATE TABLE public.doubt_library (
  id uuid primary key default gen_random_uuid(),
  subject text not null default 'General',
  topic text not null default '',
  question text not null,
  answer jsonb not null default '{}'::jsonb,
  author_name text not null default 'Student',
  user_id uuid,
  hearts integer not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.doubt_library TO anon, authenticated;
GRANT INSERT, DELETE ON public.doubt_library TO authenticated;
GRANT ALL ON public.doubt_library TO service_role;
ALTER TABLE public.doubt_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can browse the library" ON public.doubt_library FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "share solved doubts to library" ON public.doubt_library FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "remove own library entries" ON public.doubt_library FOR DELETE TO authenticated USING (user_id = auth.uid());
-- hearts are only changed through toggle_doubt_heart(); no direct UPDATE policy

CREATE TABLE public.doubt_hearts (
  doubt_id uuid not null references public.doubt_library(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (doubt_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.doubt_hearts TO authenticated;
GRANT ALL ON public.doubt_hearts TO service_role;
ALTER TABLE public.doubt_hearts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hearts" ON public.doubt_hearts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.toggle_doubt_heart(_doubt_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  liked boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM doubt_library WHERE id = _doubt_id) THEN
    RAISE EXCEPTION 'Doubt not found';
  END IF;
  IF EXISTS (SELECT 1 FROM doubt_hearts WHERE doubt_id = _doubt_id AND user_id = auth.uid()) THEN
    DELETE FROM doubt_hearts WHERE doubt_id = _doubt_id AND user_id = auth.uid();
    UPDATE doubt_library SET hearts = GREATEST(hearts - 1, 0) WHERE id = _doubt_id;
    liked := false;
  ELSE
    INSERT INTO doubt_hearts (doubt_id, user_id) VALUES (_doubt_id, auth.uid());
    UPDATE doubt_library SET hearts = hearts + 1 WHERE id = _doubt_id;
    liked := true;
  END IF;
  RETURN liked;
END $$;
GRANT EXECUTE ON FUNCTION public.toggle_doubt_heart(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_doubt_heart(uuid) FROM anon;

-- Per-category notification preferences
ALTER TABLE public.profiles
  ADD COLUMN notification_prefs jsonb NOT NULL DEFAULT '{"tasks":true,"reminders":true,"exams":true,"goals":true,"focus":true}'::jsonb;

-- Starter entries so the library is useful from day one
INSERT INTO public.doubt_library (subject, topic, question, answer, author_name) VALUES
('Physics', 'Laws of motion', 'Why does an object keep moving when no force is applied?', $json${
  "simple": "Because of inertia. An object keeps doing what it is already doing: if it is moving, it keeps moving at the same speed in the same direction until a force (like friction) stops it. This is Newton's first law of motion.",
  "steps": ["Newton's first law says an object stays at rest, or keeps moving in a straight line at constant speed, unless an unbalanced force acts on it.", "On Earth moving things slow down mainly because of friction and air resistance, which ARE forces.", "In space, where there is almost no friction, a thrown object would keep travelling almost forever.", "So no force is needed to KEEP moving — force is needed to change motion (speed up, slow down or turn)."],
  "example": "Roll a ball on grass and it stops quickly because grass has high friction. Roll the same ball on smooth ice and it travels much farther — less friction. In empty space it would never stop.",
  "key_points": ["Inertia = resistance to a change in motion; it depends on mass.", "Newton's first law: no unbalanced force means no change in velocity.", "Friction and air resistance are forces that oppose motion."],
  "common_mistake": "Thinking a force is needed to keep something moving. Actually, forces change motion; motion continues by itself.",
  "check_question": "A hockey puck slides on frictionless ice with no forces acting on it. What happens to its speed and direction?"
}$json$, 'focora tutor'),
('Biology', 'Photosynthesis', 'How do plants make their own food?', $json${
  "simple": "Plants make glucose (a sugar) through photosynthesis. They use sunlight, water from the soil and carbon dioxide from the air. Oxygen is released as a by-product.",
  "steps": ["Chlorophyll in the leaves absorbs sunlight.", "Roots absorb water, which travels up to the leaves.", "Stomata (tiny pores) let carbon dioxide in from the air.", "Light energy converts water and carbon dioxide into glucose and oxygen.", "Glucose is used for energy and growth; extra glucose is stored as starch."],
  "example": "A green leaf kept in sunlight tests positive for starch (turns blue-black with iodine), but a leaf kept in the dark tests negative — proving light is required for food-making.",
  "key_points": ["Word equation: carbon dioxide + water → glucose + oxygen (in presence of light and chlorophyll).", "Happens mainly in the leaves, inside chloroplasts.", "Stomata are the pores for gas exchange."],
  "common_mistake": "Saying plants only take in carbon dioxide. Plants also respire, taking in oxygen, all day and night.",
  "check_question": "Which gas do plants take in during photosynthesis, and which gas do they give out?"
}$json$, 'focora tutor'),
('Maths', 'Geometry', 'What is the Pythagoras theorem and when can I use it?', $json${
  "simple": "In any right-angled triangle, the square of the longest side (hypotenuse) equals the sum of squares of the other two sides: a^2 + b^2 = c^2, where c is the hypotenuse.",
  "steps": ["Identify the right angle; the side opposite it is the hypotenuse c.", "Label the other two sides a and b.", "To find the hypotenuse: c = sqrt(a^2 + b^2).", "To find a shorter side: a = sqrt(c^2 - b^2).", "Always check units are the same and give the answer with units."],
  "example": "A right triangle has legs 3 cm and 4 cm. Hypotenuse c = sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5 cm.",
  "key_points": ["Works ONLY for right-angled triangles.", "c is always the longest side.", "3-4-5 and 5-12-13 are common integer triples."],
  "common_mistake": "Adding the side lengths instead of their squares, or using the theorem on a triangle with no right angle.",
  "check_question": "A right triangle has a hypotenuse of 13 cm and one side of 5 cm. Find the third side."
}$json$, 'focora tutor'),
('Maths', 'Fractions', 'How do I add fractions with different denominators?', $json${
  "simple": "First make the denominators the same (using the LCM), then add only the numerators and keep the denominator. Simplify the result at the end.",
  "steps": ["Find the LCM of the denominators.", "Rewrite each fraction as an equivalent fraction with that LCM as denominator.", "Add the numerators; keep the denominator the same.", "Simplify by dividing top and bottom by their HCF."],
  "example": "2/3 + 1/4: LCM of 3 and 4 is 12. 2/3 = 8/12 and 1/4 = 3/12. So the sum is 11/12.",
  "key_points": ["Never add denominators — only numerators are added.", "Equivalent fractions: multiply top and bottom by the same number.", "Mixed numbers: convert to improper fractions first, then add."],
  "common_mistake": "Adding both numerators and denominators (2/3 + 1/4 is NOT 3/7).",
  "check_question": "What is 1/2 + 1/3, fully simplified?"
}$json$, 'focora tutor'),
('Chemistry', 'Acids and bases', 'What happens when an acid reacts with a base?', $json${
  "simple": "An acid and a base neutralise each other to form a salt and water. This is called a neutralisation reaction. If the base is a metal carbonate, carbon dioxide gas is also produced.",
  "steps": ["Acid + base (alkali) → salt + water. Example: HCl + NaOH → NaCl + H2O.", "Acid + metal carbonate → salt + water + carbon dioxide.", "The H+ ions from the acid combine with the OH- ions from the base to make water.", "Indicators show the change: litmus turns from red to blue when an acid is neutralised."],
  "example": "Antacid tablets (a base) neutralise excess hydrochloric acid in the stomach, relieving indigestion.",
  "key_points": ["Acids have pH less than 7; bases have pH greater than 7; neutral is 7.", "Neutralisation: acid + base → salt + water.", "Acid + carbonate also releases carbon dioxide."],
  "common_mistake": "Thinking neutralisation always produces only water. A salt is ALWAYS formed too.",
  "check_question": "Write the products when hydrochloric acid reacts with sodium hydroxide."
}$json$, 'focora tutor'),
('Physics', 'Electricity', 'What is the difference between series and parallel circuits?', $json${
  "simple": "In a series circuit the components are connected one after another, so the same current flows through all of them. In a parallel circuit the components sit in separate branches, so each branch gets the full voltage and they work independently.",
  "steps": ["Series: one path only. If one bulb breaks, the whole circuit stops working.", "Parallel: multiple paths. If one bulb breaks, the others keep working.", "Series: voltage is shared between components; adding bulbs makes them dimmer.", "Parallel: each branch gets the full battery voltage; bulbs stay equally bright.", "Homes are wired in parallel so appliances can be switched on and off separately."],
  "example": "In fairy lights wired in series, one dead bulb blacks out the whole string. Ceiling lights at home are in parallel — switch one off and the rest stay on.",
  "key_points": ["Series: current same everywhere; resistances add (R = R1 + R2).", "Parallel: voltage same across branches; 1/R = 1/R1 + 1/R2.", "Parallel circuits are used in homes."],
  "common_mistake": "Thinking current gets used up as it goes around a series circuit. Current is the same at every point in a series circuit.",
  "check_question": "Two identical bulbs are connected in parallel to a battery. One is removed. What happens to the other?"
}$json$, 'focora tutor');