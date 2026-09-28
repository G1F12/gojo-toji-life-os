
import { fetchSchoolData } from "../../lib/school.js";
import { isAuthorized, authConfigured } from "../../lib/http.js";

const esc=s=>String(s??"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
const date8=s=>String(s||"").replaceAll("-","");
export default async function handler(req,res){
  if(req.method!=="GET"){res.statusCode=405;return res.end("method_not_allowed")}
  if(!authConfigured()){res.statusCode=503;return res.end("api_token_not_configured")}
  if(!isAuthorized(req)){res.statusCode=401;return res.end("unauthorized")}
  try{
    const {items}=await fetchSchoolData();
    const rows=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//GT Life OS//School//RU","CALSCALE:GREGORIAN"];
    for(const x of items.filter(x=>x.type!=="lesson"&&x.due)){
      rows.push("BEGIN:VEVENT");
      rows.push(`UID:${esc(x.externalId)}@gt-life-os`);
      rows.push(`DTSTART;VALUE=DATE:${date8(x.due)}`);
      rows.push(`DTEND;VALUE=DATE:${date8(new Date(new Date(x.due+"T12:00:00").getTime()+86400000).toISOString().slice(0,10))}`);
      rows.push(`SUMMARY:${esc((x.type==="homework"?"ДЗ":"Контрольная")+" · "+x.subject)}`);
      rows.push(`DESCRIPTION:${esc(x.title)}`);
      rows.push("END:VEVENT");
    }
    rows.push("END:VCALENDAR");
    res.statusCode=200;
    res.setHeader("Content-Type","text/calendar; charset=utf-8");
    res.setHeader("Cache-Control","no-store");
    res.end(rows.join("\r\n"));
  }catch(e){res.statusCode=502;res.end("school_calendar_failed")}
}
