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
if (curriculum.courses.length !== 8 || curriculum.lessons.length !== 26) throw new Error("Pilot must preserve all eight Client Needs areas and include twenty-six lessons");
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
if (roadmap.totalLessons !== 184 || roadmap.phases.length !== 12 || roadmap.phases[0].lessonRange.join("-") !== "1-20" || roadmap.phases[11].lessonRange.join("-") !== "177-184") throw new Error("Traditional 184-lesson RN roadmap is incomplete");
if (roadmap.tagging.join("|") !== "traditionalCourse|nclexClientNeeds|clinicalJudgmentStep") throw new Error("Roadmap must preserve all three content tags");
if (!read("js/app.js").includes('fetchJson("data/program-roadmap.json")') || !index.includes('id="curriculumList" class="course-roadmap"') || !index.includes('id="learnList" class="course-roadmap"')) throw new Error("The visible curriculum must list all twelve course phases");
if (!fs.existsSync(path.join(root, "data/roadmap/leadership-priority-delegation.json"))) throw new Error("Original priority and delegation lesson was not preserved in the leadership roadmap");
if (questionIds.size !== 260) throw new Error("Expected 260 pilot questions after adding Lesson 26");
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
console.log("Static checks passed: 20 Foundations lessons, 6 Health Assessment lessons, 260 questions, and version parity.");
