export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    master: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenTimer: 0,
    unlock() {
      if (audio.ctx || audio.muted) {
        if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      audio.ctx = ctx;
      audio.master = ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(ctx.destination);
      audio.engineOsc = ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineGain = ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(audio.engineGain).connect(audio.master);
      audio.engineOsc.start();
      audio.sirenOsc = ctx.createOscillator();
      audio.sirenOsc.type = 'triangle';
      audio.sirenGain = ctx.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain).connect(audio.master);
      audio.sirenOsc.start();
    },
    toggleMute() {
      audio.muted = !audio.muted;
      if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
    },
    tone(freq, dur, type, vol, sweep) {
      if (!audio.ctx || audio.muted) return;
      const ctx = audio.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(30, sweep), t + dur);
      gain.gain.setValueAtTime(vol || 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(audio.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    noise(dur, vol, freq) {
      if (!audio.ctx || audio.muted) return;
      const ctx = audio.ctx;
      const t = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq || 900, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter).connect(gain).connect(audio.master);
      src.start(t);
    },
    shot() {
      audio.tone(320, 0.09, 'square', 0.16, 90);
      audio.noise(0.07, 0.2, 1800);
    },
    hit() {
      audio.tone(180, 0.06, 'triangle', 0.12, 60);
    },
    crash(force) {
      audio.noise(0.22, Math.min(0.4, 0.12 + force * 0.0004), 700);
    },
    explosion() {
      audio.noise(0.7, 0.5, 500);
      audio.tone(70, 0.5, 'sine', 0.4, 30);
    },
    door() {
      audio.noise(0.08, 0.18, 400);
    },
    ding() {
      audio.tone(660, 0.14, 'sine', 0.2);
      setTimeout(() => audio.tone(990, 0.2, 'sine', 0.2), 120);
    },
    fail() {
      audio.tone(220, 0.3, 'sawtooth', 0.15, 110);
    },
    alarm() {
      audio.tone(880, 0.18, 'square', 0.14);
      setTimeout(() => audio.tone(660, 0.18, 'square', 0.14), 200);
    },
    update(world) {
      if (!audio.ctx) return;
      const car = world.player.inCar;
      const speed = car ? Math.hypot(car.vx, car.vy) : 0;
      const engineTarget = car ? 0.045 : 0;
      audio.engineOsc.frequency.value = 60 + speed * 0.34;
      audio.engineGain.gain.value += (engineTarget - audio.engineGain.gain.value) * 0.12;
      let sirenNear = 0;
      for (const c of world.cars) {
        if (c.kind === 'police' && c.active && !c.dead && c.ai) {
          const d = Math.hypot(c.x - world.cam.x, c.y - world.cam.y);
          sirenNear = Math.max(sirenNear, 1 - d / 1100);
        }
      }
      audio.sirenTimer += 1 / 60;
      const hi = Math.floor(audio.sirenTimer * 2.6) % 2 === 0;
      audio.sirenOsc.frequency.value = hi ? 780 : 590;
      const target = sirenNear * 0.05;
      audio.sirenGain.gain.value += (target - audio.sirenGain.gain.value) * 0.08;
    },
  };
  return audio;
}
