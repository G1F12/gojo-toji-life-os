import {createClient} from '@supabase/supabase-js';
export const URL='https://tnorzynsakwyacnukzjy.supabase.co';
export const PUBLISHABLE='sb_publishable_JwQFqL4ZYzjtaDIRF5fdWQ_Z9HZ8SsO';
const anon=createClient(URL,PUBLISHABLE,{auth:{persistSession:false,autoRefreshToken:false}});
export async function authenticated(req){const auth=req.headers.authorization||'',jwt=auth.startsWith('Bearer ')?auth.slice(7):'';if(!jwt)return null;const {data,error}=await anon.auth.getUser(jwt);if(error||!data.user)return null;const client=createClient(URL,PUBLISHABLE,{global:{headers:{Authorization:'Bearer '+jwt}},auth:{persistSession:false,autoRefreshToken:false}});return {client,user:data.user};}
export function fail(res,status,error){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({ok:false,error}));}
export function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}
