function first(obj, paths, fallback = null) {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, k) => acc == null ? undefined : acc[k], obj);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function asDate(value) {
  if (!value) return null;
  // HebeCE VulcanHebeDate: { Timestamp, Date, DateDisplay, Time }
  if (typeof value === "object") {
    if (value.Date) return asDate(value.Date);
    if (value.date) return asDate(value.date);
    if (value.Timestamp != null) {
      const n = Number(value.Timestamp);
      if (Number.isFinite(n)) {
        const d = new Date(n > 1e12 ? n : n * 1000);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
    }
  }
  if (typeof value === "string") {
    const iso = value.match(/\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
    // common Polish display date fallback: dd.mm.yyyy
    const pl = value.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
    if (pl) return `${pl[3]}-${pl[2].padStart(2,"0")}-${pl[1].padStart(2,"0")}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function text(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return String(value);
}

function stableId(parts) {
  const s = parts.filter(Boolean).join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return "school-" + (h >>> 0).toString(16);
}

export function normalizeHomework(raw) {
  const subject = text(first(raw, ["Subject.Name","Subject","SubjectName","PupilSubject.Name"], "Bez przedmiotu"));
  const title = text(first(raw, ["Content","Description","Homework","Title","Topic","Task","Text"], "Zadanie domowe"));
  const due = asDate(first(raw, ["Deadline","DueDate","DateTo","Date","HomeworkDate","LessonDate"]));
  const external = first(raw, ["Id","ID","IdHomework","HomeworkId","Key"]);
  return {externalId: external ? "hw-"+external : stableId(["hw",subject,due,title]),type:"homework",subject,title,due,priority:1,source:"eduvulcan"};
}

export function normalizeExam(raw) {
  const subject = text(first(raw, ["Subject.Name","Subject","SubjectName","PupilSubject.Name"], "Bez przedmiotu"));
  const title = text(first(raw, ["Content","Description","Topic","Title","Name"], "Sprawdzian / kartkówka"));
  const typeRaw = text(first(raw, ["Type","ExamType","Category","Kind"], ""));
  const due = asDate(first(raw, ["Deadline","Date","ExamDate","DateFrom"]));
  const external = first(raw, ["Id","ID","ExamId","Key"]);
  const isQuiz = /kart|quiz/i.test(typeRaw + " " + title);
  return {externalId: external ? "exam-"+external : stableId(["exam",subject,due,title]),type:isQuiz?"quiz":"exam",subject,title,due,priority:isQuiz?2:3,source:"eduvulcan"};
}

export function normalizeLesson(raw) {
  const subject = text(first(raw, ["Subject.Name","Subject","SubjectName","PupilSubject.Name"], "Lekcja"));
  const date = asDate(first(raw, ["Date","LessonDate","Day"]));
  const start = text(first(raw, ["TimeSlot.Start","TimeFrom","StartTime","Start","HourFrom"], ""));
  const end = text(first(raw, ["TimeSlot.End","TimeTo","EndTime","End","HourTo"], ""));
  const room = text(first(raw, ["Room.Code","Room","RoomCode","Classroom"], ""));
  const teacher = text(first(raw, ["TeacherPrimary.DisplayName","TeacherPrimary.Name","Teacher","TeacherName","Employee.FullName"], ""));
  const external = first(raw, ["Id","ID","LessonId","Key"]);
  return {externalId: external ? "lesson-"+external : stableId(["lesson",subject,date,start,room]),type:"lesson",subject,title:[start&&`${start}${end?"–"+end:""}`,room&&`s. ${room}`,teacher].filter(Boolean).join(" · "),due:date,startTime:start||null,endTime:end||null,room:room||null,teacher:teacher||null,priority:0,source:"eduvulcan"};
}

export function envelopeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.Envelope)) return value.Envelope;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  return [];
}

export function normalizeAll({homework=[],exams=[],lessons=[]}) {
  return [...homework.map(normalizeHomework),...exams.map(normalizeExam),...lessons.map(normalizeLesson)].filter(x=>x.due);
}
