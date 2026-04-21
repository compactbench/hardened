// Mixed file: two Promise.all callsites with different intent.
//
//   loadProfilePage  -> required-data load, results are destructured and
//                       used; correct use of Promise.all. Should NOT flag.
//
//   emitPageviewPing -> fan-out to three independent telemetry sinks;
//                       one sink's failure should not abort the others.
//                       Should flag - suggest Promise.allSettled.
interface User {
  id: string;
  email: string;
  plan: string;
}

interface Preferences {
  theme: "light" | "dark";
  locale: string;
}

interface FeatureFlags {
  [flag: string]: boolean;
}

declare function getUser(id: string): Promise<User>;
declare function getPreferences(id: string): Promise<Preferences>;
declare function getFlags(id: string): Promise<FeatureFlags>;

export interface ProfileView {
  email: string;
  plan: string;
  theme: string;
  locale: string;
  flags: FeatureFlags;
}

export async function loadProfilePage(userId: string): Promise<ProfileView> {
  const [user, prefs, flags] = await Promise.all([
    getUser(userId),
    getPreferences(userId),
    getFlags(userId),
  ]);
  return {
    email: user.email,
    plan: user.plan,
    theme: prefs.theme,
    locale: prefs.locale,
    flags,
  };
}

interface PageviewEvent {
  userId: string;
  path: string;
  timestamp: number;
}

declare const segment: { track(e: PageviewEvent): Promise<void> };
declare const mixpanel: { track(e: PageviewEvent): Promise<void> };
declare const amplitude: { track(e: PageviewEvent): Promise<void> };

export async function emitPageviewPing(evt: PageviewEvent): Promise<void> {
  await Promise.all([
    segment.track(evt),
    mixpanel.track(evt),
    amplitude.track(evt),
  ]);
}
