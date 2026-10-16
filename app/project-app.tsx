"use client";
import { SiteLogo } from "@/components/site-logo";
import {
  ASSESSMENT_AXES,
  COMMUNITY_AXES,
  type PhaseStats,
  type ImprovementPlan,
  type Audience,
  type EvaluatorRoleCounts,
} from "@/lib/environment-assessment";
import { useEffect, useState } from "react";
import {
  PLAN_DOCUMENT_CHUNK_BYTES,
  validPlanDocumentSize,
  type PlanDocument,
} from "@/lib/plan-document";
import {
  Building2,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  Copy,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  UserRoundCheck,
  X,
  ChevronLeft,
  Save,
  Send,
  CalendarDays,
  MapPinned,
  Presentation,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";
type SettingsT = {
  projectName: string;
  year: number;
  educatorMeetings: number;
  minDevelopmentMeetings: number;
  minTrips: number;
  minWorkshops: number;
  workshopAxes: string[];
};
type AchievementItem = {
  key: string;
  type: string;
  label: string;
  status: string;
  notes: string;
  evidenceUrl: string;
};
type Org = {
  id: string;
  accessToken: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  participants: number;
  notes: string;
  updatedAt: string;
  developmentMeetings: string;
  trips: string;
  workshops: string;
  evaluationFollowup: number | null;
  planStatus: string;
  planDocument: PlanDocument | null;
  submittedAt: string | null;
  planUpdatedAt: string;
  achievementData: string;
  achievementStatus: string;
  achievementSubmittedAt: string | null;
};
type Attend = {
  organizationId: string;
  meetingNumber: number;
  attendees: number;
};
type Environment = {
  id: string;
  organizationId: string;
  name: string;
  preScore: number | null;
  postScore: number | null;
  approvalStatus: "pending" | "approved";
  preCompletedAt: string | null;
  improvementPlan: ImprovementPlan | null;
  phaseStats: { pre: PhaseStats; post: PhaseStats };
  evaluatorCounts: { pre: EvaluatorRoleCounts; post: EvaluatorRoleCounts };
  updatedAt: string;
};
type AssessmentResponse = {
  id: string;
  environmentId: string;
  phase: "pre" | "post";
  evaluatorName: string;
  evaluatorRole: string;
  audience: Audience;
  answers: string;
  strengths: string;
  improvementArea: string;
  submittedAt: string;
};
type Data = {
  settings: SettingsT;
  organizations: Org[];
  attendance: Attend[];
  environments: Environment[];
  assessmentResponses: AssessmentResponse[];
};
const parse = (v: string) => {
  try {
    const value = JSON.parse(v || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
const workshopSelections = (v: string) =>
  parse(v).map((x) =>
    Array.isArray(x)
      ? x.filter((a) => typeof a === "string" && a.trim())
      : typeof x === "string" && x.trim()
        ? [x]
        : [],
  );
const date = (v?: string | null) =>
  v
    ? new Intl.DateTimeFormat("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
function calc(o: Org, s: SettingsT) {
  const d = parse(o.developmentMeetings) as string[],
    t = parse(o.trips) as string[],
    w = workshopSelections(o.workshops);
  let checks = [
    d.length >= s.minDevelopmentMeetings,
    t.length >= s.minTrips,
    w.length >= s.minWorkshops,
    o.evaluationFollowup !== null,
    ...t.map(Boolean),
    ...w.map((x) => x.length > 0),
  ];
  const progress = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
  const missing: string[] = [];
  if (d.length < s.minDevelopmentMeetings)
    missing.push(
      `إضافة ${s.minDevelopmentMeetings} من اللقاءات التطويرية على الأقل`,
    );
  if (t.length < s.minTrips)
    missing.push(`إضافة ${s.minTrips} من الرحلات على الأقل`);
  t.forEach((x, i) => !x && missing.push(`إضافة وصف الرحلة ${i + 1}`));
  if (w.length < s.minWorkshops)
    missing.push(`إضافة ${s.minWorkshops} من ورش العمل على الأقل`);
  w.forEach(
    (x, i) =>
      !x.length &&
      missing.push(`اختيار محور واحد على الأقل لورشة العمل ${i + 1}`),
  );
  if (o.evaluationFollowup === null)
    missing.push("تحديد التقييم والمتابعة للمشاركين");
  return {
    d,
    t,
    w,
    progress,
    missing,
    valid: missing.length === 0,
    total: d.length + t.length + w.length,
  };
}
function achievementItems(o: Org) {
  const d = parse(o.developmentMeetings),
    t = parse(o.trips) as string[],
    w = workshopSelections(o.workshops);
  const planned: { key: string; type: string; label: string }[] = [
    ...d.map((_, i) => ({
      key: `development-${i}`,
      type: "لقاء تطويري",
      label: `اللقاء التطويري ${i + 1}`,
    })),
    ...t.map((x, i) => ({
      key: `trip-${i}`,
      type: "رحلة",
      label: `الرحلة ${i + 1}${x ? ` – ${x}` : ""}`,
    })),
    ...w.map((axes, i) => ({
      key: `workshop-${i}`,
      type: "ورشة تدريبية",
      label: `ورشة العمل ${i + 1}${axes.length ? ` – ${axes.join("، ")}` : ""}`,
    })),
    ...(o.evaluationFollowup === 1
      ? [
          {
            key: "evaluation",
            type: "تقييم ومتابعة",
            label: "التقييم والمتابعة للمشاركين",
          },
        ]
      : []),
  ];
  const saved = new Map(
    (parse(o.achievementData) as AchievementItem[])
      .filter((x) => x && typeof x === "object")
      .map((x) => [x.key, x]),
  );
  return planned.map((x) => ({
    ...x,
    status: "",
    notes: "",
    evidenceUrl: "",
    ...(saved.get(x.key) || {}),
    key: x.key,
    type: x.type,
    label: x.label,
  }));
}
function achievementRate(o: Org) {
  const items = achievementItems(o);
  if (!items.length) return 0;
  const points = items.reduce(
    (sum, item) =>
      sum +
      (item.status === "completed" ? 100 : item.status === "partial" ? 50 : 0),
    0,
  );
  return Math.round(points / items.length);
}
const planLabel = (o: Org, p: number) =>
  o.planStatus === "submitted"
    ? "مكتمل"
    : o.planStatus === "not_started"
      ? "لم يبدأ"
      : p < 45
        ? "يحتاج متابعة"
        : "قيد الاستكمال";
function Status({ label }: { label: string }) {
  const c =
    label === "مكتمل"
      ? "bg-brand-soft text-primary border-brand-stroke"
      : label === "قيد الاستكمال"
        ? "bg-brand-soft text-primary border-brand-stroke"
        : label === "يحتاج متابعة"
          ? "bg-brand-soft text-primary border-brand-stroke"
          : "bg-brand-surface text-brand-muted border-brand-stroke";
  return (
    <Badge variant="outline" className={c}>
      {label}
    </Badge>
  );
}
async function post(body: any) {
  const r = await fetch("/api/project", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j;
}
export default function ProjectApp() {
  const [data, setData] = useState<Data | null>(null),
    [view, setView] = useState("dashboard"),
    [selected, setSelected] = useState<string | null>(null),
    [mobile, setMobile] = useState(false);
  const orgToken =
    typeof window !== "undefined"
      ? new URLSearchParams(location.search).get("org")
      : null;
  const assessmentToken =
    typeof window !== "undefined"
      ? new URLSearchParams(location.search).get("assessment")
      : null;
  const token = orgToken || assessmentToken;
  const load = async () => {
    try {
      const r = await fetch(
        `/api/project${token ? `?token=${encodeURIComponent(token)}` : ""}`,
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  if (!data)
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)]">
        <div className="text-center">
          <RotateCcw className="mx-auto mb-3 size-7 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-brand-muted">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  if (assessmentToken)
    return (
      <AssessmentPortal data={data} token={assessmentToken} reload={load} />
    );
  if (orgToken) return <Portal data={data} token={orgToken} reload={load} />;
  const org = data.organizations.find((x) => x.id === selected);
  if (org)
    return (
      <OrgFile
        org={org}
        data={data}
        back={() => setSelected(null)}
        reload={load}
      />
    );
  const titles: any = {
    dashboard: "لوحة المتابعة",
    organizations: "الجهات المشاركة",
    assessment: "قياس المنظمات 360°",
    attendance: "حضور لقاءات المربي",
    reports: "التقارير والتحليلات",
    settings: "إعدادات المشروع",
  };
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Toaster position="top-center" dir="rtl" />
      <aside
        className={`fixed inset-y-0 start-0 z-40 w-64 border-e border-[var(--border)] bg-[var(--brand-ink)] p-5 text-white transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-9 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="rounded-xl bg-white p-3">
                <SiteLogo className="w-36" />
              </div>
              <p className="mt-2 text-sm text-white/90">
                إدارة المشروع · {data.settings.year}
              </p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <nav className="space-y-1">
          {[
            ["dashboard", "لوحة المتابعة", LayoutDashboard],
            ["organizations", "الجهات المشاركة", Building2],
            ["assessment", "قياس المنظمات 360°", ChartNoAxesColumnIncreasing],
            ["attendance", "حضور لقاءات المربي", UserRoundCheck],
            ["reports", "التقارير والتحليلات", ChartNoAxesColumnIncreasing],
            ["settings", "إعدادات المشروع", Settings],
          ].map(([id, l, I]: any) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
                setMobile(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start text-sm transition ${view === id ? "bg-white text-[var(--brand-ink)] shadow" : "text-white/90 hover:bg-white/10 hover:text-white"}`}
            >
              <I className="size-5" />
              {l}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-6 inset-x-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/85">السنة الحالية</p>
          <p className="mt-1 font-bold">{data.settings.year}</p>
          <p className="mt-2 text-xs text-white/85">آخر مزامنة: الآن</p>
        </div>
      </aside>
      <main className="lg:ps-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobile(true)}>
              <Menu />
            </button>
            <div>
              <h1 className="font-bold">{titles[view]}</h1>
              <p className="text-xs text-brand-muted">
                مشروع {data.settings.projectName}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs text-[var(--primary)]">
              نسخة تشغيلية
            </span>
            <div className="grid size-9 place-items-center rounded-full bg-[var(--brand-light)] font-bold text-white">
              م
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8">
          {view === "dashboard" && (
            <Dashboard data={data} open={setSelected} go={setView} />
          )}{" "}
          {view === "organizations" && (
            <Organizations data={data} open={setSelected} reload={load} />
          )}{" "}
          {view === "assessment" && (
            <AssessmentAdmin data={data} reload={load} />
          )}{" "}
          {view === "attendance" && <Attendance data={data} reload={load} />}{" "}
          {view === "reports" && <Reports data={data} />}{" "}
          {view === "settings" && <ProjectSettings data={data} reload={load} />}
        </div>
      </main>
    </div>
  );
}
function Dashboard({
  data,
  open,
  go,
}: {
  data: Data;
  open: (s: string) => void;
  go: (s: string) => void;
}) {
  const s = data.settings,
    orgs = data.organizations;
  const completed = orgs.filter((o) => o.planStatus === "submitted").length,
    totalP = orgs.reduce((a, o) => a + o.participants, 0),
    progress = orgs.length
      ? Math.round(
          orgs.reduce((a, o) => a + calc(o, s).progress, 0) / orgs.length,
        )
      : 0,
    avgAchievement = orgs.length
      ? Math.round(
          orgs.reduce((a, o) => a + achievementRate(o), 0) / orgs.length,
        )
      : 0,
    att = data.attendance.reduce((a, x) => a + x.attendees, 0),
    possible = orgs.reduce(
      (a, o) => a + o.participants * s.educatorMeetings,
      0,
    ),
    avgAtt = possible ? Math.round((att / possible) * 100) : 0,
    missing = orgs.filter((o) => calc(o, s).missing.length).length;
  const kpis = [
    ["إجمالي الجهات", orgs.length, "جهة", Building2, () => go("organizations")],
    ["إجمالي المشاركين", totalP, "مشارك", Users, () => go("organizations")],
    [
      "الخطط المكتملة",
      completed,
      `من ${orgs.length}`,
      ClipboardCheck,
      () => go("organizations"),
    ],
    [
      "اكتمال الخطط",
      `${progress}%`,
      "متوسط المشروع",
      ChartNoAxesColumnIncreasing,
      () => go("reports"),
    ],
    ["إجمالي الحضور", att, "حالة حضور", UserRoundCheck, () => go("attendance")],
    [
      "متوسط الحضور",
      `${avgAtt}%`,
      "كل اللقاءات",
      UserRoundCheck,
      () => go("attendance"),
    ],
    ["تحتاج متابعة", missing, "جهة", Search, () => go("organizations")],
    [
      "متوسط الإنجاز",
      `${avgAchievement}%`,
      "كل الجهات",
      ClipboardCheck,
      () => go("organizations"),
    ],
  ];
  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">نظرة عامة</h2>
          <p className="mt-1 text-sm text-brand-muted">
            حالة تنفيذ المشروع لدى الجهات المشاركة
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([l, v, x, I, click]: any) => (
          <button
            key={l}
            onClick={click}
            className="rounded-2xl border bg-white p-5 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand-light)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm text-brand-muted">{l}</span>
              <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--primary)]">
                <I className="size-5" />
              </span>
            </div>
            <b className="text-3xl">{v}</b>
            <span className="ms-2 text-xs text-brand-muted">{x}</span>
          </button>
        ))}
      </div>
      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>حالة الجهات</CardTitle>
            <p className="mt-1 text-sm text-brand-muted">
              آخر حالة مسجلة لكل جهة
            </p>
          </div>
          <Button variant="outline" onClick={() => go("organizations")}>
            عرض الكل
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <OrgTable data={data} open={open} />
        </CardContent>
      </Card>
    </>
  );
}
function OrgTable({ data, open }: { data: Data; open: (s: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>اسم الجهة</TableHead>
          <TableHead>حالة الخطة</TableHead>
          <TableHead>الاكتمال</TableHead>
          <TableHead>المشاركون</TableHead>
          {Array.from({ length: data.settings.educatorMeetings }, (_, i) => (
            <TableHead key={i}>حضور لقاء تأهيل المربي {i + 1}</TableHead>
          ))}
          <TableHead>نسبة الحضور</TableHead>
          <TableHead>معدل الإنجاز</TableHead>
          <TableHead>آخر تحديث</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.organizations.map((o) => {
          const c = calc(o, data.settings),
            ats = data.attendance.filter((a) => a.organizationId === o.id),
            rate = o.participants
              ? Math.round(
                  (ats.reduce((x, a) => x + a.attendees, 0) /
                    (o.participants * data.settings.educatorMeetings)) *
                    100,
                )
              : 0;
          return (
            <TableRow
              key={o.id}
              className="cursor-pointer"
              onClick={() => open(o.id)}
            >
              <TableCell className="min-w-44 font-semibold">{o.name}</TableCell>
              <TableCell>
                <Status label={planLabel(o, c.progress)} />
              </TableCell>
              <TableCell>
                <div className="flex min-w-28 items-center gap-2">
                  <Progress value={c.progress} className="h-2" />
                  <span className="text-xs">{c.progress}%</span>
                </div>
              </TableCell>
              <TableCell>{o.participants}</TableCell>
              {Array.from(
                { length: data.settings.educatorMeetings },
                (_, i) => (
                  <TableCell key={i}>
                    {ats.find((a) => a.meetingNumber === i + 1)?.attendees ?? 0}
                  </TableCell>
                ),
              )}
              <TableCell>{rate}%</TableCell>
              <TableCell>
                <div className="flex min-w-24 items-center gap-2">
                  <Progress value={achievementRate(o)} className="h-2" />
                  <span className="text-xs">{achievementRate(o)}%</span>
                </div>
              </TableCell>
              <TableCell className="min-w-36 text-xs text-brand-muted">
                {date(o.planUpdatedAt || o.updatedAt)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
function Organizations({
  data,
  open,
  reload,
}: {
  data: Data;
  open: (s: string) => void;
  reload: () => void;
}) {
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [add, setAdd] = useState(false);
  const list = data.organizations.filter(
    (o) =>
      o.name.includes(q) &&
      (filter === "all" ||
        planLabel(o, calc(o, data.settings).progress) === filter),
  );
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 gap-3">
          <div className="relative min-w-56 max-w-sm flex-1">
            <Search className="absolute start-3 top-3 size-4 text-brand-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث باسم الجهة"
              className="bg-white ps-9"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border bg-white px-3 text-sm"
          >
            <option value="all">كل الحالات</option>
            <option>مكتمل</option>
            <option>قيد الاستكمال</option>
            <option>لم يبدأ</option>
            <option>يحتاج متابعة</option>
          </select>
        </div>
        <Dialog open={add} onOpenChange={setAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus /> إضافة جهة
            </Button>
          </DialogTrigger>
          <OrgDialog close={() => setAdd(false)} reload={reload} />
        </Dialog>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => {
          const c = calc(o, data.settings);
          return (
            <Card key={o.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="mb-5 flex items-start justify-between">
                  <div className="grid size-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--primary)]">
                    <Building2 />
                  </div>
                  <Status label={planLabel(o, c.progress)} />
                </div>
                <h3 className="font-bold">{o.name}</h3>
                <p className="mt-1 text-sm text-brand-muted">
                  {o.contactName || "لم يحدد مسؤول التواصل"}
                </p>
                <div className="my-5">
                  <div className="mb-2 flex justify-between text-xs">
                    <span>اكتمال الخطة</span>
                    <b>{c.progress}%</b>
                  </div>
                  <Progress value={c.progress} />
                  <div className="mb-2 mt-4 flex justify-between text-xs">
                    <span>معدل الإنجاز</span>
                    <b>{achievementRate(o)}%</b>
                  </div>
                  <Progress value={achievementRate(o)} />
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-brand-muted">
                    {o.participants} مشاركًا
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:bg-brand-soft hover:text-primary"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `حذف جهة «${o.name}» نهائيًا مع خطتها وحضورها وإنجازها؟`,
                          )
                        )
                          return;
                        try {
                          await post({ action: "deleteOrg", id: o.id });
                          toast.success("تم حذف الجهة");
                          reload();
                        } catch (e: any) {
                          toast.error(e.message);
                        }
                      }}
                      title="حذف الجهة"
                    >
                      <Trash2 />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${location.origin}/?org=${o.accessToken}`,
                        );
                        toast.success("تم نسخ رابط الجهة");
                      }}
                      title="نسخ الرابط"
                    >
                      <Copy />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => open(o.id)}
                    >
                      فتح الملف <ChevronLeft />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
function OrgDialog({
  close,
  reload,
  org,
}: {
  close: () => void;
  reload: () => void;
  org?: Org;
}) {
  const [f, setF] = useState<any>(
      org || {
        name: "",
        contactName: "",
        phone: "",
        email: "",
        participants: 0,
        notes: "",
      },
    ),
    [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.name.trim()) return toast.error("أدخل اسم الجهة");
    setBusy(true);
    try {
      await post({
        action: org ? "updateOrg" : "createOrg",
        ...f,
        id: org?.id,
      });
      toast.success(
        org ? "تم تحديث بيانات الجهة" : "تم إنشاء الجهة والرابط الخاص بها",
      );
      close();
      reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <DialogContent dir="rtl" className="sm:max-w-xl">
      <DialogHeader className="text-start">
        <DialogTitle>
          {org ? "تعديل بيانات الجهة" : "إضافة جهة جديدة"}
        </DialogTitle>
        <DialogDescription>
          أدخل البيانات الأساسية، ويمكن تعديلها لاحقًا.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["name", "اسم الجهة *"],
          ["contactName", "مسؤول التواصل"],
          ["phone", "رقم الجوال"],
          ["email", "البريد الإلكتروني"],
        ].map(([k, l]) => (
          <div key={k}>
            <Label>{l}</Label>
            <Input
              className="mt-2"
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </div>
        ))}
        <div>
          <Label>عدد المشاركين</Label>
          <Input
            className="mt-2"
            type="number"
            min={0}
            value={f.participants}
            onChange={(e) => setF({ ...f, participants: +e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>ملاحظات</Label>
          <Textarea
            className="mt-2"
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={busy}>
          {busy ? "جاري الحفظ..." : "حفظ الجهة"}
        </Button>
        <Button variant="outline" onClick={close}>
          إلغاء
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
function Attendance({ data, reload }: { data: Data; reload: () => void }) {
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      data.attendance.map((a) => [
        `${a.organizationId}-${a.meetingNumber}`,
        a.attendees,
      ]),
    ),
  );
  const save = async (id: string, m: number, max: number) => {
    const v = vals[`${id}-${m}`] ?? 0;
    if (v > max)
      return toast.error("عدد الحضور لا يمكن أن يتجاوز عدد المشاركين");
    try {
      await post({
        action: "saveAttendance",
        organizationId: id,
        meetingNumber: m,
        attendees: v,
      });
      toast.success("تم حفظ الحضور");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>سجل حضور الجهات</CardTitle>
        <p className="text-sm text-brand-muted">
          أدخل عدد الحاضرين، وستحسب النسبة تلقائيًا.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الجهة</TableHead>
              <TableHead>المشاركون</TableHead>
              {Array.from(
                { length: data.settings.educatorMeetings },
                (_, i) => (
                  <TableHead key={i}>لقاء تأهيل المربي {i + 1}</TableHead>
                ),
              )}
              <TableHead>المتوسط</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.organizations.map((o) => {
              let sum = 0;
              return (
                <TableRow key={o.id}>
                  <TableCell className="min-w-48 font-semibold">
                    {o.name}
                  </TableCell>
                  <TableCell>{o.participants}</TableCell>
                  {Array.from(
                    { length: data.settings.educatorMeetings },
                    (_, i) => {
                      const k = `${o.id}-${i + 1}`,
                        v = vals[k] ?? 0;
                      sum += v;
                      return (
                        <TableCell key={i}>
                          <div className="flex min-w-44 items-center gap-2">
                            <Input
                              className="w-20"
                              type="number"
                              min={0}
                              max={o.participants}
                              value={v}
                              onChange={(e) =>
                                setVals({ ...vals, [k]: +e.target.value })
                              }
                            />
                            <span className="w-10 text-xs text-brand-muted">
                              {o.participants
                                ? Math.round((v / o.participants) * 100)
                                : 0}
                              %
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => save(o.id, i + 1, o.participants)}
                            >
                              حفظ
                            </Button>
                          </div>
                        </TableCell>
                      );
                    },
                  )}
                  <TableCell>
                    <b>
                      {o.participants
                        ? Math.round(
                            (sum /
                              (o.participants *
                                data.settings.educatorMeetings)) *
                              100,
                          )
                        : 0}
                      %
                    </b>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
function OrgFile({
  org,
  data,
  back,
  reload,
}: {
  org: Org;
  data: Data;
  back: () => void;
  reload: () => void;
}) {
  const c = calc(org, data.settings),
    ats = data.attendance.filter((a) => a.organizationId === org.id),
    avg = org.participants
      ? Math.round(
          (ats.reduce((x, a) => x + a.attendees, 0) /
            (org.participants * data.settings.educatorMeetings)) *
            100,
        )
      : 0;
  const [edit, setEdit] = useState(false);
  const achievementLabel =
    org.achievementStatus === "submitted"
      ? "تم الإرسال"
      : org.achievementStatus === "draft"
        ? "مسودة"
        : "لم يبدأ";
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Toaster position="top-center" dir="rtl" />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Button variant="ghost" onClick={back}>
            العودة للجهات <ChevronLeft />
          </Button>
          <SiteLogo className="w-28" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 lg:p-8">
        <div className="mb-6 rounded-3xl bg-[var(--brand-ink)] p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">ملف الجهة</p>
              <h1 className="mt-1 text-2xl font-bold">{org.name}</h1>
              <p className="mt-2 text-sm text-white/65">
                مسؤول التواصل: {org.contactName || "—"} · {org.participants}{" "}
                مشاركًا
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${location.origin}/?org=${org.accessToken}`,
                  );
                  toast.success("تم نسخ رابط الجهة");
                }}
              >
                <Copy /> رابط الخطة
              </Button>
              <Button
                variant="secondary"
                disabled={org.planStatus !== "submitted"}
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${location.origin}/?org=${org.accessToken}&section=achievement`,
                  );
                  toast.success("تم نسخ رابط رفع الإنجاز");
                }}
              >
                <Copy /> رابط الإنجاز
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${location.origin}/?assessment=${org.accessToken}`,
                  );
                  toast.success("تم نسخ رابط قياس 360 المستقل");
                }}
              >
                <Copy /> رابط قياس 360
              </Button>
              <Dialog open={edit} onOpenChange={setEdit}>
                <DialogTrigger asChild>
                  <Button className="bg-white/10 hover:bg-white/20">
                    تعديل البيانات
                  </Button>
                </DialogTrigger>
                <OrgDialog
                  org={org}
                  close={() => setEdit(false)}
                  reload={reload}
                />
              </Dialog>
              <Button
                className="bg-brand-soft/20 text-white hover:bg-brand-soft/35"
                onClick={async () => {
                  if (
                    !window.confirm(
                      `حذف جهة «${org.name}» نهائيًا مع جميع بياناتها؟`,
                    )
                  )
                    return;
                  try {
                    await post({ action: "deleteOrg", id: org.id });
                    toast.success("تم حذف الجهة");
                    back();
                    reload();
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
              >
                <Trash2 /> حذف الجهة
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            <Info label="حالة الاستكمال" value={planLabel(org, c.progress)} />
            <Info label="نسبة اكتمال الخطة" value={`${c.progress}%`} />
            <Info label="تسليم الإنجاز" value={achievementLabel} />
            <Info label="معدل الإنجاز" value={`${achievementRate(org)}%`} />
            <Info
              label="آخر تحديث"
              value={date(org.planUpdatedAt || org.updatedAt)}
            />
          </div>
        </div>
        <Tabs defaultValue="summary">
          <TabsList className="mb-5 h-auto w-full justify-start overflow-x-auto bg-white p-2">
            <TabsTrigger value="summary">ملخص الجهة</TabsTrigger>
            <TabsTrigger value="plan">الخطة السنوية</TabsTrigger>
            <TabsTrigger value="achievement">الإنجاز</TabsTrigger>
            <TabsTrigger value="environments">قياس البيئة</TabsTrigger>
            <TabsTrigger value="attendance">حضور لقاءات المربي</TabsTrigger>
          </TabsList>
          <TabsContent value="summary">
            <Summary org={org} data={data} />
          </TabsContent>
          <TabsContent value="plan">
            <PlanRead org={org} data={data} />
          </TabsContent>
          <TabsContent value="achievement">
            <AchievementRead org={org} />
          </TabsContent>
          <TabsContent value="environments">
            <EnvironmentManager
              org={org}
              data={data}
              token={org.accessToken}
              reload={reload}
              admin
            />
          </TabsContent>
          <TabsContent value="attendance">
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from(
                { length: data.settings.educatorMeetings },
                (_, i) => {
                  const a =
                    ats.find((x) => x.meetingNumber === i + 1)?.attendees ?? 0;
                  return (
                    <Card key={i}>
                      <CardContent className="p-5">
                        <p className="text-sm text-brand-muted">
                          حضور لقاء تأهيل المربي {i + 1}
                        </p>
                        <b className="mt-2 block text-3xl">
                          {a}{" "}
                          <small className="text-sm font-normal text-brand-muted">
                            من {org.participants}
                          </small>
                        </b>
                        <Progress
                          className="mt-4"
                          value={
                            org.participants ? (a / org.participants) * 100 : 0
                          }
                        />
                      </CardContent>
                    </Card>
                  );
                },
              )}
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-brand-muted">متوسط الحضور</p>
                  <b className="mt-2 block text-3xl text-[var(--primary)]">
                    {avg}%
                  </b>
                  <Progress className="mt-4" value={avg} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-4">
      <p className="text-xs text-white/85">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
function Summary({ org, data }: { org: Org; data: Data }) {
  const c = calc(org, data.settings),
    ats = data.attendance.filter((a) => a.organizationId === org.id),
    avg = org.participants
      ? Math.round(
          (ats.reduce((x, a) => x + a.attendees, 0) /
            (org.participants * data.settings.educatorMeetings)) *
            100,
        )
      : 0;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>مؤشرات الجهة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {[
            ["حالة الخطة", planLabel(org, c.progress)],
            ["اكتمال الخطة", `${c.progress}%`],
            ["الأنشطة المخططة", c.total],
            ["عدد المشاركين", org.participants],
            ["متوسط الحضور", `${avg}%`],
            ["معدل الإنجاز", `${achievementRate(org)}%`],
          ].map(([a, b]) => (
            <div key={a} className="rounded-2xl border bg-brand-surface/60 p-4">
              <span className="text-sm text-brand-muted">{a}</span>
              <b className="mt-1 block text-xl">{b}</b>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>التنبيهات والبنود الناقصة</CardTitle>
        </CardHeader>
        <CardContent>
          {c.missing.length ? (
            <ul className="space-y-3">
              {c.missing.map((x) => (
                <li className="flex gap-2 text-sm text-primary" key={x}>
                  <span>•</span>
                  {x}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl bg-brand-soft p-5 text-sm text-primary">
              لا توجد بنود ناقصة. الخطة مستوفية للمتطلبات.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
async function documentRequest(
  url: string,
  token: string,
  options: RequestInit = {},
) {
  const response = await fetch(url, {
    ...options,
    headers: { ...options.headers, "x-organization-token": token },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || "تعذر نقل مستند الخطة. أعد المحاولة.");
  return body;
}
async function uploadPlanDocument(
  file: File,
  token: string,
  progress: (value: number) => void,
): Promise<PlanDocument> {
  if (!validPlanDocumentSize(file.size))
    throw new Error("يجب أن يكون الملف غير فارغ وبحجم أقل من ٥ ميجابايت");
  const doc = await documentRequest("/api/plan-document?action=start", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size }),
  });
  for (
    let offset = 0, index = 0;
    offset < file.size;
    offset += PLAN_DOCUMENT_CHUNK_BYTES, index++
  ) {
    await documentRequest(
      `/api/plan-document?action=chunk&id=${encodeURIComponent(doc.id)}&index=${index}`,
      token,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: file.slice(offset, offset + PLAN_DOCUMENT_CHUNK_BYTES),
      },
    );
    progress(
      Math.round(
        (Math.min(offset + PLAN_DOCUMENT_CHUNK_BYTES, file.size) / file.size) *
          100,
      ),
    );
  }
  await documentRequest(
    `/api/plan-document?action=finish&id=${encodeURIComponent(doc.id)}`,
    token,
    { method: "POST" },
  );
  return doc;
}
function PlanDocumentDownload({
  document,
  token,
}: {
  document: PlanDocument;
  token: string;
}) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const parts: ArrayBuffer[] = [];
      for (
        let i = 0;
        i < Math.ceil(document.size / PLAN_DOCUMENT_CHUNK_BYTES);
        i++
      ) {
        const result = await documentRequest(
          `/api/plan-document?id=${encodeURIComponent(document.id)}&index=${i}`,
          token,
        );
        const bytes = Uint8Array.from(atob(result.content), (c) =>
          c.charCodeAt(0),
        );
        parts.push(bytes.buffer);
      }
      const blob = new Blob(parts, { type: "application/octet-stream" });
      if (blob.size !== document.size)
        throw new Error("التنزيل غير مكتمل. أعد المحاولة.");
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تنزيل المستند",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="break-all text-sm font-medium">{document.name}</p>
        <p className="mt-1 text-sm text-brand-muted">
          {(document.size / 1024 / 1024).toFixed(2)} ميجابايت
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={download}
      >
        {busy ? "جارٍ التنزيل…" : "تنزيل مستند الخطة"}
      </Button>
    </div>
  );
}
function PlanRead({ org, data }: { org: Org; data: Data }) {
  const c = calc(org, data.settings);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">مستند الخطة</CardTitle>
        </CardHeader>
        <CardContent>
          {org.planDocument ? (
            <PlanDocumentDownload
              document={org.planDocument}
              token={org.accessToken}
            />
          ) : (
            <p className="text-sm text-brand-muted">
              لم ترفق الجهة مستند الخطة بعد.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="size-5 text-[var(--primary)]" />
            اللقاءات التطويرية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <b className="text-3xl text-[var(--primary)]">{c.d.length}</b>
          <p className="mt-1 text-sm text-brand-muted">لقاء مخطط خلال السنة</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="size-5 text-[var(--primary)]" />
            الرحلات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {c.t.length ? (
            <ol className="space-y-2">
              {c.t.map((x: string, i: number) => (
                <li key={i} className="rounded-xl bg-brand-surface p-3 text-sm">
                  {i + 1}. {x || "غير مكتمل"}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-brand-muted">لم تتم الإضافة بعد.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5 text-[var(--primary)]" />
            ورش العمل التدريبية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {c.w.length ? (
            <ol className="space-y-3">
              {c.w.map((axes: string[], i: number) => (
                <li key={i} className="rounded-xl bg-brand-surface p-3 text-sm">
                  <b>ورشة العمل {i + 1}</b>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {axes.length ? (
                      axes.map((axis) => (
                        <Badge
                          key={axis}
                          variant="outline"
                          className="bg-white"
                        >
                          {axis}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-primary">لم تحدد المحاور</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-brand-muted">لم تتم الإضافة بعد.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function AchievementRead({ org }: { org: Org }) {
  const items = achievementItems(org);
  if (org.achievementStatus === "not_started")
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-brand-muted">
          لم تبدأ الجهة برفع الإنجاز بعد.
        </CardContent>
      </Card>
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border bg-white p-4">
        <div>
          <b>حالة تسليم الإنجاز</b>
          <p className="mt-1 text-xs text-brand-muted">
            {org.achievementSubmittedAt
              ? `تاريخ الإرسال: ${date(org.achievementSubmittedAt)}`
              : "محفوظ كمسودة"}
          </p>
        </div>
        <Status
          label={
            org.achievementStatus === "submitted" ? "مكتمل" : "قيد الاستكمال"
          }
        />
      </div>
      {items.map((item) => (
        <Card key={item.key}>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge variant="outline">{item.type}</Badge>
                <h3 className="mt-2 font-bold">{item.label}</h3>
              </div>
              <Badge
                className={
                  item.status === "completed"
                    ? "bg-brand-soft text-primary"
                    : item.status === "partial"
                      ? "bg-brand-soft text-primary"
                      : "bg-brand-soft text-primary"
                }
              >
                {item.status === "completed"
                  ? "منجز"
                  : item.status === "partial"
                    ? "منجز جزئيًا"
                    : "غير منجز"}
              </Badge>
            </div>
            {item.notes && (
              <p className="mt-4 rounded-xl bg-brand-surface p-3 text-sm">
                {item.notes}
              </p>
            )}
            {item.evidenceUrl && (
              <a
                className="mt-3 inline-block text-sm font-semibold text-[var(--primary)] underline"
                href={item.evidenceUrl}
                target="_blank"
                rel="noreferrer"
              >
                فتح رابط الإثبات
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
function AssessmentAdmin({ data, reload }: { data: Data; reload: () => void }) {
  const pending = data.environments.filter(
    (e) => e.approvalStatus === "pending",
  );
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <h2 className="text-xl font-bold">قياس البيئة التربوية</h2>
          <p className="mt-2 text-sm leading-7 text-brand-muted">
            {pending.length} بيئة بانتظار الاعتماد. تضيف الجهة بيئاتها من
            رابطها، ثم تعتمدها هنا لفتح نماذج القياس.
          </p>
        </CardContent>
      </Card>
      {data.organizations.map((org) => (
        <section key={org.id} className="space-y-3">
          <h3 className="text-lg font-bold">{org.name}</h3>
          <EnvironmentManager
            org={org}
            data={data}
            token={org.accessToken}
            reload={reload}
            admin
          />
        </section>
      ))}
      {!data.organizations.length && (
        <p className="text-brand-muted">لا توجد جهات مشاركة بعد.</p>
      )}
    </div>
  );
}
function EnvironmentManager({
  org,
  data,
  token,
  reload,
  admin = false,
}: {
  org: Org;
  data: Data;
  token: string;
  reload: () => void;
  admin?: boolean;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const environments = data.environments.filter(
    (x) => x.organizationId === org.id,
  );
  const act = async (
    body: Record<string, unknown>,
    message: string,
    id: string,
  ) => {
    setBusy(id);
    try {
      await post(body);
      toast.success(message);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ التغيير");
    } finally {
      setBusy(null);
    }
  };
  const add = async () => {
    if (!name.trim()) return toast.error("أدخل اسم البيئة التربوية");
    setBusy("add");
    try {
      await post({ action: "createEnvironment", token, name });
      setName("");
      toast.success("تم إرسال البيئة لاعتمادها من مشرف المشروع");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة البيئة");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-5">
      {!admin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              البيئات التربوية التابعة للجهة
            </CardTitle>
            <p className="text-sm leading-7 text-brand-muted">
              أضف بيئات الجهة، وستفتح روابط القياس بعد اعتمادها من مشرف المشروع.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Label className="sr-only" htmlFor={`environment-name-${org.id}`}>
              اسم البيئة التربوية
            </Label>
            <Input
              id={`environment-name-${org.id}`}
              value={name}
              disabled={!!busy}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم البيئة التربوية"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button disabled={!!busy} onClick={add}>
              <Plus />
              إرسال للاعتماد
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        {environments.map((env) => {
          const pre = env.phaseStats.pre,
            after = env.phaseStats.post;
          const improvement =
            pre.total !== null && after.total !== null
              ? Math.round((after.total - pre.total) * 10) / 10
              : null;
          const approved = env.approvalStatus === "approved";
          const notes = (data.assessmentResponses || [])
            .filter(
              (r) =>
                r.environmentId === env.id &&
                (r.strengths || r.improvementArea),
            )
            .slice(0, 2);
          return (
            <Card key={env.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge
                      variant="outline"
                      className={approved ? "text-primary" : "text-primary"}
                    >
                      {approved ? "معتمدة" : "بانتظار الاعتماد"}
                    </Badge>
                    <h3 className="mt-2 break-words text-lg font-bold">
                      {env.name}
                    </h3>
                  </div>
                  <Button
                    aria-label={`حذف بيئة ${env.name}`}
                    size="sm"
                    variant="ghost"
                    disabled={!!busy}
                    className="text-primary"
                    onClick={() => {
                      if (
                        window.confirm(`حذف بيئة «${env.name}» وجميع ردودها؟`)
                      )
                        act(
                          { action: "deleteEnvironment", token, id: env.id },
                          "تم حذف البيئة",
                          env.id,
                        );
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {!approved && (
                  <div className="rounded-xl bg-brand-soft p-4 text-sm leading-7">
                    روابط القياس غير متاحة حتى اعتماد البيئة.
                    {admin && (
                      <Button
                        className="mt-3 block"
                        disabled={!!busy}
                        onClick={() =>
                          act(
                            { action: "approveEnvironment", id: env.id },
                            "تم اعتماد البيئة وفتح القياس القبلي",
                            env.id,
                          )
                        }
                      >
                        اعتماد البيئة
                      </Button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ["القبلي", pre.total],
                    ["البعدي", after.total],
                    ["التحسن", improvement],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-xl bg-brand-surface p-3"
                    >
                      <span className="text-sm text-brand-muted">{label}</span>
                      <b className="mt-1 block text-sm">
                        {value === null
                          ? "—"
                          : `${value}${label === "التحسن" ? " نقطة" : "%"}`}
                      </b>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 rounded-xl border p-4 text-sm">
                  <p className="font-semibold">عدد المقيمين حسب الصفة</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الصفة</TableHead>
                        <TableHead>قبلي</TableHead>
                        <TableHead>بعدي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(
                        [
                          ["student", "الطلاب"],
                          ["parent", "أولياء الأمور"],
                          ["supervisor", "المشرفون"],
                          ["evaluator", "المقيمون"],
                        ] as const
                      ).map(([key, label]) => (
                        <TableRow key={key}>
                          <TableCell>{label}</TableCell>
                          <TableCell>{env.evaluatorCounts.pre[key]}</TableCell>
                          <TableCell>{env.evaluatorCounts.post[key]}</TableCell>
                        </TableRow>
                      ))}
                      {(env.evaluatorCounts.pre.other > 0 ||
                        env.evaluatorCounts.post.other > 0) && (
                        <TableRow>
                          <TableCell>صفات أخرى مسجلة سابقًا</TableCell>
                          <TableCell>{env.evaluatorCounts.pre.other}</TableCell>
                          <TableCell>
                            {env.evaluatorCounts.post.other}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <p className="font-semibold">توزيع ردود القياس والأوزان</p>
                  {(
                    [
                      ["الطلاب وأولياء الأمور — ٢٠٪", "community"],
                      ["المشرفون والمقيمون — ٨٠٪", "staff"],
                    ] as const
                  ).map(([label, key]) => (
                    <div key={key}>
                      <p>{label}</p>
                      <p className="mt-1 text-brand-muted">
                        قبلي: {pre[key].count} رد ·{" "}
                        {pre[key].total === null
                          ? "دون نتيجة"
                          : `${pre[key].total}%`}{" "}
                        | بعدي: {after[key].count} رد ·{" "}
                        {after[key].total === null
                          ? "دون نتيجة"
                          : `${after[key].total}%`}
                      </p>
                    </div>
                  ))}
                  <p className="text-brand-muted">
                    النتيجة الكلية تظهر بعد ورود رد مكتمل من كل فئة، وتحسب من
                    متوسط كل فئة حسب وزنها.
                  </p>
                </div>
                {approved && (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          ["pre", "community", "قبلي — طلاب وأولياء أمور"],
                          ["pre", "staff", "قبلي — مشرفون ومقيمون"],
                          ["post", "community", "بعدي — طلاب وأولياء أمور"],
                          ["post", "staff", "بعدي — مشرفون ومقيمون"],
                        ] as const
                      ).map(([phase, audience, label]) => (
                        <Button
                          key={`${phase}-${audience}`}
                          variant="outline"
                          className="h-auto whitespace-normal py-3 text-sm"
                          disabled={
                            phase === "pre"
                              ? !!env.preCompletedAt
                              : !env.preCompletedAt
                          }
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                `${location.origin}/?assessment=${encodeURIComponent(token)}&environment=${encodeURIComponent(env.id)}&phase=${phase}&audience=${audience}`,
                              );
                              toast.success("تم نسخ رابط النموذج");
                            } catch {
                              toast.error(
                                "تعذر نسخ الرابط. تحقق من صلاحية الحافظة.",
                              );
                            }
                          }}
                        >
                          <Copy className="shrink-0" />
                          {label}
                        </Button>
                      ))}
                    </div>
                    {!env.preCompletedAt ? (
                      <div className="rounded-xl bg-[var(--brand-soft)] p-4">
                        <p className="mb-3 text-sm leading-7">
                          بعد استلام جميع الردود المستهدفة من الفئتين، أتم
                          القياس القبلي لتثبيت النتيجة وإنشاء خطة التحسين وفتح
                          القياس البعدي. يلزم رد مكتمل واحد على الأقل من كل فئة.
                        </p>
                        <Button
                          disabled={!!busy || pre.total === null}
                          onClick={() => {
                            if (
                              window.confirm(
                                "هل استُكملت جميع الردود القبلية المستهدفة؟ سيُغلق القياس القبلي وتُثبت النتيجة وتُنشأ خطة التحسين.",
                              )
                            )
                              act(
                                {
                                  action: "completePreAssessment",
                                  token,
                                  environmentId: env.id,
                                },
                                "تم إتمام القياس القبلي وإنشاء خطة التحسين",
                                env.id,
                              );
                          }}
                        >
                          إتمام القياس القبلي
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-primary">
                        تم إتمام القياس القبلي في {date(env.preCompletedAt)}.
                        القياس البعدي متاح الآن.
                      </p>
                    )}
                  </>
                )}
                {pre.axisScores.some((x) => x !== null) && (
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-semibold">
                      نتائج المحاور الموزونة
                    </p>
                    {ASSESSMENT_AXES.map((axis, i) => (
                      <div
                        key={axis.name}
                        className="flex flex-wrap justify-between gap-2 text-sm"
                      >
                        <span>{axis.name}</span>
                        <span className="text-brand-muted">
                          قبلي{" "}
                          {pre.axisScores[i] === null
                            ? "—"
                            : `${pre.axisScores[i]}%`}{" "}
                          · بعدي{" "}
                          {after.axisScores[i] === null
                            ? "—"
                            : `${after.axisScores[i]}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {admin && notes.length > 0 && (
                  <div className="rounded-xl bg-brand-surface p-4 text-sm">
                    <b>آخر الملاحظات النوعية</b>
                    {notes.map((r) => (
                      <div key={r.id} className="mt-2 border-t pt-2">
                        {r.strengths && <p>نقاط القوة: {r.strengths}</p>}
                        {r.improvementArea && (
                          <p>فرصة تطوير: {r.improvementArea}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {env.improvementPlan && (
                  <ImprovementPlanRead plan={env.improvementPlan} />
                )}
              </CardContent>
            </Card>
          );
        })}
        {!environments.length && (
          <p className="rounded-xl border border-dashed p-6 text-sm text-brand-muted">
            لم تضف الجهة بيئات تربوية بعد.
          </p>
        )}
      </div>
    </div>
  );
}
function ImprovementPlanRead({ plan }: { plan: ImprovementPlan }) {
  return (
    <section className="space-y-4 border-t pt-4">
      <h4 className="text-lg font-bold">خطة تحسين البيئة</h4>
      <p className="text-sm leading-7 text-brand-muted">
        خطة مقترحة مبنية على أقل ثلاثة محاور في القياس القبلي الموزون. النتيجة
        القبلية: {plan.baseline.total}٪. تبدأ مدد التنفيذ من تاريخ إتمام القياس
        القبلي.
      </p>
      {plan.items.map((item, i) => (
        <div
          key={item.axis}
          className="space-y-2 rounded-xl border p-4 text-sm leading-7"
        >
          <h5 className="font-bold">
            {i + 1}. {item.axis}
          </h5>
          <p>
            خط الأساس: {item.baseline}٪ · المستهدف في القياس البعدي:{" "}
            {item.target}٪
          </p>
          <p>
            <b>الإجراء:</b> {item.action}
          </p>
          <p>
            <b>المسؤول:</b> {item.responsible}
          </p>
          <p>
            <b>المدة:</b> {item.durationDays} يومًا
          </p>
          <p>
            <b>مؤشر المتابعة:</b> {item.indicator}
          </p>
        </div>
      ))}
    </section>
  );
}
function AssessmentEntryForm({
  org,
  environment,
  phase,
  token,
  audience,
}: {
  org: Org;
  environment: Environment;
  phase: "pre" | "post";
  token: string;
  audience: Audience;
}) {
  const axes = audience === "community" ? COMMUNITY_AXES : ASSESSMENT_AXES;
  const questionCount = audience === "community" ? 10 : 24;
  const [evaluatorName, setEvaluatorName] = useState(""),
    [evaluatorRole, setEvaluatorRole] = useState(""),
    [strengths, setStrengths] = useState(""),
    [improvementArea, setImprovementArea] = useState(""),
    [answers, setAnswers] = useState<(number | null)[]>(
      Array(questionCount).fill(null),
    ),
    [busy, setBusy] = useState(false),
    [submitted, setSubmitted] = useState(false);
  const answered = answers.filter((x) => x !== null).length;
  const setAnswer = (index: number, value: number) =>
    setAnswers(answers.map((x, i) => (i === index ? value : x)));
  const submit = async () => {
    if (!evaluatorName.trim() || !evaluatorRole.trim())
      return toast.error("أدخل اسم المقيم وصفته أو علاقته بالبيئة");
    if (answered !== questionCount)
      return toast.error(
        `أكمل جميع العبارات، المتبقي ${questionCount - answered}`,
      );
    setBusy(true);
    try {
      await post({
        action: "saveAssessment",
        token,
        environmentId: environment.id,
        phase,
        audience,
        evaluatorName,
        evaluatorRole,
        answers,
        strengths,
        improvementArea,
      });
      setSubmitted(true);
      toast.success("تم إرسال التقييم بنجاح");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (submitted)
    return (
      <Card>
        <CardContent className="grid min-h-80 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-soft text-2xl text-primary">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-bold">تم استلام التقييم</h1>
            <p className="mt-2 text-sm text-brand-muted">
              شكرًا لك. تمت إضافة تقييمك المستقل إلى متوسط البيئة التربوية.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  const questionGroups =
    audience === "community"
      ? [
          {
            name: "community",
            questions: COMMUNITY_AXES.flatMap((axis) => [...axis.questions]),
          },
        ]
      : axes;
  let questionIndex = 0;
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            {phase === "pre" ? "القياس القبلي" : "القياس البعدي"}
          </Badge>
          <CardTitle>{environment.name}</CardTitle>
          <p className="text-sm text-brand-muted">
            {org.name} ·{" "}
            {audience === "community"
              ? "الطلاب وأولياء الأمور — ١٠ عبارات"
              : "المشرفون في البيئة والمقيمون — ٢٤ عبارة"}{" "}
            · اختر درجة من 1 إلى 5 لكل عبارة.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>اسم المقيم</Label>
            <Input
              className="mt-2"
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
            />
          </div>
          <div>
            <Label>الصفة أو العلاقة بالبيئة</Label>
            <select
              aria-label="الصفة أو العلاقة بالبيئة"
              className="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm"
              value={evaluatorRole}
              onChange={(e) => setEvaluatorRole(e.target.value)}
            >
              <option value="">اختر الصفة</option>
              {(audience === "community"
                ? ["طالب", "ولي أمر"]
                : ["مشرف في البيئة", "مقيم"]
              ).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm">اكتمال التقييم</span>
            <b>
              {answered}/{questionCount}
            </b>
          </div>
          <Progress className="mt-3" value={(answered / questionCount) * 100} />
          <div className="mt-4 grid grid-cols-5 gap-1 text-center text-[11px] text-brand-muted">
            <span>1 غير متحقق</span>
            <span>2 ضعيف</span>
            <span>3 متوسط</span>
            <span>4 كبير</span>
            <span>5 عالٍ جدًا</span>
          </div>
        </CardContent>
      </Card>
      {questionGroups.map((axis, axisIndex) => (
        <Card key={axis.name}>
          {audience === "staff" && (
            <CardHeader>
              <CardTitle className="text-lg">
                {axisIndex + 1}. {axis.name}
              </CardTitle>
            </CardHeader>
          )}
          <CardContent className="space-y-5">
            {axis.questions.map((question) => {
              const index = questionIndex++;
              return (
                <div key={question} className="rounded-2xl border p-4">
                  <p className="text-base font-medium leading-7">
                    {audience === "community" && `${index + 1}. `}
                    {question}
                  </p>
                  <div className="mt-3 grid grid-cols-5 gap-2" dir="rtl">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setAnswer(index, value)}
                        className={`rounded-xl border py-2 text-sm font-bold transition ${answers[index] === value ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "bg-white hover:bg-brand-surface"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
      {audience === "staff" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">أسئلة نوعية</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>ما أبرز نقاط القوة في البيئة التربوية؟</Label>
              <Textarea
                className="mt-2"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
              />
            </div>
            <div>
              <Label>ما أهم جانب يحتاج إلى تطوير؟</Label>
              <Textarea
                className="mt-2"
                value={improvementArea}
                onChange={(e) => setImprovementArea(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}
      <div className="sticky bottom-3 rounded-2xl border bg-white/95 p-4 text-start shadow-lg backdrop-blur">
        <Button disabled={busy || answered !== questionCount} onClick={submit}>
          <Send /> إرسال التقييم
        </Button>
      </div>
    </div>
  );
}
function AssessmentPortal({
  data,
  token,
  reload,
}: {
  data: Data;
  token: string;
  reload: () => void;
}) {
  const org = data.organizations[0];
  const params =
    typeof window !== "undefined" ? new URLSearchParams(location.search) : null;
  const environmentId = params?.get("environment");
  const phase = params?.get("phase");
  const audience = params?.get("audience") || "staff";
  const selectedEnvironment = data.environments.find(
    (x) => x.organizationId === org?.id && x.id === environmentId,
  );
  if (!org)
    return (
      <div className="grid min-h-screen place-items-center">
        رابط القياس غير صالح
      </div>
    );
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Toaster position="top-center" dir="rtl" />
      <header className="bg-[var(--brand-ink)] text-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white p-2">
              <SiteLogo className="w-28" />
            </div>
            <b className="text-sm">قياس البيئة التربوية</b>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
            {org.name}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 py-10">
        {environmentId && (phase === "pre" || phase === "post") ? (
          selectedEnvironment &&
          (audience === "staff" || audience === "community") ? (
            selectedEnvironment.approvalStatus !== "approved" ||
            (phase === "pre"
              ? !!selectedEnvironment.preCompletedAt
              : !selectedEnvironment.preCompletedAt) ? (
              <Card>
                <CardContent className="p-8 text-center leading-8">
                  {selectedEnvironment.approvalStatus !== "approved"
                    ? "البيئة بانتظار اعتماد مشرف المشروع."
                    : phase === "pre"
                      ? "تم إتمام القياس القبلي وإغلاق استقبال الردود. شكرًا لتعاونكم."
                      : "القياس البعدي غير متاح قبل إتمام القياس القبلي."}
                </CardContent>
              </Card>
            ) : (
              <AssessmentEntryForm
                key={`${selectedEnvironment.id}-${phase}-${audience}`}
                org={org}
                environment={selectedEnvironment}
                audience={audience}
                phase={phase}
                token={token}
              />
            )
          ) : (
            <Card className="border-brand-stroke">
              <CardContent className="p-8 text-center text-primary">
                رابط البيئة غير صالح أو تم حذف البيئة.
              </CardContent>
            </Card>
          )
        ) : (
          <EnvironmentManager
            org={org}
            data={data}
            token={token}
            reload={reload}
          />
        )}
      </main>
    </div>
  );
}
function Portal({
  data,
  token,
  reload,
}: {
  data: Data;
  token: string;
  reload: () => void;
}) {
  const org = data.organizations[0];
  const requested =
    typeof window !== "undefined" &&
    new URLSearchParams(location.search).get("section") === "achievement"
      ? "achievement"
      : "plan";
  if (!org)
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <h1 className="text-xl font-bold">رابط الجهة غير صالح</h1>
          <p className="mt-2 text-brand-muted">
            تواصل مع مشرف المشروع للحصول على الرابط الصحيح.
          </p>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Toaster position="top-center" dir="rtl" />
      <header className="bg-[var(--brand-ink)] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-2">
              <SiteLogo className="w-28" />
            </div>
            <b className="text-sm">بوابة الجهة المشاركة</b>
          </div>
          <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-sm sm:block">
            {org.name}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 py-8">
        <div className="mb-6">
          <p className="text-sm text-[var(--primary)]">{org.name}</p>
          <h1 className="mt-1 text-2xl font-bold">
            متابعة الخطة والإنجاز – مشروع تأهيل المربي
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-brand-muted">
            أدخل الخطة السنوية أولًا، وبعد اعتمادها يمكنك رفع الإنجاز الفعلي لكل
            نشاط، مع إمكانية إرفاق رابط إثبات اختياري.
          </p>
        </div>
        <Tabs defaultValue={requested}>
          <TabsList className="mb-5 h-auto max-w-full flex-wrap bg-white p-2">
            <TabsTrigger value="plan">الخطة السنوية</TabsTrigger>
            <TabsTrigger value="achievement">رفع الإنجاز</TabsTrigger>
            <TabsTrigger value="environments">البيئات التربوية</TabsTrigger>
          </TabsList>
          <TabsContent value="plan" className="space-y-5">
            <details className="rounded-xl border bg-white p-5">
              <summary className="cursor-pointer text-lg font-bold">
                إضافة البيئات التربوية ومتابعة اعتمادها
              </summary>
              <div className="mt-5">
                <EnvironmentManager
                  org={org}
                  data={data}
                  token={token}
                  reload={reload}
                />
              </div>
            </details>
            <PlanForm
              org={org}
              settings={data.settings}
              token={token}
              reload={reload}
            />
          </TabsContent>
          <TabsContent value="environments">
            <EnvironmentManager
              org={org}
              data={data}
              token={token}
              reload={reload}
            />
          </TabsContent>
          <TabsContent value="achievement">
            <AchievementForm org={org} token={token} reload={reload} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
function PlanForm({
  org,
  settings,
  token,
  reload,
}: {
  org: Org;
  settings: SettingsT;
  token: string;
  reload: () => void;
}) {
  const initial = calc(org, settings);
  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] = useState<PlanDocument | null>(
    org.planDocument,
  );
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState("");
  const [d, setD] = useState(initial.d),
    [trips, setTrips] = useState(initial.t),
    [w, setW] = useState(initial.w),
    [ev, setEv] = useState<boolean | null>(
      org.evaluationFollowup === null ? null : !!org.evaluationFollowup,
    ),
    [busy, setBusy] = useState(false);
  const temp = {
      ...org,
      developmentMeetings: JSON.stringify(d),
      trips: JSON.stringify(trips),
      workshops: JSON.stringify(w),
      evaluationFollowup: ev === null ? null : +ev,
    } as Org,
    c = calc(temp, settings);
  const resize = (a: string[], n: number, set: (x: string[]) => void) =>
    set(Array.from({ length: Math.max(0, n) }, (_, i) => a[i] || ""));
  const save = async (submit: boolean) => {
    if (submit && !c.valid)
      return toast.error("لا يمكن اعتماد الخطة حاليًا. راجع البنود الناقصة.");
    if (fileError) return toast.error(fileError);
    if (submit && !file && !document)
      return toast.error("أرفق مستند الخطة قبل إرسالها");
    setBusy(true);
    try {
      let savedDocument = document;
      if (file) {
        setUploadProgress(0);
        savedDocument = await uploadPlanDocument(
          file,
          token,
          setUploadProgress,
        );
        setDocument(savedDocument);
        setFile(null);
      }
      await post({
        action: "savePlan",
        token,
        documentId: savedDocument?.id,
        developmentMeetings: d,
        trips,
        workshops: w,
        evaluationFollowup: ev,
        submit,
      });
      toast.success(
        submit ? "تم اعتماد وإرسال الخطة بنجاح" : "تم حفظ المسودة بنجاح",
      );
      reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };
  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <b>نسبة اكتمال الخطة</b>
              <p className="mt-1 text-xs text-brand-muted">
                يتم التحديث تلقائيًا حسب البيانات المدخلة
              </p>
            </div>
            <b className="text-2xl text-[var(--primary)]">{c.progress}%</b>
          </div>
          <Progress className="mt-4 h-3" value={c.progress} />
        </CardContent>
      </Card>
      <CountSection
        title="اللقاءات التطويرية"
        icon={Presentation}
        min={settings.minDevelopmentMeetings}
        count={d.length}
        onChange={(n) => setD(Array.from({ length: Math.max(0, n) }, () => ""))}
      />
      <DynamicSection
        title="الرحلات"
        icon={MapPinned}
        min={settings.minTrips}
        items={trips}
        set={setTrips}
        resize={resize}
        label="عنوان أو وصف الرحلة"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">التقييم والمتابعة للمشاركين</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm">
            هل تتضمن الخطة تقييم ومتابعة المشاركين؟
          </p>
          <RadioGroup
            value={ev === null ? "" : ev ? "yes" : "no"}
            onValueChange={(v) => setEv(v === "yes")}
            className="flex gap-6"
          >
            <label className="flex items-center gap-2">
              <RadioGroupItem value="yes" /> نعم
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="no" /> لا
            </label>
          </RadioGroup>
        </CardContent>
      </Card>
      <WorkshopSection
        min={settings.minWorkshops}
        items={w}
        set={setW}
        axes={settings.workshopAxes}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">مستند الخطة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p id="plan-file-help" className="text-sm leading-7 text-brand-muted">
            أرفق مستند الخطة المعتمد لدى جهتكم. اضغط الملف قبل رفعه ليكون حجمه
            أقل من ٥ ميجابايت. المستند مطلوب عند اعتماد وإرسال الخطة.
          </p>
          {document && (
            <PlanDocumentDownload document={document} token={token} />
          )}
          <div className="space-y-2">
            <Label htmlFor="plan-document">
              {document ? "استبدال مستند الخطة" : "اختيار مستند الخطة"}
            </Label>
            <Input
              id="plan-document"
              type="file"
              disabled={busy}
              aria-describedby="plan-file-help plan-file-error"
              aria-invalid={!!fileError}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (!selected) {
                  setFile(null);
                  setFileError("");
                  return;
                }
                if (!validPlanDocumentSize(selected.size)) {
                  const message =
                    selected.size === 0
                      ? "الملف فارغ. اختر مستندًا صالحًا."
                      : "حجم الملف يجب أن يكون أقل من ٥ ميجابايت. اضغط الملف ثم أعد اختياره.";
                  setFile(null);
                  setFileError(message);
                  event.target.value = "";
                  toast.error(message);
                  return;
                }
                setFile(selected);
                setFileError("");
              }}
            />
            <p
              id="plan-file-error"
              role="alert"
              className="text-sm text-primary"
            >
              {fileError}
            </p>
            {file && (
              <p className="break-all text-sm text-brand-muted">
                الملف المحدد: {file.name} —{" "}
                {(file.size / 1024 / 1024).toFixed(2)} ميجابايت. سيُرفع عند حفظ
                الخطة.
              </p>
            )}
            {fileError && (
              <Button variant="outline" onClick={() => setFileError("")}>
                إلغاء اختيار الملف
              </Button>
            )}
          </div>
          {uploadProgress !== null && (
            <div role="status" aria-live="polite">
              <p className="mb-2 text-sm">
                جارٍ رفع المستند: {uploadProgress}٪
              </p>
              <Progress value={uploadProgress} />
            </div>
          )}
        </CardContent>
      </Card>
      {c.missing.length > 0 && (
        <Card className="border-brand-stroke bg-brand-soft/50">
          <CardHeader>
            <CardTitle className="text-base text-primary">
              لا يمكن اعتماد الخطة حاليًا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm font-semibold text-primary">المتبقي:</p>
            <ul className="space-y-1 text-sm text-primary">
              {c.missing.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <div className="sticky bottom-3 flex flex-wrap justify-end gap-3 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur">
        <Button variant="outline" disabled={busy} onClick={() => save(false)}>
          <Save /> حفظ كمسودة
        </Button>
        <Button
          disabled={busy || !c.valid || !!fileError || (!file && !document)}
          onClick={() => save(true)}
        >
          <Send /> اعتماد وإرسال الخطة
        </Button>
      </div>
    </div>
  );
}
function AchievementForm({
  org,
  token,
  reload,
}: {
  org: Org;
  token: string;
  reload: () => void;
}) {
  const [items, setItems] = useState<AchievementItem[]>(() =>
      achievementItems(org),
    ),
    [busy, setBusy] = useState(false);
  if (org.planStatus !== "submitted")
    return (
      <Card className="border-brand-stroke bg-brand-soft/50">
        <CardContent className="p-8 text-center">
          <h2 className="font-bold text-primary">
            رفع الإنجاز غير متاح حاليًا
          </h2>
          <p className="mt-2 text-sm text-primary">
            يجب اعتماد وإرسال الخطة السنوية أولًا، ثم سيُنشأ نموذج الإنجاز
            تلقائيًا بناءً على أنشطتها.
          </p>
        </CardContent>
      </Card>
    );
  const update = (i: number, values: Partial<AchievementItem>) =>
    setItems(items.map((x, n) => (n === i ? { ...x, ...values } : x)));
  const completed = items.filter((x) => x.status).length,
    progress = items.length ? Math.round((completed / items.length) * 100) : 0;
  const save = async (submit: boolean) => {
    if (submit) {
      const missing = items.find((x) => !x.status);
      if (missing) return toast.error(`حدد حالة التنفيذ: ${missing.label}`);
    }
    setBusy(true);
    try {
      await post({ action: "saveAchievement", token, items, submit });
      toast.success(
        submit ? "تم إرسال الإنجاز بنجاح" : "تم حفظ الإنجاز كمسودة",
      );
      reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <b>اكتمال نموذج الإنجاز</b>
              <p className="mt-1 text-xs text-brand-muted">
                {completed} من {items.length} أنشطة تم تحديد حالتها
              </p>
            </div>
            <b className="text-2xl text-[var(--primary)]">{progress}%</b>
          </div>
          <Progress className="mt-4 h-3" value={progress} />
        </CardContent>
      </Card>
      {items.map((item, i) => (
        <Card key={item.key}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant="outline">{item.type}</Badge>
                <CardTitle className="mt-2 text-lg">{item.label}</CardTitle>
              </div>
              <select
                className="rounded-xl border bg-white px-3 py-2 text-sm"
                value={item.status}
                onChange={(e) => update(i, { status: e.target.value })}
              >
                <option value="">حدد حالة التنفيذ</option>
                <option value="completed">منجز</option>
                <option value="partial">منجز جزئيًا</option>
                <option value="not_completed">غير منجز</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>ملاحظات الإنجاز</Label>
              <Textarea
                className="mt-2"
                value={item.notes}
                onChange={(e) => update(i, { notes: e.target.value })}
                placeholder="اكتب وصفًا مختصرًا لما تم تنفيذه"
              />
            </div>
            <div>
              <Label>رابط الإثبات</Label>
              <Input
                className="mt-2"
                type="url"
                dir="auto"
                value={item.evidenceUrl}
                onChange={(e) => update(i, { evidenceUrl: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
              <p className="mt-1 text-xs text-brand-muted">
                اختياري: رابط ملف أو مجلد صور أو تقرير يدعم الإنجاز.
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="sticky bottom-3 flex flex-wrap justify-end gap-3 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur">
        <Button variant="outline" disabled={busy} onClick={() => save(false)}>
          <Save /> حفظ كمسودة
        </Button>
        <Button disabled={busy || !items.length} onClick={() => save(true)}>
          <Send /> اعتماد وإرسال الإنجاز
        </Button>
      </div>
    </div>
  );
}
function CountSection({
  title,
  icon: I,
  min,
  count,
  onChange,
}: {
  title: string;
  icon: any;
  min: number;
  count: number;
  onChange: (n: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <I className="size-5 text-[var(--primary)]" />
            {title}
          </CardTitle>
          <p className="mt-1 text-sm text-brand-muted">
            الحد الأدنى: {min} · لا يلزم إدخال مواضيع اللقاءات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label>العدد</Label>
          <Input
            className="w-20"
            type="number"
            min={0}
            value={count}
            onChange={(e) => onChange(+e.target.value)}
          />
        </div>
      </CardHeader>
    </Card>
  );
}
function WorkshopSection({
  min,
  items,
  set,
  axes,
}: {
  min: number;
  items: string[][];
  set: (x: string[][]) => void;
  axes: string[];
}) {
  const options = Array.from(new Set([...axes, ...items.flat()]));
  const resize = (n: number) =>
    set(Array.from({ length: Math.max(0, n) }, (_, i) => items[i] || []));
  const toggle = (index: number, axis: string, checked: boolean) => {
    const next = items.map((x) => [...x]);
    next[index] = checked
      ? Array.from(new Set([...next[index], axis]))
      : next[index].filter((x) => x !== axis);
    set(next);
  };
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="size-5 text-[var(--primary)]" />
            ورش العمل التدريبية
          </CardTitle>
          <p className="mt-1 text-sm text-brand-muted">
            الحد الأدنى: {min} · يمكن اختيار أكثر من محور لكل ورشة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label>العدد</Label>
          <Input
            className="w-20"
            type="number"
            min={0}
            value={items.length}
            onChange={(e) => resize(+e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((selected, i) => (
          <div key={i} className="rounded-2xl border p-4">
            <Label className="text-base">ورشة العمل {i + 1} – المحاور</Label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {options.map((axis) => (
                <label
                  key={axis}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm transition ${selected.includes(axis) ? "border-[var(--brand-light)] bg-[var(--brand-soft)] text-[var(--primary)]" : "bg-white hover:bg-brand-surface"}`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={selected.includes(axis)}
                    onChange={(e) => toggle(i, axis, e.target.checked)}
                  />
                  <span>{axis}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {!items.length && (
          <p className="rounded-xl bg-brand-surface p-4 text-sm text-brand-muted">
            حدد عدد الورش لإظهار خيارات المحاور.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
function DynamicSection({
  title,
  icon: I,
  min,
  items,
  set,
  resize,
  label,
}: any) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <I className="size-5 text-[var(--primary)]" />
            {title}
          </CardTitle>
          <p className="mt-1 text-sm text-brand-muted">الحد الأدنى: {min}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label>العدد</Label>
          <Input
            className="w-20"
            type="number"
            min={0}
            value={items.length}
            onChange={(e) => resize(items, +e.target.value, set)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((x: string, i: number) => (
          <div key={i}>
            <Label>
              {title} {i + 1} – {label}
            </Label>
            <Input
              className="mt-2"
              value={x}
              onChange={(e) => {
                const n = [...items];
                n[i] = e.target.value;
                set(n);
              }}
              placeholder={`أدخل ${label}`}
            />
          </div>
        ))}
        {!items.length && (
          <p className="rounded-xl bg-brand-surface p-4 text-sm text-brand-muted">
            حدد العدد لإظهار حقول التفاصيل.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
function Reports({ data }: { data: Data }) {
  const rows = data.organizations.map((o) => ({
      o,
      c: calc(o, data.settings),
    })),
    totals = {
      d: rows.reduce((a, x) => a + x.c.d.length, 0),
      t: rows.reduce((a, x) => a + x.c.t.length, 0),
      w: rows.reduce((a, x) => a + x.c.w.length, 0),
      e: rows.filter((x) => x.o.evaluationFollowup === 1).length,
    };
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
      <Card>
        <CardHeader>
          <CardTitle>الأنشطة المخططة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            ["اللقاءات التطويرية", totals.d],
            ["الرحلات", totals.t],
            ["ورش العمل", totals.w],
            ["جهات لديها تقييم ومتابعة", totals.e],
          ].map(([l, v]) => (
            <div
              key={l}
              className="flex items-center justify-between rounded-xl bg-brand-surface p-4"
            >
              <span className="text-sm">{l}</span>
              <b className="text-xl text-[var(--primary)]">{v}</b>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>القراءة النوعية لحالة الجهات</CardTitle>
          <p className="text-sm text-brand-muted">
            أولوية المتابعة المقترحة بناءً على الخطة والإنجاز.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map(({ o, c }) => {
            const rate = achievementRate(o);
            const insight =
              o.planStatus !== "submitted"
                ? {
                    label: "استكمال الخطة",
                    note: `الخطة مكتملة بنسبة ${c.progress}%`,
                    style: "bg-brand-soft text-primary",
                  }
                : o.achievementStatus === "not_started"
                  ? {
                      label: "بدء رفع الإنجاز",
                      note: "الخطة معتمدة ولم يبدأ توثيق الإنجاز",
                      style: "bg-sky-50 text-sky-800",
                    }
                  : rate >= 80
                    ? {
                        label: "أداء متقدم",
                        note: `معدل الإنجاز ${rate}%`,
                        style: "bg-brand-soft text-primary",
                      }
                    : {
                        label: "متابعة الإنجاز",
                        note: `معدل الإنجاز ${rate}% ويحتاج استكمالًا`,
                        style: "bg-brand-soft text-primary",
                      };
            return (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
              >
                <div>
                  <b className="text-sm">{o.name}</b>
                  <p className="mt-1 text-xs text-brand-muted">
                    {insight.note}
                  </p>
                </div>
                <Badge className={insight.style}>{insight.label}</Badge>
              </div>
            );
          })}
          {!rows.length && (
            <p className="rounded-xl bg-brand-surface p-6 text-center text-sm text-brand-muted">
              ستظهر القراءة النوعية بعد إضافة الجهات.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function ProjectSettings({ data, reload }: { data: Data; reload: () => void }) {
  const [f, setF] = useState<any>(data.settings);
  const save = async () => {
    if (!f.workshopAxes?.length)
      return toast.error("أضف محورًا واحدًا على الأقل لورش العمل");
    try {
      await post({ action: "saveSettings", ...f });
      toast.success("تم حفظ إعدادات المشروع");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  return (
    <Card className="max-w-3xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle>إعدادات المشروع</CardTitle>
        <p className="text-sm text-brand-muted">
          تنعكس هذه القيم على التحقق من الخطط والحضور والتقارير.
        </p>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        {[
          ["projectName", "اسم المشروع", "text"],
          ["year", "السنة", "number"],
          ["educatorMeetings", "عدد لقاءات المربي", "number"],
          ["minDevelopmentMeetings", "الحد الأدنى للقاءات التطويرية", "number"],
          ["minTrips", "الحد الأدنى للرحلات", "number"],
          ["minWorkshops", "الحد الأدنى لورش العمل", "number"],
        ].map(([k, l, t]) => (
          <div key={k}>
            <Label>{l}</Label>
            <Input
              className="mt-2"
              type={t}
              value={f[k]}
              onChange={(e) =>
                setF({
                  ...f,
                  [k]: t === "number" ? +e.target.value : e.target.value,
                })
              }
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <Label>محاور ورش العمل التدريبية</Label>
          <p className="mt-1 text-xs text-brand-muted">
            اكتب كل محور في سطر مستقل. ستظهر هذه القائمة للجهات كاختيار متعدد.
          </p>
          <Textarea
            className="mt-2 min-h-36"
            value={(f.workshopAxes || []).join("\n")}
            onChange={(e) =>
              setF({
                ...f,
                workshopAxes: e.target.value
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div className="sm:col-span-2">
          <Button onClick={save}>
            <Save /> حفظ الإعدادات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
