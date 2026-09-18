import { getSql } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const ASSESSMENT_QUESTION_COUNT = 24;
const DEFAULT_WORKSHOP_AXES = [
  "المحور التربوي",
  "المحور القيمي",
  "المحور المهاري",
  "المحور القيادي",
  "المحور الاجتماعي",
  "المحور المعرفي",
];

async function ensureSchema() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS project_settings (
    id INTEGER PRIMARY KEY, project_name TEXT NOT NULL, year INTEGER NOT NULL,
    educator_meetings INTEGER NOT NULL DEFAULT 2,
    min_development_meetings INTEGER NOT NULL DEFAULT 2,
    min_trips INTEGER NOT NULL DEFAULT 1,
    min_workshops INTEGER NOT NULL DEFAULT 2,
    workshop_axes JSONB NOT NULL DEFAULT '["المحور التربوي","المحور القيمي","المحور المهاري","المحور القيادي","المحور الاجتماعي","المحور المعرفي"]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL
  )`;
  await sql`ALTER TABLE project_settings ADD COLUMN IF NOT EXISTS workshop_axes JSONB NOT NULL DEFAULT '["المحور التربوي","المحور القيمي","المحور المهاري","المحور القيادي","المحور الاجتماعي","المحور المعرفي"]'::jsonb`;
  await sql`CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY, access_token TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    contact_name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '', participants INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '', archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS annual_plans (
    id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL, development_meetings JSONB NOT NULL DEFAULT '[]'::jsonb,
    trips JSONB NOT NULL DEFAULT '[]'::jsonb, workshops JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluation_followup BOOLEAN, status TEXT NOT NULL DEFAULT 'not_started',
    achievement_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    achievement_status TEXT NOT NULL DEFAULT 'not_started',
    achievement_submitted_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE(organization_id, year)
  )`;
  await sql`ALTER TABLE annual_plans ADD COLUMN IF NOT EXISTS achievement_data JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE annual_plans ADD COLUMN IF NOT EXISTS achievement_status TEXT NOT NULL DEFAULT 'not_started'`;
  await sql`ALTER TABLE annual_plans ADD COLUMN IF NOT EXISTS achievement_submitted_at TIMESTAMPTZ`;
  await sql`CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_number INTEGER NOT NULL, attendees INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL, UNIQUE(organization_id, meeting_number)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS learning_environments (
    id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, pre_score NUMERIC, post_score NUMERIC,
    created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS environment_assessments (
    id TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL REFERENCES learning_environments(id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('pre','post')),
    evaluator_name TEXT NOT NULL,
    evaluator_role TEXT NOT NULL,
    answers JSONB NOT NULL,
    strengths TEXT NOT NULL DEFAULT '',
    improvement_area TEXT NOT NULL DEFAULT '',
    submitted_at TIMESTAMPTZ NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_organizations_archived ON organizations(archived)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_annual_plans_org_year ON annual_plans(organization_id, year)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_attendance_org_meeting ON attendance(organization_id, meeting_number)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_environment_assessments_environment_phase ON environment_assessments(environment_id,phase)`;
}

async function ensureProjectSettings() {
  const sql = getSql();
  const t = now();
  await sql`INSERT INTO project_settings (id,project_name,year,educator_meetings,min_development_meetings,min_trips,min_workshops,workshop_axes,updated_at)
    VALUES (1,'تأهيل المربي',2026,2,2,1,2,${JSON.stringify(DEFAULT_WORKSHOP_AXES)}::jsonb,${t}) ON CONFLICT (id) DO NOTHING`;
}

async function readAll(token?: string | null) {
  await ensureSchema();
  await ensureProjectSettings();
  const sql = getSql();
  const settingsRows =
    await sql`SELECT id,project_name AS "projectName",year,educator_meetings AS "educatorMeetings",min_development_meetings AS "minDevelopmentMeetings",min_trips AS "minTrips",min_workshops AS "minWorkshops",workshop_axes AS "workshopAxes",updated_at AS "updatedAt" FROM project_settings WHERE id=1`;
  const settings = settingsRows[0] as any;
  const organizations = token
    ? await sql`SELECT o.id,o.access_token AS "accessToken",o.name,o.contact_name AS "contactName",o.phone,o.email,o.participants,o.notes,o.updated_at AS "updatedAt",COALESCE(p.development_meetings,'[]'::jsonb)::text AS "developmentMeetings",COALESCE(p.trips,'[]'::jsonb)::text AS trips,COALESCE(p.workshops,'[]'::jsonb)::text AS workshops,CASE WHEN p.evaluation_followup IS NULL THEN NULL WHEN p.evaluation_followup THEN 1 ELSE 0 END AS "evaluationFollowup",COALESCE(p.status,'not_started') AS "planStatus",p.submitted_at AS "submittedAt",p.updated_at AS "planUpdatedAt",COALESCE(p.achievement_data,'[]'::jsonb)::text AS "achievementData",COALESCE(p.achievement_status,'not_started') AS "achievementStatus",p.achievement_submitted_at AS "achievementSubmittedAt" FROM organizations o LEFT JOIN annual_plans p ON p.organization_id=o.id AND p.year=${settings.year} WHERE o.access_token=${token} AND o.archived=FALSE ORDER BY o.created_at DESC`
    : await sql`SELECT o.id,o.access_token AS "accessToken",o.name,o.contact_name AS "contactName",o.phone,o.email,o.participants,o.notes,o.updated_at AS "updatedAt",COALESCE(p.development_meetings,'[]'::jsonb)::text AS "developmentMeetings",COALESCE(p.trips,'[]'::jsonb)::text AS trips,COALESCE(p.workshops,'[]'::jsonb)::text AS workshops,CASE WHEN p.evaluation_followup IS NULL THEN NULL WHEN p.evaluation_followup THEN 1 ELSE 0 END AS "evaluationFollowup",COALESCE(p.status,'not_started') AS "planStatus",p.submitted_at AS "submittedAt",p.updated_at AS "planUpdatedAt",COALESCE(p.achievement_data,'[]'::jsonb)::text AS "achievementData",COALESCE(p.achievement_status,'not_started') AS "achievementStatus",p.achievement_submitted_at AS "achievementSubmittedAt" FROM organizations o LEFT JOIN annual_plans p ON p.organization_id=o.id AND p.year=${settings.year} WHERE o.archived=FALSE ORDER BY o.created_at DESC`;
  const attendanceRows = token
    ? []
    : await sql`SELECT organization_id AS "organizationId",meeting_number AS "meetingNumber",attendees,updated_at AS "updatedAt" FROM attendance`;
  const environments = token
    ? await sql`SELECT e.id,e.organization_id AS "organizationId",e.name,e.pre_score AS "preScore",e.post_score AS "postScore",e.updated_at AS "updatedAt" FROM learning_environments e JOIN organizations o ON o.id=e.organization_id WHERE o.access_token=${token} AND o.archived=FALSE ORDER BY e.created_at`
    : await sql`SELECT id,organization_id AS "organizationId",name,pre_score AS "preScore",post_score AS "postScore",updated_at AS "updatedAt" FROM learning_environments ORDER BY created_at`;
  const assessmentResponses = token
    ? []
    : await sql`SELECT a.id,a.environment_id AS "environmentId",a.phase,a.evaluator_name AS "evaluatorName",a.evaluator_role AS "evaluatorRole",a.answers::text AS answers,a.strengths,a.improvement_area AS "improvementArea",a.submitted_at AS "submittedAt" FROM environment_assessments a ORDER BY a.submitted_at DESC`;
  return {
    settings,
    organizations,
    attendance: attendanceRows,
    environments,
    assessmentResponses,
  };
}

export async function GET(request: Request) {
  try {
    return Response.json(
      await readAll(new URL(request.url).searchParams.get("token")),
    );
  } catch (e) {
    console.error(e);
    return Response.json(
      {
        error:
          e instanceof Error && e.message.includes("DATABASE_URL")
            ? "قاعدة البيانات غير مرتبطة بالمشروع بعد"
            : "تعذر تحميل البيانات حاليًا",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const sql = getSql();
    const b = (await request.json()) as any;
    const t = now();
    if (b.action === "createOrg") {
      const id = uid("org"),
        token = `${b.name?.replace(/[^\u0600-\u06FFa-z0-9]/gi, "").slice(0, 8) || "org"}-${crypto.randomUUID().slice(0, 8)}`;
      const s = await sql`SELECT year FROM project_settings WHERE id=1`;
      const year = Number(s[0]?.year || new Date().getFullYear());
      await sql`INSERT INTO organizations (id,access_token,name,contact_name,phone,email,participants,notes,archived,created_at,updated_at) VALUES (${id},${token},${b.name},${b.contactName || ""},${b.phone || ""},${b.email || ""},${Number(b.participants) || 0},${b.notes || ""},FALSE,${t},${t})`;
      await sql`INSERT INTO annual_plans (id,organization_id,year,development_meetings,trips,workshops,status,updated_at) VALUES (${uid("plan")},${id},${year},'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'not_started',${t})`;
      return Response.json({ ok: true, id, token });
    }
    if (b.action === "updateOrg")
      await sql`UPDATE organizations SET name=${b.name},contact_name=${b.contactName || ""},phone=${b.phone || ""},email=${b.email || ""},participants=${Number(b.participants) || 0},notes=${b.notes || ""},updated_at=${t} WHERE id=${b.id}`;
    if (b.action === "archiveOrg")
      await sql`UPDATE organizations SET archived=TRUE,updated_at=${t} WHERE id=${b.id}`;
    if (b.action === "deleteOrg")
      await sql`DELETE FROM organizations WHERE id=${b.id}`;
    if (b.action === "createEnvironment") {
      const org =
        await sql`SELECT id FROM organizations WHERE access_token=${b.token} AND archived=FALSE`;
      if (!org[0])
        return Response.json({ error: "الرابط غير صالح" }, { status: 404 });
      const name = String(b.name || "").trim();
      if (!name)
        return Response.json(
          { error: "أدخل اسم البيئة التربوية" },
          { status: 400 },
        );
      await sql`INSERT INTO learning_environments (id,organization_id,name,created_at,updated_at) VALUES (${uid("env")},${org[0].id as string},${name},${t},${t})`;
    }
    if (b.action === "deleteEnvironment") {
      const org =
        await sql`SELECT id FROM organizations WHERE access_token=${b.token} AND archived=FALSE`;
      if (!org[0])
        return Response.json({ error: "الرابط غير صالح" }, { status: 404 });
      await sql`DELETE FROM learning_environments WHERE id=${b.id} AND organization_id=${org[0].id as string}`;
    }
    if (b.action === "saveAssessment") {
      const phase = b.phase === "pre" || b.phase === "post" ? b.phase : null;
      const answers = Array.isArray(b.answers) ? b.answers.map(Number) : [];
      if (
        !phase ||
        answers.length !== ASSESSMENT_QUESTION_COUNT ||
        answers.some((x: number) => !Number.isInteger(x) || x < 1 || x > 5)
      )
        return Response.json(
          { error: "أجب عن جميع عبارات القياس بدرجة من 1 إلى 5" },
          { status: 400 },
        );
      const evaluatorName = String(b.evaluatorName || "").trim();
      const evaluatorRole = String(b.evaluatorRole || "").trim();
      if (!evaluatorName || !evaluatorRole)
        return Response.json(
          { error: "أدخل اسم المقيم وصفته أو علاقته بالبيئة" },
          { status: 400 },
        );
      const env =
        await sql`SELECT e.id FROM learning_environments e JOIN organizations o ON o.id=e.organization_id WHERE e.id=${b.environmentId} AND o.access_token=${b.token} AND o.archived=FALSE`;
      if (!env[0])
        return Response.json(
          { error: "رابط البيئة غير صالح" },
          { status: 404 },
        );
      await sql`INSERT INTO environment_assessments (id,environment_id,phase,evaluator_name,evaluator_role,answers,strengths,improvement_area,submitted_at) VALUES (${uid("assessment")},${b.environmentId},${phase},${evaluatorName},${evaluatorRole},${JSON.stringify(answers)}::jsonb,${String(b.strengths || "").trim()},${String(b.improvementArea || "").trim()},${t})`;
      const responseRows =
        await sql`SELECT answers::text AS answers FROM environment_assessments WHERE environment_id=${b.environmentId} AND phase=${phase}`;
      const average =
        Math.round(
          (responseRows.reduce((sum, row) => {
            const values = JSON.parse(String(row.answers)) as number[];
            return (
              sum +
              (values.reduce((a, x) => a + x, 0) / (values.length * 5)) * 100
            );
          }, 0) /
            responseRows.length) *
            10,
        ) / 10;
      if (phase === "pre")
        await sql`UPDATE learning_environments SET pre_score=${average},updated_at=${t} WHERE id=${b.environmentId}`;
      else
        await sql`UPDATE learning_environments SET post_score=${average},updated_at=${t} WHERE id=${b.environmentId}`;
      return Response.json({ ok: true, score: average });
    }
    if (b.action === "savePlan") {
      const org =
        await sql`SELECT id FROM organizations WHERE access_token=${b.token} AND archived=FALSE`;
      if (!org[0])
        return Response.json({ error: "الرابط غير صالح" }, { status: 404 });
      await sql`UPDATE annual_plans SET development_meetings=${JSON.stringify(b.developmentMeetings || [])}::jsonb,trips=${JSON.stringify(b.trips || [])}::jsonb,workshops=${JSON.stringify(b.workshops || [])}::jsonb,evaluation_followup=${b.evaluationFollowup === null ? null : !!b.evaluationFollowup},status=${b.submit ? "submitted" : "draft"},submitted_at=${b.submit ? t : null},updated_at=${t} WHERE organization_id=${org[0].id as string} AND year=(SELECT year FROM project_settings WHERE id=1)`;
    }
    if (b.action === "saveAchievement") {
      const org =
        await sql`SELECT o.id,p.status FROM organizations o JOIN annual_plans p ON p.organization_id=o.id AND p.year=(SELECT year FROM project_settings WHERE id=1) WHERE o.access_token=${b.token} AND o.archived=FALSE`;
      if (!org[0])
        return Response.json({ error: "الرابط غير صالح" }, { status: 404 });
      if (org[0].status !== "submitted")
        return Response.json(
          { error: "يجب اعتماد الخطة السنوية قبل رفع الإنجاز" },
          { status: 400 },
        );
      const items = Array.isArray(b.items) ? b.items : [];
      await sql`UPDATE annual_plans SET achievement_data=${JSON.stringify(items)}::jsonb,achievement_status=${b.submit ? "submitted" : "draft"},achievement_submitted_at=${b.submit ? t : null},updated_at=${t} WHERE organization_id=${org[0].id as string} AND year=(SELECT year FROM project_settings WHERE id=1)`;
    }
    if (b.action === "saveAttendance") {
      const org =
        await sql`SELECT participants FROM organizations WHERE id=${b.organizationId}`;
      const n = Number(b.attendees) || 0;
      if (!org[0] || n < 0 || n > Number(org[0].participants))
        return Response.json(
          { error: "عدد الحضور يجب ألا يتجاوز عدد المشاركين" },
          { status: 400 },
        );
      await sql`INSERT INTO attendance (id,organization_id,meeting_number,attendees,updated_at) VALUES (${uid("att")},${b.organizationId},${Number(b.meetingNumber)},${n},${t}) ON CONFLICT (organization_id,meeting_number) DO UPDATE SET attendees=EXCLUDED.attendees,updated_at=EXCLUDED.updated_at`;
    }
    if (b.action === "saveSettings")
      await sql`UPDATE project_settings SET project_name=${b.projectName},year=${Number(b.year)},educator_meetings=${Number(b.educatorMeetings)},min_development_meetings=${Number(b.minDevelopmentMeetings)},min_trips=${Number(b.minTrips)},min_workshops=${Number(b.minWorkshops)},workshop_axes=${JSON.stringify(Array.isArray(b.workshopAxes) ? b.workshopAxes.filter((x: unknown) => typeof x === "string" && x.trim()).map((x: string) => x.trim()) : DEFAULT_WORKSHOP_AXES)}::jsonb,updated_at=${t} WHERE id=1`;
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "لم يتم حفظ البيانات. حاول مرة أخرى" },
      { status: 500 },
    );
  }
}
