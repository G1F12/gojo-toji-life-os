const dateStamp = date => /^\d{4}-\d\d-\d\d$/.test(date || '') ? `${date}T12:00:00.000Z` : '2026-01-01T00:00:00.000Z';
const timestamp = (item, date) => item?.updatedAt || item?.updated_at || dateStamp(date);
const fnv = (s, seed) => { let h = seed >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
export function stableUuid(kind, key) {
  const s = kind + ':' + String(key);
  const h = [2166136261, 16777619, 0x9e3779b9, 0x811c9dc5].map(seed => fnv(s, seed)).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export const asUuid = (kind, key) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(key || '')) ? key : stableUuid(kind, key);

export const TABLES = ['profiles','user_settings','workout_sessions','workout_sets','body_checkins','body_measurements','nutrition_logs','readiness_logs','school_items','school_lessons'];
export const PK = {profiles:'user_id',user_settings:'user_id'};
const row = (user_id, id, updated_at, extra) => ({id, user_id, updated_at, ...extra});
export function toRows(db, userId) {
  const s = db.settings || {}, out = Object.fromEntries(TABLES.map(t => [t, []]));
  out.profiles.push({user_id:userId,display_name:s.name||null,height_cm:s.height||null,starting_weight_kg:s.startWeight||null,target_kcal:s.targetKcal||null,goal_gojo_pct:s.gojo||null,goal_toji_pct:s.toji||null,updated_at:db._meta?.settingsUpdatedAt||'2026-01-01T00:00:00.000Z'});
  out.user_settings.push({user_id:userId,training_plan:db.plan||{},rest_timer_seconds:db.settings?.restTimerSeconds||120,preferences:{},updated_at:db._meta?.planUpdatedAt||'2026-01-01T00:00:00.000Z'});
  (db.sessions||[]).forEach((s,si)=>{
    const id=asUuid('session',s.cloudId||s.id||[s.date,s.day,si,JSON.stringify(s.sets)].join('|')),ts=timestamp(s,s.date);
    out.workout_sessions.push(row(userId,id,ts,{workout_date:s.date,workout_day:s.day,duration_minutes:s.duration,energy:s.energy,post_soreness:s.postSoreness,note:s.note||''}));
    (s.sets||[]).forEach((x,i)=>out.workout_sets.push(row(userId,asUuid('set',x.cloudId||`${id}:${i}`),ts,{session_id:id,exercise_name:x.exercise||'',set_number:x.set||i+1,position:i,weight_kg:x.weight,reps:x.reps,rir:x.rir,completed:!!x.done,muscles:x.muscles||[]})));
  });
  (db.body||[]).forEach(x=>out.body_checkins.push(row(userId,stableUuid('body',x.date),timestamp(x,x.date),{checkin_date:x.date,weight_kg:x.weight,waist_cm:x.waist,sleep_hours:x.sleep,steps:x.steps})));
  (db.measurements||[]).forEach(x=>out.body_measurements.push(row(userId,stableUuid('measurements',x.date),timestamp(x,x.date),{measurement_date:x.date,chest_cm:x.chest,arm_cm:x.arm,thigh_cm:x.thigh,waist_cm:x.waist})));
  (db.food||[]).forEach(x=>out.nutrition_logs.push(row(userId,stableUuid('food',x.date),timestamp(x,x.date),{log_date:x.date,kcal:x.kcal,protein_g:x.protein,note:x.note||''})));
  (db.readiness||[]).forEach(x=>out.readiness_logs.push(row(userId,stableUuid('readiness',x.date),timestamp(x,x.date),{log_date:x.date,sleep_hours:x.sleep,energy:x.energy,soreness:x.soreness,stress:x.stress,wrist_discomfort:x.wrist,calculated_score:x.score??null})));
  (db.school||[]).filter(x=>x.type!=='lesson').forEach((x,i)=>out.school_items.push(row(userId,asUuid('school',x.cloudId||x.id||[x.type,x.subject,x.title,x.due,i].join('|')),timestamp(x,x.due),{external_id:x.externalId||null,type:['homework','exam','quiz'].includes(x.type)?x.type:'other',subject:x.subject||'',title:x.title||'',due_date:x.due||null,priority:x.priority||1,source:x.source||'manual',completed:!!x.done,upstream_updated_at:x.upstreamUpdatedAt||null,deleted_at:null})));
  (db.deletedSchool||[]).forEach(x=>out.school_items.push(row(userId,asUuid('school',x.cloudId||x.id),x.deletedAt,{external_id:x.externalId||null,type:x.type||'other',subject:x.subject||'',title:x.title||'',due_date:x.due||null,priority:x.priority||1,source:x.source||'manual',completed:!!x.done,deleted_at:x.deletedAt})));
  (db.timetable||[]).forEach((x,i)=>out.school_lessons.push(row(userId,asUuid('lesson',x.cloudId||x.id||x.externalId||[x.date,x.subject,i].join('|')),timestamp(x,x.date||x.due),{external_id:x.externalId||`manual:${i}:${x.date||x.due}`,lesson_date:x.date||x.due,subject:x.subject||'',start_time:x.startTime||null,end_time:x.endTime||null,room:x.room||null,teacher:x.teacher||null,status:x.status||null,source:x.source||'eduvulcan',deleted_at:x.deletedAt||null})));
  return out;
}

export function fromRows(rows, fallback) {
  const db=structuredClone(fallback),p=rows.profiles?.[0],settings=rows.user_settings?.[0];
  if(p)db.settings={...db.settings,name:p.display_name??db.settings.name,height:+p.height_cm||db.settings.height,startWeight:+p.starting_weight_kg||db.settings.startWeight,targetKcal:+p.target_kcal||db.settings.targetKcal,gojo:+p.goal_gojo_pct||db.settings.gojo,toji:+p.goal_toji_pct||db.settings.toji};
  if(settings){db.plan=settings.training_plan&&Object.keys(settings.training_plan).length?settings.training_plan:db.plan;db.settings.restTimerSeconds=settings.rest_timer_seconds||120}
  const sets=new Map();for(const x of rows.workout_sets||[]){if(!sets.has(x.session_id))sets.set(x.session_id,[]);sets.get(x.session_id).push(x)}
  db.sessions=(rows.workout_sessions||[]).map(s=>({id:s.id,cloudId:s.id,date:s.workout_date,day:s.workout_day,duration:s.duration_minutes,energy:s.energy,postSoreness:s.post_soreness,note:s.note,updatedAt:s.updated_at,sets:(sets.get(s.id)||[]).sort((a,b)=>(a.position??a.set_number)-(b.position??b.set_number)).map(x=>({cloudId:x.id,exercise:x.exercise_name,set:x.set_number,weight:x.weight_kg,reps:x.reps,rir:x.rir,done:x.completed,muscles:x.muscles||[]}))})).sort((a,b)=>a.date.localeCompare(b.date));
  db.body=(rows.body_checkins||[]).map(x=>({date:x.checkin_date,weight:x.weight_kg,waist:x.waist_cm,sleep:x.sleep_hours,steps:x.steps,updatedAt:x.updated_at})).sort((a,b)=>a.date.localeCompare(b.date));
  db.measurements=(rows.body_measurements||[]).map(x=>({date:x.measurement_date,chest:x.chest_cm,arm:x.arm_cm,thigh:x.thigh_cm,waist:x.waist_cm,updatedAt:x.updated_at}));
  db.food=(rows.nutrition_logs||[]).map(x=>({date:x.log_date,kcal:x.kcal,protein:x.protein_g,note:x.note,updatedAt:x.updated_at}));
  db.readiness=(rows.readiness_logs||[]).map(x=>({date:x.log_date,sleep:x.sleep_hours,energy:x.energy,soreness:x.soreness,stress:x.stress,wrist:x.wrist_discomfort,score:x.calculated_score,updatedAt:x.updated_at}));
  db.deletedSchool=(rows.school_items||[]).filter(x=>x.deleted_at).map(x=>({cloudId:x.id,id:x.id,externalId:x.external_id,type:x.type,subject:x.subject,title:x.title,due:x.due_date,priority:x.priority,source:x.source,done:x.completed,deletedAt:x.deleted_at}));
  db.school=(rows.school_items||[]).filter(x=>!x.deleted_at).map(x=>({id:x.id,cloudId:x.id,externalId:x.external_id,type:x.type,subject:x.subject,title:x.title,due:x.due_date,priority:x.priority,source:x.source,done:x.completed,updatedAt:x.updated_at}));
  db.timetable=(rows.school_lessons||[]).filter(x=>!x.deleted_at).map(x=>({id:x.id,cloudId:x.id,externalId:x.external_id,date:x.lesson_date,due:x.lesson_date,subject:x.subject,startTime:x.start_time,endTime:x.end_time,room:x.room,teacher:x.teacher,status:x.status,source:x.source,updatedAt:x.updated_at}));
  db._meta={...(db._meta||{}),settingsUpdatedAt:p?.updated_at,planUpdatedAt:settings?.updated_at};
  return db;
}

export function mergeRows(local,remote){const merged={};const push={};for(const t of TABLES){const id=PK[t]||'id',old=new Map((remote[t]||[]).map(x=>[x[id],x]));push[t]=[];for(const x of local[t]||[]){const r=old.get(x[id]);if(!r||Date.parse(x.updated_at)>Date.parse(r.updated_at)){old.set(x[id],x);push[t].push(x)}}merged[t]=[...old.values()]}return{merged,push}}
