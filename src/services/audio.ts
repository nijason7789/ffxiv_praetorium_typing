interface Tone {
  frequency: number;
  type: OscillatorType;
  volume: number;
  duration: number;
  fade: number;
  delay?: number;
  endFrequency?: number;
  frequencyFade?: number;
  ramp?: "linear" | "exponential";
}

function disconnect(node: AudioNode) {
  try {
    node.disconnect();
  } catch {
    /* Cleanup must never interrupt the game. */
  }
}

class MagitekAudio {
  ctx: AudioContext | null = null;
  enabled = true;
  private resuming: AudioContext | null = null;

  init(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (this.ctx?.state === "closed") this.ctx = null;
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      const ctx = this.ctx;
      if (ctx.state === "suspended") {
        if (this.resuming !== ctx) {
          this.resuming = ctx;
          const settled = () => {
            if (this.resuming === ctx) this.resuming = null;
          };
          void Promise.resolve(ctx.resume()).then(settled, settled);
        }
        // Skip notes rather than queue a burst of sound for a later resume.
        return null;
      }
      return ctx.state === "running" ? ctx : null;
    } catch {
      if (this.resuming === this.ctx) this.resuming = null;
      return null;
    }
  }

  private play(tones: Tone[]) {
    const ctx = this.init();
    if (!ctx) return;
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    try {
      const baseTime = ctx.currentTime;
      for (const tone of tones) {
        const osc = ctx.createOscillator();
        oscillators.push(osc);
        const gain = ctx.createGain();
        gains.push(gain);
        osc.onended = () => {
          disconnect(osc);
          disconnect(gain);
        };
        const now = baseTime + (tone.delay ?? 0);
        osc.type = tone.type;
        osc.frequency.setValueAtTime(tone.frequency, now);
        if (tone.endFrequency !== undefined) {
          const end = now + (tone.frequencyFade ?? tone.fade);
          if (tone.ramp === "linear")
            osc.frequency.linearRampToValueAtTime(tone.endFrequency, end);
          else
            osc.frequency.exponentialRampToValueAtTime(tone.endFrequency, end);
        }
        gain.gain.setValueAtTime(tone.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + tone.fade);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + tone.duration);
      }
    } catch {
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          /* A node may not have started. */
        }
        disconnect(osc);
      }
      gains.forEach(disconnect);
    }
  }

  playKeyClick(isCombo = false) {
    this.play([
      {
        type: isCombo ? "triangle" : "sine",
        frequency: isCombo ? 660 : 520,
        endFrequency: isCombo ? 880 : 320,
        volume: 0.06,
        fade: 0.045,
        duration: 0.05,
      },
    ]);
  }
  playLineComplete() {
    this.play(
      [523.25, 659.25, 783.99, 1046.5].map((frequency, index) => ({
        type: "triangle",
        frequency,
        delay: index * 0.055,
        volume: 0.08,
        fade: 0.22,
        duration: 0.24,
      })),
    );
  }
  playError() {
    this.play([
      {
        type: "sawtooth",
        frequency: 160,
        endFrequency: 115,
        ramp: "linear",
        frequencyFade: 0.14,
        volume: 0.08,
        fade: 0.15,
        duration: 0.16,
      },
    ]);
  }
  playDutyComplete() {
    this.play(
      [523.25, 659.25, 783.99, 987.77, 1046.5].map((frequency, index) => ({
        type: "triangle",
        frequency,
        delay: index * 0.08,
        volume: 0.09,
        fade: 0.45,
        duration: 0.48,
      })),
    );
  }
}

export const soundFX = new MagitekAudio();
