// Exercise definitions. The physio-prescribed plan lives in server state
// ("plan"); this file defines what each exercise measures.

export const EXERCISES = {
  heel_slide: {
    id: 'heel_slide',
    name: 'Heel slide',
    short: 'Slide the heel towards your bottom, bending the knee as far as comfortable.',
    signal: 'flexion', // knee flexion in degrees: 0 = straight
    unit: '°',
    modes: {
      active: { label: 'Active', help: 'You bend the knee alone, using only your own muscles.' },
      assisted: { label: 'Assisted', help: 'Use a strap or towel around the foot (or a helper) to gently pull the heel closer.' },
    },
    base: 12, // below this flexion the leg counts as "at rest"
    minPeak: 30, // peak must be above this to count as a rep
    camera: 'Place the phone to the SIDE of the leg, at knee height, about 1.5 to 2 metres away. Bare leg or shorts.',
  },
  slr: {
    id: 'slr',
    name: 'Straight leg raise',
    short: 'Keep the knee locked straight and lift the heel off the bed, then lower slowly.',
    signal: 'lift', // thigh elevation vs the bed, degrees
    unit: '°',
    modes: {
      active: { label: 'Active', help: 'Lift with your own thigh muscle.' },
      assisted: { label: 'Assisted', help: 'Gently help the knee straighten with your hand or a strap.' },
    },
    base: 6,
    minPeak: 15,
    camera: 'Place the phone to the SIDE of the leg, at bed height, about 2 metres away. Lie on your back, bare leg.',
  },
};

// Landmark indices (MediaPipe pose, 33 points)
export const LEG = {
  left: { hip: 23, knee: 25, ankle: 27, heel: 29, foot: 31 },
  right: { hip: 24, knee: 26, ankle: 28, heel: 30, foot: 32 },
};

// Two separate patient tasks, sharing the heel-slide measurement engine.
export function heelSlideTasks(plan) {
  const exercise = plan.exercises.find(e => e.id === 'heel_slide');
  if (!exercise) return [];
  return [
    {...exercise, key:'heel-slide-active', mode:'active', name:'Heel slide — unassisted', description:'On your own'},
    {...exercise, key:'heel-slide-assisted', mode:'assisted', name:'Heel slide — assisted', description:'With help'},
  ];
}

export function exerciseTaskDone(session, task) {
 const completed = session.completedReps ?? session.reps?.filter(r=>r.complete).length ?? 0;
 return session.exercise === task.id && session.mode === task.mode && completed >= task.reps;
}
