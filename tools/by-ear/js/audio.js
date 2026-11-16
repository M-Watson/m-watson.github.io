// Realistic Audio Engine for By Ear
// Works via direct file:// double-click AND on GitHub Pages.
// Uses sampled Soundfonts (acoustic_grand_piano & trumpet via smplr CDN)
// with an immediate, warm studio-grade Web Audio fallback.

(function (global) {
  const SMPLR_URL = "https://unpkg.com/smplr@0.15.4/dist/index.mjs";

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.instrumentName = "piano"; // "piano" | "trumpet"
      this.sampledInstruments = {
        piano: null,
        trumpet: null
      };
      this.loadingStatus = {
        piano: "idle",
        trumpet: "idle"
      };
      this.smplrModule = null;
      this.activeTimers = [];
      this.activeNodes = [];
      this.onStatusChange = null;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return this.ctx;
    }

    setStatusCallback(cb) {
      this.onStatusChange = cb;
    }

    notifyStatus() {
      if (typeof this.onStatusChange === "function") {
        this.onStatusChange(this.instrumentName, this.loadingStatus[this.instrumentName]);
      }
    }

    async setInstrument(name) {
      this.instrumentName = name;
      this.stop();
      this.notifyStatus();
      await this.preloadInstrument(name);
    }

    async preloadInstrument(name) {
      if (this.loadingStatus[name] === "ready" || this.loadingStatus[name] === "loading") {
        return;
      }

      this.loadingStatus[name] = "loading";
      this.notifyStatus();

      try {
        const ctx = this.ensureContext();
        if (!this.smplrModule) {
          this.smplrModule = await import(SMPLR_URL);
        }

        const { Soundfont } = this.smplrModule;
        const sfName = name === "trumpet" ? "trumpet" : "acoustic_grand_piano";
        const inst = new Soundfont(ctx, { instrument: sfName });
        await inst.load;

        this.sampledInstruments[name] = inst;
        this.loadingStatus[name] = "ready";
        this.notifyStatus();
      } catch (err) {
        console.warn(`Sampled soundfont (${name}) unavailable; using warm acoustic synthesis fallback.`, err);
        this.loadingStatus[name] = "fallback";
        this.notifyStatus();
      }
    }

    stop() {
      for (const timer of this.activeTimers) {
        clearTimeout(timer);
      }
      this.activeTimers = [];

      for (const inst of Object.values(this.sampledInstruments)) {
        if (inst && typeof inst.stop === "function") {
          try {
            inst.stop();
          } catch (_) {}
        }
      }

      for (const node of this.activeNodes) {
        try {
          node.stop();
          node.disconnect();
        } catch (_) {}
      }
      this.activeNodes = [];
    }

    async playEvents(events, onComplete) {
      this.stop();
      const ctx = this.ensureContext();

      if (this.loadingStatus[this.instrumentName] === "idle") {
        this.preloadInstrument(this.instrumentName);
      }

      let offsetSec = 0;
      const gapSec = 0.07;

      events.forEach((event) => {
        const startDelayMs = Math.max(0, offsetSec * 1000);
        const timer = setTimeout(() => {
          this.triggerChord(ctx, event.notes, event.duration);
        }, startDelayMs);
        this.activeTimers.push(timer);
        offsetSec += event.duration + gapSec;
      });

      if (onComplete) {
        const endTimer = setTimeout(() => {
          onComplete();
        }, offsetSec * 1000);
        this.activeTimers.push(endTimer);
      }
    }

    triggerChord(ctx, midiNotes, duration) {
      const inst = this.sampledInstruments[this.instrumentName];
      if (inst && this.loadingStatus[this.instrumentName] === "ready") {
        const velocity = midiNotes.length > 1 ? 82 : 95;
        midiNotes.forEach((midi) => {
          inst.start({
            note: midi,
            velocity,
            duration: duration
          });
        });
        return;
      }

      const polyScale = 1 / Math.sqrt(midiNotes.length);
      midiNotes.forEach((midi) => {
        if (this.instrumentName === "trumpet") {
          this.synthWarmBrassNote(ctx, midi, duration, 0.28 * polyScale);
        } else {
          this.synthAcousticPianoNote(ctx, midi, duration, 0.32 * polyScale);
        }
      });
    }

    midiToFreq(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    synthAcousticPianoNote(ctx, midi, duration, maxGain) {
      const now = ctx.currentTime;
      const freq = this.midiToFreq(midi);

      const masterGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freq * 6.5, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 2.2, now + duration);

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(maxGain, now + 0.012);
      masterGain.gain.exponentialRampToValueAtTime(maxGain * 0.45, now + 0.22);
      masterGain.gain.exponentialRampToValueAtTime(0.0008, now + duration + 0.18);

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      const partials = [
        { mult: 1, amp: 1.0, detune: -1.5, type: "triangle" },
        { mult: 1, amp: 0.8, detune: 1.5, type: "sine" },
        { mult: 2, amp: 0.4, detune: 0, type: "sine" },
        { mult: 3, amp: 0.18, detune: 0, type: "sine" },
        { mult: 4, amp: 0.07, detune: 0, type: "sine" }
      ];

      partials.forEach((p) => {
        if (freq * p.mult >= ctx.sampleRate / 2) return;
        const osc = ctx.createOscillator();
        const pGain = ctx.createGain();
        osc.type = p.type;
        osc.frequency.setValueAtTime(freq * p.mult, now);
        osc.detune.setValueAtTime(p.detune, now);
        pGain.gain.setValueAtTime(p.amp, now);

        osc.connect(pGain);
        pGain.connect(filter);

        osc.start(now);
        osc.stop(now + duration + 0.2);
        this.activeNodes.push(osc);
      });
    }

    synthWarmBrassNote(ctx, midi, duration, maxGain) {
      const now = ctx.currentTime;
      const freq = this.midiToFreq(midi);

      const masterGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freq * 1.8, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 5.2, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(freq * 3.4, now + duration);
      filter.Q.setValueAtTime(1.4, now);

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(maxGain, now + 0.045);
      masterGain.gain.setValueAtTime(maxGain * 0.9, now + Math.max(0.06, duration - 0.12));
      masterGain.gain.exponentialRampToValueAtTime(0.0008, now + duration + 0.08);

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);

      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.setValueAtTime(5.2, now);
      vibratoGain.gain.setValueAtTime(0, now);
      vibratoGain.gain.linearRampToValueAtTime(3.5, now + Math.min(0.35, duration * 0.5));

      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      osc.connect(filter);

      osc.start(now);
      vibrato.start(now);
      osc.stop(now + duration + 0.1);
      vibrato.stop(now + duration + 0.1);

      this.activeNodes.push(osc, vibrato);
    }
  }

  global.ByEar = global.ByEar || {};
  global.ByEar.AudioEngine = AudioEngine;
})(window);
