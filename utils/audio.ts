// Notes Frequencies
const NOTES: Record<string, number> = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25
};

type MusicTheme = 'intro' | 'exploration' | 'combat' | 'none';

class MusicEngine {
  ctx: AudioContext;
  master: GainNode;
  tempo: number = 100;
  nextNoteTime: number = 0;
  currentBeat: number = 0;
  timerID: number | null = null;
  theme: MusicTheme = 'none';
  
  // Volume Multiplier
  globalVolume: number = 1.0;

  // Track Base Volumes
  volDrums: number = 0.4;
  volBass: number = 0.3;
  volPad: number = 0.2;
  volLead: number = 0.15;

  constructor(ctx: AudioContext, master: GainNode) {
    this.ctx = ctx;
    this.master = master;
  }

  setVolume(v: number) {
      this.globalVolume = v;
  }

  setTheme(theme: MusicTheme) {
    if (this.theme === theme) return;
    this.theme = theme;
    this.currentBeat = 0;
    
    // Theme configs
    if (theme === 'intro') {
       this.tempo = 60;
       this.volDrums = 0.0; this.volBass = 0.6; this.volPad = 0.5; this.volLead = 0.1;
    } else if (theme === 'exploration') {
       this.tempo = 85; // Hip-hop chill
       this.volDrums = 0.5; this.volBass = 0.4; this.volPad = 0.2; this.volLead = 0.2;
    } else if (theme === 'combat') {
       this.tempo = 135; // Action
       this.volDrums = 0.6; this.volBass = 0.5; this.volPad = 0.1; this.volLead = 0.4;
    }
  }

  start() {
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  stop() {
    if (this.timerID) window.clearTimeout(this.timerID);
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextStep();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), 25);
  }

  nextStep() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
    this.currentBeat = (this.currentBeat + 1) % 64; // 4 bar loops
  }

  scheduleNote(beat: number, time: number) {
    if (this.theme === 'none') return;
    
    // Apply global music volume modifier
    const volMod = this.globalVolume;

    // --- INTRO THEME ---
    if (this.theme === 'intro') {
        // Drone every 4 bars
        if (beat % 64 === 0) this.playPadChord(['C2', 'G2', 'C3'], time, 8, volMod);
        // Random Cinematic blips
        if (beat % 16 === 0 && Math.random() > 0.5) this.playPing(NOTES['G4'], time, volMod);
        if (beat % 32 === 0) this.playBassNote(NOTES['C2'], time, 4, 'sine', volMod);
    }

    // --- EXPLORATION THEME (Chill Hip Hop) ---
    if (this.theme === 'exploration') {
        // Drums (Kick on 1, Snare on 5 (16th grid))
        const step = beat % 16;
        if (step === 0 || step === 10) this.playKick(time, 1, volMod); // Boom... Bap
        if (step === 8) this.playSnare(time, 0.4, false, volMod); // Clap
        if (step % 2 === 0) this.playHihat(time, step % 4 === 0 ? 0.2 : 0.05, volMod);

        // Chords (Every 2 bars)
        if (beat % 32 === 0) this.playPadChord(['F3', 'A3', 'C4', 'E4'], time, 4, volMod); // Fmaj7
        if (beat % 32 === 16) this.playPadChord(['G3', 'B3', 'D4', 'F4'], time, 4, volMod); // G7
        
        // Bass
        if (beat % 16 === 0) this.playBassNote(NOTES['F2'], time, 1, 'triangle', volMod);
        if (beat % 16 === 14) this.playBassNote(NOTES['G2'], time, 0.5, 'triangle', volMod);
        
        // Melody (Sparse)
        if (beat % 32 === 28) this.playPing(NOTES['E4'], time, volMod);
    }

    // --- COMBAT THEME (Action Synth) ---
    if (this.theme === 'combat') {
        const step = beat % 16;
        // Driving Kick
        if (step % 4 === 0) this.playKick(time, 1.2, volMod); 
        // Snare
        if (step % 8 === 4) this.playSnare(time, 0.8, true, volMod);
        // Running Hihats
        if (step % 2 === 0) this.playHihat(time, 0.3, volMod);

        // Arp Bass
        const bassNotes = [NOTES['C2'], NOTES['C2'], NOTES['Eb2'], NOTES['C2']];
        if (step % 4 === 2) this.playBassNote(bassNotes[(beat/4)%4|0], time, 0.2, 'sawtooth', volMod);
        
        // Tension Lead
        if (beat % 64 > 48) {
             if (step % 2 === 0) this.playLead(NOTES['G4'], time, 0.1, volMod);
        }
    }
  }

  // --- INSTRUMENTS ---
  playKick(t: number, force = 1, mod = 1) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
    gain.gain.setValueAtTime(this.volDrums * force * mod, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  playSnare(t: number, force = 1, noise = false, mod = 1) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    // Tone
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    gain.gain.setValueAtTime(this.volDrums * 0.5 * force * mod, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t); osc.stop(t + 0.2);
    
    // Noise Burst
    const bSize = this.ctx.sampleRate * 0.2;
    const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for(let i=0; i<bSize; i++) d[i] = (Math.random()*2-1);
    const n = this.ctx.createBufferSource();
    n.buffer = b;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(this.volDrums * force * mod, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + (noise ? 0.3 : 0.15));
    // Highpass for crisp snare
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 800;
    n.connect(f); f.connect(nGain); nGain.connect(this.master);
    n.start(t);
  }

  playHihat(t: number, vol: number, mod = 1) {
    const bSize = this.ctx.sampleRate * 0.05;
    const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for(let i=0; i<bSize; i++) d[i] = (Math.random()*2-1);
    const n = this.ctx.createBufferSource();
    n.buffer = b;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol * this.volDrums * mod, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 6000;
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t);
  }

  playBassNote(freq: number, t: number, dur: number, type: OscillatorType = 'triangle', mod = 1) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(this.volBass * mod, t);
      g.gain.linearRampToValueAtTime(this.volBass * 0.8 * mod, t + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(type === 'sawtooth' ? 800 : 400, t);
      f.frequency.exponentialRampToValueAtTime(100, t + dur);

      osc.connect(f); f.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + dur);
  }

  playPadChord(notes: string[], t: number, dur: number, mod = 1) {
      notes.forEach(n => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine'; // lush
          osc.frequency.setValueAtTime(NOTES[n], t);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime((this.volPad / notes.length) * mod, t + 1); // Slow attack
          g.gain.setValueAtTime((this.volPad / notes.length) * mod, t + dur - 1);
          g.gain.linearRampToValueAtTime(0, t + dur);
          
          osc.connect(g); g.connect(this.master);
          osc.start(t); osc.stop(t + dur);
      });
  }

  playPing(freq: number, t: number, mod = 1) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this.volLead * mod, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2);
      
      // Delay effect (manual)
      const d = this.ctx.createDelay(0.5);
      d.delayTime.value = 0.3;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.4;
      
      osc.connect(g);
      g.connect(this.master);
      g.connect(d);
      d.connect(fb);
      fb.connect(d);
      d.connect(this.master);
      
      osc.start(t); osc.stop(t + 2);
  }
  
  playLead(freq: number, t: number, dur: number, mod = 1) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(this.volLead * mod, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(2000, t);
      f.frequency.exponentialRampToValueAtTime(500, t + dur);
      osc.connect(f); f.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + dur);
  }
}

export class AudioManager {
    ctx: AudioContext;
    master: GainNode;
    engineOsc: OscillatorNode | null = null;
    engineGain: GainNode | null = null;
    
    // Ambiance
    ambianceOsc: OscillatorNode | null = null;
    ambianceGain: GainNode | null = null;
    sirenOsc: OscillatorNode | null = null;
    sirenGain: GainNode | null = null;

    music: MusicEngine;
    initialized: boolean = false;
    
    // SFX Volume Modifier
    sfxVol: number = 1.0;
  
    constructor() {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      
      // Compressor to glue the mix
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 30;
      comp.ratio.value = 12;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      
      this.master.connect(comp);
      comp.connect(this.ctx.destination);

      this.music = new MusicEngine(this.ctx, this.master);
    }
  
    resume() {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.initialized = true;
      this.music.start();
    }
    
    setMasterVolume(val: number) {
        // Clamp 0 to 1
        const v = Math.max(0, Math.min(1, val));
        if(this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }
    
    setMusicVolume(val: number) {
        this.music.setVolume(Math.max(0, Math.min(1, val)));
    }
    
    setSfxVolume(val: number) {
        this.sfxVol = Math.max(0, Math.min(1, val));
    }

    setMusic(theme: MusicTheme) {
        this.music.setTheme(theme);
    }
  
    // --- SFX ---

    playShot() {
      if (!this.initialized) return;
      const t = this.ctx.currentTime;
      // Gunshot: Noise burst + Punch
      const bSize = this.ctx.sampleRate * 0.4;
      const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for(let i=0; i<bSize; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/bSize, 4);
      const n = this.ctx.createBufferSource();
      n.buffer = b;
      
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 2000;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.8 * this.sfxVol, t);
      n.connect(f); f.connect(g); g.connect(this.master);
      n.start(t);

      // Punch
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(10, t+0.2);
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(0.8 * this.sfxVol, t);
      og.gain.exponentialRampToValueAtTime(0.01, t+0.2);
      osc.connect(og); og.connect(this.master);
      osc.start(t); osc.stop(t+0.2);
    }

    playReload() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        // Two clicks
        [0, 0.2].forEach(dt => {
            const osc = this.ctx.createOscillator();
            osc.frequency.setValueAtTime(800, t+dt);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.1 * this.sfxVol, t+dt);
            g.gain.exponentialRampToValueAtTime(0.001, t+dt+0.05);
            osc.connect(g); g.connect(this.master);
            osc.start(t+dt); osc.stop(t+dt+0.05);
        });
    }
  
    playStep(surface: 'road' | 'grass' = 'road') {
      if (!this.initialized) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator(); // Or Noise
      const g = this.ctx.createGain();
      
      // Create noise buffer
      const bSize = this.ctx.sampleRate * 0.1;
      const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for(let i=0; i<bSize; i++) d[i] = (Math.random()*2-1);
      const n = this.ctx.createBufferSource();
      n.buffer = b;
      
      const f = this.ctx.createBiquadFilter();
      if (surface === 'road') {
          // Sharp click/tap
          f.type = 'highpass'; f.frequency.value = 1000;
          g.gain.setValueAtTime(0.15 * this.sfxVol, t);
      } else {
          // Soft swish
          f.type = 'lowpass'; f.frequency.value = 600;
          g.gain.setValueAtTime(0.2 * this.sfxVol, t);
      }
      
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      
      n.connect(f); f.connect(g); g.connect(this.master);
      n.start(t);
    }

    playUI(type: 'hover' | 'click' | 'mission' | 'punch') {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        
        if (type === 'hover') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, t);
            g.gain.setValueAtTime(0.05 * this.sfxVol, t);
            g.gain.linearRampToValueAtTime(0, t+0.05);
        } else if (type === 'click') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(1200, t+0.1);
            g.gain.setValueAtTime(0.1 * this.sfxVol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t+0.1);
        } else if (type === 'punch') {
            // Punch sound: Low thud with high frequency impact
            const osc1 = this.ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(80, t);
            osc1.frequency.exponentialRampToValueAtTime(40, t+0.15);
            const g1 = this.ctx.createGain();
            g1.gain.setValueAtTime(0.3 * this.sfxVol, t);
            g1.gain.exponentialRampToValueAtTime(0.001, t+0.15);
            osc1.connect(g1); g1.connect(this.master);
            osc1.start(t); osc1.stop(t+0.15);
            
            // Impact crack
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(200, t);
            osc2.frequency.exponentialRampToValueAtTime(800, t+0.05);
            const g2 = this.ctx.createGain();
            g2.gain.setValueAtTime(0.2 * this.sfxVol, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t+0.1);
            const f = this.ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = 1000;
            osc2.connect(f); f.connect(g2); g2.connect(this.master);
            osc2.start(t); osc2.stop(t+0.1);
            return;
        } else if (type === 'mission') {
            // Success chord
            this.music.playPadChord(['C4', 'E4', 'G4', 'C5'], t, 2, this.sfxVol);
            return;
        }
        
        osc.connect(g); g.connect(this.master);
        osc.start(t); osc.stop(t+0.2);
    }

    playHorn() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        [300, 370].forEach(f => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, t);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.1 * this.sfxVol, t);
            g.gain.linearRampToValueAtTime(0, t+0.4);
            osc.connect(g); g.connect(this.master);
            osc.start(t); osc.stop(t+0.4);
        });
    }

    playSkid() {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        // Filtered pink noise sweeping up frequency
        const bSize = this.ctx.sampleRate * 0.5;
        const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        let last = 0;
        for(let i=0; i<bSize; i++) {
             const white = Math.random()*2-1;
             d[i] = (last + (0.02 * white)) / 1.02;
             last = d[i];
             d[i] *= 3.5; 
        }
        const n = this.ctx.createBufferSource();
        n.buffer = b;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.2 * this.sfxVol, t);
        g.gain.linearRampToValueAtTime(0, t+0.5);
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(800, t);
        f.frequency.linearRampToValueAtTime(1200, t+0.5);
        
        n.connect(f); f.connect(g); g.connect(this.master);
        n.start(t);
    }
  
    updateEngine(speed: number, active: boolean) {
      if (!this.initialized) return;

      const t = this.ctx.currentTime;

      if (!this.engineOsc) {
          this.engineOsc = this.ctx.createOscillator();
          this.engineOsc.type = 'sawtooth';
          this.engineGain = this.ctx.createGain();
          this.engineGain.gain.value = 0;
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass'; f.frequency.value = 200;
          this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
          this.engineOsc.start();
      }

      if (active) {
          const targetFreq = 50 + (Math.abs(speed) * 3); 
          const targetVol = (0.1 + (Math.min(Math.abs(speed), 20) / 100)) * this.sfxVol;
          this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
          if (this.engineGain) this.engineGain.gain.setTargetAtTime(targetVol, t, 0.1);
      } else {
          if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, t, 0.5);
      }
    }
    
    updateSiren(active: boolean) {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;
        if (active) {
            if (!this.sirenOsc) {
                this.sirenOsc = this.ctx.createOscillator();
                this.sirenOsc.type = 'triangle';
                this.sirenGain = this.ctx.createGain();
                this.sirenGain.gain.value = 0;
                
                // LFO for pitch modulation
                const lfo = this.ctx.createOscillator();
                lfo.frequency.value = 2; // Hz
                const lfoGain = this.ctx.createGain();
                lfoGain.gain.value = 300; // Pitch depth
                lfo.connect(lfoGain);
                lfoGain.connect(this.sirenOsc.frequency);
                lfo.start();
                this.sirenOsc.frequency.value = 800;

                const panner = this.ctx.createStereoPanner(); // Pan it around a bit randomly? Or just wide
                
                this.sirenOsc.connect(this.sirenGain);
                this.sirenGain.connect(panner);
                panner.connect(this.master);
                this.sirenOsc.start();
            }
            if (this.sirenGain) this.sirenGain.gain.setTargetAtTime(0.15 * this.sfxVol, t, 1.0);
        } else {
            if (this.sirenGain) this.sirenGain.gain.setTargetAtTime(0, t, 1.0);
        }
    }
  
    updateAmbiance(isNight: boolean) {
        if (!this.initialized) return;
        const t = this.ctx.currentTime;

        if (!this.ambianceOsc) {
            this.ambianceOsc = this.ctx.createOscillator();
            this.ambianceOsc.type = 'triangle'; 
            this.ambianceOsc.frequency.value = 80;
            this.ambianceGain = this.ctx.createGain();
            this.ambianceGain.gain.value = 0.05;
            const p = this.ctx.createStereoPanner();
            p.pan.value = 0.1;
            this.ambianceOsc.connect(this.ambianceGain);
            this.ambianceGain.connect(p);
            p.connect(this.master);
            this.ambianceOsc.start();
        }

        const targetFreq = isNight ? 60 : 90;
        const targetVol = (isNight ? 0.08 : 0.03) * this.sfxVol;
        
        this.ambianceOsc.frequency.setTargetAtTime(targetFreq, t, 2);
        if (this.ambianceGain) this.ambianceGain.gain.setTargetAtTime(targetVol, t, 2);
    }
}
  
export const audioManager = new AudioManager();