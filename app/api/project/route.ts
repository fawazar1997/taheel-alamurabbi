import { env } from "cloudflare:workers";

const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

async function seedIfEmpty() {
  // Idempotent demo seeding also repairs a partially interrupted first load.
  const t = now();
  const orgs = [
    ["org_namaa","namaa-7f2k","جمعية نماء التربوية","أحمد القحطاني","0501234567","ahmad@namaa.org",24,"جهة نشطة ومبادرة"],
    ["org_roaa","roaa-9m4p","مؤسسة رؤى الشباب","سارة الشهري","0552345678","sara@roaa.org",18,""],
    ["org_athar","athar-3x8d","مركز أثر للتنمية","محمد عسيري","0533456789","m.aseeri@athar.org",30,"تحتاج متابعة الخطة"],
    ["org_binaa","binaa-6q1w","جمعية بناء القيم","نورة الأحمري","0564567890","noura@binaa.org",15,""],
    ["org_manar","manar-2h5n","مركز منار التربوي","خالد الشهراني","0545678901","khaled@manar.org",22,""],
  ];
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO project_settings (id,project_name,year,educator_meetings,min_development_meetings,min_trips,min_workshops,updated_at) VALUES (1,?,?,?,?,?,?,?)").bind("تأهيل المربي",2026,2,2,1,2,t),
    ...orgs.map(o => env.DB.prepare("INSERT OR IGNORE INTO organizations (id,access_token,name,contact_name,phone,email,participants,notes,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,0,?,?)").bind(...o,t,t)),
  ]);
  const plans = [
    ["plan_namaa","org_namaa",'["مهارات بناء الشخصية","التواصل التربوي","إدارة المبادرات"]','["رحلة تعليمية ميدانية"]','["تصميم البرامج التربوية","قياس الأثر"]',1,"submitted",t,t],
    ["plan_roaa","org_roaa",'["التخطيط الشخصي","مهارات الإرشاد"]','["زيارة معرفية"]','["مهارات الحوار","إدارة فرق الشباب"]',1,"submitted",t,t],
    ["plan_athar","org_athar",'["مهارات المربي"]','[]','["التعامل مع التحديات",""]',null,"draft",null,t],
    ["plan_binaa","org_binaa",'["غرس القيم",""]','["رحلة تطوعية"]','["التعلم بالممارسة",""]',1,"draft",null,t],
    ["plan_manar","org_manar",'[]','[]','[]',null,"not_started",null,t],
  ];
  await env.DB.batch(plans.map(p => env.DB.prepare("INSERT OR IGNORE INTO annual_plans (id,organization_id,year,development_meetings,trips,workshops,evaluation_followup,status,submitted_at,updated_at) VALUES (?,?,2026,?,?,?,?,?,?,?)").bind(...p)));
  const attendance = [["org_namaa",1,22],["org_namaa",2,21],["org_roaa",1,15],["org_roaa",2,16],["org_athar",1,20],["org_athar",2,0],["org_binaa",1,12],["org_binaa",2,11],["org_manar",1,0],["org_manar",2,0]];
  await env.DB.batch(attendance.map((a,i)=>env.DB.prepare("INSERT OR IGNORE INTO attendance (id,organization_id,meeting_number,attendees,updated_at) VALUES (?,?,?,?,?)").bind(`att_${i}`,...a,t)));
}

async function readAll(token?: string | null) {
  await seedIfEmpty();
  const settings = await env.DB.prepare("SELECT id, project_name projectName, year, educator_meetings educatorMeetings, min_development_meetings minDevelopmentMeetings, min_trips minTrips, min_workshops minWorkshops, updated_at updatedAt FROM project_settings WHERE id=1").first();
  const where = token ? "WHERE o.access_token = ? AND o.archived=0" : "WHERE o.archived=0";
  const query = `SELECT o.id,o.access_token accessToken,o.name,o.contact_name contactName,o.phone,o.email,o.participants,o.notes,o.updated_at updatedAt,p.development_meetings developmentMeetings,p.trips,p.workshops,p.evaluation_followup evaluationFollowup,p.status planStatus,p.submitted_at submittedAt,p.updated_at planUpdatedAt FROM organizations o LEFT JOIN annual_plans p ON p.organization_id=o.id AND p.year=? ${where} ORDER BY o.created_at DESC`;
  const stmt = env.DB.prepare(query).bind((settings as any).year, ...(token ? [token] : []));
  const organizations = (await stmt.all()).results;
  const attendance = token ? [] : (await env.DB.prepare("SELECT organization_id organizationId, meeting_number meetingNumber, attendees, updated_at updatedAt FROM attendance").all()).results;
  return { settings, organizations, attendance };
}

export async function GET(request: Request) {
  try { return Response.json(await readAll(new URL(request.url).searchParams.get("token"))); }
  catch (e) { console.error(e); return Response.json({error:"تعذر تحميل البيانات حاليًا"},{status:500}); }
}

export async function POST(request: Request) {
  try {
    const b = await request.json() as any; const t=now();
    if (b.action === "createOrg") {
      const id=uid("org"), token=`${b.name?.replace(/[^\u0600-\u06FFa-z0-9]/gi,"").slice(0,8)||"org"}-${crypto.randomUUID().slice(0,8)}`;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO organizations (id,access_token,name,contact_name,phone,email,participants,notes,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,0,?,?)").bind(id,token,b.name,b.contactName||"",b.phone||"",b.email||"",Number(b.participants)||0,b.notes||"",t,t),
        env.DB.prepare("INSERT INTO annual_plans (id,organization_id,year,development_meetings,trips,workshops,status,updated_at) SELECT ?,?,year,'[]','[]','[]','not_started',? FROM project_settings WHERE id=1").bind(uid("plan"),id,t)
      ]); return Response.json({ok:true,id,token});
    }
    if (b.action === "updateOrg") { await env.DB.prepare("UPDATE organizations SET name=?,contact_name=?,phone=?,email=?,participants=?,notes=?,updated_at=? WHERE id=?").bind(b.name,b.contactName||"",b.phone||"",b.email||"",Number(b.participants)||0,b.notes||"",t,b.id).run(); }
    if (b.action === "archiveOrg") { await env.DB.prepare("UPDATE organizations SET archived=1,updated_at=? WHERE id=?").bind(t,b.id).run(); }
    if (b.action === "savePlan") {
      const org=await env.DB.prepare("SELECT id FROM organizations WHERE access_token=? AND archived=0").bind(b.token).first<any>(); if(!org) return Response.json({error:"الرابط غير صالح"},{status:404});
      await env.DB.prepare("UPDATE annual_plans SET development_meetings=?,trips=?,workshops=?,evaluation_followup=?,status=?,submitted_at=?,updated_at=? WHERE organization_id=? AND year=(SELECT year FROM project_settings WHERE id=1)").bind(JSON.stringify(b.developmentMeetings||[]),JSON.stringify(b.trips||[]),JSON.stringify(b.workshops||[]),b.evaluationFollowup===null?null:(b.evaluationFollowup?1:0),b.submit?"submitted":"draft",b.submit?t:null,t,org.id).run();
    }
    if (b.action === "saveAttendance") {
      const org=await env.DB.prepare("SELECT participants FROM organizations WHERE id=?").bind(b.organizationId).first<any>(); const n=Number(b.attendees)||0;
      if(!org || n<0 || n>org.participants) return Response.json({error:"عدد الحضور يجب ألا يتجاوز عدد المشاركين"},{status:400});
      await env.DB.prepare("INSERT INTO attendance (id,organization_id,meeting_number,attendees,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(organization_id,meeting_number) DO UPDATE SET attendees=excluded.attendees,updated_at=excluded.updated_at").bind(uid("att"),b.organizationId,Number(b.meetingNumber),n,t).run();
    }
    if (b.action === "saveSettings") { await env.DB.prepare("UPDATE project_settings SET project_name=?,year=?,educator_meetings=?,min_development_meetings=?,min_trips=?,min_workshops=?,updated_at=? WHERE id=1").bind(b.projectName,Number(b.year),Number(b.educatorMeetings),Number(b.minDevelopmentMeetings),Number(b.minTrips),Number(b.minWorkshops),t).run(); }
    return Response.json({ok:true});
  } catch(e) { console.error(e); return Response.json({error:"لم يتم حفظ البيانات. حاول مرة أخرى"},{status:500}); }
}
