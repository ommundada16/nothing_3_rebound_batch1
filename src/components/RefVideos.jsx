import { mediaUrl } from '../lib/api.js';

function Slot({ title, subtitle, id, fallback }) {
 const source=id?mediaUrl(id):fallback;
  return (
    <div>
      <div className="small" style={{ fontWeight: 700 }}>
        {title}
      </div>
      <div className="tiny muted" style={{ marginBottom: 6 }}>
        {subtitle}
      </div>
      {source ? (
        <video src={source} controls playsInline preload="metadata" style={{ width: '100%', borderRadius: 10, background: '#0b1718', aspectRatio: '16/9' }} />
      ) : (
        <div className="muted small" style={{ border: '1px dashed var(--line)', borderRadius: 10, padding: 18, textAlign: 'center', aspectRatio: '16/9', display: 'grid', placeItems: 'center' }}>
          Your physio has not added this yet.
        </div>
      )}
    </div>
  );
}

// Two videos per exercise: a clean reference from a healthy person, and a clip
// of THIS patient doing it in THEIR room with THEIR physio and THEIR props.
export default function RefVideos({ refVideos, exerciseId, mode }) {
  const v = refVideos?.[exerciseId] || {};
  if (mode) {
    const id = mode === 'assisted' ? v.stock_assisted : (v.stock_active || v.stock);
    return <div className="stack reference-video"><Slot title="Follow this demonstration" subtitle={mode === 'assisted' ? 'Heel slide with help' : 'Heel slide on your own'} id={id} fallback={exerciseId==='heel_slide'?`/reference/heel-slide-${mode==='assisted'?'assisted':'active'}.mp4`:undefined}/>{v.home && <Slot title="Your own home set-up" subtitle="Recorded with your physiotherapist" id={v.home}/>}</div>;
  }
  return (
    <div className="grid two">
      {exerciseId === 'heel_slide' ? <><Slot title="Heel slide on your own" subtitle="Healthy-person reference · active" id={v.stock_active || v.stock} fallback="/reference/heel-slide-active.mp4"/><Slot title="Heel slide with help" subtitle="Healthy-person reference · assisted" id={v.stock_assisted} fallback="/reference/heel-slide-assisted.mp4"/></> : <Slot title="How it should look" subtitle="Reference: a healthy person" id={v.stock} />}
      <Slot title="Your own set-up" subtitle="Recorded with your physio, in your room" id={v.home} />
    </div>
  );
}
