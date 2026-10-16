export const ASSESSMENT_AXES = [
  {
    name: "وضوح التوجه التربوي",
    questions: [
      "لدى البيئة أهداف تربوية واضحة ومعلنة.",
      "توجد قيم تربوية محددة تسعى البيئة لتعزيزها.",
      "البرامج والأنشطة مرتبطة بالأهداف التربوية للبيئة.",
      "يعرف المربون الأدوار والنتائج التربوية المتوقعة منهم.",
    ],
  },
  {
    name: "كفاءة المربين",
    questions: [
      "يمتلك المربون المهارات اللازمة للتعامل مع المشاركين.",
      "يستطيع المربون بناء علاقة تربوية إيجابية مع المشاركين.",
      "يراعي المربون الفروق الفردية بين المشاركين.",
      "يحصل المربون على تطوير وتأهيل مستمر.",
    ],
  },
  {
    name: "التخطيط والتنفيذ",
    questions: [
      "توجد خطة تربوية واضحة للبيئة.",
      "تنفذ البرامج وفق خطة زمنية محددة.",
      "تتنوع الأساليب والأنشطة المستخدمة لتحقيق الأهداف.",
      "تتم مراجعة جودة تنفيذ البرامج بشكل دوري.",
    ],
  },
  {
    name: "المتابعة والتقويم",
    questions: [
      "توجد آلية واضحة لمتابعة تطور المشاركين.",
      "يتم توثيق الملاحظات والتغيرات على المشاركين.",
      "تستخدم نتائج التقييم في تحسين البرامج.",
      "توجد متابعة لأداء المربين وتقديم تغذية راجعة لهم.",
    ],
  },
  {
    name: "البيئة والعلاقات التربوية",
    questions: [
      "توفر البيئة مناخًا آمنًا ومحفزًا للمشاركين.",
      "تسود علاقات إيجابية قائمة على الاحترام والثقة.",
      "يشعر المشاركون بالانتماء للبيئة التربوية.",
      "تشجع البيئة المشاركين على المبادرة وتحمل المسؤولية.",
    ],
  },
  {
    name: "الأثر والاستدامة",
    questions: [
      "تظهر آثار البرامج التربوية على سلوك المشاركين.",
      "تستطيع البيئة تحديد جوانب التحسن لدى المشاركين.",
      "توجد ممارسات تضمن استمرار العمل التربوي وعدم ارتباطه بأفراد محددين.",
      "تستفيد البيئة من نتائجها السابقة في تطوير خططها المستقبلية.",
    ],
  },
] as const;

export type Audience = "community" | "staff";
// The ten statements cover the same six axes, in their original order.
export const COMMUNITY_AXES = [
  {
    name: ASSESSMENT_AXES[0].name,
    questions: [
      "ما مدى وضوح أهداف البرنامج للطالب؟",
      "إلى أي مدى تعزز الأنشطة قيم الاحترام والتعاون لدى الطالب؟",
    ],
  },
  {
    name: ASSESSMENT_AXES[1].name,
    questions: [
      "كيف تقيّم أسلوب المشرف في الاستماع إلى الطالب والتعامل معه باحترام؟",
      "إلى أي مدى يراعي المشرف قدرات الطالب واحتياجاته الفردية؟",
    ],
  },
  {
    name: ASSESSMENT_AXES[2].name,
    questions: ["ما مدى تنوع الأنشطة وملاءمتها لعمر الطالب واهتماماته؟"],
  },
  {
    name: ASSESSMENT_AXES[3].name,
    questions: [
      "ما مدى وضوح الملاحظات التي يقدمها المشرف للطالب أو ولي أمره عن تقدم الطالب؟",
    ],
  },
  {
    name: ASSESSMENT_AXES[4].name,
    questions: [
      "إلى أي مدى يشعر الطالب بالأمان والانتماء داخل البيئة؟",
      "ما مدى إتاحة فرص للطالب للمشاركة والمبادرة وتحمل المسؤولية؟",
    ],
  },
  {
    name: ASSESSMENT_AXES[5].name,
    questions: [
      "ما مقدار التحسن الملحوظ في سلوك الطالب ومهاراته نتيجة مشاركته؟",
      "إلى أي مدى يطبق الطالب ما يتعلمه في حياته اليومية خارج البيئة؟",
    ],
  },
] as const;
export type AssessmentInput = { audience?: string; answers: string | number[] };
export type GroupStats = {
  count: number;
  total: number | null;
  axisScores: (number | null)[];
};
export type PhaseStats = {
  community: GroupStats;
  staff: GroupStats;
  total: number | null;
  axisScores: (number | null)[];
};
const round = (n: number) => Math.round(n * 10) / 10;

export function phaseStats(responses: AssessmentInput[]): PhaseStats {
  const group = (audience: Audience): GroupStats => {
    const axes = audience === "community" ? COMMUNITY_AXES : ASSESSMENT_AXES;
    const length = audience === "community" ? 10 : 24;
    const sets = responses
      .filter((r) => (r.audience || "staff") === audience)
      .map((r) => {
        try {
          return typeof r.answers === "string"
            ? JSON.parse(r.answers)
            : r.answers;
        } catch {
          return [];
        }
      })
      .filter(
        (a): a is number[] =>
          Array.isArray(a) &&
          a.length === length &&
          a.every((n) => Number.isInteger(n) && n >= 1 && n <= 5),
      );
    let offset = 0;
    const axisScores = axes.map((axis) => {
      const start = offset;
      offset += axis.questions.length;
      return sets.length
        ? sets.reduce(
            (sum, a) =>
              sum +
              (a.slice(start, offset).reduce((s, n) => s + n, 0) /
                (axis.questions.length * 5)) *
                100,
            0,
          ) / sets.length
        : null;
    });
    return {
      count: sets.length,
      total: sets.length
        ? sets.reduce(
            (s, a) => s + (a.reduce((v, n) => v + n, 0) / (length * 5)) * 100,
            0,
          ) / sets.length
        : null,
      axisScores,
    };
  };
  const community = group("community"),
    staff = group("staff");
  const weighted = (c: number | null, s: number | null) =>
    c === null || s === null ? null : round(c * 0.2 + s * 0.8);
  // Weight unrounded group averages; round only the final displayed results.
  const total = weighted(community.total, staff.total);
  const axisScores = community.axisScores.map((c, i) =>
    weighted(c, staff.axisScores[i]),
  );
  for (const g of [community, staff]) {
    g.total = g.total === null ? null : round(g.total);
    g.axisScores = g.axisScores.map((n) => (n === null ? null : round(n)));
  }
  return { community, staff, total, axisScores };
}
export type ImprovementItem = {
  axis: string;
  baseline: number;
  target: number;
  action: string;
  responsible: string;
  durationDays: number;
  indicator: string;
};
export type ImprovementPlan = {
  createdAt: string;
  baseline: PhaseStats;
  items: ImprovementItem[];
};
const ACTIONS = [
  {
    action:
      "عقد لقاء لتحديد الأهداف والقيم التربوية ونشرها للطلاب وأولياء الأمور وربط الأنشطة بها.",
    indicator: "توثيق الأهداف والقيم وإعلانها ومراجعة ارتباط الأنشطة بها.",
    durationDays: 30,
  },
  {
    action:
      "تنفيذ ورشة للمربين عن التواصل الإيجابي ومراعاة الفروق الفردية، مع ملاحظة تطبيق المهارات وتقديم تغذية راجعة.",
    indicator: "توثيق الورشة وملاحظات تطبيق المهارات لدى المربين.",
    durationDays: 45,
  },
  {
    action:
      "إعداد جدول أنشطة متنوع يتضمن هدف كل نشاط وموعده ومسؤول التنفيذ ومراجعة الالتزام به.",
    indicator: "اعتماد جدول الأنشطة ومراجعة نسبة الأنشطة المنفذة في مواعيدها.",
    durationDays: 30,
  },
  {
    action:
      "تطبيق سجل مبسط لمتابعة تقدم الطلاب وتقديم تغذية راجعة دورية للطلاب وأولياء الأمور والمربين.",
    indicator: "اكتمال سجلات المتابعة وتوثيق التغذية الراجعة الدورية.",
    durationDays: 30,
  },
  {
    action:
      "مراجعة إجراءات الأمان والاحترام وإشراك الطلاب في مبادرات جماعية تعزز الانتماء وتحمل المسؤولية.",
    indicator: "توثيق مراجعة الأمان ومشاركة الطلاب في مبادرة واحدة على الأقل.",
    durationDays: 45,
  },
  {
    action:
      "تحديد سلوكيات ومهارات مستهدفة ومتابعة تطبيقها داخل البيئة وخارجها بالتعاون مع أولياء الأمور.",
    indicator: "توثيق شواهد تقدم الطلاب في السلوكيات والمهارات المستهدفة.",
    durationDays: 60,
  },
];
export function buildImprovementPlan(
  stats: PhaseStats,
  createdAt: string,
): ImprovementPlan {
  if (stats.total === null)
    throw new Error("يجب اكتمال ردود الفئتين قبل إنشاء خطة التحسين");
  const items = stats.axisScores
    .map((score, index) => ({ score: score!, index }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, 3)
    .map(({ score, index }) => ({
      axis: ASSESSMENT_AXES[index].name,
      baseline: score,
      target: Math.min(100, round(score + 10)),
      ...ACTIONS[index],
      responsible: "مسؤول البيئة بالتعاون مع المربين",
    }));
  return { createdAt, baseline: stats, items };
}
