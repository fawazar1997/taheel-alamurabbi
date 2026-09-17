import { getSql } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

async function ensureSchema() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS project_settings (
    id INTEGER PRIMARY KEY, project_name TEXT NOT NULL, year INTEGER NOT NULL,
    educator_meetings INTEGER NOT NULL DEFAULT 2,
    min_development_meetings INTEGER NOT NULL DEFAULT 2,
    min_trips INTEGER NOT NULL DEFAULT 1,
    min_workshops INTEGER NOT NULL DEFAULT 2,
    updated_at TIMESTAMPTZ NOT NULL
  )`;
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
    submitted_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE(organization_id, year)
  )`;
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
  await sql`CREATE INDEX IF NOT EXISTS idx_organizations_archived ON organizations(archived)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_annual_plans_org_year ON annual_plans(organization_id, year)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_attendance_org_meeting ON attendance(organization_id, meeting_number)`;
}

async function seedDemoData() {
  const sql = getSql(); const t = now();
  await sql`INSERT INTO project_settings (id,project_name,year,educator_meetings,min_development_meetings,min_trips,min_workshops,updated_at)
    VALUES (1,'تأهيل المربي',2026,2,2,1,2,${t}) ON CONFLICT (id) DO NOTHING`;
  const orgs = [
    ["org_namaa","namaa-7f2k","جمعية نماء التربوية","أحمد القحطاني","0501234567","ahmad@namaa.org",24,"جهة نشطة ومبادرة"],
    ["org_roaa","roaa-9m4p","مؤسسة رؤى الشباب","سارة الشهري","0552345678","sara@roaa.org",18,""],
    ["org_athar","athar-3x8d","مركز أثر للتنمية","محمد عسيري","0533456789","m.aseeri@athar.org",30,"تحتاج متابعة الخطة"],
    ["org_binaa","binaa-6q1w","جمعية بناء القيم","نورة الأحمري","0564567890","noura@binaa.org",15,""],
    ["org_manar","manar-2h5n","مركز منار التربوي","خالد الشهراني","0545678901","khaled@manar.org",22,""]
  ] as const;
  for (const o of orgs) await sql`INSERT INTO organizations (id,access_token,name,contact_name,phone,email,participants,notes,archived,created_at,updated_at)
    VALUES (${o[0]},${o[1]},${o[2]},${o[3]},${o[4]},${o[5]},${o[6]},${o[7]},FALSE,${t},${t}) ON CONFLICT (id) DO NOTHING`;
  const plans = [
    ["plan_namaa","org_namaa",["مهارات بناء الشخصية","التواصل التربوي","إدارة المبادرات"],["رحلة تعليمية ميدانية"],["تصميم البرامج التربوية","قياس الأثر"],true,"submitted",t],
    ["plan_roaa","org_roaa",["التخطيط الشخصي","مهارات الإرشاد"],["زيارة معرفية"],["مهارات الحوار","إدارة فرق الشباب"],true,"submitted",t],
    ["plan_athar","org_athar",["مهارات المربي"],[],["التعامل مع التحديات",""],null,"draft",null],
    ["plan_binaa","org_binaa",["غرس القيم",""],["رحلة تطوعية"],["التعلم بالممارسة",""],true,"draft",null],
    ["plan_manar","org_manar",[],[],[],null,"not_started",null]
  ] as const;
  for (const p of plans) await sql`INSERT INTO annual_plans (id,organization_id,year,development_meetings,trips,workshops,evaluation_followup,status,submitted_at,updated_at)
    VALUES (${p[0]},${p[1]},2026,${JSON.stringify(p[2])}::jsonb,${JSON.stringify(p[3])}::jsonb,${JSON.stringify(p[4])}::jsonb,${p[5]},${p[6]},${p[7]},${t}) ON CONFLICT (organization_id,year) DO NOTHING`;
  const attendanceRows = [["org_namaa",1,22],["org_namaa",2,21],["org_roaa",1,15],["org_roaa",2,16],["org_athar",1,20],["org_athar",2,0],["org_binaa",1,12],["org_binaa",2,11],["org_manar",1,0],["org_manar",2,0]] as const;
  for (let i=0;i<attendanceRows.length;i++) { const a=attendanceRows[i]; await sql`INSERT INTO attendance (id,organization_id,meeting_number,attendees,updated_at) VALUES (${`att_${i}`},${a[0]},${a[1]},${a[2]},${t}) ON CONFLICT (organization_id,meeting_number) DO NOTHING`; }
}

async function readAll(token?: string | null) {
  await ensureSchema(); await seedDemoData(); const sql=getSql();
  const settingsRows=await sql`SELECT id,project_name AS "projectName",year,educator_meetings AS "educatorMeetings",min_development_meetings AS "minDevelopmentMeetings",min_trips AS "minTrips",min_workshops AS "minWorkshops",updated_at AS "updatedAt" FROM project_settings WHERE id=1`;
  const settings=settingsRows[0] as any;
  const organizations = token
    ? await sql`SELECT o.id,o.access_token AS "accessToken",o.name,o.contact_name AS "contactName",o.phone,o.email,o.participants,o.notes,o.updated_at AS "updatedAt",COALESCE(p.development_meetings,'[]'::jsonb)::text AS "developmentMeetings",COALESCE(p.trips,'[]'::jsonb)::text AS trips,COALESCE(p.workshops,'[]'::jsonb)::text AS workshops,CASE WHEN p.evaluation_followup IS NULL THEN NULL WHEN p.evaluation_followup THEN 1 ELSE 0 END AS "evaluationFollowup",COALESCE(p.status,'not_started') AS "planStatus",p.submitted_at AS "submittedAt",p.updated_at AS "planUpdatedAt" FROM organizations o LEFT JOIN annual_plans p ON p.organization_id=o.id AND p.year=${settings.year} WHERE o.access_token=${token} AND o.archived=FALSE ORDER BY o.created_at DESC`
    : await sql`SELECT o.id,o.access_token AS "accessToken",o.name,o.contact_name AS "contactName",o.phone,o.email,o.participants,o.notes,o.updated_at AS "updatedAt",COALESCE(p.development_meetings,'[]'::jsonb)::text AS "developmentMeetings",COALESCE(p.trips,'[]'::jsonb)::text AS trips,COALESCE(p.workshops,'[]'::jsonb)::text AS workshops,CASE WHEN p.evaluation_followup IS NULL THEN NULL WHEN p.evaluation_followup THEN 1 ELSE 0 END AS "evaluationFollowup",COALESCE(p.status,'not_started') AS "planStatus",p.submitted_at AS "submittedAt",p.updated_at AS "planUpdatedAt" FROM organizations o LEFT JOIN annual_plans p ON p.organization_id=o.id AND p.year=${settings.year} WHERE o.archived=FALSE ORDER BY o.created_at DESC`;
  const attendanceRows = token ? [] : await sql`SELECT organization_id AS "organizationId",meeting_number AS "meetingNumber",attendees,updated_at AS "updatedAt" FROM attendance`;
  return {settings,organizations,attendance:attendanceRows};
}

export async function GET(request:Request){try{return Response.json(await readAll(new URL(request.url).searchParams.get("token")))}catch(e){console.error(e);return Response.json({error:e instanceof Error&&e.message.includes("DATABASE_URL")?"قاعدة البيانات غير مرتبطة بالمشروع بعد":"تعذر تحميل البيانات حاليًا"},{status:500})}}

export async function POST(request:Request){
  try{
    await ensureSchema(); const sql=getSql(); const b=await request.json() as any; const t=now();
    if(b.action==="createOrg"){
      const id=uid("org"),token=`${b.name?.replace(/[^\u0600-\u06FFa-z0-9]/gi,"").slice(0,8)||"org"}-${crypto.randomUUID().slice(0,8)}`;
      const s=await sql`SELECT year FROM project_settings WHERE id=1`; const year=Number(s[0]?.year||new Date().getFullYear());
      await sql`INSERT INTO organizations (id,access_token,name,contact_name,phone,email,participants,notes,archived,created_at,updated_at) VALUES (${id},${token},${b.name},${b.contactName||""},${b.phone||""},${b.email||""},${Number(b.participants)||0},${b.notes||""},FALSE,${t},${t})`;
      await sql`INSERT INTO annual_plans (id,organization_id,year,development_meetings,trips,workshops,status,updated_at) VALUES (${uid("plan")},${id},${year},'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'not_started',${t})`;
      return Response.json({ok:true,id,token});
    }
    if(b.action==="updateOrg") await sql`UPDATE organizations SET name=${b.name},contact_name=${b.contactName||""},phone=${b.phone||""},email=${b.email||""},participants=${Number(b.participants)||0},notes=${b.notes||""},updated_at=${t} WHERE id=${b.id}`;
    if(b.action==="archiveOrg") await sql`UPDATE organizations SET archived=TRUE,updated_at=${t} WHERE id=${b.id}`;
    if(b.action==="savePlan"){
      const org=await sql`SELECT id FROM organizations WHERE access_token=${b.token} AND archived=FALSE`; if(!org[0])return Response.json({error:"الرابط غير صالح"},{status:404});
      await sql`UPDATE annual_plans SET development_meetings=${JSON.stringify(b.developmentMeetings||[])}::jsonb,trips=${JSON.stringify(b.trips||[])}::jsonb,workshops=${JSON.stringify(b.workshops||[])}::jsonb,evaluation_followup=${b.evaluationFollowup===null?null:!!b.evaluationFollowup},status=${b.submit?"submitted":"draft"},submitted_at=${b.submit?t:null},updated_at=${t} WHERE organization_id=${org[0].id as string} AND year=(SELECT year FROM project_settings WHERE id=1)`;
    }
    if(b.action==="saveAttendance"){
      const org=await sql`SELECT participants FROM organizations WHERE id=${b.organizationId}`; const n=Number(b.attendees)||0;if(!org[0]||n<0||n>Number(org[0].participants))return Response.json({error:"عدد الحضور يجب ألا يتجاوز عدد المشاركين"},{status:400});
      await sql`INSERT INTO attendance (id,organization_id,meeting_number,attendees,updated_at) VALUES (${uid("att")},${b.organizationId},${Number(b.meetingNumber)},${n},${t}) ON CONFLICT (organization_id,meeting_number) DO UPDATE SET attendees=EXCLUDED.attendees,updated_at=EXCLUDED.updated_at`;
    }
    if(b.action==="saveSettings") await sql`UPDATE project_settings SET project_name=${b.projectName},year=${Number(b.year)},educator_meetings=${Number(b.educatorMeetings)},min_development_meetings=${Number(b.minDevelopmentMeetings)},min_trips=${Number(b.minTrips)},min_workshops=${Number(b.minWorkshops)},updated_at=${t} WHERE id=1`;
    return Response.json({ok:true});
  }catch(e){console.error(e);return Response.json({error:"لم يتم حفظ البيانات. حاول مرة أخرى"},{status:500})}
}
