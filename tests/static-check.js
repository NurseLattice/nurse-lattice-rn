const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const index = read("index.html");
const curriculum = JSON.parse(read("data/curriculum.json"));
const version = JSON.parse(read("version.json"));
const versionScript = read("js/version.js");

const expectedCategories = [
  "management-of-care",
  "safety-infection",
  "health-promotion",
  "psychosocial",
  "basic-care",
  "pharmacological",
  "risk-reduction",
  "physiological-adaptation"
];
const judgmentSteps = new Set(["Recognize cues", "Analyze cues", "Prioritize hypotheses", "Generate solutions", "Take action", "Evaluate outcomes"]);

if (curriculum.blueprint !== "2026 NCLEX-RN Test Plan") throw new Error("Current NCLEX-RN blueprint is missing");
if (curriculum.courses.length !== 8 || curriculum.lessons.length !== 8) throw new Error("Pilot must include all eight Client Needs areas");
if (curriculum.courses.map(course => course.id).join("|") !== expectedCategories.join("|")) throw new Error("Client Needs areas are incomplete or out of order");

const questionIds = new Set();
for (const [index, lessonItem] of curriculum.lessons.entries()) {
  if (lessonItem.id !== index + 1) throw new Error("Lesson IDs must be contiguous");
  if (lessonItem.categoryId !== expectedCategories[index]) throw new Error("Lesson category order does not match blueprint");
  for (const property of ["category", "weight", "cardTitle", "summary", "lessonFile", "quizFile"]) {
    if (!lessonItem[property]) throw new Error("Lesson " + lessonItem.id + " is missing " + property);
  }
  const lesson = JSON.parse(read(lessonItem.lessonFile));
  const quiz = JSON.parse(read(lessonItem.quizFile));
  if (lesson.id !== lessonItem.id || !lesson.title || !lesson.html || lesson.html.length < 600) throw new Error("Lesson " + lessonItem.id + " is incomplete");
  if (quiz.lessonId !== lessonItem.id || !Array.isArray(quiz.questions) || quiz.questions.length < 3) throw new Error("Lesson " + lessonItem.id + " needs at least three pilot questions");
  for (const question of quiz.questions) {
    if (!question.id || questionIds.has(question.id)) throw new Error("Quiz question IDs must be unique");
    questionIds.add(question.id);
    if (!judgmentSteps.has(question.clinicalJudgmentStep)) throw new Error("Invalid clinical judgment step in " + question.id);
    if (!question.question || !Array.isArray(question.choices) || question.choices.length !== 4) throw new Error("Question " + question.id + " requires four choices");
    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) throw new Error("Question " + question.id + " has an invalid answer");
    if (!question.explanation || question.explanation.length < 60) throw new Error("Question " + question.id + " needs a teaching rationale");
  }
}

const firstLessonItem = curriculum.lessons[0];
const firstLesson = JSON.parse(read(firstLessonItem.lessonFile));
const firstQuiz = JSON.parse(read(firstLessonItem.quizFile));
if (firstLessonItem.courseId !== "foundations-of-nursing" || firstLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 1 must begin the traditional nursing curriculum");
if (!firstLesson.title.includes("RN Role & Nursing Process") || !firstLesson.html.includes("ADPIE") || !firstLesson.html.includes("Role, scope, and accountability")) throw new Error("Lesson 1 foundations content is incomplete");
if (firstQuiz.questions.length !== 10) throw new Error("Lesson 1 must include ten foundation questions");
const secondLessonItem = curriculum.lessons[1];
const secondLesson = JSON.parse(read(secondLessonItem.lessonFile));
const secondQuiz = JSON.parse(read(secondLessonItem.quizFile));
if (secondLessonItem.courseId !== "foundations-of-nursing" || secondLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 2 must continue the traditional nursing foundations course");
if (!secondLesson.title.includes("Patient Safety & Infection Prevention") || !secondLesson.html.includes("Standard Precautions") || !secondLesson.html.includes("Transmission-Based Precautions") || !secondLesson.html.includes("Protect the sterile field")) throw new Error("Lesson 2 safety and infection content is incomplete");
if (secondQuiz.questions.length !== 10) throw new Error("Lesson 2 must include ten safety and infection questions");
const thirdLessonItem = curriculum.lessons[2];
const thirdLesson = JSON.parse(read(thirdLessonItem.lessonFile));
const thirdQuiz = JSON.parse(read(thirdLessonItem.quizFile));
if (thirdLessonItem.courseId !== "health-assessment" || thirdLessonItem.course !== "Health Assessment") throw new Error("Lesson 3 must begin the traditional health assessment course");
if (!thirdLesson.title.includes("General Survey, Vital Signs & Pain") || !thirdLesson.html.includes("Subjective and objective data") || !thirdLesson.html.includes("PQRSTU") || !thirdLesson.html.includes("Pulse oximetry")) throw new Error("Lesson 3 health assessment content is incomplete");
if (thirdQuiz.questions.length !== 10) throw new Error("Lesson 3 must include ten health assessment questions");
const fourthLessonItem = curriculum.lessons[3];
const fourthLesson = JSON.parse(read(fourthLessonItem.lessonFile));
const fourthQuiz = JSON.parse(read(fourthLessonItem.quizFile));
if (fourthLessonItem.courseId !== "health-assessment" || fourthLessonItem.course !== "Health Assessment") throw new Error("Lesson 4 must continue the traditional health assessment course");
if (!fourthLesson.title.includes("Therapeutic Interview & Mental Status Assessment") || !fourthLesson.html.includes("Observe the mental status throughout") || !fourthLesson.html.includes("Ask directly about safety") || !fourthLesson.html.includes("qualified interpreter")) throw new Error("Lesson 4 interview and mental status content is incomplete");
if (fourthQuiz.questions.length !== 10) throw new Error("Lesson 4 must include ten interview and mental status questions");
if (!fs.existsSync(path.join(root, "data/roadmap/leadership-priority-delegation.json"))) throw new Error("Original priority and delegation lesson was not preserved in the leadership roadmap");
if (questionIds.size !== 52) throw new Error("Expected 52 pilot questions after the Lesson 4 redesign");
for (const file of ["css/styles.css", "js/app.js", "js/progress.js", "js/quiz.js", "js/cloud.js", "js/version.js", "sw.js", "manifest.webmanifest", ".openai/hosting.json"]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error("Missing required file: " + file);
}
for (const label of ["Home", "Learn", "Practice", "Progress", "Educational pilot", "About &amp; sources"]) {
  if (!index.includes(label)) throw new Error("Missing primary UI: " + label);
}
const match = versionScript.match(/RN_APP_VERSION = "([^"]+)"/);
if (!match || match[1] !== version.version || !index.includes("RN Quest " + version.version)) throw new Error("Version values do not match");
const numericVersion = version.version.replace(/^v/, "");
for (const asset of ["css/styles.css", "js/app.js", "js/progress.js", "js/quiz.js", "js/cloud.js", "js/version.js"]) {
  if (!index.includes(asset + "?v=" + numericVersion)) throw new Error("Stale asset version: " + asset);
}
const executableSource = ["index.html", "js/app.js", "js/progress.js", "js/quiz.js", "js/cloud.js", "sw.js"].map(read).join("\n");
if (/fnpQuest|FNP_APP_VERSION|mirwbtlwglrpmbbqhfol|service_role|sb_secret_/i.test(executableSource)) throw new Error("FNP namespace or secret leaked into RN runtime");
const cloudConfig = read("js/cloud.js");
if (!cloudConfig.includes('url: ""') || !cloudConfig.includes('publishableKey: ""')) throw new Error("Pilot cloud adapter must remain unconfigured");
const manifest = JSON.parse(read("manifest.webmanifest"));
if (manifest.name !== "RN Quest" || manifest.display !== "standalone" || manifest.start_url !== "./") throw new Error("Invalid web app manifest");
console.log("Static checks passed: redesigned Lessons 1–4, 52 questions, isolated runtime, and version parity.");
