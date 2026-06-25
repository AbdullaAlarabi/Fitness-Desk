insert into body_metric_definitions (
  workspace_id,
  key,
  label,
  unit,
  value_type,
  category,
  is_active,
  position
)
select
  'abdulla-fitness-desk',
  seed.key,
  seed.label,
  seed.unit,
  seed.value_type,
  seed.category,
  true,
  seed.position
from (
  values
    ('weight', 'Weight', 'kg', 'number', 'core', 1),
    ('bmi', 'BMI', null, 'number', 'scale', 2),
    ('body_fat', 'Body Fat', '%', 'number', 'core', 3),
    ('muscle_mass', 'Muscle Mass', 'kg', 'number', 'scale', 4),
    ('bmr', 'BMR', 'kcal', 'number', 'scale', 5),
    ('body_water', 'Body Water', '%', 'number', 'core', 6),
    ('body_fat_mass', 'Body Fat Mass', 'kg', 'number', 'scale', 7),
    ('lean_body_mass', 'Lean Body Mass', 'kg', 'number', 'scale', 8),
    ('bone_mass', 'Bone Mass', 'kg', 'number', 'scale', 9),
    ('visceral_fat', 'Visceral Fat', null, 'number', 'scale', 10),
    ('protein', 'Protein', '%', 'number', 'scale', 11),
    ('skeletal_muscle_mass', 'Skeletal Muscle Mass', 'kg', 'number', 'scale', 12),
    ('subcutaneous_mass', 'Subcutaneous Mass', '%', 'number', 'scale', 13),
    ('body_age', 'Body Age', 'years', 'number', 'scale', 14),
    ('body_type', 'Body Type', null, 'text', 'scale', 15)
) as seed(key, label, unit, value_type, category, position)
where not exists (
  select 1
  from body_metric_definitions existing
  where existing.workspace_id = 'abdulla-fitness-desk'
    and existing.key = seed.key
);

insert into intake_items (
  workspace_id,
  name,
  category,
  timing,
  frequency,
  notes,
  is_active,
  position
)
select
  'abdulla-fitness-desk',
  seed.name,
  seed.category,
  seed.timing,
  seed.frequency,
  seed.notes,
  true,
  seed.position
from (
  values
    ('Magnesium', 'supplement', 'night', 'daily', 'Night supplement routine.', 1),
    ('Zinc', 'supplement', 'morning', 'daily', 'Morning supplement routine.', 2),
    ('Biotin', 'supplement', 'morning', 'daily', 'Morning supplement routine.', 3),
    ('Omega 3', 'supplement', 'morning', 'daily', 'Morning supplement routine.', 4),
    ('Multivitamin', 'supplement', 'morning', 'daily', 'Morning supplement routine.', 5),
    ('Honey', 'nutrition', 'workout or morning', 'custom', 'Use around training or in the morning.', 6),
    ('Protein shake', 'nutrition', 'workout', 'training_days', 'Use after training sessions.', 7),
    ('Creatine', 'supplement', 'workout', 'daily or training_days', 'Use daily or at minimum on training days.', 8)
) as seed(name, category, timing, frequency, notes, position)
where not exists (
  select 1
  from intake_items existing
  where existing.workspace_id = 'abdulla-fitness-desk'
    and lower(existing.name) = lower(seed.name)
);

insert into workout_templates (
  workspace_id,
  name,
  day_label,
  description,
  position,
  is_active
)
select
  'abdulla-fitness-desk',
  seed.name,
  seed.day_label,
  seed.description,
  seed.position,
  true
from (
  values
    (
      'Push',
      'Day 1',
      'Focus: chest, shoulders, triceps. Simple machine and cable structure only.',
      1
    ),
    (
      'Pull',
      'Day 2',
      'Focus: back, rear delts, biceps. Keep the session simple and controlled.',
      2
    ),
    (
      'Legs + Core + Run Intervals',
      'Day 3',
      'Focus: quads, hamstrings, core, and run intervals. No detailed exercise list yet.',
      3
    ),
    (
      'Rest / Walking',
      'Day 4',
      'Recovery day with walking and general movement only.',
      4
    ),
    (
      'Upper Shape',
      'Day 5',
      'Focus: shoulders, chest, back. Shape-oriented upper session without complex programming.',
      5
    ),
    (
      '3.2 km Run + Arms/Core',
      'Day 6',
      'Controlled 3.2 km run plus simple arms and core work. No detailed exercise list yet.',
      6
    ),
    (
      'Rest / Walking',
      'Day 7',
      'Recovery day with walking and low fatigue activity.',
      7
    )
) as seed(name, day_label, description, position)
where not exists (
  select 1
  from workout_templates existing
  where existing.workspace_id = 'abdulla-fitness-desk'
    and existing.day_label = seed.day_label
    and existing.name = seed.name
);
