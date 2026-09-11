const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const index = read("index.html");
const curriculum = JSON.parse(read("data/curriculum.json"));
const roadmap = JSON.parse(read("data/program-roadmap.json"));
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
if (curriculum.courses.length !== 8 || curriculum.lessons.length !== 70) throw new Error("Pilot must preserve all eight Client Needs areas and include seventy lessons");
if (curriculum.courses.map(course => course.id).join("|") !== expectedCategories.join("|")) throw new Error("Client Needs areas are incomplete or out of order");

const clientNeedsTitles = new Set(curriculum.courses.map(course => course.title));
const questionIds = new Set();
for (const [index, lessonItem] of curriculum.lessons.entries()) {
  if (lessonItem.id !== index + 1) throw new Error("Lesson IDs must be contiguous");
  const phase = roadmap.phases.find(item => lessonItem.id >= item.lessonRange[0] && lessonItem.id <= item.lessonRange[1]);
  const expectedCourseId = phase?.id === "foundations" ? "foundations-of-nursing" : phase?.id;
  if (!phase || lessonItem.courseId !== expectedCourseId || lessonItem.course !== phase.title) throw new Error("Lesson " + lessonItem.id + " is assigned to the wrong traditional course");
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
const sixteenthLessonItem = curriculum.lessons[15];
const sixteenthLesson = JSON.parse(read(sixteenthLessonItem.lessonFile));
const sixteenthQuiz = JSON.parse(read(sixteenthLessonItem.quizFile));
if (sixteenthLessonItem.courseId !== "foundations-of-nursing" || sixteenthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 16 must remain in the foundations course");
if (!sixteenthLesson.title.includes("Grief, Loss & End-of-Life Care") || !sixteenthLesson.html.includes("Use precise terms") || !sixteenthLesson.html.includes("Center the client's choices") || !sixteenthLesson.html.includes("Assess and relieve suffering") || !sixteenthLesson.html.includes("After death")) throw new Error("Lesson 16 grief and end-of-life content is incomplete");
if (sixteenthQuiz.questions.length !== 10) throw new Error("Lesson 16 must include ten end-of-life questions");
if (sixteenthLesson.traditionalCourse !== "Foundations of Nursing Practice" || sixteenthLesson.nclexClientNeeds !== "Psychosocial Integrity" || sixteenthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 16 must preserve all three content tags");
for (const question of sixteenthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 16 question must preserve its course and NCLEX tags");
}
const seventeenthLessonItem = curriculum.lessons[16];
const seventeenthLesson = JSON.parse(read(seventeenthLessonItem.lessonFile));
const seventeenthQuiz = JSON.parse(read(seventeenthLessonItem.quizFile));
if (seventeenthLessonItem.courseId !== "foundations-of-nursing" || seventeenthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 17 must remain in the foundations course");
if (!seventeenthLesson.title.includes("Medication Dosage Calculations & Safe Math") || !seventeenthLesson.html.includes("Begin with a safety screen") || !seventeenthLesson.html.includes("Weight-based and divided doses") || !seventeenthLesson.html.includes("Safe-dose range is a separate check") || !seventeenthLesson.html.includes("Write decimals safely")) throw new Error("Lesson 17 dosage-calculation content is incomplete");
if (seventeenthQuiz.questions.length !== 10) throw new Error("Lesson 17 must include ten dosage-calculation questions");
if (seventeenthLesson.traditionalCourse !== "Foundations of Nursing Practice" || seventeenthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || seventeenthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 17 must preserve all three content tags");
for (const question of seventeenthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 17 question must preserve its course and NCLEX tags");
}
const eighteenthLessonItem = curriculum.lessons[17];
const eighteenthLesson = JSON.parse(read(eighteenthLessonItem.lessonFile));
const eighteenthQuiz = JSON.parse(read(eighteenthLessonItem.quizFile));
if (eighteenthLessonItem.courseId !== "foundations-of-nursing" || eighteenthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 18 must remain in the foundations course");
if (!eighteenthLesson.title.includes("Restraint-Free Care & Least-Restrictive Safety") || !eighteenthLesson.html.includes("Assess the cause before restricting movement") || !eighteenthLesson.html.includes("Use individualized alternatives") || !eighteenthLesson.html.includes("Discontinue at the earliest possible time") || !eighteenthLesson.html.includes("Document objective evidence")) throw new Error("Lesson 18 least-restrictive safety content is incomplete");
if (eighteenthQuiz.questions.length !== 10) throw new Error("Lesson 18 must include ten least-restrictive safety questions");
if (eighteenthLesson.traditionalCourse !== "Foundations of Nursing Practice" || eighteenthLesson.nclexClientNeeds !== "Safety and Infection Prevention and Control" || eighteenthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 18 must preserve all three content tags");
for (const question of eighteenthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 18 question must preserve its course and NCLEX tags");
}
const nineteenthLessonItem = curriculum.lessons[18];
const nineteenthLesson = JSON.parse(read(nineteenthLessonItem.lessonFile));
const nineteenthQuiz = JSON.parse(read(nineteenthLessonItem.quizFile));
if (nineteenthLessonItem.courseId !== "foundations-of-nursing" || nineteenthLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 19 must remain in the foundations course");
if (!nineteenthLesson.title.includes("Patient Education, Health Literacy & Teach-Back") || !nineteenthLesson.html.includes("Assess before teaching") || !nineteenthLesson.html.includes("Use universal precautions") || !nineteenthLesson.html.includes("Teach-back checks the explanation") || !nineteenthLesson.html.includes("Use return demonstration for skills")) throw new Error("Lesson 19 patient-education content is incomplete");
if (nineteenthQuiz.questions.length !== 10) throw new Error("Lesson 19 must include ten patient-education questions");
if (nineteenthLesson.traditionalCourse !== "Foundations of Nursing Practice" || nineteenthLesson.nclexClientNeeds !== "Health Promotion and Maintenance" || nineteenthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 19 must preserve all three content tags");
for (const question of nineteenthQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 19 question must preserve its course and NCLEX tags");
}
const twentiethLessonItem = curriculum.lessons[19];
const twentiethLesson = JSON.parse(read(twentiethLessonItem.lessonFile));
const twentiethQuiz = JSON.parse(read(twentiethLessonItem.quizFile));
if (twentiethLessonItem.courseId !== "foundations-of-nursing" || twentiethLessonItem.course !== "Foundations of Nursing Practice") throw new Error("Lesson 20 must complete the foundations course");
if (!twentiethLesson.title.includes("Ethical Practice, Client Rights & Advocacy") || !twentiethLesson.html.includes("Center self-determination") || !twentiethLesson.html.includes("Support informed consent") || !twentiethLesson.html.includes("Protect privacy and confidentiality") || !twentiethLesson.html.includes("Advocacy is a clinical action")) throw new Error("Lesson 20 ethical-practice content is incomplete");
if (twentiethQuiz.questions.length !== 10) throw new Error("Lesson 20 must include ten ethical-practice questions");
if (twentiethLesson.traditionalCourse !== "Foundations of Nursing Practice" || twentiethLesson.nclexClientNeeds !== "Management of Care" || twentiethLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 20 must preserve all three content tags");
for (const question of twentiethQuiz.questions) {
  if (question.traditionalCourse !== "Foundations of Nursing Practice" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 20 question must preserve its course and NCLEX tags");
}
const twentyFirstLessonItem = curriculum.lessons[20];
const twentyFirstLesson = JSON.parse(read(twentyFirstLessonItem.lessonFile));
const twentyFirstQuiz = JSON.parse(read(twentyFirstLessonItem.quizFile));
if (twentyFirstLessonItem.courseId !== "health-assessment-skills" || twentyFirstLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 21 must begin Health Assessment & Nursing Skills");
if (!twentyFirstLesson.title.includes("Comprehensive Health History & Risk Assessment") || !twentyFirstLesson.html.includes("Separate subjective and objective data") || !twentyFirstLesson.html.includes("Analyze the present symptom") || !twentyFirstLesson.html.includes("Assess function and daily life") || !twentyFirstLesson.html.includes("Complete a focused review of systems")) throw new Error("Lesson 21 health-history content is incomplete");
if (twentyFirstQuiz.questions.length !== 10) throw new Error("Lesson 21 must include ten health-history questions");
if (twentyFirstLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || twentyFirstLesson.nclexClientNeeds !== "Health Promotion and Maintenance" || twentyFirstLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 21 must preserve all three content tags");
for (const question of twentyFirstQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 21 question must preserve its course and NCLEX tags");
}
const twentySecondLessonItem = curriculum.lessons[21];
const twentySecondLesson = JSON.parse(read(twentySecondLessonItem.lessonFile));
const twentySecondQuiz = JSON.parse(read(twentySecondLessonItem.quizFile));
if (twentySecondLessonItem.courseId !== "health-assessment-skills" || twentySecondLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 22 must remain in Health Assessment & Nursing Skills");
if (!twentySecondLesson.title.includes("Vital Signs—Accurate Measurement & Trend Recognition") || !twentySecondLesson.html.includes("Temperature: route and context matter") || !twentySecondLesson.html.includes("Blood pressure: control the technique") || !twentySecondLesson.html.includes("Pulse oximetry estimates saturation") || !twentySecondLesson.html.includes("Trends and clusters carry meaning")) throw new Error("Lesson 22 vital-sign content is incomplete");
if (twentySecondQuiz.questions.length !== 10) throw new Error("Lesson 22 must include ten vital-sign questions");
if (twentySecondLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || twentySecondLesson.nclexClientNeeds !== "Reduction of Risk Potential" || twentySecondLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 22 must preserve all three content tags");
for (const question of twentySecondQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 22 question must preserve its course and NCLEX tags");
}
const twentyThirdLessonItem = curriculum.lessons[22];
const twentyThirdLesson = JSON.parse(read(twentyThirdLessonItem.lessonFile));
const twentyThirdQuiz = JSON.parse(read(twentyThirdLessonItem.quizFile));
if (twentyThirdLessonItem.courseId !== "health-assessment-skills" || twentyThirdLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 23 must remain in Health Assessment & Nursing Skills");
if (!twentyThirdLesson.title.includes("Pain Assessment, Functional Goals & Reassessment") || !twentyThirdLesson.html.includes("Use PQRSTU to organize the story") || !twentyThirdLesson.html.includes("When the client cannot self-report") || !twentyThirdLesson.html.includes("Set a comfort-function goal") || !twentyThirdLesson.html.includes("Reassessment closes the loop")) throw new Error("Lesson 23 pain-assessment content is incomplete");
if (twentyThirdQuiz.questions.length !== 10) throw new Error("Lesson 23 must include ten pain-assessment questions");
if (twentyThirdLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || twentyThirdLesson.nclexClientNeeds !== "Basic Care and Comfort" || twentyThirdLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 23 must preserve all three content tags");
for (const question of twentyThirdQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 23 question must preserve its course and NCLEX tags");
}
const twentyFourthLessonItem = curriculum.lessons[23];
const twentyFourthLesson = JSON.parse(read(twentyFourthLessonItem.lessonFile));
const twentyFourthQuiz = JSON.parse(read(twentyFourthLessonItem.quizFile));
if (twentyFourthLessonItem.courseId !== "health-assessment-skills" || twentyFourthLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 24 must remain in Health Assessment & Nursing Skills");
if (!twentyFourthLesson.title.includes("Head-to-Toe Assessment—Sequence, Techniques & Documentation") || !twentyFourthLesson.html.includes("Begin with safety, consent, and context") || !twentyFourthLesson.html.includes("Stability comes before the routine sequence") || !twentyFourthLesson.html.includes("Use the four core techniques") || !twentyFourthLesson.html.includes("Document a usable clinical picture")) throw new Error("Lesson 24 head-to-toe assessment content is incomplete");
if (twentyFourthQuiz.questions.length !== 10) throw new Error("Lesson 24 must include ten head-to-toe assessment questions");
if (twentyFourthLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || twentyFourthLesson.nclexClientNeeds !== "Reduction of Risk Potential" || twentyFourthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 24 must preserve all three content tags");
for (const question of twentyFourthQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 24 question must preserve its course and NCLEX tags");
}
const twentyFifthLessonItem = curriculum.lessons[24];
const twentyFifthLesson = JSON.parse(read(twentyFifthLessonItem.lessonFile));
const twentyFifthQuiz = JSON.parse(read(twentyFifthLessonItem.quizFile));
if (twentyFifthLessonItem.courseId !== "health-assessment-skills" || twentyFifthLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 25 must remain in Health Assessment & Nursing Skills");
if (!twentyFifthLesson.title.includes("Respiratory Assessment—Inspection, Auscultation & Early Deterioration") || !twentyFifthLesson.html.includes("Start with the airway and the client—not the stethoscope") || !twentyFifthLesson.html.includes("Inspect the respiratory pattern") || !twentyFifthLesson.html.includes("Auscultate in a side-to-side ladder") || !twentyFifthLesson.html.includes("Recognize deterioration as a cluster")) throw new Error("Lesson 25 respiratory-assessment content is incomplete");
if (twentyFifthQuiz.questions.length !== 10) throw new Error("Lesson 25 must include ten respiratory-assessment questions");
if (twentyFifthLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || twentyFifthLesson.nclexClientNeeds !== "Reduction of Risk Potential" || twentyFifthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 25 must preserve all three content tags");
for (const question of twentyFifthQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 25 question must preserve its course and NCLEX tags");
}
const twentySixthLessonItem = curriculum.lessons[25];
const twentySixthLesson = JSON.parse(read(twentySixthLessonItem.lessonFile));
const twentySixthQuiz = JSON.parse(read(twentySixthLessonItem.quizFile));
if (twentySixthLessonItem.courseId !== "health-assessment-skills" || twentySixthLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 26 must remain in Health Assessment & Nursing Skills");
if (!twentySixthLesson.title.includes("Cardiovascular & Peripheral Vascular Assessment") || !twentySixthLesson.html.includes("Begin with stability and time-sensitive symptoms") || !twentySixthLesson.html.includes("Auscultate rate, rhythm, and heart sounds") || !twentySixthLesson.html.includes("Assess pulses and peripheral perfusion") || !twentySixthLesson.html.includes("Describe edema instead of merely naming it")) throw new Error("Lesson 26 cardiovascular-assessment content is incomplete");
if (twentySixthQuiz.questions.length !== 10) throw new Error("Lesson 26 must include ten cardiovascular-assessment questions");
if (twentySixthLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || twentySixthLesson.nclexClientNeeds !== "Reduction of Risk Potential" || twentySixthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 26 must preserve all three content tags");
for (const question of twentySixthQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 26 question must preserve its course and NCLEX tags");
}
const twentySeventhLessonItem = curriculum.lessons[26];
const twentySeventhLesson = JSON.parse(read(twentySeventhLessonItem.lessonFile));
const twentySeventhQuiz = JSON.parse(read(twentySeventhLessonItem.quizFile));
if (twentySeventhLessonItem.courseId !== "health-assessment-skills" || twentySeventhLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 27 must remain in Health Assessment & Nursing Skills");
if (!twentySeventhLesson.title.includes("Neurologic Assessment—Mental Status, Pupils, Strength & Acute Change") || !twentySeventhLesson.html.includes("Stability and time come first") || !twentySeventhLesson.html.includes("Level of consciousness is not the same as orientation") || !twentySeventhLesson.html.includes("Assess pupils deliberately") || !twentySeventhLesson.html.includes("Recognize acute change as a pattern")) throw new Error("Lesson 27 neurologic-assessment content is incomplete");
if (twentySeventhQuiz.questions.length !== 10) throw new Error("Lesson 27 must include ten neurologic-assessment questions");
if (twentySeventhLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || twentySeventhLesson.nclexClientNeeds !== "Reduction of Risk Potential" || twentySeventhLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 27 must preserve all three content tags");
for (const question of twentySeventhQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 27 question must preserve its course and NCLEX tags");
}
const twentyEighthLessonItem = curriculum.lessons[27];
const twentyEighthLesson = JSON.parse(read(twentyEighthLessonItem.lessonFile));
const twentyEighthQuiz = JSON.parse(read(twentyEighthLessonItem.quizFile));
if (twentyEighthLessonItem.courseId !== "health-assessment-skills" || twentyEighthLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 28 must remain in Health Assessment & Nursing Skills");
if (!twentyEighthLesson.title.includes("Abdominal & Gastrointestinal Assessment") || !twentyEighthLesson.html.includes("Begin with stability and urgent symptoms") || !twentyEighthLesson.html.includes("Use the abdominal sequence: I-A-P-P") || !twentyEighthLesson.html.includes("Auscultate before percussion or palpation") || !twentyEighthLesson.html.includes("Palpate gently and leave pain until last")) throw new Error("Lesson 28 abdominal-assessment content is incomplete");
if (twentyEighthQuiz.questions.length !== 10) throw new Error("Lesson 28 must include ten abdominal-assessment questions");
if (twentyEighthLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || twentyEighthLesson.nclexClientNeeds !== "Reduction of Risk Potential" || twentyEighthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 28 must preserve all three content tags");
for (const question of twentyEighthQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 28 question must preserve its course and NCLEX tags");
}
const twentyNinthLessonItem = curriculum.lessons[28];
const twentyNinthLesson = JSON.parse(read(twentyNinthLessonItem.lessonFile));
const twentyNinthQuiz = JSON.parse(read(twentyNinthLessonItem.quizFile));
if (twentyNinthLessonItem.courseId !== "health-assessment-skills" || twentyNinthLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 29 must remain in Health Assessment & Nursing Skills");
if (!twentyNinthLesson.title.includes("Musculoskeletal Assessment, Mobility & Fall Risk") || !twentyNinthLesson.html.includes("Begin with safety and function") || !twentyNinthLesson.html.includes("Assess active motion before passive motion") || !twentyNinthLesson.html.includes("Check distal neurovascular status") || !twentyNinthLesson.html.includes("Fall risk is a plan, not just a score")) throw new Error("Lesson 29 musculoskeletal-assessment content is incomplete");
if (twentyNinthQuiz.questions.length !== 10) throw new Error("Lesson 29 must include ten musculoskeletal-assessment questions");
if (twentyNinthLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || twentyNinthLesson.nclexClientNeeds !== "Basic Care and Comfort" || twentyNinthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 29 must preserve all three content tags");
for (const question of twentyNinthQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 29 question must preserve its course and NCLEX tags");
}
const thirtiethLessonItem = curriculum.lessons[29];
const thirtiethLesson = JSON.parse(read(thirtiethLessonItem.lessonFile));
const thirtiethQuiz = JSON.parse(read(thirtiethLessonItem.quizFile));
if (thirtiethLessonItem.courseId !== "health-assessment-skills" || thirtiethLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 30 must remain in Health Assessment & Nursing Skills");
if (!thirtiethLesson.title.includes("Skin, Hair & Nail Assessment—Pressure Injury Risk and Early Change") || !thirtiethLesson.html.includes("Assess color across skin tones") || !thirtiethLesson.html.includes("Describe lesions before naming them") || !thirtiethLesson.html.includes("Identify early pressure-related change") || !thirtiethLesson.html.includes("Risk tools support—but never replace—inspection")) throw new Error("Lesson 30 integumentary-assessment content is incomplete");
if (thirtiethQuiz.questions.length !== 10) throw new Error("Lesson 30 must include ten integumentary-assessment questions");
if (thirtiethLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || thirtiethLesson.nclexClientNeeds !== "Reduction of Risk Potential" || thirtiethLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 30 must preserve all three content tags");
for (const question of thirtiethQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 30 question must preserve its course and NCLEX tags");
}
const thirtyFirstLessonItem = curriculum.lessons[30];
const thirtyFirstLesson = JSON.parse(read(thirtyFirstLessonItem.lessonFile));
const thirtyFirstQuiz = JSON.parse(read(thirtyFirstLessonItem.quizFile));
if (thirtyFirstLessonItem.courseId !== "health-assessment-skills" || thirtyFirstLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 31 must remain in Health Assessment & Nursing Skills");
if (!thirtyFirstLesson.title.includes("Lines, Tubes & Drains—IV, Urinary Catheter & Enteral Tube Safety") || !thirtyFirstLesson.html.includes("Assess the client before the device") || !thirtyFirstLesson.html.includes("Peripheral IV assessment") || !thirtyFirstLesson.html.includes("Indwelling urinary catheter safety") || !thirtyFirstLesson.html.includes("Enteral tube assessment")) throw new Error("Lesson 31 lines, tubes, and drains content is incomplete");
if (thirtyFirstQuiz.questions.length !== 10) throw new Error("Lesson 31 must include ten lines, tubes, and drains questions");
if (thirtyFirstLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || thirtyFirstLesson.nclexClientNeeds !== "Reduction of Risk Potential" || thirtyFirstLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 31 must preserve all three content tags");
for (const question of thirtyFirstQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 31 question must preserve its course and NCLEX tags");
}
const thirtySecondLessonItem = curriculum.lessons[31];
const thirtySecondLesson = JSON.parse(read(thirtySecondLessonItem.lessonFile));
const thirtySecondQuiz = JSON.parse(read(thirtySecondLessonItem.quizFile));
if (thirtySecondLessonItem.courseId !== "health-assessment-skills" || thirtySecondLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 32 must remain in Health Assessment & Nursing Skills");
if (!thirtySecondLesson.title.includes("Laboratory Interpretation—Reference Ranges, Trends & Critical Results") || !thirtySecondLesson.html.includes("Start with the client, then validate the result") || !thirtySecondLesson.html.includes("Read a complete blood count as connected cell lines") || !thirtySecondLesson.html.includes("Interpret electrolytes through their clinical effects") || !thirtySecondLesson.html.includes("Respond to critical and unexpected results")) throw new Error("Lesson 32 laboratory-interpretation content is incomplete");
if (thirtySecondQuiz.questions.length !== 10) throw new Error("Lesson 32 must include ten laboratory-interpretation questions");
if (thirtySecondLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || thirtySecondLesson.nclexClientNeeds !== "Reduction of Risk Potential" || thirtySecondLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 32 must preserve all three content tags");
for (const question of thirtySecondQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 32 question must preserve its course and NCLEX tags");
}
const thirtyThirdLessonItem = curriculum.lessons[32];
const thirtyThirdLesson = JSON.parse(read(thirtyThirdLessonItem.lessonFile));
const thirtyThirdQuiz = JSON.parse(read(thirtyThirdLessonItem.quizFile));
if (thirtyThirdLessonItem.courseId !== "health-assessment-skills" || thirtyThirdLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 33 must remain in Health Assessment & Nursing Skills");
if (!thirtyThirdLesson.title.includes("Recognizing Abnormal Findings—From Cue to Escalation") || !thirtyThirdLesson.html.includes("Know the baseline—but never normalize a dangerous change") || !thirtyThirdLesson.html.includes("Validate data without abandoning the client") || !thirtyThirdLesson.html.includes("Cluster cues across sources") || !thirtyThirdLesson.html.includes("Reassessment closes the rescue loop")) throw new Error("Lesson 33 abnormal-findings content is incomplete");
if (thirtyThirdQuiz.questions.length !== 10) throw new Error("Lesson 33 must include ten abnormal-findings questions");
if (thirtyThirdLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || thirtyThirdLesson.nclexClientNeeds !== "Reduction of Risk Potential" || thirtyThirdLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 33 must preserve all three content tags");
for (const question of thirtyThirdQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 33 question must preserve its course and NCLEX tags");
}
const thirtyFourthLessonItem = curriculum.lessons[33];
const thirtyFourthLesson = JSON.parse(read(thirtyFourthLessonItem.lessonFile));
const thirtyFourthQuiz = JSON.parse(read(thirtyFourthLessonItem.quizFile));
if (thirtyFourthLessonItem.courseId !== "health-assessment-skills" || thirtyFourthLessonItem.course !== "Health Assessment & Nursing Skills") throw new Error("Lesson 34 must complete Health Assessment & Nursing Skills");
if (!thirtyFourthLesson.title.includes("Nursing Documentation—Accurate Charting, Handoffs & Legal Safety") || !thirtyFourthLesson.html.includes("Document the clinical story—not just completed tasks") || !thirtyFourthLesson.html.includes("Correct errors transparently") || !thirtyFourthLesson.html.includes("Handoff transfers information, authority, and responsibility") || !thirtyFourthLesson.html.includes("Protect privacy and confidentiality")) throw new Error("Lesson 34 nursing-documentation content is incomplete");
if (thirtyFourthQuiz.questions.length !== 10) throw new Error("Lesson 34 must include ten nursing-documentation questions");
if (thirtyFourthLesson.traditionalCourse !== "Health Assessment & Nursing Skills" || thirtyFourthLesson.nclexClientNeeds !== "Management of Care" || thirtyFourthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 34 must preserve all three content tags");
for (const question of thirtyFourthQuiz.questions) {
  if (question.traditionalCourse !== "Health Assessment & Nursing Skills" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 34 question must preserve its course and NCLEX tags");
}
const thirtyFifthLessonItem = curriculum.lessons[34];
const thirtyFifthLesson = JSON.parse(read(thirtyFifthLessonItem.lessonFile));
const thirtyFifthQuiz = JSON.parse(read(thirtyFifthLessonItem.quizFile));
if (thirtyFifthLessonItem.courseId !== "pathophysiology" || thirtyFifthLessonItem.course !== "Pathophysiology") throw new Error("Lesson 35 must begin Pathophysiology");
if (!thirtyFifthLesson.title.includes("Cellular Adaptation, Injury & Death—From Homeostasis to Clinical Cues") || !thirtyFifthLesson.html.includes("Homeostasis is dynamic balance") || !thirtyFifthLesson.html.includes("Adaptation changes size, number, or cell type") || !thirtyFifthLesson.html.includes("ATP depletion begins the injury cascade") || !thirtyFifthLesson.html.includes("Necrosis and apoptosis are not interchangeable")) throw new Error("Lesson 35 cellular-pathophysiology content is incomplete");
if (thirtyFifthQuiz.questions.length !== 10) throw new Error("Lesson 35 must include ten cellular-pathophysiology questions");
if (thirtyFifthLesson.traditionalCourse !== "Pathophysiology" || thirtyFifthLesson.nclexClientNeeds !== "Physiological Adaptation" || thirtyFifthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 35 must preserve all three content tags");
for (const question of thirtyFifthQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 35 question must preserve its course and NCLEX tags");
}
const thirtySixthLessonItem = curriculum.lessons[35];
const thirtySixthLesson = JSON.parse(read(thirtySixthLessonItem.lessonFile));
const thirtySixthQuiz = JSON.parse(read(thirtySixthLessonItem.quizFile));
if (thirtySixthLessonItem.courseId !== "pathophysiology" || thirtySixthLessonItem.course !== "Pathophysiology") throw new Error("Lesson 36 must remain in Pathophysiology");
if (!thirtySixthLesson.title.includes("Inflammation, Fever & Tissue Repair—Protection, Injury and Healing") || !thirtySixthLesson.html.includes("Inflammation is not the same as infection") || !thirtySixthLesson.html.includes("Vascular changes create the cardinal signs") || !thirtySixthLesson.html.includes("Fever resets the temperature set point") || !thirtySixthLesson.html.includes("Tissue repair uses four overlapping phases")) throw new Error("Lesson 36 inflammation and repair content is incomplete");
if (thirtySixthQuiz.questions.length !== 10) throw new Error("Lesson 36 must include ten inflammation and repair questions");
if (thirtySixthLesson.traditionalCourse !== "Pathophysiology" || thirtySixthLesson.nclexClientNeeds !== "Physiological Adaptation" || thirtySixthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 36 must preserve all three content tags");
for (const question of thirtySixthQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 36 question must preserve its course and NCLEX tags");
}
const thirtySeventhLessonItem = curriculum.lessons[36];
const thirtySeventhLesson = JSON.parse(read(thirtySeventhLessonItem.lessonFile));
const thirtySeventhQuiz = JSON.parse(read(thirtySeventhLessonItem.quizFile));
if (thirtySeventhLessonItem.courseId !== "pathophysiology" || thirtySeventhLessonItem.course !== "Pathophysiology") throw new Error("Lesson 37 must remain in Pathophysiology");
if (!thirtySeventhLesson.title.includes("Innate & Adaptive Immunity—Defense, Memory and Dysregulation") || !thirtySeventhLesson.html.includes("Innate immunity is rapid and broadly targeted") || !thirtySeventhLesson.html.includes("Antigen presentation connects innate and adaptive immunity") || !thirtySeventhLesson.html.includes("Active and passive immunity are different") || !thirtySeventhLesson.html.includes("Anaphylaxis is an airway and circulation emergency")) throw new Error("Lesson 37 immunity content is incomplete");
if (thirtySeventhQuiz.questions.length !== 10) throw new Error("Lesson 37 must include ten immunity questions");
if (thirtySeventhLesson.traditionalCourse !== "Pathophysiology" || thirtySeventhLesson.nclexClientNeeds !== "Physiological Adaptation" || thirtySeventhLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 37 must preserve all three content tags");
for (const question of thirtySeventhQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 37 question must preserve its course and NCLEX tags");
}
const thirtyEighthLessonItem = curriculum.lessons[37];
const thirtyEighthLesson = JSON.parse(read(thirtyEighthLessonItem.lessonFile));
const thirtyEighthQuiz = JSON.parse(read(thirtyEighthLessonItem.quizFile));
if (thirtyEighthLessonItem.courseId !== "pathophysiology" || thirtyEighthLessonItem.course !== "Pathophysiology") throw new Error("Lesson 38 must remain in Pathophysiology");
if (!thirtyEighthLesson.title.includes("Infection—From Exposure and Colonization to Sepsis") || !thirtyEighthLesson.html.includes("Presence of a microorganism is not always infection") || !thirtyEighthLesson.html.includes("The chain of infection identifies prevention points") || !thirtyEighthLesson.html.includes("Specimens must answer the clinical question") || !thirtyEighthLesson.html.includes("Sepsis is infection with a dangerous systemic response")) throw new Error("Lesson 38 infection content is incomplete");
if (thirtyEighthQuiz.questions.length !== 10) throw new Error("Lesson 38 must include ten infection questions");
if (thirtyEighthLesson.traditionalCourse !== "Pathophysiology" || thirtyEighthLesson.nclexClientNeeds !== "Physiological Adaptation" || thirtyEighthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 38 must preserve all three content tags");
for (const question of thirtyEighthQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 38 question must preserve its course and NCLEX tags");
}
const thirtyNinthLessonItem = curriculum.lessons[38];
const thirtyNinthLesson = JSON.parse(read(thirtyNinthLessonItem.lessonFile));
const thirtyNinthQuiz = JSON.parse(read(thirtyNinthLessonItem.quizFile));
if (thirtyNinthLessonItem.courseId !== "pathophysiology" || thirtyNinthLessonItem.course !== "Pathophysiology") throw new Error("Lesson 39 must remain in Pathophysiology");
if (!thirtyNinthLesson.title.includes("Fluid Compartments & Volume Regulation—Movement, Edema and Perfusion") || !thirtyNinthLesson.html.includes("Body water occupies connected compartments") || !thirtyNinthLesson.html.includes("Osmolality and tonicity answer different questions") || !thirtyNinthLesson.html.includes("Third spacing can hide intravascular depletion") || !thirtyNinthLesson.html.includes("The kidneys and hormones defend balance")) throw new Error("Lesson 39 fluid-balance content is incomplete");
if (thirtyNinthQuiz.questions.length !== 10) throw new Error("Lesson 39 must include ten fluid-balance questions");
if (thirtyNinthLesson.traditionalCourse !== "Pathophysiology" || thirtyNinthLesson.nclexClientNeeds !== "Physiological Adaptation" || thirtyNinthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 39 must preserve all three content tags");
for (const question of thirtyNinthQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 39 question must preserve its course and NCLEX tags");
}
const fortiethLessonItem = curriculum.lessons[39];
const fortiethLesson = JSON.parse(read(fortiethLessonItem.lessonFile));
const fortiethQuiz = JSON.parse(read(fortiethLessonItem.quizFile));
if (fortiethLessonItem.courseId !== "pathophysiology" || fortiethLessonItem.course !== "Pathophysiology") throw new Error("Lesson 40 must remain in Pathophysiology");
if (!fortiethLesson.title.includes("Sodium & Water Disorders—Hyponatremia, Hypernatremia and Brain Adaptation") || !fortiethLesson.html.includes("Start with tonicity—not the sodium number alone") || !fortiethLesson.html.includes("Hyponatremia causes water to enter brain cells") || !fortiethLesson.html.includes("Hypernatremia usually reflects too little water") || !fortiethLesson.html.includes("Evaluate correction and detect complications")) throw new Error("Lesson 40 sodium-disorder content is incomplete");
if (fortiethQuiz.questions.length !== 10) throw new Error("Lesson 40 must include ten sodium-disorder questions");
if (fortiethLesson.traditionalCourse !== "Pathophysiology" || fortiethLesson.nclexClientNeeds !== "Physiological Adaptation" || fortiethLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 40 must preserve all three content tags");
for (const question of fortiethQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 40 question must preserve its course and NCLEX tags");
}
const fortyFirstLessonItem = curriculum.lessons[40];
const fortyFirstLesson = JSON.parse(read(fortyFirstLessonItem.lessonFile));
const fortyFirstQuiz = JSON.parse(read(fortyFirstLessonItem.quizFile));
if (fortyFirstLessonItem.courseId !== "pathophysiology" || fortyFirstLessonItem.course !== "Pathophysiology") throw new Error("Lesson 41 must remain in Pathophysiology");
if (!fortyFirstLesson.title.includes("Potassium Disorders—Cellular Shifts, Dysrhythmias and Safe Correction") || !fortyFirstLesson.html.includes("Serum potassium is a small window into a large store") || !fortyFirstLesson.html.includes("Potassium replacement is high-alert therapy") || !fortyFirstLesson.html.includes("Exclude pseudohyperkalemia without delaying rescue") || !fortyFirstLesson.html.includes("Emergency treatment has three different jobs")) throw new Error("Lesson 41 potassium-disorder content is incomplete");
if (fortyFirstQuiz.questions.length !== 10) throw new Error("Lesson 41 must include ten potassium-disorder questions");
if (fortyFirstLesson.traditionalCourse !== "Pathophysiology" || fortyFirstLesson.nclexClientNeeds !== "Physiological Adaptation" || fortyFirstLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 41 must preserve all three content tags");
for (const question of fortyFirstQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 41 question must preserve its course and NCLEX tags");
}
const fortySecondLessonItem = curriculum.lessons[41];
const fortySecondLesson = JSON.parse(read(fortySecondLessonItem.lessonFile));
const fortySecondQuiz = JSON.parse(read(fortySecondLessonItem.quizFile));
if (fortySecondLessonItem.courseId !== "pathophysiology" || fortySecondLessonItem.course !== "Pathophysiology") throw new Error("Lesson 42 must remain in Pathophysiology");
if (!fortySecondLesson.title.includes("Calcium, Magnesium & Phosphate—Excitability, Bone and Cellular Energy") || !fortySecondLesson.html.includes("Ionized calcium is the biologically active fraction") || !fortySecondLesson.html.includes("Magnesium stabilizes enzymes, membranes, and electrolyte balance") || !fortySecondLesson.html.includes("Refeeding can create a dangerous intracellular shift") || !fortySecondLesson.html.includes("Replacement can create new emergencies")) throw new Error("Lesson 42 calcium-magnesium-phosphate content is incomplete");
if (fortySecondQuiz.questions.length !== 10) throw new Error("Lesson 42 must include ten calcium-magnesium-phosphate questions");
if (fortySecondLesson.traditionalCourse !== "Pathophysiology" || fortySecondLesson.nclexClientNeeds !== "Physiological Adaptation" || fortySecondLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 42 must preserve all three content tags");
for (const question of fortySecondQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 42 question must preserve its course and NCLEX tags");
}
const fortyThirdLessonItem = curriculum.lessons[42];
const fortyThirdLesson = JSON.parse(read(fortyThirdLessonItem.lessonFile));
const fortyThirdQuiz = JSON.parse(read(fortyThirdLessonItem.quizFile));
if (fortyThirdLessonItem.courseId !== "pathophysiology" || fortyThirdLessonItem.course !== "Pathophysiology") throw new Error("Lesson 43 must remain in Pathophysiology");
if (!fortyThirdLesson.title.includes("Acid–Base Balance—ABG Patterns, Compensation and Mixed Disorders") || !fortyThirdLesson.html.includes("pH depends on a ratio") || !fortyThirdLesson.html.includes("Use a systematic interpretation sequence") || !fortyThirdLesson.html.includes("The anion gap organizes unmeasured ions") || !fortyThirdLesson.html.includes("Compensation moves toward normal but does not overcorrect")) throw new Error("Lesson 43 acid-base content is incomplete");
if (fortyThirdQuiz.questions.length !== 10) throw new Error("Lesson 43 must include ten acid-base questions");
if (fortyThirdLesson.traditionalCourse !== "Pathophysiology" || fortyThirdLesson.nclexClientNeeds !== "Physiological Adaptation" || fortyThirdLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 43 must preserve all three content tags");
for (const question of fortyThirdQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 43 question must preserve its course and NCLEX tags");
}
const fortyFourthLessonItem = curriculum.lessons[43];
const fortyFourthLesson = JSON.parse(read(fortyFourthLessonItem.lessonFile));
const fortyFourthQuiz = JSON.parse(read(fortyFourthLessonItem.quizFile));
if (fortyFourthLessonItem.courseId !== "pathophysiology" || fortyFourthLessonItem.course !== "Pathophysiology") throw new Error("Lesson 44 must remain in Pathophysiology");
if (!fortyFourthLesson.title.includes("Cardiovascular Hemodynamics—Cardiac Output, Ischemia and Heart Failure") || !fortyFourthLesson.html.includes("Cardiac output links the pump to perfusion") || !fortyFourthLesson.html.includes("Coronary perfusion must match myocardial demand") || !fortyFourthLesson.html.includes("Heart failure can reflect impaired ejection, filling, or both") || !fortyFourthLesson.html.includes("Cardiogenic shock is pump failure with organ hypoperfusion")) throw new Error("Lesson 44 cardiovascular hemodynamics content is incomplete");
if (fortyFourthQuiz.questions.length !== 10) throw new Error("Lesson 44 must include ten cardiovascular questions");
if (fortyFourthLesson.traditionalCourse !== "Pathophysiology" || fortyFourthLesson.nclexClientNeeds !== "Physiological Adaptation" || fortyFourthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 44 must preserve all three content tags");
for (const question of fortyFourthQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 44 question must preserve its course and NCLEX tags");
}
const fortyFifthLessonItem = curriculum.lessons[44];
const fortyFifthLesson = JSON.parse(read(fortyFifthLessonItem.lessonFile));
const fortyFifthQuiz = JSON.parse(read(fortyFifthLessonItem.quizFile));
if (fortyFifthLessonItem.courseId !== "pathophysiology" || fortyFifthLessonItem.course !== "Pathophysiology") throw new Error("Lesson 45 must remain in Pathophysiology");
if (!fortyFifthLesson.title.includes("Respiratory Gas Exchange—Ventilation, V/Q Mismatch and Respiratory Failure") || !fortyFifthLesson.html.includes("Ventilation moves carbon dioxide; oxygenation is a different function") || !fortyFifthLesson.html.includes("Ventilation and perfusion must meet in the same alveolus") || !fortyFifthLesson.html.includes("Hypoxemia and tissue hypoxia are related but not identical") || !fortyFifthLesson.html.includes("Respiratory failure may be hypoxemic, hypercapnic, or mixed")) throw new Error("Lesson 45 respiratory pathophysiology content is incomplete");
if (fortyFifthQuiz.questions.length !== 10) throw new Error("Lesson 45 must include ten respiratory pathophysiology questions");
if (fortyFifthLesson.traditionalCourse !== "Pathophysiology" || fortyFifthLesson.nclexClientNeeds !== "Physiological Adaptation" || fortyFifthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 45 must preserve all three content tags");
for (const question of fortyFifthQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 45 question must preserve its course and NCLEX tags");
}
const fortySixthLessonItem = curriculum.lessons[45];
const fortySixthLesson = JSON.parse(read(fortySixthLessonItem.lessonFile));
const fortySixthQuiz = JSON.parse(read(fortySixthLessonItem.quizFile));
if (fortySixthLessonItem.courseId !== "pathophysiology" || fortySixthLessonItem.course !== "Pathophysiology") throw new Error("Lesson 46 must remain in Pathophysiology");
if (!fortySixthLesson.title.includes("Renal Function—Filtration, Acute Kidney Injury and Chronic Kidney Disease") || !fortySixthLesson.html.includes("The nephron filters first, then edits the filtrate") || !fortySixthLesson.html.includes("Acute kidney injury is organized by mechanism") || !fortySixthLesson.html.includes("Chronic kidney disease is defined by persistence, not one result") || !fortySixthLesson.html.includes("Uremia is a clinical syndrome, not simply a high urea value")) throw new Error("Lesson 46 renal pathophysiology content is incomplete");
if (fortySixthQuiz.questions.length !== 10) throw new Error("Lesson 46 must include ten renal pathophysiology questions");
if (fortySixthLesson.traditionalCourse !== "Pathophysiology" || fortySixthLesson.nclexClientNeeds !== "Physiological Adaptation" || fortySixthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 46 must preserve all three content tags");
for (const question of fortySixthQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 46 question must preserve its course and NCLEX tags");
}
const fortySeventhLessonItem = curriculum.lessons[46];
const fortySeventhLesson = JSON.parse(read(fortySeventhLessonItem.lessonFile));
const fortySeventhQuiz = JSON.parse(read(fortySeventhLessonItem.quizFile));
if (fortySeventhLessonItem.courseId !== "pathophysiology" || fortySeventhLessonItem.course !== "Pathophysiology") throw new Error("Lesson 47 must remain in Pathophysiology");
if (!fortySeventhLesson.title.includes("Endocrine Regulation—Feedback Loops, Glucose Control and Hormonal Crises") || !fortySeventhLesson.html.includes("Hormone systems communicate through feedback loops") || !fortySeventhLesson.html.includes("DKA is insulin deficiency with ketone-driven acidosis") || !fortySeventhLesson.html.includes("Thyroid storm is clinical decompensation, not just a high hormone value") || !fortySeventhLesson.html.includes("Adrenal crisis is refractory shock until proven otherwise")) throw new Error("Lesson 47 endocrine pathophysiology content is incomplete");
if (fortySeventhQuiz.questions.length !== 10) throw new Error("Lesson 47 must include ten endocrine pathophysiology questions");
if (fortySeventhLesson.traditionalCourse !== "Pathophysiology" || fortySeventhLesson.nclexClientNeeds !== "Physiological Adaptation" || fortySeventhLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 47 must preserve all three content tags");
for (const question of fortySeventhQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 47 question must preserve its course and NCLEX tags");
}
const fortyEighthLessonItem = curriculum.lessons[47];
const fortyEighthLesson = JSON.parse(read(fortyEighthLessonItem.lessonFile));
const fortyEighthQuiz = JSON.parse(read(fortyEighthLessonItem.quizFile));
if (fortyEighthLessonItem.courseId !== "pathophysiology" || fortyEighthLessonItem.course !== "Pathophysiology") throw new Error("Lesson 48 must remain in Pathophysiology");
if (!fortyEighthLesson.title.includes("Neurologic Function—Cerebral Perfusion, Stroke, Seizures and Deterioration") || !fortyEighthLesson.html.includes("Cerebral perfusion depends on pressure and resistance") || !fortyEighthLesson.html.includes("The skull contains a fixed total volume") || !fortyEighthLesson.html.includes("Ischemic stroke creates a core and a threatened penumbra") || !fortyEighthLesson.html.includes("Status epilepticus is a time-sensitive emergency")) throw new Error("Lesson 48 neurologic pathophysiology content is incomplete");
if (fortyEighthQuiz.questions.length !== 10) throw new Error("Lesson 48 must include ten neurologic pathophysiology questions");
if (fortyEighthLesson.traditionalCourse !== "Pathophysiology" || fortyEighthLesson.nclexClientNeeds !== "Physiological Adaptation" || fortyEighthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 48 must preserve all three content tags");
for (const question of fortyEighthQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 48 question must preserve its course and NCLEX tags");
}
const fortyNinthLessonItem = curriculum.lessons[48];
const fortyNinthLesson = JSON.parse(read(fortyNinthLessonItem.lessonFile));
const fortyNinthQuiz = JSON.parse(read(fortyNinthLessonItem.quizFile));
if (fortyNinthLessonItem.courseId !== "pathophysiology" || fortyNinthLessonItem.course !== "Pathophysiology") throw new Error("Lesson 49 must remain in Pathophysiology");
if (!fortyNinthLesson.title.includes("Gastrointestinal & Hepatobiliary Function—Obstruction, Bleeding and Organ Failure") || !fortyNinthLesson.html.includes("Obstruction raises pressure and threatens blood flow") || !fortyNinthLesson.html.includes("Mesenteric ischemia is a vascular emergency") || !fortyNinthLesson.html.includes("GI bleeding can be visible, occult, or concealed") || !fortyNinthLesson.html.includes("Acute pancreatitis can become systemic")) throw new Error("Lesson 49 gastrointestinal and hepatobiliary pathophysiology content is incomplete");
if (fortyNinthQuiz.questions.length !== 10) throw new Error("Lesson 49 must include ten gastrointestinal and hepatobiliary pathophysiology questions");
if (fortyNinthLesson.traditionalCourse !== "Pathophysiology" || fortyNinthLesson.nclexClientNeeds !== "Physiological Adaptation" || fortyNinthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 49 must preserve all three content tags");
for (const question of fortyNinthQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 49 question must preserve its course and NCLEX tags");
}
const fiftiethLessonItem = curriculum.lessons[49];
const fiftiethLesson = JSON.parse(read(fiftiethLessonItem.lessonFile));
const fiftiethQuiz = JSON.parse(read(fiftiethLessonItem.quizFile));
if (fiftiethLessonItem.courseId !== "pathophysiology" || fiftiethLessonItem.course !== "Pathophysiology") throw new Error("Lesson 50 must remain in Pathophysiology");
if (!fiftiethLesson.title.includes("Hematologic Function & Systemic Shock—Oxygen Delivery, Hemostasis, DIC and Multiorgan Failure") || !fiftiethLesson.html.includes("Oxygen delivery depends on more than pulse oximetry") || !fiftiethLesson.html.includes("DIC causes clotting and bleeding at the same time") || !fiftiethLesson.html.includes("Four major shock mechanisms guide hypotheses") || !fiftiethLesson.html.includes("Multiorgan dysfunction is an interacting network failure")) throw new Error("Lesson 50 hematologic and systemic shock pathophysiology content is incomplete");
if (fiftiethQuiz.questions.length !== 10) throw new Error("Lesson 50 must include ten hematologic and shock pathophysiology questions");
if (fiftiethLesson.traditionalCourse !== "Pathophysiology" || fiftiethLesson.nclexClientNeeds !== "Physiological Adaptation" || fiftiethLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 50 must preserve all three content tags");
for (const question of fiftiethQuiz.questions) {
  if (question.traditionalCourse !== "Pathophysiology" || !clientNeedsTitles.has(question.nclexClientNeeds)) throw new Error("Each Lesson 50 question must preserve its course and NCLEX tags");
}
const fiftyFirstLessonItem = curriculum.lessons[50];
const fiftyFirstLesson = JSON.parse(read(fiftyFirstLessonItem.lessonFile));
const fiftyFirstQuiz = JSON.parse(read(fiftyFirstLessonItem.quizFile));
if (fiftyFirstLessonItem.courseId !== "pharmacology" || fiftyFirstLessonItem.course !== "Pharmacology") throw new Error("Lesson 51 must begin the Pharmacology phase");
if (!fiftyFirstLesson.title.includes("Pharmacology Foundations: Pharmacokinetics, Pharmacodynamics & Individualized Medication Response") || !fiftyFirstLesson.html.includes("Pharmacokinetics is what the body does to the drug") || !fiftyFirstLesson.html.includes("Half-life predicts accumulation and decline") || !fiftyFirstLesson.html.includes("Pharmacodynamics is what the drug does to the body") || !fiftyFirstLesson.html.includes("Every dose is a new decision point")) throw new Error("Lesson 51 foundational pharmacology content is incomplete");
if (fiftyFirstQuiz.questions.length !== 10) throw new Error("Lesson 51 must include ten foundational pharmacology questions");
if (fiftyFirstLesson.traditionalCourse !== "Pharmacology" || fiftyFirstLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || fiftyFirstLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 51 must preserve all three content tags");
for (const question of fiftyFirstQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 51 question must preserve its course and NCLEX tags");
}
const fiftySecondLessonItem = curriculum.lessons[51];
const fiftySecondLesson = JSON.parse(read(fiftySecondLessonItem.lessonFile));
const fiftySecondQuiz = JSON.parse(read(fiftySecondLessonItem.quizFile));
if (fiftySecondLessonItem.courseId !== "pharmacology" || fiftySecondLessonItem.course !== "Pharmacology") throw new Error("Lesson 52 must remain in Pharmacology");
if (!fiftySecondLesson.title.includes("Medication Administration Safety: Verification, Reconciliation, High-Alert Safeguards & Error Response") || !fiftySecondLesson.html.includes("Begin with the current client, not the medication package") || !fiftySecondLesson.html.includes("High-alert means the consequence of error is greater") || !fiftySecondLesson.html.includes("Respond to an error by protecting the client first") || !fiftySecondLesson.html.includes("Correct scanning never overrides new clinical cues")) throw new Error("Lesson 52 medication administration safety content is incomplete");
if (fiftySecondQuiz.questions.length !== 10) throw new Error("Lesson 52 must include ten medication administration safety questions");
if (fiftySecondLesson.traditionalCourse !== "Pharmacology" || fiftySecondLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || fiftySecondLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 52 must preserve all three content tags");
for (const question of fiftySecondQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 52 question must preserve its course and NCLEX tags");
}
const fiftyThirdLessonItem = curriculum.lessons[52];
const fiftyThirdLesson = JSON.parse(read(fiftyThirdLessonItem.lessonFile));
const fiftyThirdQuiz = JSON.parse(read(fiftyThirdLessonItem.quizFile));
if (fiftyThirdLessonItem.courseId !== "pharmacology" || fiftyThirdLessonItem.course !== "Pharmacology") throw new Error("Lesson 53 must remain in Pharmacology");
if (!fiftyThirdLesson.title.includes("Dosage Calculations & Infusion Math: Units, Safe Ranges, Pump Rates and Clinical Verification") || !fiftyThirdLesson.html.includes("Start with meaning, not arithmetic") || !fiftyThirdLesson.html.includes("Weight-based doses must preserve the time basis") || !fiftyThirdLesson.html.includes("Convert dose-per-time orders into mL/hr") || !fiftyThirdLesson.html.includes("Unexpected pump behavior is a clinical event")) throw new Error("Lesson 53 dosage and infusion calculation content is incomplete");
if (fiftyThirdQuiz.questions.length !== 10) throw new Error("Lesson 53 must include ten dosage and infusion calculation questions");
if (fiftyThirdLesson.traditionalCourse !== "Pharmacology" || fiftyThirdLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || fiftyThirdLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 53 must preserve all three content tags");
for (const question of fiftyThirdQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 53 question must preserve its course and NCLEX tags");
}
const fiftyFourthLessonItem = curriculum.lessons[53];
const fiftyFourthLesson = JSON.parse(read(fiftyFourthLessonItem.lessonFile));
const fiftyFourthQuiz = JSON.parse(read(fiftyFourthLessonItem.quizFile));
if (fiftyFourthLessonItem.courseId !== "pharmacology" || fiftyFourthLessonItem.course !== "Pharmacology") throw new Error("Lesson 54 must remain in Pharmacology");
if (!fiftyFourthLesson.title.includes("IV Medication Administration: Access, Compatibility, Push Safety, Extravasation & Infusion Reactions") || !fiftyFourthLesson.html.includes("Choose access that matches the therapy") || !fiftyFourthLesson.html.includes("Compatibility is specific to products and conditions") || !fiftyFourthLesson.html.includes("Do not flush a suspected extravasation") || !fiftyFourthLesson.html.includes("Pumps add precision, not certainty")) throw new Error("Lesson 54 IV medication content is incomplete");
if (fiftyFourthQuiz.questions.length !== 10) throw new Error("Lesson 54 must include ten IV medication questions");
if (fiftyFourthLesson.traditionalCourse !== "Pharmacology" || fiftyFourthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || fiftyFourthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 54 must preserve all three content tags");
for (const question of fiftyFourthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 54 question must preserve its course and NCLEX tags");
}
const fiftyFifthLessonItem = curriculum.lessons[54];
const fiftyFifthLesson = JSON.parse(read(fiftyFifthLessonItem.lessonFile));
const fiftyFifthQuiz = JSON.parse(read(fiftyFifthLessonItem.quizFile));
if (fiftyFifthLessonItem.courseId !== "pharmacology" || fiftyFifthLessonItem.course !== "Pharmacology") throw new Error("Lesson 55 must remain in Pharmacology");
if (!fiftyFifthLesson.title.includes("High-Alert Medications & Rescue Readiness") || !fiftyFifthLesson.html.includes("High-alert is a harm category, not a frequency claim") || !fiftyFifthLesson.html.includes("Make the double check truly independent") || !fiftyFifthLesson.html.includes("Never give potassium chloride by IV push") || !fiftyFifthLesson.html.includes("Neuromuscular blockers paralyze; they do not sedate or relieve pain") || !fiftyFifthLesson.html.includes("Prepare rescue before the dose")) throw new Error("Lesson 55 high-alert medication content is incomplete");
if (fiftyFifthQuiz.questions.length !== 10) throw new Error("Lesson 55 must include ten high-alert medication questions");
if (fiftyFifthLesson.traditionalCourse !== "Pharmacology" || fiftyFifthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || fiftyFifthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 55 must preserve all three content tags");
for (const question of fiftyFifthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 55 question must preserve its course and NCLEX tags");
}
const fiftySixthLessonItem = curriculum.lessons[55];
const fiftySixthLesson = JSON.parse(read(fiftySixthLessonItem.lessonFile));
const fiftySixthQuiz = JSON.parse(read(fiftySixthLessonItem.quizFile));
if (fiftySixthLessonItem.courseId !== "pharmacology" || fiftySixthLessonItem.course !== "Pharmacology") throw new Error("Lesson 56 must remain in Pharmacology");
if (!fiftySixthLesson.title.includes("Antibacterial Therapy & Stewardship") || !fiftySixthLesson.html.includes("Start with indication and urgency") || !fiftySixthLesson.html.includes("Obtain the right specimen at the right time") || !fiftySixthLesson.html.includes("Read microbiology as evidence, not an automatic prescription") || !fiftySixthLesson.html.includes("Watch for C. difficile and other superinfection") || !fiftySixthLesson.html.includes("Antibiotic stewardship happens at the bedside")) throw new Error("Lesson 56 antibacterial therapy content is incomplete");
if (fiftySixthQuiz.questions.length !== 10) throw new Error("Lesson 56 must include ten antibacterial therapy questions");
if (fiftySixthLesson.traditionalCourse !== "Pharmacology" || fiftySixthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || fiftySixthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 56 must preserve all three content tags");
for (const question of fiftySixthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 56 question must preserve its course and NCLEX tags");
}
const fiftySeventhLessonItem = curriculum.lessons[56];
const fiftySeventhLesson = JSON.parse(read(fiftySeventhLessonItem.lessonFile));
const fiftySeventhQuiz = JSON.parse(read(fiftySeventhLessonItem.quizFile));
if (fiftySeventhLessonItem.courseId !== "pharmacology" || fiftySeventhLessonItem.course !== "Pharmacology") throw new Error("Lesson 57 must remain in Pharmacology");
if (!fiftySeventhLesson.title.includes("Cardiovascular Medications") || !fiftySeventhLesson.html.includes("Treat the client and the indication—not one number") || !fiftySeventhLesson.html.includes("ACE inhibitor and ARNI require separation") || !fiftySeventhLesson.html.includes("Nitrates reduce myocardial workload and relieve ischemic symptoms") || !fiftySeventhLesson.html.includes("Heart failure therapy has different purposes") || !fiftySeventhLesson.html.includes("Digoxin has a narrow safety margin")) throw new Error("Lesson 57 cardiovascular medication content is incomplete");
if (fiftySeventhQuiz.questions.length !== 10) throw new Error("Lesson 57 must include ten cardiovascular medication questions");
if (fiftySeventhLesson.traditionalCourse !== "Pharmacology" || fiftySeventhLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || fiftySeventhLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 57 must preserve all three content tags");
for (const question of fiftySeventhQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 57 question must preserve its course and NCLEX tags");
}
const fiftyEighthLessonItem = curriculum.lessons[57];
const fiftyEighthLesson = JSON.parse(read(fiftyEighthLessonItem.lessonFile));
const fiftyEighthQuiz = JSON.parse(read(fiftyEighthLessonItem.quizFile));
if (fiftyEighthLessonItem.courseId !== "pharmacology" || fiftyEighthLessonItem.course !== "Pharmacology") throw new Error("Lesson 58 must remain in Pharmacology");
if (!fiftyEighthLesson.title.includes("Anticoagulants, Antiplatelets & Thrombolytics") || !fiftyEighthLesson.html.includes("Match the medication to the clotting pathway") || !fiftyEighthLesson.html.includes("Heparin-induced thrombocytopenia is a clotting emergency") || !fiftyEighthLesson.html.includes("Direct oral anticoagulants require exact product and timing") || !fiftyEighthLesson.html.includes("Neuraxial and procedural safety depends on timing") || !fiftyEighthLesson.html.includes("Respond to bleeding by severity and drug")) throw new Error("Lesson 58 antithrombotic medication content is incomplete");
if (fiftyEighthQuiz.questions.length !== 10) throw new Error("Lesson 58 must include ten antithrombotic medication questions");
if (fiftyEighthLesson.traditionalCourse !== "Pharmacology" || fiftyEighthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || fiftyEighthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 58 must preserve all three content tags");
for (const question of fiftyEighthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 58 question must preserve its course and NCLEX tags");
}
const fiftyNinthLessonItem = curriculum.lessons[58];
const fiftyNinthLesson = JSON.parse(read(fiftyNinthLessonItem.lessonFile));
const fiftyNinthQuiz = JSON.parse(read(fiftyNinthLessonItem.quizFile));
if (fiftyNinthLessonItem.courseId !== "pharmacology" || fiftyNinthLessonItem.course !== "Pharmacology") throw new Error("Lesson 59 must remain in Pharmacology");
if (!fiftyNinthLesson.title.includes("Respiratory Medications & Inhaler Safety") || !fiftyNinthLesson.html.includes("Reliever and controller are clinical roles") || !fiftyNinthLesson.html.includes("A quiet chest can be dangerous") || !fiftyNinthLesson.html.includes("Inhaled corticosteroids control inflammation") || !fiftyNinthLesson.html.includes("Theophylline has a narrow therapeutic range") || !fiftyNinthLesson.html.includes("Device technique determines delivered dose")) throw new Error("Lesson 59 respiratory medication content is incomplete");
if (fiftyNinthQuiz.questions.length !== 10) throw new Error("Lesson 59 must include ten respiratory medication questions");
if (fiftyNinthLesson.traditionalCourse !== "Pharmacology" || fiftyNinthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || fiftyNinthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 59 must preserve all three content tags");
for (const question of fiftyNinthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 59 question must preserve its course and NCLEX tags");
}
const sixtiethLessonItem = curriculum.lessons[59];
const sixtiethLesson = JSON.parse(read(sixtiethLessonItem.lessonFile));
const sixtiethQuiz = JSON.parse(read(sixtiethLessonItem.quizFile));
if (sixtiethLessonItem.courseId !== "pharmacology" || sixtiethLessonItem.course !== "Pharmacology") throw new Error("Lesson 60 must remain in Pharmacology");
if (!sixtiethLesson.title.includes("Diabetes Medications & Insulin Safety") || !sixtiethLesson.html.includes("Start with the whole regimen—not one glucose number") || !sixtiethLesson.html.includes("Type 1 diabetes requires continuous insulin availability") || !sixtiethLesson.html.includes("Insulin is a high-alert medication") || !sixtiethLesson.html.includes("Hypoglycemia is a medication emergency") || !sixtiethLesson.html.includes("SGLT2 inhibitors: benefits with ketosis and volume risks")) throw new Error("Lesson 60 diabetes medication content is incomplete");
if (sixtiethQuiz.questions.length !== 10) throw new Error("Lesson 60 must include ten diabetes medication questions");
if (sixtiethLesson.traditionalCourse !== "Pharmacology" || sixtiethLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtiethLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 60 must preserve all three content tags");
for (const question of sixtiethQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 60 question must preserve its course and NCLEX tags");
}
const sixtyFirstLessonItem = curriculum.lessons[60];
const sixtyFirstLesson = JSON.parse(read(sixtyFirstLessonItem.lessonFile));
const sixtyFirstQuiz = JSON.parse(read(sixtyFirstLessonItem.quizFile));
if (sixtyFirstLessonItem.courseId !== "pharmacology" || sixtyFirstLessonItem.course !== "Pharmacology") throw new Error("Lesson 61 must remain in Pharmacology");
if (!sixtyFirstLesson.title.includes("Thyroid, Adrenal & Pituitary Medications") || !sixtyFirstLesson.html.includes("Think in feedback loops and time courses") || !sixtyFirstLesson.html.includes("Levothyroxine is not a weight-loss drug") || !sixtyFirstLesson.html.includes("Fever or sore throat may signal agranulocytosis") || !sixtyFirstLesson.html.includes("Do not stop chronic glucocorticoids abruptly") || !sixtyFirstLesson.html.includes("Desmopressin reduces free-water excretion")) throw new Error("Lesson 61 endocrine medication content is incomplete");
if (sixtyFirstQuiz.questions.length !== 10) throw new Error("Lesson 61 must include ten endocrine medication questions");
if (sixtyFirstLesson.traditionalCourse !== "Pharmacology" || sixtyFirstLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtyFirstLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 61 must preserve all three content tags");
for (const question of sixtyFirstQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 61 question must preserve its course and NCLEX tags");
}
const sixtySecondLessonItem = curriculum.lessons[61];
const sixtySecondLesson = JSON.parse(read(sixtySecondLessonItem.lessonFile));
const sixtySecondQuiz = JSON.parse(read(sixtySecondLessonItem.quizFile));
if (sixtySecondLessonItem.courseId !== "pharmacology" || sixtySecondLessonItem.course !== "Pharmacology") throw new Error("Lesson 62 must remain in Pharmacology");
if (!sixtySecondLesson.title.includes("Neurologic Medications & Safety") || !sixtySecondLesson.html.includes("Start with the neurologic baseline") || !sixtySecondLesson.html.includes("Do not stop antiseizure medication abruptly") || !sixtySecondLesson.html.includes("Lamotrigine rash can be life-threatening") || !sixtySecondLesson.html.includes("Parkinson medications are time-critical") || !sixtySecondLesson.html.includes("Medication-overuse headache can perpetuate the cycle")) throw new Error("Lesson 62 neurologic medication content is incomplete");
if (sixtySecondQuiz.questions.length !== 10) throw new Error("Lesson 62 must include ten neurologic medication questions");
if (sixtySecondLesson.traditionalCourse !== "Pharmacology" || sixtySecondLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtySecondLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 62 must preserve all three content tags");
for (const question of sixtySecondQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 62 question must preserve its course and NCLEX tags");
}
const sixtyThirdLessonItem = curriculum.lessons[62];
const sixtyThirdLesson = JSON.parse(read(sixtyThirdLessonItem.lessonFile));
const sixtyThirdQuiz = JSON.parse(read(sixtyThirdLessonItem.quizFile));
if (sixtyThirdLessonItem.courseId !== "pharmacology" || sixtyThirdLessonItem.course !== "Pharmacology") throw new Error("Lesson 63 must remain in Pharmacology");
if (!sixtyThirdLesson.title.includes("Psychiatric Medications & Behavioral Safety") || !sixtyThirdLesson.html.includes("Start with safety and the whole person") || !sixtyThirdLesson.html.includes("Activation is not the same as recovery") || !sixtyThirdLesson.html.includes("Serotonin syndrome is a toxic pattern") || !sixtyThirdLesson.html.includes("Lithium has a narrow therapeutic window") || !sixtyThirdLesson.html.includes("Neuroleptic malignant syndrome is an emergency") || !sixtyThirdLesson.html.includes("Clozapine needs continuing ANC and systemic monitoring")) throw new Error("Lesson 63 psychiatric medication content is incomplete");
if (sixtyThirdQuiz.questions.length !== 10) throw new Error("Lesson 63 must include ten psychiatric medication questions");
if (sixtyThirdLesson.traditionalCourse !== "Pharmacology" || sixtyThirdLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtyThirdLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 63 must preserve all three content tags");
for (const question of sixtyThirdQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 63 question must preserve its course and NCLEX tags");
}
const sixtyFourthLessonItem = curriculum.lessons[63];
const sixtyFourthLesson = JSON.parse(read(sixtyFourthLessonItem.lessonFile));
const sixtyFourthQuiz = JSON.parse(read(sixtyFourthLessonItem.quizFile));
if (sixtyFourthLessonItem.courseId !== "pharmacology" || sixtyFourthLessonItem.course !== "Pharmacology") throw new Error("Lesson 64 must remain in Pharmacology");
if (!sixtyFourthLesson.title.includes("Pain Medications & Opioid Safety") || !sixtyFourthLesson.html.includes("Pain relief is more than a number") || !sixtyFourthLesson.html.includes("Sedation can precede respiratory arrest") || !sixtyFourthLesson.html.includes("Count every source of acetaminophen") || !sixtyFourthLesson.html.includes("Only the client presses the PCA button") || !sixtyFourthLesson.html.includes("Naloxone does not end the emergency") || !sixtyFourthLesson.html.includes("Tolerance, dependence, and opioid use disorder are different")) throw new Error("Lesson 64 pain medication and opioid safety content is incomplete");
if (sixtyFourthQuiz.questions.length !== 10) throw new Error("Lesson 64 must include ten pain medication questions");
if (sixtyFourthLesson.traditionalCourse !== "Pharmacology" || sixtyFourthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtyFourthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 64 must preserve all three content tags");
for (const question of sixtyFourthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 64 question must preserve its course and NCLEX tags");
}
const sixtyFifthLessonItem = curriculum.lessons[64];
const sixtyFifthLesson = JSON.parse(read(sixtyFifthLessonItem.lessonFile));
const sixtyFifthQuiz = JSON.parse(read(sixtyFifthLessonItem.quizFile));
if (sixtyFifthLessonItem.courseId !== "pharmacology" || sixtyFifthLessonItem.course !== "Pharmacology") throw new Error("Lesson 65 must remain in Pharmacology");
if (!sixtyFifthLesson.title.includes("Gastrointestinal Medications & Safety") || !sixtyFifthLesson.html.includes("Treat the cause, not just the symptom") || !sixtyFifthLesson.html.includes("Symptom relief can hide deterioration") || !sixtyFifthLesson.html.includes("Metoclopramide requires movement surveillance") || !sixtyFifthLesson.html.includes("Diarrhea treatment begins with hydration and cause") || !sixtyFifthLesson.html.includes("Hepatic encephalopathy: evaluate the brain and the bowel") || !sixtyFifthLesson.html.includes("Medication administration through feeding tubes")) throw new Error("Lesson 65 gastrointestinal medication content is incomplete");
if (sixtyFifthQuiz.questions.length !== 10) throw new Error("Lesson 65 must include ten gastrointestinal medication questions");
if (sixtyFifthLesson.traditionalCourse !== "Pharmacology" || sixtyFifthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtyFifthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 65 must preserve all three content tags");
for (const question of sixtyFifthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 65 question must preserve its course and NCLEX tags");
}
const sixtySixthLessonItem = curriculum.lessons[65];
const sixtySixthLesson = JSON.parse(read(sixtySixthLessonItem.lessonFile));
const sixtySixthQuiz = JSON.parse(read(sixtySixthLessonItem.quizFile));
if (sixtySixthLessonItem.courseId !== "pharmacology" || sixtySixthLessonItem.course !== "Pharmacology") throw new Error("Lesson 66 must remain in Pharmacology");
if (!sixtySixthLesson.title.includes("Maternal–Newborn Medications & Safety") || !sixtySixthLesson.html.includes("Start with indication, timing, and two-patient assessment") || !sixtySixthLesson.html.includes("Oxytocin is a high-alert titrated medication") || !sixtySixthLesson.html.includes("Absent reflexes plus slow breathing is an emergency") || !sixtySixthLesson.html.includes("Match the uterotonic to the client") || !sixtySixthLesson.html.includes("Rh(D) immune globulin prevents sensitization") || !sixtySixthLesson.html.includes("Newborn prophylaxis requires exact identity and timing")) throw new Error("Lesson 66 maternal-newborn medication content is incomplete");
if (sixtySixthQuiz.questions.length !== 10) throw new Error("Lesson 66 must include ten maternal-newborn medication questions");
if (sixtySixthLesson.traditionalCourse !== "Pharmacology" || sixtySixthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtySixthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 66 must preserve all three content tags");
for (const question of sixtySixthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 66 question must preserve its course and NCLEX tags");
}
const sixtySeventhLessonItem = curriculum.lessons[66];
const sixtySeventhLesson = JSON.parse(read(sixtySeventhLessonItem.lessonFile));
const sixtySeventhQuiz = JSON.parse(read(sixtySeventhLessonItem.quizFile));
if (sixtySeventhLessonItem.courseId !== "pharmacology" || sixtySeventhLessonItem.course !== "Pharmacology") throw new Error("Lesson 67 must remain in Pharmacology");
if (!sixtySeventhLesson.title.includes("Pediatric Medication Dosing & Safety") || !sixtySeventhLesson.html.includes("Start with a measured weight in kilograms") || !sixtySeventhLesson.html.includes("Read the dosing expression word by word") || !sixtySeventhLesson.html.includes("The dose and the volume are not interchangeable") || !sixtySeventhLesson.html.includes("Decimals can create tenfold errors") || !sixtySeventhLesson.html.includes("Know important pediatric restrictions") || !sixtySeventhLesson.html.includes("High-alert medications need pediatric-specific safeguards")) throw new Error("Lesson 67 pediatric medication content is incomplete");
if (sixtySeventhQuiz.questions.length !== 10) throw new Error("Lesson 67 must include ten pediatric medication questions");
if (sixtySeventhLesson.traditionalCourse !== "Pharmacology" || sixtySeventhLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtySeventhLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 67 must preserve all three content tags");
for (const question of sixtySeventhQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 67 question must preserve its course and NCLEX tags");
}
const sixtyEighthLessonItem = curriculum.lessons[67];
const sixtyEighthLesson = JSON.parse(read(sixtyEighthLessonItem.lessonFile));
const sixtyEighthQuiz = JSON.parse(read(sixtyEighthLessonItem.quizFile));
if (sixtyEighthLessonItem.courseId !== "pharmacology" || sixtyEighthLessonItem.course !== "Pharmacology") throw new Error("Lesson 68 must remain in Pharmacology");
if (!sixtyEighthLesson.title.includes("Geriatric Medication Safety & Deprescribing") || !sixtyEighthLesson.html.includes("Start with the person, not the birth date") || !sixtyEighthLesson.html.includes("A normal creatinine can hide reduced clearance") || !sixtyEighthLesson.html.includes("Beers Criteria is a screening tool, not a blacklist") || !sixtyEighthLesson.html.includes("Delirium is an emergency clue, not a normal aging change") || !sixtyEighthLesson.html.includes("Deprescribing is a monitored clinical intervention") || !sixtyEighthLesson.html.includes("Stopping a medicine can cause harm too")) throw new Error("Lesson 68 geriatric medication content is incomplete");
if (sixtyEighthQuiz.questions.length !== 10) throw new Error("Lesson 68 must include ten geriatric medication questions");
if (sixtyEighthLesson.traditionalCourse !== "Pharmacology" || sixtyEighthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtyEighthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 68 must preserve all three content tags");
for (const question of sixtyEighthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 68 question must preserve its course and NCLEX tags");
}
const sixtyNinthLessonItem = curriculum.lessons[68];
const sixtyNinthLesson = JSON.parse(read(sixtyNinthLessonItem.lessonFile));
const sixtyNinthQuiz = JSON.parse(read(sixtyNinthLessonItem.quizFile));
if (sixtyNinthLessonItem.courseId !== "pharmacology" || sixtyNinthLessonItem.course !== "Pharmacology") throw new Error("Lesson 69 must remain in Pharmacology");
if (!sixtyNinthLesson.title.includes("Blood Products & Transfusion Safety") || !sixtyNinthLesson.html.includes("Match the component to the deficit") || !sixtyNinthLesson.html.includes("Identity is the final bedside barrier") || !sixtyNinthLesson.html.includes("Stop the transfusion first") || !sixtyNinthLesson.html.includes("TACO and TRALI both cause respiratory distress") || !sixtyNinthLesson.html.includes("Massive transfusion is a resuscitation system") || !sixtyNinthLesson.html.includes("Delayed reactions can appear after discharge")) throw new Error("Lesson 69 blood-product and transfusion-safety content is incomplete");
if (sixtyNinthQuiz.questions.length !== 10) throw new Error("Lesson 69 must include ten blood-product and transfusion-safety questions");
if (sixtyNinthLesson.traditionalCourse !== "Pharmacology" || sixtyNinthLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || sixtyNinthLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 69 must preserve all three content tags");
for (const question of sixtyNinthQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 69 question must preserve its course and NCLEX tags");
}
const seventiethLessonItem = curriculum.lessons[69];
const seventiethLesson = JSON.parse(read(seventiethLessonItem.lessonFile));
const seventiethQuiz = JSON.parse(read(seventiethLessonItem.quizFile));
if (seventiethLessonItem.courseId !== "pharmacology" || seventiethLessonItem.course !== "Pharmacology") throw new Error("Lesson 70 must remain in Pharmacology");
if (!seventiethLesson.title.includes("Adverse Drug Reactions, Allergies, Interactions & Medication Reconciliation") || !seventiethLesson.html.includes("Name the event accurately") || !seventiethLesson.html.includes("Anaphylaxis is a clinical emergency") || !seventiethLesson.html.includes("Interactions are more than two prescriptions") || !seventiethLesson.html.includes("Build the best possible medication history") || !seventiethLesson.html.includes("Reconciliation means compare, decide, and communicate") || !seventiethLesson.html.includes("Withdrawal and rebound are medication harms too")) throw new Error("Lesson 70 adverse-reaction and medication-reconciliation content is incomplete");
if (seventiethQuiz.questions.length !== 10) throw new Error("Lesson 70 must include ten adverse-reaction and medication-reconciliation questions");
if (seventiethLesson.traditionalCourse !== "Pharmacology" || seventiethLesson.nclexClientNeeds !== "Pharmacological and Parenteral Therapies" || seventiethLesson.clinicalJudgmentSteps.length !== judgmentSteps.size) throw new Error("Lesson 70 must preserve all three content tags");
for (const question of seventiethQuiz.questions) {
  if (question.traditionalCourse !== "Pharmacology" || question.nclexClientNeeds !== "Pharmacological and Parenteral Therapies") throw new Error("Each Lesson 70 question must preserve its course and NCLEX tags");
}
if (roadmap.totalLessons !== 184 || roadmap.phases.length !== 12 || roadmap.phases[0].lessonRange.join("-") !== "1-20" || roadmap.phases[11].lessonRange.join("-") !== "177-184") throw new Error("Traditional 184-lesson RN roadmap is incomplete");
if (roadmap.tagging.join("|") !== "traditionalCourse|nclexClientNeeds|clinicalJudgmentStep") throw new Error("Roadmap must preserve all three content tags");
if (!read("js/app.js").includes('fetchJson("data/program-roadmap.json")') || !index.includes('id="curriculumList" class="course-roadmap"') || !index.includes('id="learnList" class="course-roadmap"')) throw new Error("The visible curriculum must list all twelve course phases");
if (!read("js/app.js").includes('document.createElement("details")') || !read("js/app.js").includes("phaseDisclosureState") || !read("js/app.js").includes("new Set([currentPhaseIndex])")) throw new Error("Course phases must be collapsible with the current phase expanded by default");
if (!read("css/styles.css").includes(".course-phase[open] .phase-chevron") || !read("css/styles.css").includes(".course-phase-summary:focus-visible")) throw new Error("Course phase disclosure states must have visible, accessible styling");
if (!index.includes('id="themeToggle" class="floating-theme-toggle"') || !read("css/styles.css").includes(".floating-theme-toggle { position: fixed") || !read("css/styles.css").includes("safe-area-inset-top") || !read("js/app.js").includes('dark ? "☀ Light" : "☾ Dark"')) throw new Error("Theme control must remain fixed at the upper-right with clear Light and Dark labels");
if (!fs.existsSync(path.join(root, "data/roadmap/leadership-priority-delegation.json"))) throw new Error("Original priority and delegation lesson was not preserved in the leadership roadmap");
if (questionIds.size !== 700) throw new Error("Expected 700 pilot questions after adding Lesson 70");
for (const file of ["css/styles.css", "js/app.js", "js/progress.js", "js/quiz.js", "js/cloud.js", "js/analytics.js", "js/version.js", "sw.js", "manifest.webmanifest", ".openai/hosting.json", "supabase/rn_analytics_setup.sql", "docs/ANONYMOUS_ANALYTICS.md"]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error("Missing required file: " + file);
}
for (const label of ["Home", "Learn", "Practice", "Progress", "Educational pilot", "About &amp; sources"]) {
  if (!index.includes(label)) throw new Error("Missing primary UI: " + label);
}
const match = versionScript.match(/RN_APP_VERSION = "([^"]+)"/);
if (!match || match[1] !== version.version || !index.includes("NurseLattice RN Quest " + version.version)) throw new Error("Version values do not match");
const numericVersion = version.version.replace(/^v/, "");
for (const asset of ["css/styles.css", "js/app.js", "js/progress.js", "js/quiz.js", "js/cloud.js", "js/analytics.js", "js/version.js"]) {
  if (!index.includes(asset + "?v=" + numericVersion)) throw new Error("Stale asset version: " + asset);
}
const executableSource = ["index.html", "js/app.js", "js/progress.js", "js/quiz.js", "js/cloud.js", "js/analytics.js", "sw.js"].map(read).join("\n");
if (/fnpQuest|FNP_APP_VERSION|mirwbtlwglrpmbbqhfol|service_role|sb_secret_/i.test(executableSource)) throw new Error("FNP namespace or secret leaked into RN runtime");
const cloudConfig = read("js/cloud.js");
if (!cloudConfig.includes('url: ""') || !cloudConfig.includes('publishableKey: ""')) throw new Error("Pilot cloud adapter must remain unconfigured");
const analyticsSource = read("js/analytics.js");
if (!analyticsSource.includes("dmdkfyvrjfbcyuebhcop.supabase.co") || !analyticsSource.includes("sb_publishable_") || !analyticsSource.includes('RN_ANALYTICS_TABLE = "rn_analytics_events"')) throw new Error("RN analytics must use the dedicated project and publishable key");
if (!analyticsSource.includes('location.hostname === "nurselattice.github.io"') || !analyticsSource.includes("globalPrivacyControl") || !analyticsSource.includes("RN_ANALYTICS_OPT_OUT_KEY")) throw new Error("RN analytics privacy controls are incomplete");
if (!index.includes('id="anonymousAnalyticsStatus"') || !index.includes('id="anonymousAnalyticsToggle"')) throw new Error("Anonymous statistics disclosure and opt-out control are missing");
if (!read("js/app.js").includes('RNAnalytics.track("lesson_open"') || !read("js/app.js").includes('RNAnalytics.track("lesson_quiz_complete"')) throw new Error("Learning analytics event hooks are incomplete");
const manifest = JSON.parse(read("manifest.webmanifest"));
if (manifest.name !== "NurseLattice RN Quest" || manifest.short_name !== "NurseLattice RN" || manifest.display !== "standalone" || manifest.start_url !== "./") throw new Error("Invalid web app manifest");
console.log("Static checks passed: 20 Foundations lessons, 14 Health Assessment lessons, 16 Pathophysiology lessons, 20 Pharmacology lessons, 700 questions, and version parity.");
