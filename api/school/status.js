import { json, authConfigured } from "../../lib/http.js";
export default async function handler(req,res){
 if(req.method!=="GET")return json(res,405,{error:"method_not_allowed"});
 const provider=(process.env.SCHOOL_PROVIDER||(process.env.EDUVULCAN_API_AP&&process.env.EDUVULCAN_KEYPAIR_JSON?"hebece":process.env.SCHOOL_FEED_URL?"feed":"")).toLowerCase();
 return json(res,200,{ok:true,provider:provider||null,configured:Boolean(provider),authConfigured:authConfigured(),hebeceConfigured:Boolean(process.env.EDUVULCAN_API_AP&&process.env.EDUVULCAN_KEYPAIR_JSON),feedConfigured:Boolean(process.env.SCHOOL_FEED_URL)});
}
