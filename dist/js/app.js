const RN_THEME_KEY = "rnQuestThemeV1";
const JUDGMENT_STEPS = ["Recognize cues", "Analyze cues", "Prioritize hypotheses", "Generate solutions", "Take action", "Evaluate outcomes"];
let curriculum = null;
let progress = RNProgress.loadProgress(localStorage);
let currentLessonIndex = 0;
let currentQuiz = null;
let currentQuizTitle = "";
let lessonCache = new Map();
let quizCache = new Map();
let toastTimer = null;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return [year, month, day].join("-");
}

function toast(message) {
  const element = document.getElementById("toast");
  element.textContent = message;
  element.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove("show"), 1800);
}

function save() {
  progress = RNProgress.saveProgress(localStorage, progress);
  updateDashboard();
}

function setRoute(route) {
  document.querySelectorAll(".page").forEach(page => page.classList.toggle("active", page.id === route));
  document.querySelectorAll(".bottom-nav button").forEach(button => {
    const activeRoute = route === "lesson" || route === "learn" ? "learn" : route;
    button.classList.toggle("active", button.dataset.route === activeRoute);
  });
  if (route === "progress") renderProgress();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function initializeTheme() {
  const saved = localStorage.getItem(RN_THEME_KEY);
  const theme = saved === "dark" || saved === "light" ? saved : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  syncThemeButton();
}

function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  const button = document.getElementById("themeToggle");
  button.textContent = dark ? "☀" : "☾";
  button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(RN_THEME_KEY, next);
  syncThemeButton();
}

function moduleCard(lesson, index) {
  const complete = progress.completedLessons.includes(lesson.id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "module-card" + (complete ? " completed" : "");
  button.dataset.lessonIndex = String(index);
  button.innerHTML = '<span class="module-number">' + (complete ? "✓" : lesson.id) + '</span><span class="module-copy"><b>' + lesson.cardTitle + '</b><small>' + lesson.summary + '</small></span><span class="module-weight">' + lesson.weight + '</span>';
  button.addEventListener("click", () => openLesson(index));
  return button;
}

function renderCurriculum() {
  [document.getElementById("curriculumList"), document.getElementById("learnList")].forEach(container => {
    container.replaceChildren(...curriculum.lessons.map(moduleCard));
  });
}

function updateDashboard() {
  if (!curriculum) return;
  const level = Math.floor(progress.xp / 500) + 1;
  const withinLevel = progress.xp % 500;
  document.getElementById("level").textContent = level;
  document.getElementById("xp").textContent = progress.xp;
  document.getElementById("xpBar").style.width = String(withinLevel / 5) + "%";
  document.getElementById("streak").textContent = progress.streak;
  document.getElementById("studyDays").textContent = progress.studyDates.length;
  document.getElementById("freeze").textContent = progress.freeze;
  document.getElementById("completionSummary").textContent = progress.completedLessons.length + " / " + curriculum.lessons.length + " complete";
  const nextIndex = Math.max(0, Math.min(curriculum.lessons.length - 1, progress.lastLessonId - 1));
  const continueButton = document.getElementById("continueButton");
  continueButton.textContent = progress.completedLessons.length ? "Continue Lesson " + curriculum.lessons[nextIndex].id : "Start Lesson 1";
  continueButton.onclick = () => openLesson(nextIndex);
  renderCurriculum();
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load " + path);
  return response.json();
}

async function loadLesson(index) {
  const item = curriculum.lessons[index];
  if (!lessonCache.has(item.id)) lessonCache.set(item.id, await fetchJson(item.lessonFile));
  return lessonCache.get(item.id);
}

async function loadQuiz(index) {
  const item = curriculum.lessons[index];
  if (!quizCache.has(item.id)) quizCache.set(item.id, await fetchJson(item.quizFile));
  return quizCache.get(item.id);
}

async function openLesson(index) {
  try {
    currentLessonIndex = index;
    const item = curriculum.lessons[index];
    const lesson = await loadLesson(index);
    progress = RNProgress.markStudyDay(progress, localDateKey());
    progress.lastLessonId = item.id;
    save();
    const body = document.getElementById("lessonBody");
    const courseLabel = item.course ? item.course + " · NCLEX tag: " + item.category + " " + item.weight : item.category + " · " + item.weight;
    body.innerHTML = '<span class="eyebrow">' + courseLabel + '</span><h1 id="lessonTitle">' + lesson.title + "</h1>" + lesson.html + '<p class="source-note">Blueprint source: <a href="https://www.nclex.com/test-plans" target="_blank" rel="noopener noreferrer">2026 NCLEX-RN Test Plan</a>. Educational content last reviewed September 2026.</p>';
    setRoute("lesson");
  } catch (error) {
    console.error(error);
    toast("This lesson could not be loaded.");
  }
}

async function startLessonQuiz() {
  try {
    const data = await loadQuiz(currentLessonIndex);
    currentQuiz = RNQuiz.createQuizSession(data.questions, { mode: "lesson", lessonId: curriculum.lessons[currentLessonIndex].id });
    currentQuizTitle = curriculum.lessons[currentLessonIndex].cardTitle;
    startQuizUI();
  } catch (error) {
    console.error(error);
    toast("The quiz could not be loaded.");
  }
}

async function startPractice() {
  try {
    document.getElementById("practiceButton").disabled = true;
    const banks = await Promise.all(curriculum.lessons.map((lesson, index) => loadQuiz(index)));
    const questions = banks.flatMap((bank, index) => bank.questions.map(question => Object.assign({}, question, { lessonId: curriculum.lessons[index].id })));
    currentQuiz = RNQuiz.createQuizSession(RNQuiz.shuffleQuestions(questions).slice(0, Math.min(10, questions.length)), { mode: "practice" });
    currentQuizTitle = "Mixed RN practice";
    startQuizUI();
  } catch (error) {
    console.error(error);
    toast("Practice could not be loaded.");
  } finally {
    document.getElementById("practiceButton").disabled = false;
  }
}

function startQuizUI() {
  progress = RNProgress.markStudyDay(progress, localDateKey());
  save();
  document.getElementById("quizLabel").textContent = currentQuiz.mode === "lesson" ? "LESSON QUIZ" : "MIXED PRACTICE";
  renderQuestion();
  setRoute("quiz");
}

function renderQuestion() {
  const question = currentQuiz.questions[currentQuiz.current];
  document.getElementById("questionNumber").textContent = currentQuiz.current + 1;
  document.getElementById("questionTotal").textContent = currentQuiz.questions.length;
  document.getElementById("questionProgress").style.width = String((currentQuiz.current + 1) / currentQuiz.questions.length * 100) + "%";
  document.getElementById("questionStep").textContent = JUDGMENT_STEPS.includes(question.clinicalJudgmentStep) ? question.clinicalJudgmentStep : "Clinical judgment";
  document.getElementById("questionText").textContent = question.question;
  const choices = document.getElementById("answerChoices");
  choices.replaceChildren(...question.choices.map((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-choice";
    button.innerHTML = '<span class="choice-letter">' + String.fromCharCode(65 + index) + "</span><span>" + choice + "</span>";
    button.addEventListener("click", () => selectAnswer(index));
    return button;
  }));
  const rationale = document.getElementById("answerRationale");
  rationale.hidden = true;
  rationale.textContent = "";
  document.getElementById("nextQuestionButton").hidden = true;
}

function selectAnswer(selectedIndex) {
  const result = RNQuiz.answerCurrentQuestion(currentQuiz, selectedIndex);
  if (result.repeated) return;
  const buttons = [...document.querySelectorAll(".answer-choice")];
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === result.correctIndex) button.classList.add("correct");
    if (index === selectedIndex && !result.correct) button.classList.add("incorrect");
  });
  progress = RNProgress.recordAnswer(progress, result.correct);
  save();
  const rationale = document.getElementById("answerRationale");
  rationale.innerHTML = "<b>" + (result.correct ? "Correct" : "Best answer: " + String.fromCharCode(65 + result.correctIndex)) + "</b><span>" + result.explanation + "</span>";
  rationale.hidden = false;
  const next = document.getElementById("nextQuestionButton");
  next.textContent = currentQuiz.current === currentQuiz.questions.length - 1 ? "See results" : "Next question";
  next.hidden = false;
}

function nextQuestion() {
  if (RNQuiz.advanceQuestion(currentQuiz)) renderQuestion();
  else finishQuiz();
}

function finishQuiz() {
  if (currentQuiz.mode === "lesson") {
    progress = RNProgress.completeLesson(progress, currentQuiz.lessonId);
    save();
  }
  document.getElementById("resultsTitle").textContent = currentQuizTitle + " complete";
  document.getElementById("resultScore").textContent = currentQuiz.score;
  document.getElementById("resultTotal").textContent = currentQuiz.questions.length;
  const percentage = currentQuiz.score / currentQuiz.questions.length;
  document.getElementById("resultMessage").textContent = percentage >= .8 ? "Strong shift. Keep applying the same reasoning to new cues." : percentage >= .6 ? "Good foundation. Review the rationales before the next shift." : "Review the lesson, then try the questions again with safety and priority in mind.";
  setRoute("results");
}

function renderProgress() {
  if (!curriculum) return;
  document.getElementById("progressXp").textContent = progress.xp;
  document.getElementById("progressStreak").textContent = progress.streak + " days";
  document.getElementById("progressStudyDays").textContent = progress.studyDates.length;
  document.getElementById("progressAccuracy").textContent = progress.answers.total ? Math.round(progress.answers.correct / progress.answers.total * 100) + "%" : "—";
  document.getElementById("moduleProgress").innerHTML = curriculum.lessons.map(lesson => '<div class="progress-row"><div><b>' + lesson.cardTitle + "</b><br><span>" + lesson.category + '</span></div><b>' + (progress.completedLessons.includes(lesson.id) ? "Complete" : "Not started") + "</b></div>").join("");
}

function bindEvents() {
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("lessonQuizButton").addEventListener("click", startLessonQuiz);
  document.getElementById("nextQuestionButton").addEventListener("click", nextQuestion);
  document.getElementById("quizBackButton").addEventListener("click", () => setRoute(currentQuiz && currentQuiz.mode === "lesson" ? "lesson" : "home"));
  document.getElementById("resultsHomeButton").addEventListener("click", () => setRoute("home"));
  document.getElementById("practiceButton").addEventListener("click", startPractice);
  document.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", () => setRoute(button.dataset.route)));
  document.querySelectorAll("[data-action='practice']").forEach(button => button.addEventListener("click", startPractice));
}

async function initializeApp() {
  initializeTheme();
  bindEvents();
  try {
    curriculum = await fetchJson("data/curriculum.json");
    updateDashboard();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(error => console.warn("Offline support unavailable", error));
  } catch (error) {
    console.error(error);
    document.getElementById("curriculumList").innerHTML = '<article class="notice-card"><b>Curriculum unavailable</b><p>Reload while connected to continue.</p></article>';
  }
}

window.addEventListener("DOMContentLoaded", initializeApp);
