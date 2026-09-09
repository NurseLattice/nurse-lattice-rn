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
if (curriculum.courses.length !== 8 || curriculum.lessons.length !== 15) throw new Error("Pilot must preserve all eight Client Needs areas and include fifteen lessons");
if (curriculum.courses.map(course => course.id).join("|") !== expectedCategories.join("|")) throw new Error("Client Needs areas are incomplete or out of order");

const clientNeedsTitles = new Set(curriculum.courses.map(course => course.title));
const questionIds = new Set();
for (const [index, lessonItem] of curriculum.lessons.entries()) {
  if (lessonItem.id !== index + 1) throw new Error("Lesson IDs must be contiguous");
  if (lessonItem.courseId !== "foundations-of-nursing" || lessonItem.course !== "Foundations of Nursing Practice") throw new Error("All current lessons must remain under Foundations of Nursing Practice");
  if (index < expectedCategories.length && lessonItem.categoryId !== expectedCategories[index]) throw new Error("Lesson category order does not match blueprint");
  if (!expectedCategories.includes(lessonItem.categoryId)) throw new Error("Lesson category must map to a current Client Needs area");
  for (const property of ["category", "weight", "cardTitle", "summary", "lessonFile", "quizFile"]) {
    if (!lessonItem[property]) throw new Error("Lesson " + lessonItem.id + " is missing " + property);
  }
  const lesson = JSON.parse(read(lessonItem.lessonFile));
  const quiz = JSON.parse(read(lessonItem.quizFile));
  if (lesson.id !== lessonItem.id || !lesson.title || !lesson.html || lesson.html.length < 600) throw new Error("Lesson " + lessonItem.id + " is incomplete");
  if (quiz.lessonId !== lessonItem.id || !Array.isArray(quiz.questions) || quiz.questions.length !== 10) throw new Error("Lesson " + lessonItem.id + " must have ten questions");
  const category = curriculum.courses.find(course => course.id === lessonItem.categoryId).title;
  if (lesson.traditionalCourse !== lessonItem.course || lesson.nclexClientNeeds !== category ||
      lesson.clinicalJudgmentSteps.length !== 6 || !lesson.html.includes("https://")) throw new Error("Incomplete lesson tags or sources: " + lesson.id);
  for (const question of quiz.questions) {
    if (question.traditionalCourse !== lessonItem.course || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Incomplete question tags: " + question.id);
    if (new Set(question.choices).size !== 4) throw new Error("Duplicate options: " + question.id);
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
if (thirdLessonItem.courseId !== "foundations-of-nursing" || thirdLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 3 must remain in Foundations of Nursing Practice");
if (!thirdLesson.title.includes("General Survey, Vital Signs & Pain") || !thirdLesson.html.includes("Subjective and objective data") || !thirdLesson.html.includes("PQRSTU") || !thirdLesson.html.includes("Pulse oximetry")) throw new Error("Lesson 3 health assessment content is incomplete");
if (thirdQuiz.questions.length !== 10) throw new Error("Lesson 3 must include ten health assessment questions");
const fourthLessonItem = curriculum.lessons[3];
const fourthLesson = JSON.parse(read(fourthLessonItem.lessonFile));
const fourthQuiz = JSON.parse(read(fourthLessonItem.quizFile));
if (fourthLessonItem.courseId !== "foundations-of-nursing" || fourthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 4 must remain in Foundations of Nursing Practice");
if (!fourthLesson.title.includes("Therapeutic Interview & Mental Status Assessment") || !fourthLesson.html.includes("Observe the mental status throughout") || !fourthLesson.html.includes("Ask directly about safety") || !fourthLesson.html.includes("qualified interpreter")) throw new Error("Lesson 4 interview and mental status content is incomplete");
if (fourthQuiz.questions.length !== 10) throw new Error("Lesson 4 must include ten interview and mental status questions");
const ninthLessonItem = curriculum.lessons[8];
const ninthLesson = JSON.parse(read(ninthLessonItem.lessonFile));
const ninthQuiz = JSON.parse(read(ninthLessonItem.quizFile));
if (ninthLessonItem.courseId !== "foundations-of-nursing" || ninthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 9 must remain in the foundations course");
if (!ninthLesson.title.includes("Skin Integrity & Wound Care") || !ninthLesson.html.includes("Describe a wound, not a conclusion") || !ninthLesson.html.includes("Prevent contamination during wound care") || !ninthLesson.html.includes("Skin-tone–responsive assessment")) throw new Error("Lesson 9 skin and wound content is incomplete");
if (ninthQuiz.questions.length !== 10) throw new Error("Lesson 9 must include ten skin and wound questions");
if (ninthLesson.traditionalCourse !== "Foundations of Nursing Practice" || ninthLesson.nclexClientNeeds !== "Basic Care and Comfort" || ninthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 9 must preserve all three content tags");
for (const question of ninthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 9 question must preserve its course and NCLEX tags");
}
const tenthLessonItem = curriculum.lessons[9];
const tenthLesson = JSON.parse(read(tenthLessonItem.lessonFile));
const tenthQuiz = JSON.parse(read(tenthLessonItem.quizFile));
if (tenthLessonItem.courseId !== "foundations-of-nursing" || tenthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 10 must remain in the foundations course");
if (!tenthLesson.title.includes("Nutrition, Feeding & Aspiration Prevention") || !tenthLesson.html.includes("Recognize aspiration risk before feeding") || !tenthLesson.html.includes("Protect swallowing safety") || !tenthLesson.html.includes("Enteral feeding: follow the order and policy") || !tenthLesson.html.includes("Evaluate nutrition and hydration outcomes")) throw new Error("Lesson 10 nutrition and feeding content is incomplete");
if (tenthQuiz.questions.length !== 10) throw new Error("Lesson 10 must include ten nutrition and feeding questions");
if (tenthLesson.traditionalCourse !== "Foundations of Nursing Practice" || tenthLesson.nclexClientNeeds !== "Basic Care and Comfort" || tenthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 10 must preserve all three content tags");
for (const question of tenthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 10 question must preserve its course and NCLEX tags");
}
const eleventhLessonItem = curriculum.lessons[10];
const eleventhLesson = JSON.parse(read(eleventhLessonItem.lessonFile));
const eleventhQuiz = JSON.parse(read(eleventhLessonItem.quizFile));
if (eleventhLessonItem.courseId !== "foundations-of-nursing" || eleventhLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 11 must remain in the foundations course");
if (!eleventhLesson.title.includes("Elimination—Toileting, Urinary & Bowel Care") || !eleventhLesson.html.includes("Assess the pattern and the change") || !eleventhLesson.html.includes("Promote safe, dignified toileting") || !eleventhLesson.html.includes("Indwelling urinary catheter: protect the closed system") || !eleventhLesson.html.includes("Evaluate the plan")) throw new Error("Lesson 11 elimination content is incomplete");
if (eleventhQuiz.questions.length !== 10) throw new Error("Lesson 11 must include ten elimination questions");
if (eleventhLesson.traditionalCourse !== "Foundations of Nursing Practice" || eleventhLesson.nclexClientNeeds !== "Basic Care and Comfort" || eleventhLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 11 must preserve all three content tags");
for (const question of eleventhQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 11 question must preserve its course and NCLEX tags");
}
const twelfthLessonItem = curriculum.lessons[11];
const twelfthLesson = JSON.parse(read(twelfthLessonItem.lessonFile));
const twelfthQuiz = JSON.parse(read(twelfthLessonItem.quizFile));
if (twelfthLessonItem.courseId !== "foundations-of-nursing" || twelfthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 12 must remain in the foundations course");
if (!twelfthLesson.title.includes("Oxygenation Basics & Respiratory Safety") || !twelfthLesson.html.includes("Assess breathing before the monitor") || !twelfthLesson.html.includes("Use pulse oximetry wisely") || !twelfthLesson.html.includes("Administer oxygen safely") || !twelfthLesson.html.includes("Evaluate the response")) throw new Error("Lesson 12 oxygenation content is incomplete");
if (twelfthQuiz.questions.length !== 10) throw new Error("Lesson 12 must include ten oxygenation questions");
if (twelfthLesson.traditionalCourse !== "Foundations of Nursing Practice" || twelfthLesson.nclexClientNeeds !== "Physiological Adaptation" || twelfthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 12 must preserve all three content tags");
for (const question of twelfthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 12 question must preserve its course and NCLEX tags");
}
const thirteenthLessonItem = curriculum.lessons[12];
const thirteenthLesson = JSON.parse(read(thirteenthLessonItem.lessonFile));
const thirteenthQuiz = JSON.parse(read(thirteenthLessonItem.quizFile));
if (thirteenthLessonItem.courseId !== "foundations-of-nursing" || thirteenthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 13 must remain in the foundations course");
if (!thirteenthLesson.title.includes("Pain, Sleep & Comfort") || !thirteenthLesson.html.includes("Assess pain as a multidimensional experience") || !thirteenthLesson.html.includes("Plan for comfort and function") || !thirteenthLesson.html.includes("Medication safety and reassessment") || !thirteenthLesson.html.includes("Protect sleep and rest")) throw new Error("Lesson 13 pain and comfort content is incomplete");
if (thirteenthQuiz.questions.length !== 10) throw new Error("Lesson 13 must include ten pain and comfort questions");
if (thirteenthLesson.traditionalCourse !== "Foundations of Nursing Practice" || thirteenthLesson.nclexClientNeeds !== "Basic Care and Comfort" || thirteenthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 13 must preserve all three content tags");
for (const question of thirteenthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 13 question must preserve its course and NCLEX tags");
}
const fourteenthLessonItem = curriculum.lessons[13];
const fourteenthLesson = JSON.parse(read(fourteenthLessonItem.lessonFile));
const fourteenthQuiz = JSON.parse(read(fourteenthLessonItem.quizFile));
if (fourteenthLessonItem.courseId !== "foundations-of-nursing" || fourteenthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 14 must remain in the foundations course");
if (!fourteenthLesson.title.includes("Documentation & Handover") || !fourteenthLesson.html.includes("Chart what happened, when it happened, and the response") || !fourteenthLesson.html.includes("Use SBAR to communicate a concern") || !fourteenthLesson.html.includes("Give a handover that supports continuity") || !fourteenthLesson.html.includes("Evaluate communication")) throw new Error("Lesson 14 documentation content is incomplete");
if (fourteenthQuiz.questions.length !== 10) throw new Error("Lesson 14 must include ten documentation questions");
if (fourteenthLesson.traditionalCourse !== "Foundations of Nursing Practice" || fourteenthLesson.nclexClientNeeds !== "Management of Care" || fourteenthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 14 must preserve all three content tags");
for (const question of fourteenthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 14 question must preserve its course and NCLEX tags");
}
const fifteenthLessonItem = curriculum.lessons[14];
const fifteenthLesson = JSON.parse(read(fifteenthLessonItem.lessonFile));
const fifteenthQuiz = JSON.parse(read(fifteenthLessonItem.quizFile));
if (fifteenthLessonItem.courseId !== "foundations-of-nursing" || fifteenthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 15 must remain in the foundations course");
if (!fifteenthLesson.title.includes("Admission, Transfer & Discharge") || !fifteenthLesson.html.includes("Admission: stabilize, identify, and establish a baseline") || !fifteenthLesson.html.includes("Transfer: move responsibility with the client") || !fifteenthLesson.html.includes("Discharge: build a plan the client can use") || !fifteenthLesson.html.includes("Teach-back evaluates the explanation")) throw new Error("Lesson 15 transition content is incomplete");
if (fifteenthQuiz.questions.length !== 10) throw new Error("Lesson 15 must include ten transition questions");
if (fifteenthLesson.traditionalCourse !== "Foundations of Nursing Practice" || fifteenthLesson.nclexClientNeeds !== "Management of Care" || fifteenthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 15 must preserve all three content tags");
for (const question of fifteenthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 15 question must preserve its course and NCLEX tags");
}
const roadmap = JSON.parse(read("data/program-roadmap.json"));
if (roadmap.totalLessons !== 184 || roadmap.phases.length !== 12 || roadmap.phases[0].lessonRange.join("-") !== "1-20" || roadmap.phases[11].lessonRange.join("-") !== "177-184") throw new Error("Traditional 184-lesson RN roadmap is incomplete");
if (roadmap.tagging.join("|") !== "traditionalCourse|nclexClientNeeds|clinicalJudgmentStep") throw new Error("Roadmap must preserve all three content tags");
if (!read("js/app.js").includes('fetchJson("data/program-roadmap.json")') || !index.includes('id="curriculumList" class="course-roadmap"') || !index.includes('id="learnList" class="course-roadmap"')) throw new Error("The visible curriculum must list all twelve course phases");
if (!fs.existsSync(path.join(root, "data/roadmap/leadership-priority-delegation.json"))) throw new Error("Original priority and delegation lesson was not preserved in the leadership roadmap");
if (questionIds.size !== 150) throw new Error("Expected 150 reviewed pilot questions");
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
console.log("Static checks passed: 15 Foundations lessons preserved and reviewed, 150 questions, and version parity.");
