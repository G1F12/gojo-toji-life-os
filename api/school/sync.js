import { fetchSchoolData } from "../../lib/school.js";
import { isAuthorized, json, authConfigured } from "../../lib/http.js";
export default async function handler(req,res){
 if(req.method!=="GET")return json(res,405,{error:"method_not_allowed"});
 if(!authConfigured())return json(res,503,{error:"api_token_not_configured",message:"Set LIFE_OS_API_TOKEN (recommended) or LIFE_OS_ALLOW_UNAUTHENTICATED=true."});
 if(!isAuthorized(req))return json(res,401,{error:"unauthorized"});
 try{
  const {provider,items}=await fetchSchoolData();
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const future=items.filter(x=>!x.due||x.due>=today).sort((a,b)=>(a.due||"").localeCompare(b.due||"")||(b.priority||0)-(a.priority||0));
  return json(res,200,{ok:true,provider,syncedAt:new Date().toISOString(),items:future.filter(x=>x.type!=="lesson"),lessons:future.filter(x=>x.type==="lesson")});
 }catch(error){console.error("school-sync",error);return json(res,502,{ok:false,error:"school_sync_failed",message:error?.message||String(error)})}
}
