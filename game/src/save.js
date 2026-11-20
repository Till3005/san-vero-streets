const KEY = 'sanvero-streets-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.cash !== 'number' || typeof data.mission !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(world) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({
      v: 1,
      cash: Math.round(world.cash),
      mission: world.missionIdx,
      wins: !!world.wins,
      kills: world.stats.kills,
      jacked: world.stats.jacked,
      muted: !!world.audio.muted,
      time: Math.round(world.time),
    }));
  } catch {
    // storage unavailable: session-only progress
  }
}
