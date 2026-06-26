export type WorkoutExerciseConfig = {
  id: string;
  name: string;
  category: string;
  targetMuscles: string;
  sets: number;
  minReps: number;
  maxReps: number;
  restSeconds: number;
  note: string;
  machineSetup: string;
  mainCue: string;
  commonMistake: string;
  alternatives: string[];
  mediaThumbnailUrl: string;
  mediaFullUrl: string;
  mediaType: 'image' | 'gif' | 'video_placeholder';
  mediaAlt: string;
};

export type WorkoutPlanDayConfig = {
  dayId: string;
  dayNumber: number;
  title: string;
  focus: string;
  estimatedDurationMinutes: number;
  warmup: string;
  sessionType: 'gym' | 'run' | 'rest';
  detailLevel: 'exact' | 'split_only';
  exercises: WorkoutExerciseConfig[];
};

export type WorkoutHeroCopy = {
  title: string;
  focus: string;
  command: string;
};

const TRAINING_CYCLE_ANCHOR = new Date('2026-06-27T12:00:00');

export const workoutRules = [
  'Warm up for 5 minutes: treadmill walk, bike, or cross trainer.',
  'Use a weight where the last clean rep still stays in reserve.',
  'Do not go to failure every set.',
  'Rest 90 seconds for bigger presses, rows, and pulldowns, and leg press.',
  'Rest 45 to 60 seconds for lateral raises, curls, triceps, rear delts, and core.',
  'Progression: when all sets reach the top of the rep range with clean form, increase weight next session by the smallest available jump.',
  'No drop sets.',
  'No complicated supersets.',
  'No ego lifting.',
  'Clean reps only.'
] as const;

export const workoutPlan: WorkoutPlanDayConfig[] = [
  {
    dayId: 'day-1',
    dayNumber: 1,
    title: 'Push',
    focus: 'Chest, shoulders, triceps',
    estimatedDurationMinutes: 60,
    warmup: '5 minutes easy treadmill walk or bike, then 1 to 2 lighter feeder sets before the first press.',
    sessionType: 'gym',
    detailLevel: 'exact',
    exercises: [
      {
        id: 'day1-incline-chest-press-machine',
        name: 'Incline Chest Press Machine',
        category: 'press',
        targetMuscles: 'Upper chest, front delts, triceps',
        sets: 4,
        minReps: 8,
        maxReps: 10,
        restSeconds: 90,
        note: 'Main chest builder.',
        machineSetup: 'Seat height set so handles line up with upper chest.',
        mainCue: 'Drive through the chest and keep shoulders pinned down.',
        commonMistake: 'Letting shoulders roll forward and shortening the range.',
        alternatives: ['Incline converging chest press', 'Incline Smith machine press'],
        mediaThumbnailUrl: 'coach-media/incline-chest-press-thumb',
        mediaFullUrl: 'coach-media/incline-chest-press-full',
        mediaType: 'image',
        mediaAlt: 'Incline chest press machine demo'
      },
      {
        id: 'day1-seated-chest-press-machine',
        name: 'Seated Chest Press Machine',
        category: 'press',
        targetMuscles: 'Mid chest, triceps',
        sets: 3,
        minReps: 8,
        maxReps: 12,
        restSeconds: 90,
        note: 'Controlled, full range.',
        machineSetup: 'Set seat so wrists stay stacked with elbows through the press path.',
        mainCue: 'Lower under control and finish with chest, not shoulder shrugging.',
        commonMistake: 'Bouncing the bottom and cutting the stretch short.',
        alternatives: ['Plate-loaded chest press', 'Cable standing chest press'],
        mediaThumbnailUrl: 'coach-media/seated-chest-press-thumb',
        mediaFullUrl: 'coach-media/seated-chest-press-full',
        mediaType: 'image',
        mediaAlt: 'Seated chest press machine demo'
      },
      {
        id: 'day1-pec-deck-or-cable-fly',
        name: 'Pec Deck Machine or Cable Fly',
        category: 'fly',
        targetMuscles: 'Chest',
        sets: 3,
        minReps: 12,
        maxReps: 15,
        restSeconds: 60,
        note: 'Chest definition.',
        machineSetup: 'Keep elbows softly bent and shoulders down.',
        mainCue: 'Bring biceps toward the midline and squeeze the chest.',
        commonMistake: 'Turning it into a shoulder swing.',
        alternatives: ['Dual cable fly', 'Pec deck machine'],
        mediaThumbnailUrl: 'coach-media/pec-deck-fly-thumb',
        mediaFullUrl: 'coach-media/pec-deck-fly-full',
        mediaType: 'image',
        mediaAlt: 'Pec deck or cable fly demo'
      },
      {
        id: 'day1-shoulder-press-machine',
        name: 'Shoulder Press Machine',
        category: 'press',
        targetMuscles: 'Front delts, side delts, triceps',
        sets: 3,
        minReps: 8,
        maxReps: 10,
        restSeconds: 90,
        note: 'Do not over-arch the back.',
        machineSetup: 'Seat low enough for the handles to start around ear level.',
        mainCue: 'Brace the trunk and press straight up with control.',
        commonMistake: 'Overextending the lower back to force reps.',
        alternatives: ['Plate-loaded shoulder press', 'Smith machine high incline press'],
        mediaThumbnailUrl: 'coach-media/shoulder-press-thumb',
        mediaFullUrl: 'coach-media/shoulder-press-full',
        mediaType: 'image',
        mediaAlt: 'Shoulder press machine demo'
      },
      {
        id: 'day1-lateral-raise',
        name: 'Lateral Raise Machine or Cable Lateral Raise',
        category: 'isolation',
        targetMuscles: 'Side delts',
        sets: 4,
        minReps: 12,
        maxReps: 20,
        restSeconds: 60,
        note: 'Very important for broader shoulders.',
        machineSetup: 'Keep shoulders level and raise slightly out to the side, not forward.',
        mainCue: 'Lead with elbows and keep the trap quiet.',
        commonMistake: 'Swinging the torso or shrugging hard to finish the rep.',
        alternatives: ['Single-arm cable lateral raise', 'Lateral raise machine'],
        mediaThumbnailUrl: 'coach-media/lateral-raise-thumb',
        mediaFullUrl: 'coach-media/lateral-raise-full',
        mediaType: 'image',
        mediaAlt: 'Lateral raise demo'
      },
      {
        id: 'day1-rope-triceps-pushdown',
        name: 'Rope Triceps Pushdown',
        category: 'isolation',
        targetMuscles: 'Triceps',
        sets: 3,
        minReps: 10,
        maxReps: 15,
        restSeconds: 60,
        note: 'Elbows fixed.',
        machineSetup: 'Stand tall with elbows pinned by the ribs.',
        mainCue: 'Spread the rope slightly at the bottom without swinging.',
        commonMistake: 'Turning it into a bodyweight dip with torso movement.',
        alternatives: ['Straight-bar pushdown', 'Single-arm cable pushdown'],
        mediaThumbnailUrl: 'coach-media/triceps-pushdown-thumb',
        mediaFullUrl: 'coach-media/triceps-pushdown-full',
        mediaType: 'image',
        mediaAlt: 'Rope triceps pushdown demo'
      }
    ]
  },
  {
    dayId: 'day-2',
    dayNumber: 2,
    title: 'Pull',
    focus: 'Back, rear delts, biceps',
    estimatedDurationMinutes: 60,
    warmup: '5 minutes easy bike or treadmill walk, then 1 lighter warm-up set on the first pulldown or row.',
    sessionType: 'gym',
    detailLevel: 'exact',
    exercises: [
      {
        id: 'day2-lat-pulldown',
        name: 'Lat Pulldown, Wide or Neutral Grip',
        category: 'pulldown',
        targetMuscles: 'Lats, upper back, biceps',
        sets: 4,
        minReps: 8,
        maxReps: 12,
        restSeconds: 90,
        note: 'Pull elbows down, not hands.',
        machineSetup: 'Lock thighs down and sit tall before the first rep.',
        mainCue: 'Drive elbows toward the ribs and pause briefly at the chest line.',
        commonMistake: 'Yanking with the hands and leaning back too far.',
        alternatives: ['Neutral-grip pulldown', 'Assisted pull-up machine'],
        mediaThumbnailUrl: 'coach-media/lat-pulldown-thumb',
        mediaFullUrl: 'coach-media/lat-pulldown-full',
        mediaType: 'image',
        mediaAlt: 'Lat pulldown demo'
      },
      {
        id: 'day2-chest-supported-row',
        name: 'Chest-Supported Row Machine',
        category: 'row',
        targetMuscles: 'Mid back, lats, rear delts',
        sets: 3,
        minReps: 8,
        maxReps: 12,
        restSeconds: 90,
        note: 'Main back thickness.',
        machineSetup: 'Chest stays planted so the low back does not take over.',
        mainCue: 'Pull through the elbow and squeeze the upper back hard.',
        commonMistake: 'Rushing the eccentric and bouncing off the pad.',
        alternatives: ['Plate-loaded chest-supported row', 'Seal row machine'],
        mediaThumbnailUrl: 'coach-media/chest-supported-row-thumb',
        mediaFullUrl: 'coach-media/chest-supported-row-full',
        mediaType: 'image',
        mediaAlt: 'Chest-supported row machine demo'
      },
      {
        id: 'day2-seated-cable-row',
        name: 'Seated Cable Row',
        category: 'row',
        targetMuscles: 'Mid back, lats, biceps',
        sets: 3,
        minReps: 10,
        maxReps: 12,
        restSeconds: 75,
        note: 'Controlled squeeze.',
        machineSetup: 'Sit upright and set the feet before the pull.',
        mainCue: 'Finish by driving elbows back, then return under control.',
        commonMistake: 'Rocking the whole torso to move the stack.',
        alternatives: ['Close-grip cable row', 'Machine seated row'],
        mediaThumbnailUrl: 'coach-media/seated-cable-row-thumb',
        mediaFullUrl: 'coach-media/seated-cable-row-full',
        mediaType: 'image',
        mediaAlt: 'Seated cable row demo'
      },
      {
        id: 'day2-straight-arm-pulldown',
        name: 'Straight-Arm Cable Pulldown',
        category: 'lat isolation',
        targetMuscles: 'Lats',
        sets: 2,
        minReps: 12,
        maxReps: 15,
        restSeconds: 60,
        note: 'Builds lat shape.',
        machineSetup: 'Slight hip hinge, ribs down, arms mostly straight.',
        mainCue: 'Sweep the bar down with the lats and keep tension constant.',
        commonMistake: 'Bending the elbows too much and making it a row.',
        alternatives: ['Rope straight-arm pulldown', 'Single-arm cable pulldown'],
        mediaThumbnailUrl: 'coach-media/straight-arm-pulldown-thumb',
        mediaFullUrl: 'coach-media/straight-arm-pulldown-full',
        mediaType: 'image',
        mediaAlt: 'Straight-arm cable pulldown demo'
      },
      {
        id: 'day2-reverse-pec-deck',
        name: 'Reverse Pec Deck',
        category: 'rear delt',
        targetMuscles: 'Rear delts, upper back',
        sets: 3,
        minReps: 12,
        maxReps: 20,
        restSeconds: 60,
        note: 'Rear delts, posture.',
        machineSetup: 'Set the handles so the shoulders stay neutral, not shrugged.',
        mainCue: 'Reach wide and slightly back while keeping the chest steady.',
        commonMistake: 'Letting upper traps dominate the whole set.',
        alternatives: ['Cable rear delt fly', 'Rear delt machine'],
        mediaThumbnailUrl: 'coach-media/reverse-pec-deck-thumb',
        mediaFullUrl: 'coach-media/reverse-pec-deck-full',
        mediaType: 'image',
        mediaAlt: 'Reverse pec deck demo'
      },
      {
        id: 'day2-cable-curl',
        name: 'Cable Curl or Machine Preacher Curl',
        category: 'biceps',
        targetMuscles: 'Biceps',
        sets: 3,
        minReps: 10,
        maxReps: 12,
        restSeconds: 60,
        note: 'No swinging.',
        machineSetup: 'Upper arm stays fixed and the wrist stays stacked.',
        mainCue: 'Curl with control and squeeze at the top without shoulder roll.',
        commonMistake: 'Throwing the hips into the rep.',
        alternatives: ['Machine preacher curl', 'Cable EZ-bar curl'],
        mediaThumbnailUrl: 'coach-media/cable-curl-thumb',
        mediaFullUrl: 'coach-media/cable-curl-full',
        mediaType: 'image',
        mediaAlt: 'Cable curl demo'
      },
      {
        id: 'day2-face-pull',
        name: 'Face Pull',
        category: 'rear delt',
        targetMuscles: 'Rear delts, upper back, external rotators',
        sets: 2,
        minReps: 15,
        maxReps: 20,
        restSeconds: 45,
        note: 'Optional if time remains.',
        machineSetup: 'Set the cable around upper chest height and use rope handles.',
        mainCue: 'Pull toward the face with elbows high and controlled rotation.',
        commonMistake: 'Turning it into a heavy row with lower back sway.',
        alternatives: ['Cable rear delt pull', 'Reverse pec deck finisher'],
        mediaThumbnailUrl: 'coach-media/face-pull-thumb',
        mediaFullUrl: 'coach-media/face-pull-full',
        mediaType: 'image',
        mediaAlt: 'Face pull demo'
      }
    ]
  },
  {
    dayId: 'day-3',
    dayNumber: 3,
    title: 'Legs + Core + Run Intervals',
    focus: 'Quads, hamstrings, core, pacing',
    estimatedDurationMinutes: 60,
    warmup: '5 minutes treadmill walk or bike, then move into the planned leg and interval blocks.',
    sessionType: 'gym',
    detailLevel: 'exact',
    exercises: [
      {
        id: 'day3-leg-press',
        name: 'Leg Press',
        category: 'press',
        targetMuscles: 'Quads, adductors',
        sets: 3,
        minReps: 10,
        maxReps: 12,
        restSeconds: 90,
        note: 'Main lower-body builder without loading the spine.',
        machineSetup: 'Feet shoulder-width and slightly lower on the platform for quad focus.',
        mainCue: 'Control the descent and drive through the whole foot.',
        commonMistake: 'Dropping too deep and letting the lower back round off the pad.',
        alternatives: ['Hack squat machine', 'Pendulum squat machine'],
        mediaThumbnailUrl: 'coach-media/leg-press-thumb',
        mediaFullUrl: 'coach-media/leg-press-full',
        mediaType: 'image',
        mediaAlt: 'Leg press demo'
      },
      {
        id: 'day3-seated-leg-curl',
        name: 'Seated or Lying Leg Curl',
        category: 'curl',
        targetMuscles: 'Hamstrings',
        sets: 3,
        minReps: 10,
        maxReps: 15,
        restSeconds: 75,
        note: 'Controlled squeeze for hamstrings.',
        machineSetup: 'Pad tight above the heels and hips locked into the seat.',
        mainCue: 'Pull through the hamstrings and pause briefly in the contracted position.',
        commonMistake: 'Jerking the stack and lifting the hips off the pad.',
        alternatives: ['Lying leg curl', 'Prone machine leg curl'],
        mediaThumbnailUrl: 'coach-media/seated-leg-curl-thumb',
        mediaFullUrl: 'coach-media/seated-leg-curl-full',
        mediaType: 'image',
        mediaAlt: 'Seated leg curl demo'
      },
      {
        id: 'day3-leg-extension',
        name: 'Leg Extension',
        category: 'isolation',
        targetMuscles: 'Quads',
        sets: 3,
        minReps: 12,
        maxReps: 15,
        restSeconds: 60,
        note: 'Controlled quad burn, not momentum.',
        machineSetup: 'Knees line up with the machine axis and the pad sits above the ankles.',
        mainCue: 'Extend hard and lower with control all the way down.',
        commonMistake: 'Snapping the knees and rushing the eccentric.',
        alternatives: ['Single-leg extension', 'Sissy squat machine'],
        mediaThumbnailUrl: 'coach-media/leg-extension-thumb',
        mediaFullUrl: 'coach-media/leg-extension-full',
        mediaType: 'image',
        mediaAlt: 'Leg extension demo'
      },
      {
        id: 'day3-standing-calf-raise',
        name: 'Standing or Seated Calf Raise',
        category: 'calves',
        targetMuscles: 'Calves',
        sets: 3,
        minReps: 12,
        maxReps: 20,
        restSeconds: 60,
        note: 'Full stretch and full finish each rep.',
        machineSetup: 'Balls of the feet on the edge and shoulders fixed under the pads.',
        mainCue: 'Drop into a stretch, then drive tall through the toes.',
        commonMistake: 'Bouncing the bottom and shortening the range.',
        alternatives: ['Seated calf raise', 'Leg press calf raise'],
        mediaThumbnailUrl: 'coach-media/calf-raise-thumb',
        mediaFullUrl: 'coach-media/calf-raise-full',
        mediaType: 'image',
        mediaAlt: 'Standing calf raise demo'
      },
      {
        id: 'day3-cable-crunch',
        name: 'Cable Crunch',
        category: 'core',
        targetMuscles: 'Abs',
        sets: 3,
        minReps: 12,
        maxReps: 20,
        restSeconds: 45,
        note: 'Core tension before the interval block.',
        machineSetup: 'Kneel far enough from the stack to keep tension through the full range.',
        mainCue: 'Curl the ribcage down toward the pelvis without yanking the rope.',
        commonMistake: 'Hinging at the hips instead of flexing the trunk.',
        alternatives: ['Machine crunch', 'Decline crunch machine'],
        mediaThumbnailUrl: 'coach-media/cable-crunch-thumb',
        mediaFullUrl: 'coach-media/cable-crunch-full',
        mediaType: 'image',
        mediaAlt: 'Cable crunch demo'
      },
      {
        id: 'day3-plank',
        name: 'Plank',
        category: 'core',
        targetMuscles: 'Abs, trunk stiffness',
        sets: 3,
        minReps: 30,
        maxReps: 45,
        restSeconds: 45,
        note: 'Hold each set for 30 to 45 seconds.',
        machineSetup: 'Forearms grounded, ribs down, glutes lightly squeezed.',
        mainCue: 'Brace hard and keep the body in one straight line.',
        commonMistake: 'Sagging through the lower back or lifting the hips too high.',
        alternatives: ['RKC plank', 'Tall plank'],
        mediaThumbnailUrl: 'coach-media/plank-thumb',
        mediaFullUrl: 'coach-media/plank-full',
        mediaType: 'image',
        mediaAlt: 'Plank demo'
      }
    ]
  },
  {
    dayId: 'day-4',
    dayNumber: 4,
    title: 'Rest / Walking',
    focus: 'Recovery and steps',
    estimatedDurationMinutes: 30,
    warmup: 'Easy walking only.',
    sessionType: 'rest',
    detailLevel: 'split_only',
    exercises: []
  },
  {
    dayId: 'day-5',
    dayNumber: 5,
    title: 'Upper Shape',
    focus: 'Shoulders, chest, back',
    estimatedDurationMinutes: 60,
    warmup: '5 minutes treadmill walk or bike, then one lighter set before the first upper-body machine.',
    sessionType: 'gym',
    detailLevel: 'exact',
    exercises: [
      {
        id: 'day5-incline-press',
        name: 'Incline Chest Press Machine',
        category: 'press',
        targetMuscles: 'Upper chest, front delts, triceps',
        sets: 3,
        minReps: 10,
        maxReps: 12,
        restSeconds: 90,
        note: 'Upper chest emphasis without barbell loading.',
        machineSetup: 'Seat set so handles track the upper chest line.',
        mainCue: 'Press from the chest and lower with control into the stretch.',
        commonMistake: 'Letting the shoulders roll forward during the bottom phase.',
        alternatives: ['Incline converging press', 'Smith high incline press'],
        mediaThumbnailUrl: 'coach-media/incline-machine-press-thumb',
        mediaFullUrl: 'coach-media/incline-machine-press-full',
        mediaType: 'image',
        mediaAlt: 'Incline machine press demo'
      },
      {
        id: 'day5-neutral-pulldown',
        name: 'Neutral-Grip Lat Pulldown',
        category: 'pulldown',
        targetMuscles: 'Lats, upper back, biceps',
        sets: 3,
        minReps: 10,
        maxReps: 12,
        restSeconds: 75,
        note: 'Lat width and shape without overloading the lower back.',
        machineSetup: 'Lock the thighs down and stay tall before the first rep.',
        mainCue: 'Pull elbows down to the ribs and control the return.',
        commonMistake: 'Leaning back too far and turning it into a row.',
        alternatives: ['Assisted pull-up machine', 'Single-arm high row'],
        mediaThumbnailUrl: 'coach-media/neutral-pulldown-thumb',
        mediaFullUrl: 'coach-media/neutral-pulldown-full',
        mediaType: 'image',
        mediaAlt: 'Neutral-grip lat pulldown demo'
      },
      {
        id: 'day5-lateral-raise-machine',
        name: 'Machine Lateral Raise',
        category: 'isolation',
        targetMuscles: 'Side delts',
        sets: 4,
        minReps: 12,
        maxReps: 20,
        restSeconds: 60,
        note: 'Priority shoulder width work.',
        machineSetup: 'Set handles or pads so the elbows lead the motion, not the wrists.',
        mainCue: 'Lift wide with quiet traps and a steady torso.',
        commonMistake: 'Shrugging or swinging to force the top range.',
        alternatives: ['Cable lateral raise', 'Single-arm cable lateral raise'],
        mediaThumbnailUrl: 'coach-media/lateral-raise-machine-thumb',
        mediaFullUrl: 'coach-media/lateral-raise-machine-full',
        mediaType: 'image',
        mediaAlt: 'Lateral raise machine demo'
      },
      {
        id: 'day5-pec-deck',
        name: 'Pec Deck or Cable Fly',
        category: 'fly',
        targetMuscles: 'Chest',
        sets: 3,
        minReps: 12,
        maxReps: 15,
        restSeconds: 60,
        note: 'Chest finish without shoulder stress.',
        machineSetup: 'Elbows slightly bent and shoulders pinned down.',
        mainCue: 'Sweep inward and squeeze the chest at the midline.',
        commonMistake: 'Turning it into a front delt swing.',
        alternatives: ['Cable fly', 'Plate-loaded fly machine'],
        mediaThumbnailUrl: 'coach-media/pec-deck-day5-thumb',
        mediaFullUrl: 'coach-media/pec-deck-day5-full',
        mediaType: 'image',
        mediaAlt: 'Pec deck demo'
      },
      {
        id: 'day5-seated-row-machine',
        name: 'Seated Row Machine',
        category: 'row',
        targetMuscles: 'Mid back, lats, rear delts',
        sets: 3,
        minReps: 10,
        maxReps: 12,
        restSeconds: 75,
        note: 'Main back thickness for upper shape day.',
        machineSetup: 'Set the chest firmly against the pad and pull from a stable base.',
        mainCue: 'Drive elbows back and squeeze the upper back hard.',
        commonMistake: 'Pulling with the hands and bouncing off the chest pad.',
        alternatives: ['Plate-loaded row', 'Seated machine row'],
        mediaThumbnailUrl: 'coach-media/chest-supported-row-day5-thumb',
        mediaFullUrl: 'coach-media/chest-supported-row-day5-full',
        mediaType: 'image',
        mediaAlt: 'Chest-supported row demo'
      },
      {
        id: 'day5-reverse-pec-deck',
        name: 'Reverse Pec Deck or Face Pull',
        category: 'rear delt',
        targetMuscles: 'Rear delts, upper back',
        sets: 3,
        minReps: 15,
        maxReps: 20,
        restSeconds: 60,
        note: 'Rear delt finish for upper shape.',
        machineSetup: 'Set the arms so shoulders stay low and chest stays tall.',
        mainCue: 'Open wide and keep the upper back working through the full arc.',
        commonMistake: 'Shrugging hard and turning it into trap work.',
        alternatives: ['Face pull', 'Rear delt machine'],
        mediaThumbnailUrl: 'coach-media/reverse-pec-deck-day5-thumb',
        mediaFullUrl: 'coach-media/reverse-pec-deck-day5-full',
        mediaType: 'image',
        mediaAlt: 'Reverse pec deck or face pull demo'
      },
      {
        id: 'day5-rope-triceps-pushdown',
        name: 'Optional Rope Triceps Pushdown',
        category: 'isolation',
        targetMuscles: 'Triceps',
        sets: 2,
        minReps: 12,
        maxReps: 15,
        restSeconds: 45,
        note: 'Optional if time remains.',
        machineSetup: 'Stand tall with elbows pinned by the ribs.',
        mainCue: 'Spread the rope slightly at the bottom without swinging.',
        commonMistake: 'Turning it into a bodyweight dip with torso movement.',
        alternatives: ['Straight-bar pushdown', 'Single-arm cable pushdown'],
        mediaThumbnailUrl: 'coach-media/day5-triceps-pushdown-thumb',
        mediaFullUrl: 'coach-media/day5-triceps-pushdown-full',
        mediaType: 'image',
        mediaAlt: 'Optional rope triceps pushdown demo'
      },
      {
        id: 'day5-cable-curl',
        name: 'Optional Cable Curl',
        category: 'biceps',
        targetMuscles: 'Biceps',
        sets: 2,
        minReps: 12,
        maxReps: 15,
        restSeconds: 45,
        note: 'Optional if time remains.',
        machineSetup: 'Upper arm stays fixed and the wrist stays stacked.',
        mainCue: 'Curl with control and squeeze at the top without shoulder roll.',
        commonMistake: 'Throwing the hips into the rep.',
        alternatives: ['Machine preacher curl', 'Cable EZ-bar curl'],
        mediaThumbnailUrl: 'coach-media/day5-cable-curl-thumb',
        mediaFullUrl: 'coach-media/day5-cable-curl-full',
        mediaType: 'image',
        mediaAlt: 'Optional cable curl demo'
      }
    ]
  },
  {
    dayId: 'day-6',
    dayNumber: 6,
    title: '3.2 km Run + Arms/Core',
    focus: 'Controlled run, arms, trunk',
    estimatedDurationMinutes: 60,
    warmup: '5 minutes easy walk or jog, then move into the run block.',
    sessionType: 'run',
    detailLevel: 'exact',
    exercises: [
      {
        id: 'day6-rope-triceps-pushdown',
        name: 'Rope Triceps Pushdown',
        category: 'isolation',
        targetMuscles: 'Triceps',
        sets: 3,
        minReps: 12,
        maxReps: 15,
        restSeconds: 60,
        note: 'Arms block after the run.',
        machineSetup: 'Stand tall with elbows pinned by the ribs.',
        mainCue: 'Spread the rope slightly at the bottom without swinging.',
        commonMistake: 'Turning it into a bodyweight dip with torso movement.',
        alternatives: ['Straight-bar pushdown', 'Single-arm cable pushdown'],
        mediaThumbnailUrl: 'coach-media/day6-triceps-pushdown-thumb',
        mediaFullUrl: 'coach-media/day6-triceps-pushdown-full',
        mediaType: 'image',
        mediaAlt: 'Rope triceps pushdown demo'
      },
      {
        id: 'day6-machine-preacher-curl',
        name: 'Machine Preacher Curl',
        category: 'biceps',
        targetMuscles: 'Biceps',
        sets: 3,
        minReps: 10,
        maxReps: 12,
        restSeconds: 60,
        note: 'Controlled biceps work after the run.',
        machineSetup: 'Arms fixed against the pad with shoulders relaxed.',
        mainCue: 'Curl smoothly and squeeze hard without lifting the elbows.',
        commonMistake: 'Bouncing off the bottom or shrugging the shoulders.',
        alternatives: ['Cable curl', 'EZ-bar preacher curl machine'],
        mediaThumbnailUrl: 'coach-media/day6-preacher-curl-thumb',
        mediaFullUrl: 'coach-media/day6-preacher-curl-full',
        mediaType: 'image',
        mediaAlt: 'Machine preacher curl demo'
      },
      {
        id: 'day6-overhead-triceps-extension',
        name: 'Overhead Cable Triceps Extension',
        category: 'isolation',
        targetMuscles: 'Triceps',
        sets: 2,
        minReps: 12,
        maxReps: 15,
        restSeconds: 45,
        note: 'Long-head triceps emphasis.',
        machineSetup: 'Step forward enough to keep tension through the full arc.',
        mainCue: 'Keep elbows fixed and extend without flaring the ribs.',
        commonMistake: 'Swinging the torso to start the rep.',
        alternatives: ['Single-arm overhead cable extension', 'Machine overhead extension'],
        mediaThumbnailUrl: 'coach-media/day6-overhead-extension-thumb',
        mediaFullUrl: 'coach-media/day6-overhead-extension-full',
        mediaType: 'image',
        mediaAlt: 'Overhead cable triceps extension demo'
      },
      {
        id: 'day6-cable-hammer-curl',
        name: 'Cable Hammer Curl',
        category: 'biceps',
        targetMuscles: 'Brachialis, biceps',
        sets: 2,
        minReps: 12,
        maxReps: 15,
        restSeconds: 45,
        note: 'Arm thickness without swinging.',
        machineSetup: 'Use rope handles and keep upper arms steady by the sides.',
        mainCue: 'Drive the thumbs up and squeeze at the top.',
        commonMistake: 'Throwing the hips or shoulders into the curl.',
        alternatives: ['Machine hammer curl', 'Cross-body cable curl'],
        mediaThumbnailUrl: 'coach-media/day6-hammer-curl-thumb',
        mediaFullUrl: 'coach-media/day6-hammer-curl-full',
        mediaType: 'image',
        mediaAlt: 'Cable hammer curl demo'
      },
      {
        id: 'day6-captain-chair-knee-raise',
        name: 'Captain Chair Knee Raise',
        category: 'core',
        targetMuscles: 'Lower abs, trunk',
        sets: 3,
        minReps: 10,
        maxReps: 15,
        restSeconds: 45,
        note: 'Controlled core work without swinging.',
        machineSetup: 'Back pressed into the pad with shoulders set down.',
        mainCue: 'Curl the knees up under control and lower slowly.',
        commonMistake: 'Using momentum and kicking the legs.',
        alternatives: ['Roman chair knee raise', 'Hanging knee raise'],
        mediaThumbnailUrl: 'coach-media/day6-knee-raise-thumb',
        mediaFullUrl: 'coach-media/day6-knee-raise-full',
        mediaType: 'image',
        mediaAlt: 'Captain chair knee raise demo'
      },
      {
        id: 'day6-pallof-press',
        name: 'Pallof Press or Plank',
        category: 'core',
        targetMuscles: 'Trunk stability, obliques',
        sets: 3,
        minReps: 10,
        maxReps: 15,
        restSeconds: 45,
        note: 'Three controlled sets. For planks, hold each rep block for time.',
        machineSetup: 'Cable set at chest height or forearms stacked under shoulders for plank.',
        mainCue: 'Brace hard and resist rotation or trunk movement.',
        commonMistake: 'Letting the ribs flare and losing trunk pressure.',
        alternatives: ['Tall kneeling Pallof press', 'Plank'],
        mediaThumbnailUrl: 'coach-media/day6-pallof-thumb',
        mediaFullUrl: 'coach-media/day6-pallof-full',
        mediaType: 'image',
        mediaAlt: 'Pallof press or plank demo'
      }
    ]
  },
  {
    dayId: 'day-7',
    dayNumber: 7,
    title: 'Rest / Walking',
    focus: 'Recovery and steps',
    estimatedDurationMinutes: 30,
    warmup: 'Easy walking only.',
    sessionType: 'rest',
    detailLevel: 'split_only',
    exercises: []
  }
];

export function getWorkoutPlanByDayNumber(dayNumber: number) {
  return workoutPlan.find((day) => day.dayNumber === dayNumber) ?? workoutPlan[0];
}

export function getWorkoutPlanDayForDate(date: Date) {
  const dayNumber = getAnchoredCycleDayNumber(date);
  return getWorkoutPlanByDayNumber(dayNumber);
}

export function getWorkoutHeroCopy(day: WorkoutPlanDayConfig): WorkoutHeroCopy {
  if (day.title === 'Rest / Walking') {
    return {
      title: 'REST / WALKING',
      focus: 'RECOVERY / EASY MOVEMENT',
      command: 'Recover. Walk 30-45 minutes. Do not add hard running today.'
    };
  }

  if (day.title === 'Push') {
    return {
      title: 'PUSH — CHEST / SHOULDERS / TRICEPS',
      focus: 'CHEST / SHOULDERS / TRICEPS',
      command: 'Build the chest. Widen the frame. Leave 1-2 reps in reserve.'
    };
  }

  if (day.title === 'Pull') {
    return {
      title: 'PULL — BACK / REAR DELTS / BICEPS',
      focus: 'BACK / REAR DELTS / BICEPS',
      command: 'Build the V-shape. Pull with control. No swinging.'
    };
  }

  if (day.title === 'Legs + Core + Run Intervals') {
    return {
      title: 'LEGS + CORE + INTERVALS',
      focus: 'QUADS / HAMSTRINGS / CORE / INTERVALS',
      command: 'Run controlled. Train legs clean. No glute-heavy work today.'
    };
  }

  if (day.title === 'Upper Shape') {
    return {
      title: 'UPPER SHAPE — SHOULDERS / CHEST / BACK',
      focus: 'SHOULDERS / CHEST / BACK',
      command: 'Make the frame wider. Control every rep.'
    };
  }

  return {
    title: '3.2 KM RUN + ARMS / CORE',
    focus: 'PACE / ARMS / CORE',
    command: 'Run with discipline. Track pace. Finish clean.'
  };
}

export function getNextStructuredWorkoutDay(date: Date) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(date.getDate() + offset);
    const day = getWorkoutPlanDayForDate(candidate);
    if (day.sessionType !== 'rest') return day;
  }

  return workoutPlan.find((day) => day.sessionType !== 'rest') ?? workoutPlan[0];
}

export function getWorkoutPlanDayByTemplate(name: string | null | undefined, dayLabel: string | null | undefined) {
  if (dayLabel) {
    const byDay = workoutPlan.find((day) => day.dayNumber === Number(dayLabel.replace('Day ', '')));
    if (byDay) return byDay;
  }

  if (!name) return null;
  return workoutPlan.find((day) => day.title.toLowerCase() === name.toLowerCase()) ?? null;
}

function getAnchoredCycleDayNumber(date: Date) {
  const anchor = startOfLocalDay(TRAINING_CYCLE_ANCHOR);
  const target = startOfLocalDay(date);
  const diffDays = Math.round((target.getTime() - anchor.getTime()) / 86400000);
  const normalized = ((diffDays % 7) + 7) % 7;
  return normalized + 1;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
