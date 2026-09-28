export function isAuthorized(req) {
  const token = process.env.LIFE_OS_API_TOKEN;
  if (!token) return process.env.LIFE_OS_ALLOW_UNAUTHENTICATED === "true";
  const auth = req.headers?.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const query = new URL(req.url, "http://localhost").searchParams.get("token") || "";
  return bearer === token || query === token;
}
export function authConfigured(){
  return Boolean(process.env.LIFE_OS_API_TOKEN) || process.env.LIFE_OS_ALLOW_UNAUTHENTICATED === "true";
}
export function json(res,status,body){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(body));}
