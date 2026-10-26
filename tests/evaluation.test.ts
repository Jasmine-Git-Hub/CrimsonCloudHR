// Run: npm run test:unit   (Node 24 runs TypeScript directly)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_QUESTION_IDS, scoreResponse, isComplete, quarterPeriod, quarterLabels,
  attendanceMetric, combine360, evaluationDocId,
} from '../src/app/lib/evaluation.ts';

const allAnswers = (v: number) => Object.fromEntries(ALL_QUESTION_IDS.map((id) => [id, v]));

test('scoreResponse averages questions per category, then categories', () => {
  const answers = allAnswers(4);
  answers.wq1 = 1; // quality: (1+4+4)/3 = 3
  const r = scoreResponse(answers);
  assert.equal(r.categoryScores.workQuality, 3);
  assert.equal(r.categoryScores.teamwork, 4);
  assert.equal(r.score, 3.8);
});

test('isComplete requires every question answered 1–5', () => {
  assert.equal(isComplete(allAnswers(5)), true);
  const missing = allAnswers(5);
  delete missing.ps3;
  assert.equal(isComplete(missing), false);
  assert.equal(isComplete({ ...allAnswers(5), wq1: 6 }), false);
});

test('quarter periods and labels', () => {
  assert.deepEqual(quarterPeriod('Q4 2026'), { id: '2026-Q4', start: '2026-10-01', end: '2026-12-31' });
  assert.deepEqual(quarterPeriod('Q1 2028'), { id: '2028-Q1', start: '2028-01-01', end: '2028-03-31' });
  assert.deepEqual(quarterLabels('2026-02-10', 3), ['Q1 2026', 'Q4 2025', 'Q3 2025']);
  assert.equal(evaluationDocId('2026-Q4', 'E1', 'peer', 'E2'), '2026-Q4__E1__peer__E2');
});

test('attendance: approved leave is excused, late time-ins lower punctuality', () => {
  // Mon 5 – Fri 9 Jan 2026 = 5 workdays; Fri is approved leave → 4 expected.
  const ts = [
    { date: '2026-01-05', timeIn: '08:30' },
    { date: '2026-01-06', timeIn: '09:30' }, // late
    { date: '2026-01-07', timeIn: '08:00', status: 'Rejected' }, // doesn't count
    { date: '2026-01-08', timeIn: '08:55' },
  ];
  const leaves = [{ start_date: '2026-01-09', end_date: '2026-01-09', status: 'Approved' }];
  const m = attendanceMetric(ts, leaves, '2026-01-05', '2026-01-09', '2026-01-31')!;
  assert.equal(m.expectedDays, 4);
  assert.equal(m.presentDays, 3);
  assert.equal(m.lateDays, 1);
  // 1 + 4 * (0.7*0.75 + 0.3*(2/3)) = 3.9
  assert.equal(m.score, 3.9);
});

test('attendance only counts days up to today; perfect record scores 5', () => {
  const ts = [{ date: '2026-01-05', timeIn: '08:00' }, { date: '2026-01-06', timeIn: '08:10' }];
  const m = attendanceMetric(ts, [], '2026-01-05', '2026-03-31', '2026-01-06')!;
  assert.equal(m.expectedDays, 2);
  assert.equal(m.score, 5);
  assert.equal(attendanceMetric([], [], '2026-04-01', '2026-06-30', '2026-01-06'), null);
});

test('360: 50/30/20 weights, peers averaged, attendance as sixth category', () => {
  const cats = (v: number) => ({ workQuality: v, productivity: v, teamwork: v, communication: v, problemSolving: v });
  const r = combine360([
    { type: 'supervisor', categoryScores: cats(4) },
    { type: 'peer', categoryScores: cats(3) },
    { type: 'peer', categoryScores: cats(5) }, // peers average 4
    { type: 'self', categoryScores: cats(5) },
  ], 3.2);
  // behaviour = 4*.5 + 4*.3 + 5*.2 = 4.2 ; final = (5*4.2 + 3.2)/6 = 4.03
  assert.equal(r.ratings.teamwork, 4.2);
  assert.equal(r.averageScore, 4);
  assert.equal(r.interpretation, 'Very Good');
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.raterScores.peer, { score: 4, count: 2 });
});

test('360: missing rater groups are re-weighted, not counted as zero', () => {
  const cats = (v: number) => ({ workQuality: v, productivity: v, teamwork: v, communication: v, problemSolving: v });
  const r = combine360([{ type: 'supervisor', categoryScores: cats(4) }, { type: 'self', categoryScores: cats(5) }], null);
  // weights 0.5/0.7 and 0.2/0.7 → 4*0.714 + 5*0.286 = 4.29
  assert.equal(r.averageScore, 4.3);
  assert.deepEqual(r.missing, ['peer']);
  assert.deepEqual(r.effectiveWeights, { supervisor: 71.4, self: 28.6 });
});
