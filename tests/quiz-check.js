const assert = require("assert");
const RNQuiz = require("../js/quiz.js");
const questions = [
  { question: "One", choices: ["A", "B", "C", "D"], correctIndex: 1, explanation: "Reason one" },
  { question: "Two", choices: ["A", "B", "C", "D"], correctIndex: 2, explanation: "Reason two" }
];
const session = RNQuiz.createQuizSession(questions, { mode: "lesson", lessonId: 4 });
let result = RNQuiz.answerCurrentQuestion(session, 1);
assert.equal(result.correct, true);
assert.equal(session.score, 1);
result = RNQuiz.answerCurrentQuestion(session, 1);
assert.equal(result.repeated, true);
assert.equal(session.score, 1, "repeat taps must not add score");
assert.equal(RNQuiz.advanceQuestion(session), true);
assert.equal(session.current, 1);
assert.equal(session.answered, false);
RNQuiz.answerCurrentQuestion(session, 0);
assert.equal(session.score, 1);
assert.equal(RNQuiz.advanceQuestion(session), false, "last question must end the session");
const shuffled = RNQuiz.shuffleQuestions(questions, () => 0);
assert.equal(shuffled.length, questions.length);
assert.notStrictEqual(shuffled, questions);
console.log("Quiz checks passed: scoring, repeat-tap protection, navigation, and shuffle isolation.");


const original = JSON.stringify(questions);
for (let seed = 0; seed < 20; seed++) {
  let n = seed + 1;
  const random = () => ((n = n * 16807 % 2147483647) - 1) / 2147483646;
  const mixed = RNQuiz.createQuizSession(questions, { shuffleChoices: true, random });
  mixed.questions.forEach((question, i) => assert.equal(question.choices[question.correctIndex], questions[i].choices[questions[i].correctIndex]));
}
assert.equal(JSON.stringify(questions), original, "randomizing options must not mutate the question bank");
assert.equal(session.missedQuestions.length, 1);
const unanswered = RNQuiz.createQuizSession(questions);
assert.equal(RNQuiz.advanceQuestion(unanswered), false);
assert.throws(() => RNQuiz.answerCurrentQuestion(unanswered, -1));
console.log("Answer shuffling preserves correct answers; missed-question tracking and invalid navigation passed.");
