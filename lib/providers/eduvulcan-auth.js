import {createHash} from "node:crypto";

const BASE_URL = "https://eduvulcan.pl";
const APP = {userAgent:"Dart/3.11 (dart:io)", os:"Android", versionCode:"998", vapi:"1"};

export class EduVulcanAuthError extends Error {
  constructor(code, message, meta = {}) { super(message); this.name = "EduVulcanAuthError"; this.code = code; this.meta = meta; }
}const esc = value => String(value ?? "")
  .replace(/&#x([0-9a-f]+);/gi, (entity, hex) => decodeCodePoint(entity, Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (entity, decimal) => decodeCodePoint(entity, Number.parseInt(decimal, 10)))
  .replace(/&quot;/gi, '"')
  .replace(/&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&amp;/gi, "&");

function decodeCodePoint(entity, codePoint) {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff && (codePoint < 0xd800 || codePoint > 0xdfff)
    ? String.fromCodePoint(codePoint)
    : entity;
}
const form = values => new URLSearchParams(Object.entries(values).map(([key,value]) => [key, String(value ?? "")])).toString();

function inputValue(html, name) {
  const tag = String(html).match(new RegExp(`<input\\b[^>]*(?:name|id)=["']${name.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")}["'][^>]*>`, "i"));
  if (!tag) return null;
  return esc(tag[0].match(/\bvalue=["']([^"']*)["']/i)?.[1] || "");
}

function captchaParams(html) {
  const tag = String(html).match(/<div\b[^>]*\bcaptcha-wrapper\b[^>]*>/i)?.[0];
  if (!tag) throw new EduVulcanAuthError("EDUVULCAN_CAPTCHA_PARAMS_MISSING", "eduVULCAN CAPTCHA parameters are missing");
  const get = name => tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`,"i"))?.[1];
  const challenge = get("data-challenge"), difficulty = Number(get("data-difficulty")), rounds = Number(get("data-rounds"));
  if (!challenge || !Number.isSafeInteger(difficulty) || difficulty < 0 || difficulty > 0xffffffff || !Number.isSafeInteger(rounds) || rounds < 0) throw new EduVulcanAuthError("EDUVULCAN_CAPTCHA_PARAMS_INVALID", "eduVULCAN CAPTCHA parameters are invalid");
  return {challenge,difficulty,rounds};
}

export function solvePowCaptcha({challenge,difficulty,rounds}) {
  let material = String(challenge), answers = [];
  for (let round = 0; round < rounds; round++) {
    let answer = null;
    for (let nonce = 1; nonce <= 1_000_000_000; nonce++) {
      const digest = createHash("sha256").update(material + nonce).digest();
      if (digest.readUInt32BE(0) < difficulty) { answer = nonce; break; }
    }
    if (answer == null) throw new EduVulcanAuthError("EDUVULCAN_CAPTCHA_UNSOLVED", "eduVULCAN CAPTCHA proof of work was not solved");
    answers.push(answer); material += answer;
  }
  return answers.join(";");
}

function mobileHeaders(accessToken) {
  const headers = {"accept":"text/html,application/xhtml+xml","user-agent":APP.userAgent,"vapi":APP.vapi,"vcanonicalurl":"api%2fap","vdate":new Date().toUTCString(),"vos":APP.os,"vversioncode":APP.versionCode};
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  return headers;
}

class CookieJar {
  constructor() { this.cookies = new Map(); }
  set(response) {
    const values = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
    for (const value of values) { const [pair] = value.split(";"); const at = pair.indexOf("="); if (at > 0) this.cookies.set(pair.slice(0,at).trim(), pair.slice(at + 1).trim()); }
  }
  header() { return [...this.cookies].map(([k,v]) => `${k}=${v}`).join("; "); }
}

function parseApiAp(html, response) {
  const raw = inputValue(html,"ap");
  if (!raw) throw new EduVulcanAuthError("EDUVULCAN_API_AP_EMPTY", "eduVULCAN /api/ap returned an empty #ap value", {status:response.status,contentType:response.headers.get("content-type") || null});
  let data;
  try { data = JSON.parse(raw); } catch { throw new EduVulcanAuthError("EDUVULCAN_API_AP_INVALID", "eduVULCAN /api/ap returned a non-JSON #ap value", {status:response.status}); }
  if (!data.Success) throw new EduVulcanAuthError("EDUVULCAN_API_AP_REJECTED", "eduVULCAN /api/ap rejected authentication", {status:response.status});
  if (!data.AccessToken || !Array.isArray(data.Tokens)) throw new EduVulcanAuthError("EDUVULCAN_API_AP_INCOMPLETE", "eduVULCAN /api/ap response is missing auth fields", {status:response.status});
  return data;
}

export async function provisionApiAp({login,password,fetchImpl = fetch}) {
  if (!login || !password) throw new EduVulcanAuthError("EDUVULCAN_LOGIN_NOT_CONFIGURED", "eduVULCAN login credentials are not configured");
  const jar = new CookieJar();
  const request = async (path, init = {}) => {
    const headers = {...(init.headers || {})};
    const cookie = jar.header(); if (cookie) headers.cookie = cookie;
    const response = await fetchImpl(`${BASE_URL}${path}`, {...init,headers,redirect:"manual"}); jar.set(response); return response;
  };
  let showCaptcha = false;
  try {
    const response = await request("/Account/QueryUserInfo", {method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form({UserName:login})});
    const json = await response.json(); showCaptcha = json?.data?.ShowCaptcha === true;
  } catch { /* The upstream reference intentionally continues without CAPTCHA on preflight failure. */ }
  const loginPage = await request("/logowanie", {headers:{accept:"text/html"}});
  const loginHtml = await loginPage.text();
  const csrf = inputValue(loginHtml,"__RequestVerificationToken");
  if (!csrf) throw new EduVulcanAuthError("EDUVULCAN_CSRF_MISSING", "eduVULCAN login page did not provide a CSRF token", {status:loginPage.status});
  const captchaResponse = showCaptcha ? solvePowCaptcha(captchaParams(loginHtml)) : "";
  const response = await request("/logowanie", {method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",accept:"text/html"},body:form({UserName:login,Password:password,"captcha-response":captchaResponse,__RequestVerificationToken:csrf})});
  const loginHtmlResponse = await response.text();
  if (/robot|robak/i.test(loginHtmlResponse)) throw new EduVulcanAuthError("EDUVULCAN_CAPTCHA_REJECTED", "eduVULCAN rejected the CAPTCHA proof", {status:response.status});
  if (!response.headers.get("location")) throw new EduVulcanAuthError("EDUVULCAN_LOGIN_REJECTED", "eduVULCAN login was rejected", {status:response.status});
  const readApiAp = async accessToken => {
    const apiResponse = await request("/api/ap", {headers:mobileHeaders(accessToken)});
    return parseApiAp(await apiResponse.text(), apiResponse);
  };
  let apiAp = await readApiAp();
  if (!apiAp.IsConsentAccepted) {
    if (!apiAp.CanAcceptConsent) throw new EduVulcanAuthError("EDUVULCAN_CONSENT_REQUIRED", "eduVULCAN consent must be accepted interactively");
    await request("/konto/zgody", {method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form({HasUnacceptedOnlyOneRegulation:true,"Consent[0].Key":6,"Consent[0].Value":true})});
    apiAp = await readApiAp(apiAp.AccessToken);
    if (!apiAp.IsConsentAccepted) throw new EduVulcanAuthError("EDUVULCAN_CONSENT_FAILED", "eduVULCAN consent was not accepted");
  }
  if (!apiAp.Tokens.length) throw new EduVulcanAuthError("EDUVULCAN_NO_PUPILS", "eduVULCAN account has no linked pupils");
  return {apiApHtml:`<input id="ap" type="hidden" value="${rawAttribute(apiAp)}">`,pupilTokens:apiAp.Tokens.length};
}

function rawAttribute(data) { return JSON.stringify(data).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
