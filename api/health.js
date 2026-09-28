
export default function handler(req,res){
  res.statusCode=200;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.end(JSON.stringify({ok:true,app:"GOJO × TOJI Life OS",version:"5.0.0",time:new Date().toISOString()}));
}
