import { CUE_FALLBACK, CUE_TAGS } from '../../shared/constants.js';
import { mediaUrl } from './api.js';

// One sentence at a time. Ordinary stale cues are dropped, not queued.
// A current limit warning may be next, but never cuts off a sentence.
export class CuePlayer {
  constructor({getCues,getLang,onCaption}) {
    this.getCues=getCues; this.getLang=getLang; this.onCaption=onCaption||(()=>{});
    this.audio=null;this.busy=false;this.busyUntil=0;this.pending=null;this.last=new Map();this.muted=false;this.generation=0;
  }
  hasRealClip(tag){return (this.getCues()[tag]||[]).length>0;}
  pick(tag){const clips=this.getCues()[tag]||[];const preferred=clips.filter(c=>!c.lang||c.lang===this.getLang());return (preferred.length?preferred:clips)[0]||null;}
  play(tag,{priority=false,text,valid=()=>true}={}) {
    const clip=this.pick(tag),label=CUE_TAGS.find(c=>c.id===tag)?.label||tag;
    return this.enqueue({key:tag,priority,valid,text:text||clip?.text||CUE_FALLBACK[tag]||label,clip,source:clip?'physio':'system'});
  }
  speak(text,{key=text,priority=false,valid=()=>true}={}){return this.enqueue({key,text,priority,valid,source:'system'});}
  enqueue(item) {
    if(this.muted || !item.valid())return false;
    const now=performance.now(),cooldown=['push','again','good'].includes(item.key)?12000:item.priority?15000:6000;
    if(now-(this.last.get(item.key)??-Infinity)<cooldown)return false;
    if(this.busy){if(['near_limit','angle_limit'].includes(item.key))this.pending={...item,queuedAt:now};return false;}
    this.last.set(item.key,now);this.busy=true;this.busyUntil=Infinity;
    const generation=this.generation;
    const finish=()=>{
      if(generation!==this.generation)return;
      this.audio=null;this.busy=false;this.busyUntil=0;
      const next=this.pending;this.pending=null;
      if(next&&performance.now()-next.queuedAt<5000&&next.valid())this.enqueue(next);
    };
    this.onCaption({tag:item.key,text:item.text,source:item.source});
    if(item.clip){
      const audio=new Audio(mediaUrl(item.clip.mediaId));this.audio=audio;
      audio.onended=finish;audio.onerror=finish;audio.play().catch(finish);
    } else if(typeof speechSynthesis!=='undefined') {
      const utterance=new SpeechSynthesisUtterance(item.text);utterance.rate=0.95;
      utterance.onend=finish;utterance.onerror=finish;speechSynthesis.speak(utterance);
    } else finish();
    return true;
  }
  stop(){
    this.generation++;this.pending=null;this.busy=false;this.busyUntil=0;
    if(this.audio){this.audio.pause();this.audio=null;}
    if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();
  }
}
