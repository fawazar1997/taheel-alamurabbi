"use client";
import { useEffect, useState } from "react";
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
  updatedAt: string;
};
type Data = {
  settings: SettingsT;
  organizations: Org[];
  attendance: Attend[];
  environments: Environment[];
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
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : label === "قيد الاستكمال"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : label === "يحتاج متابعة"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-slate-100 text-slate-600 border-slate-200";
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
      <div className="grid min-h-screen place-items-center bg-[#f5f7f6]">
        <div className="text-center">
          <RotateCcw className="mx-auto mb-3 size-7 animate-spin text-[#0b5b46]" />
          <p className="text-sm text-slate-500">جاري تحميل النظام...</p>
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
    <div className="min-h-screen bg-[#f5f7f6] text-[#17211d]">
      <Toaster position="top-center" richColors />
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-64 border-l border-[#dfe7e3] bg-[#073f32] p-5 text-white transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-9 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-white/12 text-lg font-bold">
              ت
            </div>
            <div>
              <b className="block">تأهيل المربي</b>
              <span className="text-xs text-white/55">
                إدارة المشروع · {data.settings.year}
              </span>
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
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm transition ${view === id ? "bg-white text-[#073f32] shadow" : "text-white/72 hover:bg-white/10 hover:text-white"}`}
            >
              <I className="size-5" />
              {l}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-6 inset-x-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/55">السنة الحالية</p>
          <p className="mt-1 font-bold">{data.settings.year}</p>
          <p className="mt-2 text-xs text-white/45">آخر مزامنة: الآن</p>
        </div>
      </aside>
      <main className="lg:pr-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobile(true)}>
              <Menu />
            </button>
            <div>
              <h1 className="font-bold">{titles[view]}</h1>
              <p className="text-xs text-slate-500">
                مشروع {data.settings.projectName}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="rounded-full bg-[#edf5f2] px-3 py-1.5 text-xs text-[#0b5b46]">
              نسخة تشغيلية
            </span>
            <div className="grid size-9 place-items-center rounded-full bg-[#d8ae59] font-bold text-white">
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
          {view === "assessment" && <AssessmentAdmin data={data} />}{" "}
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
          <p className="mt-1 text-sm text-slate-500">
            حالة تنفيذ المشروع لدى الجهات المشاركة
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([l, v, x, I, click]: any) => (
          <button
            key={l}
            onClick={click}
            className="rounded-2xl border bg-white p-5 text-right shadow-[0_3px_15px_rgb(15_60_47/4%)] transition hover:-translate-y-0.5 hover:border-[#84b7a8]"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm text-slate-500">{l}</span>
              <span className="grid size-9 place-items-center rounded-xl bg-[#e9f2ee] text-[#0b5b46]">
                <I className="size-5" />
              </span>
            </div>
            <b className="text-3xl">{v}</b>
            <span className="mr-2 text-xs text-slate-400">{x}</span>
          </button>
        ))}
      </div>
      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>حالة الجهات</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
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
              <TableCell className="min-w-36 text-xs text-slate-500">
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
            <Search className="absolute right-3 top-3 size-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث باسم الجهة"
              className="bg-white pr-9"
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
                  <div className="grid size-11 place-items-center rounded-xl bg-[#e9f2ee] text-[#0b5b46]">
                    <Building2 />
                  </div>
                  <Status label={planLabel(o, c.progress)} />
                </div>
                <h3 className="font-bold">{o.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
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
                  <span className="text-sm text-slate-500">
                    {o.participants} مشاركًا
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
      <DialogHeader className="text-right">
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
        <p className="text-sm text-slate-500">
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
                            <span className="w-10 text-xs text-slate-500">
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
    <div className="min-h-screen bg-[#f5f7f6]">
      <Toaster position="top-center" richColors />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Button variant="ghost" onClick={back}>
            العودة للجهات <ChevronLeft />
          </Button>
          <b className="text-[#0b5b46]">تأهيل المربي</b>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 lg:p-8">
        <div className="mb-6 rounded-3xl bg-[#073f32] p-6 text-white">
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
                className="bg-rose-500/20 text-white hover:bg-rose-500/35"
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
                        <p className="text-sm text-slate-500">
                          حضور لقاء تأهيل المربي {i + 1}
                        </p>
                        <b className="mt-2 block text-3xl">
                          {a}{" "}
                          <small className="text-sm font-normal text-slate-400">
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
                  <p className="text-sm text-slate-500">متوسط الحضور</p>
                  <b className="mt-2 block text-3xl text-[#0b5b46]">{avg}%</b>
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
      <p className="text-xs text-white/55">{label}</p>
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
            <div key={a} className="rounded-2xl border bg-slate-50/60 p-4">
              <span className="text-sm text-slate-500">{a}</span>
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
                <li className="flex gap-2 text-sm text-rose-700" key={x}>
                  <span>•</span>
                  {x}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-700">
              لا توجد بنود ناقصة. الخطة مستوفية للمتطلبات.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
function PlanRead({ org, data }: { org: Org; data: Data }) {
  const c = calc(org, data.settings);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="size-5 text-[#0b5b46]" />
            اللقاءات التطويرية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <b className="text-3xl text-[#0b5b46]">{c.d.length}</b>
          <p className="mt-1 text-sm text-slate-500">لقاء مخطط خلال السنة</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="size-5 text-[#0b5b46]" />
            الرحلات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {c.t.length ? (
            <ol className="space-y-2">
              {c.t.map((x: string, i: number) => (
                <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
                  {i + 1}. {x || "غير مكتمل"}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">لم تتم الإضافة بعد.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5 text-[#0b5b46]" />
            ورش العمل التدريبية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {c.w.length ? (
            <ol className="space-y-3">
              {c.w.map((axes: string[], i: number) => (
                <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
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
                      <span className="text-rose-600">لم تحدد المحاور</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">لم تتم الإضافة بعد.</p>
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
        <CardContent className="p-8 text-center text-slate-500">
          لم تبدأ الجهة برفع الإنجاز بعد.
        </CardContent>
      </Card>
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border bg-white p-4">
        <div>
          <b>حالة تسليم الإنجاز</b>
          <p className="mt-1 text-xs text-slate-500">
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
                    ? "bg-emerald-100 text-emerald-800"
                    : item.status === "partial"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
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
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                {item.notes}
              </p>
            )}
            {item.evidenceUrl && (
              <a
                className="mt-3 inline-block text-sm font-semibold text-[#0b5b46] underline"
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
function AssessmentAdmin({ data }: { data: Data }) {
  return (
    <div className="space-y-5">
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e9f2ee] text-[#0b5b46]">
              <ChartNoAxesColumnIncreasing />
            </div>
            <div>
              <h2 className="font-bold">قياس المنظمات 360°</h2>
              <p className="mt-1 text-sm leading-7 text-slate-500">
                محور مستقل عن الخطة والإنجاز. سيُستكمل نموذج المعايير بعد
                تزويدنا به، مع دعم البيئات التربوية والمقيمين والقياس القبلي
                والبعدي وحساب المتوسط والتحسن.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.organizations.map((org) => {
          const environmentCount = data.environments.filter(
            (x) => x.organizationId === org.id,
          ).length;
          return (
            <Card key={org.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{org.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      رابط مستقل لقياس 360°
                    </p>
                  </div>
                  <Badge variant="outline">
                    {environmentCount} بيئة تربوية
                  </Badge>
                </div>
                <Button
                  className="mt-5 w-full"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${location.origin}/?assessment=${org.accessToken}`,
                    );
                    toast.success("تم نسخ رابط قياس 360");
                  }}
                >
                  <Copy /> نسخ رابط القياس
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
function EnvironmentManager({
  org,
  data,
  token,
  reload,
}: {
  org: Org;
  data: Data;
  token: string;
  reload: () => void;
}) {
  const [name, setName] = useState(""),
    [busy, setBusy] = useState(false);
  const environments = data.environments.filter(
    (x) => x.organizationId === org.id,
  );
  const add = async () => {
    if (!name.trim()) return toast.error("أدخل اسم البيئة التربوية");
    setBusy(true);
    try {
      await post({ action: "createEnvironment", token, name });
      setName("");
      toast.success("تمت إضافة البيئة التربوية");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">قياس البيئة</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          إدارة البيئات التربوية التابعة للجهة. ستظهر نتائج القياس القبلي
          والبعدي والمتوسط والتحسن لكل بيئة بعد إضافة نموذج المعايير.
        </p>
      </div>
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم البيئة التربوية"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button disabled={busy} onClick={add}>
              <Plus /> إضافة بيئة
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {environments.map((env) => (
          <Card key={env.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline">بيئة تربوية</Badge>
                  <h3 className="mt-2 font-bold">{env.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    قياس البيئة: بانتظار نموذج المعايير
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600"
                  onClick={async () => {
                    if (!window.confirm(`حذف بيئة «${env.name}»؟`)) return;
                    try {
                      await post({
                        action: "deleteEnvironment",
                        token,
                        id: env.id,
                      });
                      toast.success("تم حذف البيئة");
                      reload();
                    } catch (e: any) {
                      toast.error(e.message);
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <span className="text-xs text-slate-500">القبلي</span>
                  <b className="mt-1 block">{env.preScore ?? "—"}</b>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <span className="text-xs text-slate-500">البعدي</span>
                  <b className="mt-1 block">{env.postScore ?? "—"}</b>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <span className="text-xs text-slate-500">التحسن</span>
                  <b className="mt-1 block">—</b>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${location.origin}/?assessment=${token}&environment=${env.id}&phase=pre`,
                    );
                    toast.success("تم نسخ رابط القياس القبلي");
                  }}
                >
                  <Copy /> رابط القياس القبلي
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${location.origin}/?assessment=${token}&environment=${env.id}&phase=post`,
                    );
                    toast.success("تم نسخ رابط القياس البعدي");
                  }}
                >
                  <Copy /> رابط القياس البعدي
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!environments.length && (
          <Card className="border-dashed md:col-span-2">
            <CardContent className="p-8 text-center text-sm text-slate-500">
              لم تتم إضافة بيئات تربوية لهذه الجهة بعد.
            </CardContent>
          </Card>
        )}
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
    <div className="min-h-screen bg-[#f5f7f6]">
      <Toaster position="top-center" richColors />
      <header className="bg-[#073f32] text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">
          <div>
            <b>قياس المنظمات 360°</b>
            <p className="text-xs text-white/55">مشروع تأهيل المربي</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
            {org.name}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 py-10">
        {environmentId && (phase === "pre" || phase === "post") ? (
          selectedEnvironment ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Badge variant="outline">
                  {phase === "pre" ? "القياس القبلي" : "القياس البعدي"}
                </Badge>
                <h1 className="mt-4 text-2xl font-bold">
                  {selectedEnvironment.name}
                </h1>
                <p className="mt-2 text-sm text-slate-500">{org.name}</p>
                <div className="mx-auto mt-7 max-w-xl rounded-2xl border border-dashed bg-slate-50 p-7">
                  <ChartNoAxesColumnIncreasing className="mx-auto size-9 text-[#0b5b46]" />
                  <h2 className="mt-3 font-bold">
                    نموذج {phase === "pre" ? "القياس القبلي" : "القياس البعدي"}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    الرابط مخصص لهذه البيئة ومرحلة القياس. ستظهر أسئلة التقييم هنا
                    فور إضافة نموذج المعايير وآلية الاحتساب.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-rose-200"><CardContent className="p-8 text-center text-rose-700">رابط البيئة غير صالح أو تم حذف البيئة.</CardContent></Card>
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
          <p className="mt-2 text-slate-500">
            تواصل مع مشرف المشروع للحصول على الرابط الصحيح.
          </p>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-[#f5f7f6]">
      <Toaster position="top-center" richColors />
      <header className="bg-[#073f32] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-white/10 font-bold">
              ت
            </div>
            <div>
              <b>مشروع تأهيل المربي</b>
              <p className="text-xs text-white/55">بوابة الجهة المشاركة</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-sm sm:block">
            {org.name}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 py-8">
        <div className="mb-6">
          <p className="text-sm text-[#0b5b46]">{org.name}</p>
          <h1 className="mt-1 text-2xl font-bold">
            متابعة الخطة والإنجاز – مشروع تأهيل المربي
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            أدخل الخطة السنوية أولًا، وبعد اعتمادها يمكنك رفع الإنجاز الفعلي لكل
            نشاط، مع إمكانية إرفاق رابط إثبات اختياري.
          </p>
        </div>
        <Tabs defaultValue={requested}>
          <TabsList className="mb-5 h-auto bg-white p-2">
            <TabsTrigger value="plan">الخطة السنوية</TabsTrigger>
            <TabsTrigger value="achievement">رفع الإنجاز</TabsTrigger>
          </TabsList>
          <TabsContent value="plan">
            <PlanForm
              org={org}
              settings={data.settings}
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
    setBusy(true);
    try {
      await post({
        action: "savePlan",
        token,
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
    }
  };
  return (
    <div className="space-y-5">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <b>نسبة اكتمال الخطة</b>
              <p className="mt-1 text-xs text-slate-500">
                يتم التحديث تلقائيًا حسب البيانات المدخلة
              </p>
            </div>
            <b className="text-2xl text-[#0b5b46]">{c.progress}%</b>
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
      {c.missing.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardHeader>
            <CardTitle className="text-base text-rose-800">
              لا يمكن اعتماد الخطة حاليًا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm font-semibold text-rose-700">المتبقي:</p>
            <ul className="space-y-1 text-sm text-rose-700">
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
        <Button disabled={busy || !c.valid} onClick={() => save(true)}>
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
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-8 text-center">
          <h2 className="font-bold text-amber-900">
            رفع الإنجاز غير متاح حاليًا
          </h2>
          <p className="mt-2 text-sm text-amber-700">
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
              <p className="mt-1 text-xs text-slate-500">
                {completed} من {items.length} أنشطة تم تحديد حالتها
              </p>
            </div>
            <b className="text-2xl text-[#0b5b46]">{progress}%</b>
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
                dir="ltr"
                value={item.evidenceUrl}
                onChange={(e) => update(i, { evidenceUrl: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
              <p className="mt-1 text-xs text-slate-500">
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
            <I className="size-5 text-[#0b5b46]" />
            {title}
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500">
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
            <CalendarDays className="size-5 text-[#0b5b46]" />
            ورش العمل التدريبية
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500">
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
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm transition ${selected.includes(axis) ? "border-[#77aa9b] bg-[#edf5f2] text-[#0b5b46]" : "bg-white hover:bg-slate-50"}`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[#0b5b46]"
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
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
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
            <I className="size-5 text-[#0b5b46]" />
            {title}
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500">الحد الأدنى: {min}</p>
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
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
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
              className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
            >
              <span className="text-sm">{l}</span>
              <b className="text-xl text-[#0b5b46]">{v}</b>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>القراءة النوعية لحالة الجهات</CardTitle>
          <p className="text-sm text-slate-500">
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
                    style: "bg-amber-50 text-amber-800",
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
                        style: "bg-emerald-50 text-emerald-800",
                      }
                    : {
                        label: "متابعة الإنجاز",
                        note: `معدل الإنجاز ${rate}% ويحتاج استكمالًا`,
                        style: "bg-rose-50 text-rose-800",
                      };
            return (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
              >
                <div>
                  <b className="text-sm">{o.name}</b>
                  <p className="mt-1 text-xs text-slate-500">{insight.note}</p>
                </div>
                <Badge className={insight.style}>{insight.label}</Badge>
              </div>
            );
          })}
          {!rows.length && (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
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
        <p className="text-sm text-slate-500">
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
          <p className="mt-1 text-xs text-slate-500">
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
