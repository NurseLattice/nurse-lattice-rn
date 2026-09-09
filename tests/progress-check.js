const assert = require("assert");
const RNProgress = require("../js/progress.js");

let state = RNProgress.createDefaultProgress();
state = RNProgress.markStudyDay(state, "2026-09-01");
assert.equal(state.streak, 1);
assert.equal(state.studyDates.length, 1);
state = RNProgress.markStudyDay(state, "2026-09-01");
assert.equal(state.streak, 1, "same-day activity must not increase streak");
assert.equal(state.studyDates.length, 1, "same-day activity must count once");
state = RNProgress.markStudyDay(state, "2026-09-02");
assert.equal(state.streak, 2, "consecutive day must increase streak");
state = RNProgress.markStudyDay(state, "2026-09-04");
assert.equal(state.streak, 3, "one missed day uses freeze and preserves streak");
assert.equal(state.freeze, 0);
state = RNProgress.markStudyDay(state, "2026-09-07");
assert.equal(state.streak, 1, "missed days without freeze reset current streak");
assert.equal(state.studyDates.length, 4, "total study days never decrease when streak resets");

state = RNProgress.recordAnswer(state, true);
state = RNProgress.recordAnswer(state, false);
assert.deepEqual(state.answers, { total: 2, correct: 1 });
assert.equal(state.xp, 10);
state = RNProgress.completeLesson(state, 1);
assert.equal(state.xp, 60);
state = RNProgress.completeLesson(state, 1);
assert.equal(state.xp, 60, "lesson completion XP must be idempotent");

const memory = new Map();
const storage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
RNProgress.saveProgress(storage, state);
const restored = RNProgress.loadProgress(storage);
assert.deepEqual(restored, state, "reload must preserve RN progress");
assert.ok(RNProgress.RN_PROGRESS_KEY.startsWith("rnQuest"));
assert.ok(!RNProgress.RN_PROGRESS_KEY.toLowerCase().includes("fnp"));
console.log("Progress checks passed: streak, freeze, unique days, XP, completion, and reload persistence.");


const lessons = [1, 2, 3].map(id => ({ id }));
assert.equal(RNProgress.nextLessonIndex(state, lessons), 1, "continue must advance past a completed lesson");
assert.equal(RNProgress.nextLessonIndex({ ...state, lastLessonId: 3 }, lessons), 2, "resume an unfinished lesson");
assert.equal(RNProgress.nextLessonIndex({ completedLessons: [1, 2, 3], lastLessonId: 3 }, lessons), 2);
const legacy = RNProgress.normalizeProgress({ ...state, missedQuestionIds: undefined, lessonScores: undefined });
assert.deepEqual(legacy.completedLessons, state.completedLessons);
let review = RNProgress.recordAnswer(legacy, false, "rn-05-q04");
review = RNProgress.recordAnswer(review, false, "rn-05-q04");
assert.deepEqual(review.missedQuestionIds, ["rn-05-q04"], "missed IDs must be unique");
review = RNProgress.recordAnswer(review, true, "rn-05-q04");
assert.deepEqual(review.missedQuestionIds, []);
review = RNProgress.recordLessonScore(review, 5, 8, 10);
review = RNProgress.recordLessonScore(review, 5, 3, 10);
assert.deepEqual(review.lessonScores[5], { last: 3, total: 10, bestPercent: 80, attempts: 2 });
RNProgress.saveProgress(storage, review);
assert.deepEqual(RNProgress.loadProgress(storage), review);
assert.equal(RNProgress.normalizeProgress({ xp: Infinity }).xp, 0);
console.log("Legacy migration, next lesson, persistent missed questions and quiz history passed.");

assert.equal(RNProgress.currentStreak({ streak: 4, lastStudyDate: "2026-09-01", freeze: 0 }, "2026-09-03"), 0);
assert.equal(RNProgress.currentStreak({ streak: 4, lastStudyDate: "2026-09-01", freeze: 1 }, "2026-09-03"), 4);
assert.equal(RNProgress.currentStreak({ streak: 4, lastStudyDate: "2026-09-01", freeze: 1 }, "2026-09-04"), 0);
