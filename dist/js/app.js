const RN_THEME_KEY = "rnQuestThemeV1";
const JUDGMENT_STEPS = ["Recognize cues", "Analyze cues", "Prioritize hypotheses", "Generate solutions", "Take action", "Evaluate outcomes"];
let curriculum = null;
let roadmap = null;
let progress = RNProgress.loadProgress(localStorage);
let currentLessonIndex = 0;
let currentQuiz = null;
let currentQuizTitle = "";
let lessonCache = new Map();
let quizCache = new Map();
let toastTimer = null;
let loadingQuiz = false;
let navigationEpoch = 0;
const phaseDisclosureState = new Map();

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
  try { progress = RNProgress.saveProgress(localStorage, progress); }
  catch (error) { toast("Progress cannot be saved on this device. Keep this tab open and check browser storage."); }
  updateDashboard();
}

function setRoute(route) {
  navigationEpoch += 1;
  document.querySelectorAll(".page").forEach(page => page.classList.toggle("active", page.id === route));
  document.querySelectorAll(".bottom-nav button").forEach(button => {
    const activeRoute = route === "lesson" || route === "learn" ? "learn" : route;
    button.classList.toggle("active", button.dataset.route === activeRoute);
  });
  if (route === "progress") renderProgress();
  window.scrollTo({ top: 0, behavior: "instant" });
  const heading = document.querySelector("#" + route + " h1");
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}

function initializeTheme() {
  let saved;
  try { saved = localStorage.getItem(RN_THEME_KEY); } catch (error) { /* Theme remains available without storage. */ }
  const theme = saved === "dark" || saved === "light" ? saved : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  syncThemeButton();
}

function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  const button = document.getElementById("themeToggle");
  button.textContent = dark ? "☀ Light" : "☾ Dark";
  button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  button.setAttribute("title", dark ? "Switch to light theme" : "Switch to dark theme");
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(RN_THEME_KEY, next); } catch (error) { toast("Theme changed for this session only."); }
  syncThemeButton();
}

function moduleCard(lesson, index) {
  const complete = progress.completedLessons.includes(lesson.id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "module-card" + (complete ? " completed" : "");
  button.dataset.lessonIndex = String(index);
  button.innerHTML = '<span class="module-number">' + (complete ? "✓" : lesson.id) + '</span><span class="module-copy"><b>' + lesson.cardTitle + '</b><small>' + lesson.summary + '</small></span><span class="module-weight">' + (complete ? "Quiz completed" : "10 questions") + '</span>';
  button.addEventListener("click", () => openLesson(index));
  return button;
}

function phaseCard(phase, phaseIndex, expandedPhases) {
  const [firstLesson, lastLesson] = phase.lessonRange;
  const lessons = curriculum.lessons.filter(lesson => lesson.id >= firstLesson && lesson.id <= lastLesson);
  const section = document.createElement("details");
  section.className = "course-phase" + (lessons.length ? " course-phase-active" : "");
  section.dataset.phaseIndex = String(phaseIndex);
  section.open = expandedPhases.has(phaseIndex);
  const status = lessons.length ? lessons.length + " / " + (lastLesson - firstLesson + 1) + " lessons available" : "Coming soon";
  const summary = document.createElement("summary");
  summary.className = "course-phase-summary";
  summary.innerHTML = '<div class="course-phase-header"><div class="course-phase-copy"><span class="eyebrow">PART ' + (phaseIndex + 1) + '</span><h2>' + phase.title + '</h2><p>Lessons ' + firstLesson + '–' + lastLesson + '</p></div><div class="phase-header-actions"><span class="phase-status">' + status + '</span><span class="phase-chevron" aria-hidden="true">⌄</span></div></div>';
  section.append(summary);
  const body = document.createElement("div");
  body.className = "course-phase-body";
  if (lessons.length) {
    const list = document.createElement("div");
    list.className = "phase-module-list";
    list.append(...lessons.map(lesson => moduleCard(lesson, curriculum.lessons.indexOf(lesson))));
    body.append(list);
  } else {
    const message = document.createElement("p");
    message.className = "phase-message";
    message.textContent = "This course is mapped and will unlock as its lessons are authored.";
    body.append(message);
  }
  section.append(body);
  section.addEventListener("toggle", () => {
    if (section.open) expandedPhases.add(phaseIndex);
    else expandedPhases.delete(phaseIndex);
  });
  return section;
}

function renderCurriculum() {
  if (!curriculum || !roadmap) return;
  const nextLesson = curriculum.lessons[RNProgress.nextLessonIndex(progress, curriculum.lessons)];
  const currentPhaseIndex = Math.max(0, roadmap.phases.findIndex(phase =>
    nextLesson.id >= phase.lessonRange[0] && nextLesson.id <= phase.lessonRange[1]));
  [document.getElementById("curriculumList"), document.getElementById("learnList")].forEach(container => {
    let expandedPhases = phaseDisclosureState.get(container.id);
    if (!expandedPhases) {
      expandedPhases = new Set([currentPhaseIndex]);
      phaseDisclosureState.set(container.id, expandedPhases);
    }
    container.replaceChildren(...roadmap.phases.map((phase, phaseIndex) => phaseCard(phase, phaseIndex, expandedPhases)));
  });
}

function updateDashboard() {
  if (!curriculum) return;
  const level = Math.floor(progress.xp / 500) + 1;
  const withinLevel = progress.xp % 500;
  document.getElementById("level").textContent = level;
  document.getElementById("xp").textContent = progress.xp;
  document.getElementById("xpBar").style.width = String(withinLevel / 5) + "%";
  document.getElementById("streak").textContent = RNProgress.currentStreak(progress, localDateKey());
  document.getElementById("studyDays").textContent = progress.studyDates.length;
  document.getElementById("freeze").textContent = progress.freeze;
  document.getElementById("completionSummary").textContent = progress.completedLessons.length + " / " + curriculum.lessons.length + " available complete";
  const nextIndex = RNProgress.nextLessonIndex(progress, curriculum.lessons);
  const continueButton = document.getElementById("continueButton");
  const nextLesson = curriculum.lessons[nextIndex];
  continueButton.textContent = (progress.completedLessons.includes(nextLesson.id) ? "Review Lesson " : "Continue Lesson ") + nextLesson.id;
  document.getElementById("reviewButton").textContent = "Review missed questions (" + progress.missedQuestionIds.length + ")";
  document.getElementById("reviewButton").disabled = !progress.missedQuestionIds.length;
  document.getElementById("availabilitySummary").textContent = curriculum.lessons.length + " lessons available · 184 planned across 12 courses";
  continueButton.onclick = () => openLesson(nextIndex);
  renderCurriculum();
}

async function fetchJson(path) {
  const response = await fetch(path + "?v=" + RN_APP_VERSION.replace(/^v/, ""));
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

function lessonContent(item, lesson) {
  if (item.id !== 44) return lesson.html;
  const nextSection = "<h2>Coronary perfusion must match myocardial demand</h2>";
  const preloadAfterloadGuide = '<div class="clinical-callout"><b>Preload fills the heart; afterload resists its ejection</b><br>Think of the ventricle as a water pump. Preload is how much the pump fills and stretches before it squeezes. Afterload is the pressure or resistance the pump must overcome to move blood through the outlet.</div>' +
    '<h3>Connect preload to EDV and venous return</h3><p>Preload occurs at the end of diastole, just before contraction. Strictly, it is myocardial fiber stretch or wall stress created by filling; <b>end-diastolic volume (EDV)</b> and end-diastolic pressure are useful clinical estimates, not perfect synonyms. Venous return is a major determinant: greater return generally increases EDV and preload, while hemorrhage, dehydration, venodilation, or excessive diuresis can reduce them.</p>' +
    '<p>Within the useful part of the <b>Frank–Starling relationship</b>, increased filling stretches myocardial fibers and can raise contraction force and stroke volume. This response has a limit. A weak or stiff failing ventricle may be on the flatter part of the curve; additional volume then produces little forward-flow benefit while filling pressure, pulmonary congestion, edema, or both worsen.</p>' +
    '<h3>Connect afterload to ESV and arterial resistance</h3><p>Afterload acts during systolic ejection. The left ventricle must generate enough pressure to open the aortic valve and eject into the arterial system. Aortic pressure, systemic vascular resistance, arterial stiffness, and outflow obstruction all contribute. When afterload rises and contractility does not compensate, less blood is ejected and more remains after contraction, increasing <b>end-systolic volume (ESV)</b>.</p>' +
    '<p><b>Stroke volume (SV) = EDV − ESV.</b> An EDV of 120 mL and ESV of 50 mL produces an SV of 70 mL. If greater afterload raises ESV to 70 mL while EDV is initially unchanged, SV falls to 50 mL. <b>Ejection fraction (EF) = SV ÷ EDV × 100%.</b> EF is a proportion, so interpret it with the actual volumes and the client’s clinical state.</p>' +
    '<div class="hemodynamic-compare" role="group" aria-label="Preload and afterload comparison"><p><b>Preload</b><span>Before systole · filling and fiber stretch · closely linked to venous return and EDV · usually raises SV within physiologic limits</span></p><p><b>Afterload</b><span>During systole · resistance to ejection · influenced by aortic pressure and vascular resistance · usually lowers SV and raises ESV when increased</span></p></div>' +
    '<h3>Apply the distinction to heart failure</h3><p>A client can have both high preload and high afterload. In decompensated heart failure, sodium and water retention and venous congestion can raise filling pressures, while hypertension or vasoconstriction can make ejection more difficult. The combination can reduce forward flow and worsen pulmonary or systemic congestion.</p>' +
    '<p>Therapies change several variables and are not interchangeable shortcuts. Diuresis and venodilation can reduce excessive filling pressure; arterial vasodilation can reduce resistance to ejection. Nitrates often have prominent venodilating and preload-reducing effects, while renin–angiotensin system therapies can reduce vascular resistance as part of broader heart-failure treatment. The RN assesses the indication and monitors blood pressure, symptoms, lung findings, perfusion, kidney function, electrolytes, and response because excessive preload reduction or vasodilation can cause hypotension and lower stroke volume.</p>';
  return lesson.html.replace(nextSection, preloadAfterloadGuide + nextSection);
}

async function openLesson(index) {
  try {
    const requestEpoch = ++navigationEpoch;
    const item = curriculum.lessons[index];
    const lesson = await loadLesson(index);
    if (requestEpoch !== navigationEpoch) return;
    currentLessonIndex = index;
    progress = RNProgress.markStudyDay(progress, localDateKey());
    progress.lastLessonId = item.id;
    save();
    RNAnalytics.track("lesson_open", item.id);
    const body = document.getElementById("lessonBody");
    const courseLabel = item.course ? item.course + " · NCLEX tag: " + lesson.nclexClientNeeds : item.category + " · " + item.weight;
    body.innerHTML = '<span class="lesson-number-badge">Lesson ' + item.id + '</span><span class="eyebrow">' + courseLabel + '</span><h1 id="lessonTitle">' + lesson.title + "</h1>" + lessonContent(item, lesson) + '<p class="source-note">Blueprint source: <a href="https://www.nclex.com/test-plans" target="_blank" rel="noopener noreferrer">2026 NCLEX-RN Test Plan</a>. Educational content last reviewed September 2026.</p>';
    setRoute("lesson");
  } catch (error) {
    console.error(error);
    toast("This lesson could not be loaded.");
  }
}

async function startLessonQuiz() {
  if (!curriculum || loadingQuiz) return;
  loadingQuiz = true;
  const index = currentLessonIndex;
  const epoch = navigationEpoch;
  try {
    const data = await loadQuiz(index);
    if (epoch !== navigationEpoch) return;
    currentQuiz = RNQuiz.createQuizSession(data.questions, { mode: "lesson", lessonId: curriculum.lessons[index].id, shuffleChoices: true });
    currentQuizTitle = curriculum.lessons[currentLessonIndex].cardTitle;
    RNAnalytics.track("lesson_quiz_start", currentQuiz.lessonId);
    startQuizUI();
  } catch (error) {
    console.error(error);
    toast("The quiz could not be loaded.");
  } finally { loadingQuiz = false; }
}

async function startPractice(reviewOnly = false) {
  // Event listeners pass an Event; only a literal true requests missed-question review.
  reviewOnly = reviewOnly === true;
  if (!curriculum || loadingQuiz) return;
  loadingQuiz = true;
  const epoch = navigationEpoch;
  try {
    document.getElementById("practiceButton").disabled = true;
    const banks = await Promise.all(curriculum.lessons.map((lesson, index) => loadQuiz(index)));
    if (epoch !== navigationEpoch) return;
    let questions = banks.flatMap((bank, index) => bank.questions.map(question => Object.assign({}, question, { lessonId: curriculum.lessons[index].id })));
    if (reviewOnly) questions = questions.filter(question => progress.missedQuestionIds.includes(question.id));
    if (!questions.length) { toast("No missed questions to review."); return; }
    currentQuiz = RNQuiz.createQuizSession(RNQuiz.shuffleQuestions(questions).slice(0, Math.min(10, questions.length)), { mode: reviewOnly ? "review" : "practice", shuffleChoices: true });
    currentQuizTitle = reviewOnly ? "Missed-question review" : "Mixed RN practice";
    startQuizUI();
  } catch (error) {
    console.error(error);
    toast("Practice could not be loaded.");
  } finally {
    loadingQuiz = false;
    document.getElementById("practiceButton").disabled = false;
  }
}

function startQuizUI() {
  progress = RNProgress.markStudyDay(progress, localDateKey());
  save();
  document.getElementById("quizLabel").textContent = currentQuiz.mode === "lesson" ? "LESSON QUIZ" : currentQuiz.mode === "review" ? "MISSED-QUESTION REVIEW" : "MIXED PRACTICE";
  renderQuestion();
  setRoute("quiz");
}

function renderQuestion() {
  const question = currentQuiz.questions[currentQuiz.current];
  document.getElementById("questionNumber").textContent = currentQuiz.current + 1;
  document.getElementById("questionTotal").textContent = currentQuiz.questions.length;
  document.getElementById("questionProgress").style.width = String((currentQuiz.current + 1) / currentQuiz.questions.length * 100) + "%";
  document.getElementById("questionStep").textContent = JUDGMENT_STEPS.includes(question.clinicalJudgmentStep) ? question.clinicalJudgmentStep : "Clinical judgment";
  document.getElementById("questionTags").textContent = question.traditionalCourse + " · " + question.nclexClientNeeds;
  document.getElementById("questionText").textContent = question.question;
  document.getElementById("questionText").tabIndex = -1;
  document.getElementById("questionText").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
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
  progress = RNProgress.recordAnswer(progress, result.correct, currentQuiz.questions[currentQuiz.current].id);
  save();
  const rationale = document.getElementById("answerRationale");
  rationale.innerHTML = "<b>" + (result.correct ? "Correct" : "Best answer: " + String.fromCharCode(65 + result.correctIndex)) + "</b><span>" + result.explanation + "</span>";
  rationale.hidden = false;
  const next = document.getElementById("nextQuestionButton");
  next.textContent = currentQuiz.current === currentQuiz.questions.length - 1 ? "See results" : "Next question";
  next.hidden = false;
}

function nextQuestion() {
  if (!currentQuiz || !currentQuiz.answered || currentQuiz.finished) return;
  if (RNQuiz.advanceQuestion(currentQuiz)) renderQuestion();
  else finishQuiz();
}

function finishQuiz() {
  if (!currentQuiz || currentQuiz.finished) return;
  currentQuiz.finished = true;
  if (currentQuiz.mode === "lesson") {
    progress = RNProgress.completeLesson(progress, currentQuiz.lessonId);
    progress = RNProgress.recordLessonScore(progress, currentQuiz.lessonId, currentQuiz.score, currentQuiz.questions.length);
    save();
    RNAnalytics.track("lesson_quiz_complete", currentQuiz.lessonId);
  }
  if (currentQuiz.mode === "practice") RNAnalytics.track("practice_complete");
  document.getElementById("resultsTitle").textContent = currentQuizTitle + " complete";
  document.getElementById("resultScore").textContent = currentQuiz.score;
  document.getElementById("resultTotal").textContent = currentQuiz.questions.length;
  const percentage = currentQuiz.score / currentQuiz.questions.length;
  document.getElementById("resultMessage").textContent = percentage >= .8 ? "Strong shift. Keep applying the same reasoning to new cues." : percentage >= .6 ? "Good foundation. Review the rationales before the next shift." : "Review the lesson, then try the questions again with safety and priority in mind.";
  document.getElementById("resultsReviewButton").hidden = !currentQuiz.missedQuestions.length;
  document.getElementById("resultsReviewButton").onclick = () => {
    currentQuiz = RNQuiz.createQuizSession(currentQuiz.missedQuestions, { mode: "review", shuffleChoices: true });
    currentQuizTitle = "Missed-question review";
    startQuizUI();
  };
  const next = document.getElementById("resultsNextButton");
  next.hidden = !curriculum.lessons.some(lesson => !progress.completedLessons.includes(lesson.id));
  next.onclick = () => openLesson(RNProgress.nextLessonIndex(progress, curriculum.lessons));
  setRoute("results");
}

function renderProgress() {
  if (!curriculum) return;
  document.getElementById("progressXp").textContent = progress.xp;
  document.getElementById("progressStreak").textContent = RNProgress.currentStreak(progress, localDateKey()) + " days";
  document.getElementById("progressStudyDays").textContent = progress.studyDates.length;
  document.getElementById("progressAccuracy").textContent = progress.answers.total ? Math.round(progress.answers.correct / progress.answers.total * 100) + "%" : "—";
  document.getElementById("moduleProgress").innerHTML = curriculum.lessons.map(lesson => {
    const score = progress.lessonScores[lesson.id];
    const status = score ? "Last " + score.last + "/" + score.total + " · Best " + score.bestPercent + "%" : progress.completedLessons.includes(lesson.id) ? "Quiz completed · score not recorded" : "Quiz not completed";
    return '<div class="progress-row"><div><b>' + lesson.cardTitle + "</b><br><span>" + lesson.category + '</span></div><b>' + status + "</b></div>";
  }).join("");
}

function bindEvents() {
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("lessonQuizButton").addEventListener("click", startLessonQuiz);
  document.getElementById("nextQuestionButton").addEventListener("click", nextQuestion);
  document.getElementById("quizBackButton").addEventListener("click", () => setRoute(currentQuiz && currentQuiz.mode === "lesson" ? "lesson" : "home"));
  document.getElementById("resultsHomeButton").addEventListener("click", () => setRoute("home"));
  document.getElementById("reviewButton").addEventListener("click", () => startPractice(true));
  document.getElementById("practiceButton").addEventListener("click", startPractice);
  document.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", () => setRoute(button.dataset.route)));
  document.querySelectorAll("[data-action='practice']").forEach(button => button.addEventListener("click", startPractice));
}

async function initializeApp() {
  initializeTheme();
  bindEvents();
  RNAnalytics.init();
  try {
    [curriculum, roadmap] = await Promise.all([fetchJson("data/curriculum.json"), fetchJson("data/program-roadmap.json")]);
    updateDashboard();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").then(registration => {
        const offerUpdate = () => {
          if (!registration.waiting) return;
          const notice = document.getElementById("updateNotice");
          notice.hidden = false;
          document.getElementById("updateButton").onclick = () => {
            navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          };
        };
        offerUpdate();
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed") offerUpdate();
          });
        });
      }).catch(error => console.warn("Offline support unavailable", error));
    }
  } catch (error) {
    console.error(error);
    document.getElementById("curriculumList").innerHTML = '<article class="notice-card"><b>Curriculum unavailable</b><p>Reload while connected to continue.</p></article>';
  }
}

window.addEventListener("DOMContentLoaded", initializeApp);
