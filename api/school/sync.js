import {fetchSchoolData} from '../../lib/school.js';
import {authenticated,fail,json} from '../../lib/cloud.js';
import {createHash} from 'node:crypto';
const uuid=s=>{const h=createHash('sha256').update(s).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`};
export default async function handler(req,res){
 if(req.method!=='GET'&&req.method!=='POST')return fail(res,405,'method_not_allowed');
 const context=await authenticated(req);if(!context)return fail(res,401,'unauthorized');
 const provider=(process.env.SCHOOL_PROVIDER||'').toLowerCase();
 const hebeceConfigured=!!(process.env.EDUVULCAN_KEYPAIR_JSON&&(process.env.EDUVULCAN_API_AP||(process.env.EDUVULCAN_LOGIN&&process.env.EDUVULCAN_PASSWORD)));
 if(!provider||provider==='hebece'&&!hebeceConfigured||provider==='feed'&&!process.env.SCHOOL_FEED_URL)return fail(res,503,'NOT_CONFIGURED');
 const {client,user}=context,now=new Date().toISOString();
 try{
  const {items}=await fetchSchoolData(),tasks=items.filter(x=>x.type!=='lesson'),lessons=items.filter(x=>x.type==='lesson');
  const {data:old,error:readError}=await client.from('school_items').select('*').eq('user_id',user.id).eq('source','eduvulcan');if(readError)throw readError;
  const oldMap=new Map(old.map(x=>[x.external_id,x]));const seen=new Set();
  const rows=tasks.map(x=>{seen.add(x.externalId);const prior=oldMap.get(x.externalId);return {id:prior?.id||uuid(`${user.id}:item:${x.externalId}`),user_id:user.id,external_id:x.externalId,type:x.type,subject:x.subject,title:x.title,due_date:x.due,priority:x.priority,source:'eduvulcan',completed:prior?.completed||false,upstream_updated_at:now,deleted_at:null,updated_at:now}});
  for(const row of old){if(!seen.has(row.external_id)&&!row.completed)rows.push({...row,deleted_at:now,updated_at:now})}
  if(rows.length){const {error}=await client.from('school_items').upsert(rows,{onConflict:'id'});if(error)throw error}
  const lessonRows=lessons.map(x=>({id:uuid(`${user.id}:lesson:${x.externalId}`),user_id:user.id,external_id:x.externalId,lesson_date:x.due,subject:x.subject,start_time:x.startTime||null,end_time:x.endTime||null,room:x.room||null,teacher:x.teacher||null,status:null,source:'eduvulcan',updated_at:now,deleted_at:null}));
  const {data:oldLessons,error:lessonError}=await client.from('school_lessons').select('*').eq('user_id',user.id).eq('source','eduvulcan');if(lessonError)throw lessonError;
  const lessonSeen=new Set(lessonRows.map(x=>x.external_id));for(const row of oldLessons){if(!lessonSeen.has(row.external_id))lessonRows.push({...row,deleted_at:now,updated_at:now})}
  if(lessonRows.length){const {error}=await client.from('school_lessons').upsert(lessonRows,{onConflict:'id'});if(error)throw error}
  await client.from('school_sync_state').upsert({user_id:user.id,provider,status:'READY',last_sync_at:now,last_success_at:now,last_error:null,updated_at:now});
  return json(res,200,{ok:true,provider,items:tasks.length,lessons:lessons.length,syncedAt:now});
 }catch(error){const message=String(error.message||error).slice(0,500);console.error('school-sync',message);await client.from('school_sync_state').upsert({user_id:user.id,provider,status:'ERROR',last_sync_at:now,last_error:message,updated_at:now});return fail(res,502,'school_sync_failed')}
}
