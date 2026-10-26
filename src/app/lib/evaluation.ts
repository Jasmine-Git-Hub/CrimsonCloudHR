// 360° performance evaluation: supervisor + peers + self, plus an attendance
// metric computed from timesheets (nobody rates attendance by hand).
// Pure functions only, so tests/evaluation.test.ts can run them under node.

export type RaterType = "supervisor" | "peer" | "self";

/** Share of each rater group in the behavioural categories (must total 1). */
export const RATER_WEIGHTS: Record<RaterType, number> = { supervisor: 0.5, peer: 0.3, self: 0.2 };

export const RATER_LABELS: Record<RaterType, string> = {
  supervisor: "Supervisor",
  peer: "Peer",
  self: "Self",
};

export const SCALE = [
  { value: 5, label: "Outstanding" },
  { value: 4, label: "Very Satisfactory" },
  { value: 3, label: "Satisfactory" },
  { value: 2, label: "Fair" },
  { value: 1, label: "Needs Improvement" },
] as const;

export type CategoryKey = "workQuality" | "productivity" | "teamwork" | "communication" | "problemSolving";

export interface RubricCategory {
  key: CategoryKey;
  title: string;
  questions: { id: string; text: string }[];
}

// Observable behaviours, not personality traits, so every rater judges the same thing.
export const RUBRIC: RubricCategory[] = [
  {
    key: "workQuality",
    title: "A. Quality of Work",
    questions: [
      { id: "wq1", text: "Produces accurate, thorough and error-free work." },
      { id: "wq2", text: "Follows company standards, policies and procedures." },
      { id: "wq3", text: "Checks own work before submitting it." },
    ],
  },
  {
    key: "productivity",
    title: "B. Productivity",
    questions: [
      { id: "pr1", text: "Completes assigned tasks on or before deadlines." },
      { id: "pr2", text: "Manages time well and handles a fair workload." },
      { id: "pr3", text: "Works with little need for follow-up or supervision." },
    ],
  },
  {
    key: "teamwork",
    title: "C. Teamwork",
    questions: [
      { id: "tw1", text: "Cooperates and shares knowledge with co-workers." },
      { id: "tw2", text: "Treats others with respect and courtesy." },
      { id: "tw3", text: "Contributes to team goals, not only personal tasks." },
    ],
  },
  {
    key: "communication",
    title: "D. Communication",
    questions: [
      { id: "cm1", text: "Explains ideas clearly in speech and writing." },
      { id: "cm2", text: "Listens and responds well to feedback." },
      { id: "cm3", text: "Keeps the team and supervisor updated on progress and issues." },
    ],
  },
  {
    key: "problemSolving",
    title: "E. Problem Solving",
    questions: [
      { id: "ps1", text: "Identifies problems early and raises them." },
      { id: "ps2", text: "Proposes practical solutions, not only reports problems." },
      { id: "ps3", text: "Adapts well to changes and new situations." },
    ],
  },
];

export const ALL_QUESTION_IDS = RUBRIC.flatMap((c) => c.questions.map((q) => q.id));

export const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const isComplete = (answers: Record<string, number>) =>
  ALL_QUESTION_IDS.every((id) => answers[id] >= 1 && answers[id] <= 5);

/** Category averages and overall average (1–5) for one submitted form. */
export function scoreResponse(answers: Record<string, number>) {
  const categoryScores = Object.fromEntries(
    RUBRIC.map((c) => [c.key, round1(mean(c.questions.map((q) => answers[q.id])))]),
  ) as Record<CategoryKey, number>;
  return { categoryScores, score: round1(mean(Object.values(categoryScores))) };
}

export function interpret(score: number) {
  if (score >= 4.5) return "Excellent";
  if (score >= 3.5) return "Very Good";
  if (score >= 2.5) return "Good";
  if (score >= 1.5) return "Needs Improvement";
  return "Poor";
}

// ---------------------------------------------------------------------------
// Review periods (quarters) and document IDs
// ---------------------------------------------------------------------------

/** "Q4 2026" → { id: "2026-Q4", start: "2026-10-01", end: "2026-12-31" } */
export function quarterPeriod(label: string) {
  const m = /^Q([1-4]) (\d{4})$/.exec(label.trim());
  if (!m) throw new Error(`Bad review period: ${label}`);
  const q = Number(m[1]);
  const year = Number(m[2]);
  const startMonth = (q - 1) * 3;
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, startMonth + 3, 0)).getUTCDate();
  return {
    id: `${year}-Q${q}`,
    start: `${year}-${pad(startMonth + 1)}-01`,
    end: `${year}-${pad(startMonth + 3)}-${pad(lastDay)}`,
  };
}

export function quarterLabels(today: string, count = 4) {
  let year = Number(today.slice(0, 4));
  let q = Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1;
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    labels.push(`Q${q} ${year}`);
    if (--q === 0) { q = 4; year--; }
  }
  return labels;
}

/** Same ID for the request and its response, so firestore.rules can match them. */
export const evaluationDocId = (periodId: string, subjectEmpId: string, type: RaterType, reviewerEmpId: string) =>
  `${periodId}__${subjectEmpId}__${type}__${reviewerEmpId}`;

// ---------------------------------------------------------------------------
// Attendance metric (system-computed)
// ---------------------------------------------------------------------------

/** Time-ins after this count as late. */
export const LATE_AFTER = "09:00";

export interface AttendanceTimesheet { date: string; timeIn?: string; status?: string }
export interface AttendanceLeave { start_date: string; end_date: string; status?: string }

const DAY = 86_400_000;
const toUTC = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const weekdays = (start: string, end: string) => {
  const out: string[] = [];
  for (let t = toUTC(start); t <= toUTC(end); t += DAY) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
};

/**
 * Attendance (70%) and punctuality (30%) over the period up to `today`,
 * mapped to 1–5. Approved leave days are excused. Returns null with no workdays.
 */
export function attendanceMetric(
  timesheets: AttendanceTimesheet[],
  leaves: AttendanceLeave[],
  start: string,
  end: string,
  today: string,
) {
  const last = end < today ? end : today;
  if (last < start) return null;

  const excused = new Set(
    leaves
      .filter((l) => l.status === "Approved")
      .flatMap((l) => weekdays(l.start_date > start ? l.start_date : start, l.end_date < last ? l.end_date : last)),
  );
  const expected = weekdays(start, last).filter((d) => !excused.has(d));
  if (expected.length === 0) return null;

  const expectedSet = new Set(expected);
  const byDate = new Map<string, string>();
  for (const t of timesheets) {
    if (t.status === "Rejected" || !t.timeIn || !expectedSet.has(t.date)) continue;
    byDate.set(t.date, t.timeIn);
  }
  const present = byDate.size;
  const late = [...byDate.values()].filter((tin) => tin > LATE_AFTER).length;

  const attendanceRate = present / expected.length;
  const punctualityRate = present ? 1 - late / present : 0;
  return {
    expectedDays: expected.length,
    presentDays: present,
    absentDays: expected.length - present,
    lateDays: late,
    attendanceRate: round1(attendanceRate * 100),
    punctualityRate: round1(punctualityRate * 100),
    score: round1(1 + 4 * (0.7 * attendanceRate + 0.3 * punctualityRate)),
  };
}

// ---------------------------------------------------------------------------
// Final score
// ---------------------------------------------------------------------------

export interface SubmittedResponse { type: RaterType; categoryScores: Record<CategoryKey, number> }

/**
 * Each behavioural category = weighted average of the rater groups that answered
 * (peers averaged first; weights re-normalised if a group is missing).
 * Attendance is a sixth category from timesheets. Final = mean of categories.
 */
export function combine360(responses: SubmittedResponse[], attendanceScore: number | null) {
  const present = (Object.keys(RATER_WEIGHTS) as RaterType[]).filter((t) => responses.some((r) => r.type === t));
  const weightSum = present.reduce((a, t) => a + RATER_WEIGHTS[t], 0);

  const byGroup = Object.fromEntries(
    present.map((t) => {
      const group = responses.filter((r) => r.type === t);
      const cats = Object.fromEntries(
        RUBRIC.map((c) => [c.key, mean(group.map((r) => r.categoryScores[c.key]))]),
      ) as Record<CategoryKey, number>;
      return [t, { count: group.length, score: round1(mean(Object.values(cats))), cats }];
    }),
  ) as Partial<Record<RaterType, { count: number; score: number; cats: Record<CategoryKey, number> }>>;

  const categories = Object.fromEntries(
    RUBRIC.map((c) => [
      c.key,
      weightSum ? round1(present.reduce((a, t) => a + byGroup[t]!.cats[c.key] * RATER_WEIGHTS[t], 0) / weightSum) : 0,
    ]),
  ) as Record<CategoryKey, number>;

  const parts = [...Object.values(categories), ...(attendanceScore == null ? [] : [attendanceScore])];
  const averageScore = round1(mean(parts));

  return {
    ratings: { ...categories, attendance: attendanceScore ?? 0 },
    averageScore,
    interpretation: interpret(averageScore),
    raterScores: Object.fromEntries(present.map((t) => [t, { score: byGroup[t]!.score, count: byGroup[t]!.count }])),
    effectiveWeights: Object.fromEntries(present.map((t) => [t, round1((RATER_WEIGHTS[t] / weightSum) * 100)])),
    missing: (Object.keys(RATER_WEIGHTS) as RaterType[]).filter((t) => !present.includes(t)),
  };
}
