const RN_PROGRESS_KEY = "rnQuestProgressV2:guest";

function createDefaultProgress() {
  return {
    xp: 0,
    streak: 0,
    freeze: 1,
    studyDates: [],
    lastStudyDate: null,
    completedLessons: [],
    lastLessonId: 1,
    answers: { total: 0, correct: 0 },
    missedQuestionIds: [],
    lessonScores: {}
  };
}

function nonnegativeInteger(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function normalizeProgress(value) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = Object.assign(createDefaultProgress(), source);
  normalized.xp = nonnegativeInteger(normalized.xp);
  normalized.streak = nonnegativeInteger(normalized.streak);
  normalized.freeze = nonnegativeInteger(normalized.freeze);
  normalized.studyDates = Array.isArray(normalized.studyDates)
    ? [...new Set(normalized.studyDates.filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort()
    : [];
  normalized.completedLessons = Array.isArray(normalized.completedLessons)
    ? [...new Set(normalized.completedLessons.map(Number).filter(id => Number.isInteger(id) && id > 0))].sort((a, b) => a - b)
    : [];
  normalized.lastLessonId = Math.max(1, nonnegativeInteger(normalized.lastLessonId));
  const answers = normalized.answers && typeof normalized.answers === "object" ? normalized.answers : {};
  normalized.answers = {
    total: nonnegativeInteger(answers.total),
    correct: nonnegativeInteger(answers.correct)
  };
  normalized.answers.correct = Math.min(normalized.answers.correct, normalized.answers.total);
  normalized.lastStudyDate = /^\d{4}-\d{2}-\d{2}$/.test(normalized.lastStudyDate || "")
    ? normalized.lastStudyDate
    : (normalized.studyDates.at(-1) || null);
  normalized.missedQuestionIds = Array.isArray(source.missedQuestionIds)
    ? [...new Set(source.missedQuestionIds.filter(id => typeof id === "string" && /^rn-\d+-q\d+$/.test(id)))] : [];
  normalized.lessonScores = {};
  for (const [id, score] of Object.entries(source.lessonScores || {})) {
    if (!/^\d+$/.test(id) || !score || typeof score !== "object") continue;
    const total = nonnegativeInteger(score.total);
    if (total) normalized.lessonScores[id] = {
      total, last: Math.min(total, nonnegativeInteger(score.last)),
      bestPercent: Math.min(100, nonnegativeInteger(score.bestPercent)),
      attempts: nonnegativeInteger(score.attempts)
    };
  }
  return normalized;
}

function dayNumber(dateKey) {
  const parts = dateKey.split("-").map(Number);
  return Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000;
}

function markStudyDay(progress, dateKey) {
  const state = normalizeProgress(progress);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("Study date must use YYYY-MM-DD");
  if (state.studyDates.includes(dateKey)) return state;

  state.studyDates.push(dateKey);
  state.studyDates.sort();
  if (!state.lastStudyDate) {
    state.streak = 1;
    state.lastStudyDate = dateKey;
    return state;
  }

  const difference = dayNumber(dateKey) - dayNumber(state.lastStudyDate);
  if (difference === 1) {
    state.streak += 1;
    state.lastStudyDate = dateKey;
  } else if (difference === 2 && state.freeze > 0) {
    state.freeze -= 1;
    state.streak += 1;
    state.lastStudyDate = dateKey;
  } else if (difference > 1) {
    state.streak = 1;
    state.lastStudyDate = dateKey;
  }
  return state;
}

function currentStreak(progress, today) {
  const state = normalizeProgress(progress);
  if (!state.lastStudyDate) return 0;
  const gap = dayNumber(today) - dayNumber(state.lastStudyDate);
  return gap <= 1 || (gap === 2 && state.freeze > 0) ? state.streak : 0;
}

function recordAnswer(progress, correct, questionId) {
  const state = normalizeProgress(progress);
  state.answers.total += 1;
  if (typeof questionId === "string" && /^rn-\d+-q\d+$/.test(questionId)) {
    state.missedQuestionIds = state.missedQuestionIds.filter(id => id !== questionId);
    if (!correct) state.missedQuestionIds.push(questionId);
  }
  if (correct) {
    state.answers.correct += 1;
    state.xp += 10;
  }
  return state;
}

function completeLesson(progress, lessonId) {
  const state = normalizeProgress(progress);
  if (!state.completedLessons.includes(lessonId)) {
    state.completedLessons.push(lessonId);
    state.completedLessons.sort((a, b) => a - b);
    state.xp += 50;
  }
  state.lastLessonId = lessonId;
  return state;
}

function recordLessonScore(progress, lessonId, score, total) {
  const state = normalizeProgress(progress);
  const previous = state.lessonScores[lessonId];
  state.lessonScores[lessonId] = { last: score, total,
    bestPercent: Math.max(previous?.bestPercent || 0, Math.round(score / total * 100)),
    attempts: (previous?.attempts || 0) + 1 };
  return normalizeProgress(state);
}

function nextLessonIndex(progress, lessons) {
  const state = normalizeProgress(progress);
  const last = lessons.findIndex(lesson => lesson.id === state.lastLessonId);
  if (last >= 0 && !state.completedLessons.includes(lessons[last].id)) return last;
  const next = lessons.findIndex(lesson => !state.completedLessons.includes(lesson.id));
  return next >= 0 ? next : Math.max(0, last);
}

function loadProgress(storage) {
  try {
    return normalizeProgress(JSON.parse(storage.getItem(RN_PROGRESS_KEY) || "null"));
  } catch (error) {
    console.warn("RN Quest progress could not be loaded", error);
    return createDefaultProgress();
  }
}

function saveProgress(storage, progress) {
  const normalized = normalizeProgress(progress);
  storage.setItem(RN_PROGRESS_KEY, JSON.stringify(normalized));
  return normalized;
}

const RNProgress = {
  RN_PROGRESS_KEY,
  createDefaultProgress,
  normalizeProgress,
  markStudyDay,
  currentStreak,
  recordAnswer,
  recordLessonScore,
  nextLessonIndex,
  completeLesson,
  loadProgress,
  saveProgress
};

if (typeof window !== "undefined") window.RNProgress = RNProgress;
if (typeof module !== "undefined") module.exports = RNProgress;
