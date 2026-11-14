// Where Home's tab (Gym, Cardio, Stretch) and Gym's Plans/Custom switch are
// remembered for the session.
export const TAB_KEY = 'workout-v2-home-tab'
export const GYM_KEY = 'workout-v2-gym-view'

// Back from Food: Home opens on Gym, Plans.
export function resetHomeView() {
  try {
    sessionStorage.setItem(TAB_KEY, 'gym')
    sessionStorage.setItem(GYM_KEY, 'plans')
  } catch {
    // Private browsing: nothing is remembered anyway.
  }
}
