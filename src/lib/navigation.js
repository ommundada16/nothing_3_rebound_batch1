import {useEffect,useRef} from 'react';
const handlers=new Map();let sequence=0;
export function useBack(action,enabled=true,priority=10){const ref=useRef(action);ref.current=action;useEffect(()=>{if(!enabled)return;const id=++sequence;handlers.set(id,{priority,run:()=>ref.current()});return()=>handlers.delete(id);},[enabled,priority]);}
export function navigateBack(){const top=[...handlers.entries()].sort((a,b)=>b[1].priority-a[1].priority||b[0]-a[0])[0];if(!top)return false;top[1].run();return true;}
