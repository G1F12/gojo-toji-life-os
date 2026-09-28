import hebece from "hebece";
const { VulcanJwtRegister, VulcanHebeCe } = hebece;
import { envelopeArray, normalizeAll } from "../normalize.js";
import { provisionApiAp } from "./eduvulcan-auth.js";

function parseKeypair() {
  const raw = process.env.EDUVULCAN_KEYPAIR_JSON;
  if (!raw) throw new Error("EDUVULCAN_KEYPAIR_JSON is not configured");
  const kp = JSON.parse(raw);
  for (const k of ["fingerprint","privateKey","certificate"]) {
    if (!kp[k]) throw new Error(`EDUVULCAN_KEYPAIR_JSON missing ${k}`);
  }
  return kp;
}

export async function fetchHebeCE({daysBack=1, daysForward=45}={}) {
  const apiap = process.env.EDUVULCAN_API_AP || (await provisionApiAp({login:process.env.EDUVULCAN_LOGIN,password:process.env.EDUVULCAN_PASSWORD})).apiApHtml;
  const keypair = parseKeypair();

  // hebece v0.2.x: register the pre-provisioned keypair against /api/ap,
  // connect to assigned pupils, then select either EDUVULCAN_PUPIL_ID or the first pupil.
  const jwt = new VulcanJwtRegister(keypair, apiap, true);
  await jwt.init();

  const client = new VulcanHebeCe(keypair);
  await client.connect();

  const requested = Number(process.env.EDUVULCAN_PUPIL_ID || 0);
  await client.selectStudent(Number.isFinite(requested) ? requested : 0);

  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  const to = new Date();
  to.setDate(to.getDate() + daysForward);

  const [hw, exams, lessons] = await Promise.all([
    client.getHomework(from, to),
    client.getExams(from, to),
    client.getLessons(from, to)
  ]);

  return normalizeAll({
    homework: envelopeArray(hw),
    exams: envelopeArray(exams),
    lessons: envelopeArray(lessons)
  });
}
