import { Response } from 'express';
import { Types } from 'mongoose';
import Quiz from '../models/Quiz.model';
import QuizAttempt from '../models/QuizAttempt.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getQuizzes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.week) filter.week = req.query.week;
    if (!req.user || req.user.role === 'student') filter.isPublished = true;

    let query = Quiz.find(filter).sort({ createdAt: 1 });
    // Students should never receive correctAnswer/explanation up front — strip via projection
    if (req.user?.role === 'student') {
      query = Quiz.find(filter, { 'questions.correctAnswer': 0, 'questions.explanation': 0 }).sort({ createdAt: 1 });
    }
    const quizzes = await query;
    sendSuccess(res, quizzes, 'Quizzes fetched.');
  } catch {
    sendError(res, 'Could not fetch quizzes.', 500);
  }
};

export const getQuizById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isStudent = req.user?.role === 'student';
    const projection = isStudent ? { 'questions.correctAnswer': 0, 'questions.explanation': 0 } : {};
    const quiz = await Quiz.findById(req.params.id, projection);
    if (!quiz) {
      sendError(res, 'Quiz not found.', 404);
      return;
    }
    sendSuccess(res, quiz, 'Quiz fetched.');
  } catch {
    sendError(res, 'Could not fetch quiz.', 500);
  }
};

export const createQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, course, week, lesson, description, questions, duration, passingScore, maxAttempts, randomizeQuestions, isPublished, availableFrom, availableUntil } = req.body;
    if (!title || !course || !questions?.length) {
      sendError(res, 'Title, course, and at least one question are required.', 400);
      return;
    }
    const quiz = await Quiz.create({
      title, course, week, lesson, description, questions,
      duration: duration || 30,
      passingScore: passingScore || 70,
      maxAttempts: maxAttempts || 3,
      randomizeQuestions: !!randomizeQuestions,
      isPublished: !!isPublished,
      availableFrom: availableFrom || undefined,
      availableUntil: availableUntil || undefined,
      createdBy: req.user!._id,
    });
    sendSuccess(res, quiz, 'Quiz created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create quiz.', 500);
  }
};

export const updateQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!quiz) {
      sendError(res, 'Quiz not found.', 404);
      return;
    }
    sendSuccess(res, quiz, 'Quiz updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update quiz.', 500);
  }
};

export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      sendError(res, 'Quiz not found.', 404);
      return;
    }
    sendSuccess(res, null, 'Quiz deleted.');
  } catch {
    sendError(res, 'Could not delete quiz.', 500);
  }
};

// ─── Attempts ───────────────────────────────────────────────────────────────
// Frontend calls: POST /quizzes/:id/attempt  →  starts a new attempt, returns attempt ID
export const startAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      sendError(res, 'Quiz not found.', 404);
      return;
    }

    const now = new Date();
    if (quiz.availableFrom && now < quiz.availableFrom) {
      sendError(res, `This quiz opens on ${quiz.availableFrom.toLocaleString()}.`, 403);
      return;
    }
    if (quiz.availableUntil && now > quiz.availableUntil) {
      sendError(res, `This quiz closed on ${quiz.availableUntil.toLocaleString()}.`, 403);
      return;
    }

    const previousAttempts = await QuizAttempt.countDocuments({ quiz: quiz._id, student: req.user!._id });
    if (previousAttempts >= quiz.maxAttempts) {
      sendError(res, `Maximum attempts (${quiz.maxAttempts}) reached for this quiz.`, 403);
      return;
    }

    const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: req.user!._id,
      totalPoints,
      attemptNumber: previousAttempts + 1,
      startedAt: new Date(),
    });

    sendSuccess(res, attempt, 'Quiz attempt started.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not start quiz attempt.', 500);
  }
};

// Frontend calls: POST /quizzes/attempts/:attemptId/submit  with { answers: [{questionId, answer}] }
export const submitAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { answers } = req.body as { answers: { questionId: string; answer: string }[] };
    if (!answers?.length) {
      sendError(res, 'Answers are required.', 400);
      return;
    }

    const attempt = await QuizAttempt.findById(req.params.attemptId);
    if (!attempt) {
      sendError(res, 'Quiz attempt not found.', 404);
      return;
    }
    if (attempt.student.toString() !== req.user!._id.toString()) {
      sendError(res, 'This attempt does not belong to you.', 403);
      return;
    }
    if (attempt.completedAt) {
      sendError(res, 'This attempt has already been submitted.', 409);
      return;
    }

    const quiz = await Quiz.findById(attempt.quiz);
    if (!quiz) {
      sendError(res, 'Associated quiz not found.', 404);
      return;
    }

    let score = 0;
    const gradedAnswers = answers.map((a) => {
      const question = quiz.questions.find((q) => q._id?.toString() === a.questionId);
      const isCorrect = !!question && question.correctAnswer.trim().toLowerCase() === a.answer.trim().toLowerCase();
      const pointsEarned = isCorrect ? (question?.points || 1) : 0;
      score += pointsEarned;
      return {
        questionId: new Types.ObjectId(a.questionId),
        answer: a.answer,
        isCorrect,
        pointsEarned,
      };
    });

    const percentage = attempt.totalPoints > 0 ? Math.round((score / attempt.totalPoints) * 100) : 0;
    const passed = percentage >= quiz.passingScore;
    const timeSpent = Math.round((Date.now() - attempt.startedAt.getTime()) / 1000);

    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.completedAt = new Date();
    attempt.timeSpent = timeSpent;
    await attempt.save();

    sendSuccess(res, attempt, passed ? 'Quiz passed!' : 'Quiz submitted.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not submit quiz attempt.', 500);
  }
};

export const getMyAttempts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const attempts = await QuizAttempt.find({ student: req.user!._id })
      .populate('quiz', 'title passingScore maxAttempts')
      .sort({ createdAt: -1 });
    sendSuccess(res, attempts, 'Your quiz attempts fetched.');
  } catch {
    sendError(res, 'Could not fetch your quiz attempts.', 500);
  }
};
