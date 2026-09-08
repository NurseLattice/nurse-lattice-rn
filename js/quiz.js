function shuffleQuestions(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function createQuizSession(questions, options = {}) {
  if (!Array.isArray(questions) || questions.length === 0) throw new Error("Quiz requires questions");
  return {
    questions: options.shuffle ? shuffleQuestions(questions, options.random) : [...questions],
    current: 0,
    score: 0,
    answered: false,
    mode: options.mode || "lesson",
    lessonId: options.lessonId || null
  };
}

function answerCurrentQuestion(session, selectedIndex) {
  if (session.answered) return { correct: selectedIndex === session.questions[session.current].correctIndex, repeated: true };
  const question = session.questions[session.current];
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= question.choices.length) throw new Error("Invalid answer index");
  session.answered = true;
  const correct = selectedIndex === question.correctIndex;
  if (correct) session.score += 1;
  return { correct, repeated: false, correctIndex: question.correctIndex, explanation: question.explanation };
}

function advanceQuestion(session) {
  if (!session.answered) return false;
  if (session.current >= session.questions.length - 1) return false;
  session.current += 1;
  session.answered = false;
  return true;
}

const RNQuiz = { shuffleQuestions, createQuizSession, answerCurrentQuestion, advanceQuestion };
if (typeof window !== "undefined") window.RNQuiz = RNQuiz;
if (typeof module !== "undefined") module.exports = RNQuiz;

