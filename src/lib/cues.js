import { CUE_FALLBACK, CUE_TAGS } from '../../shared/constants.js';
import { mediaUrl } from './api.js';

// Plays the physio's own recorded voice at the right moment. Until the physio
// has recorded a clip for a slot, a plain placeholder voice is used and the
// caption says so. The system never invents clinical instructions: it only
// chooses WHEN to play something the physio recorded.
export class CuePlayer {
  constructor({ getCues, getLang, onCaption }) {
    this.getCues = getCues;
    this.getLang = getLang;
    this.onCaption = onCaption || (() => {});
    this.audio = null;
    this.busyUntil = 0;
    this.lastTag = null;
    this.muted = false;
  }

  hasRealClip(tag) {
    return (this.getCues()[tag] || []).length > 0;
  }

  pick(tag) {
    const clips = this.getCues()[tag] || [];
    if (!clips.length) return null;
    const lang = this.getLang();
    const pool = clips.filter((c) => !c.lang || c.lang === lang);
    const list = pool.length ? pool : clips;
    // avoid repeating the same clip back to back
    const choices = list.length > 1 ? list.filter((c) => c.mediaId !== this.lastClip) : list;
    const c = choices[Math.floor(Math.random() * choices.length)];
    this.lastClip = c.mediaId;
    return c;
  }

  // priority cues (relax, stop) may interrupt whatever is playing.
  play(tag, { priority = false } = {}) {
    if (this.muted) return false;
    const now = performance.now();
    if (!priority && now < this.busyUntil) return false;
    const label = CUE_TAGS.find((t) => t.id === tag)?.label || tag;
    const clip = this.pick(tag);
    this.stop();
    if (clip) {
      const a = new Audio(mediaUrl(clip.mediaId));
      this.audio = a;
      this.busyUntil = now + 1500;
      a.onloadedmetadata = () => {
        if (Number.isFinite(a.duration)) this.busyUntil = performance.now() + a.duration * 1000 + 250;
      };
      a.onended = () => {
        this.busyUntil = 0;
      };
      a.play().catch(() => {});
      this.onCaption({ tag, text: clip.text || label, source: 'physio' });
      return true;
    }
    const text = CUE_FALLBACK[tag];
    if (text) {
      this.speak(text);
      this.busyUntil = now + 1600;
      this.onCaption({ tag, text, source: 'placeholder' });
      return true;
    }
    return false;
  }

  // System (non-physio) voice, e.g. "move the phone back".
  speak(text) {
    if (this.muted || typeof speechSynthesis === 'undefined') return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }
}
