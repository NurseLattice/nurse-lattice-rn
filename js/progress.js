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
    answers: { total: 0, correct: 0 }
  };
}

function normalizeProgress(value) {
  const source = value && typeof value === "object" ? value : {};
  const normalized = Object.assign(createDefaultProgress(), source);
  normalized.xp = Math.max(0, Number(normalized.xp) || 0);
  normalized.streak = Math.max(0, Number(normalized.streak) || 0);
  normalized.freeze = Math.max(0, Number(normalized.freeze) || 0);
  normalized.studyDates = Array.isArray(normalized.studyDates)
    ? [...new Set(normalized.studyDates.filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort()
    : [];
  normalized.completedLessons = Array.isArray(normalized.completedLessons)
    ? [...new Set(normalized.completedLessons.map(Number).filter(Number.isInteger))].sort((a, b) => a - b)
    : [];
  normalized.lastLessonId = Math.max(1, Number(normalized.lastLessonId) || 1);
  const answers = normalized.answers && typeof normalized.answers === "object" ? normalized.answers : {};
  normalized.answers = {
    total: Math.max(0, Number(answers.total) || 0),
    correct: Math.max(0, Number(answers.correct) || 0)
  };
  normalized.answers.correct = Math.min(normalized.answers.correct, normalized.answers.total);
  normalized.lastStudyDate = /^\d{4}-\d{2}-\d{2}$/.test(normalized.lastStudyDate || "")
    ? normalized.lastStudyDate
    : (normalized.studyDates.at(-1) || null);
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

function recordAnswer(progress, correct) {
  const state = normalizeProgress(progress);
  state.answers.total += 1;
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
  recordAnswer,
  completeLesson,
  loadProgress,
  saveProgress
};

if (typeof window !== "undefined") window.RNProgress = RNProgress;
if (typeof module !== "undefined") module.exports = RNProgress;
