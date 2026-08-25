import { useState } from 'react'
import { Brain, Trophy, ChevronRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quizAPI, enrollmentAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { EmptyState, ProgressBar, ListItemSkeleton } from '../../components/ui'

interface QuizQuestion { _id: string; question: string; options?: string[]; type?: 'mcq' | 'true_false' | 'short_answer' }
interface Quiz {
  _id: string
  title: string
  course?: { title?: string }
  questions?: QuizQuestion[]
  questionCount?: number
  duration?: number
  passingScore?: number
  maxAttempts?: number
  myAttempts?: number
  attempts?: number
  bestScore?: number | null
  myBestScore?: number | null
}

export default function StudentQuizzes() {
  const qc = useQueryClient()
  const [taking, setTaking] = useState<{ quizId: string; attemptId: string; questions: QuizQuestion[]; passingScore: number } | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ score: number; passed: boolean; passingScore: number } | null>(null)
  const [current, setCurrent] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['myQuizzes'],
    queryFn: async () => {
      // Get enrolled courses, then quizzes for those courses
      const enrollRes = await enrollmentAPI.mine()
      const enrollments = Array.isArray(enrollRes.data.data) ? enrollRes.data.data : (enrollRes.data.data?.enrollments ?? [])
      const courseIds = enrollments.map((e: any) => e.course?._id).filter(Boolean)
      if (!courseIds.length) return []
      const results = await Promise.all(courseIds.map((cid: string) => quizAPI.forCourse(cid)))
      const allQuizzes = results.flatMap(r => Array.isArray(r.data.data) ? r.data.data : (r.data.data?.quizzes ?? []))

      // Merge in this student's real attempt history — the quiz list endpoint
      // only returns quiz definitions, never per-student progress, so without
      // this every quiz would always show as "Available" with 0 attempts
      // regardless of how many times the student has actually taken it.
      const attemptsRes = await quizAPI.myAttempts()
      const attempts: any[] = Array.isArray(attemptsRes.data.data) ? attemptsRes.data.data : []

      return allQuizzes.map((q: any) => {
        const mine = attempts.filter(a => (a.quiz?._id ?? a.quiz) === q._id)
        const best = mine.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0)
        return { ...q, myAttempts: mine.length, bestScore: mine.length > 0 ? best : null }
      })
    },
  })

  const quizzes: Quiz[] = Array.isArray(data) ? data : []

  const startMut = useMutation({
    mutationFn: (quizId: string) => quizAPI.attempt(quizId),
    onSuccess: (res, quizId) => {
      const attempt = res.data.data
      const questions: QuizQuestion[] = attempt.questions ?? []
      const quizMeta = quizzes.find(q => q._id === quizId)
      setTaking({ quizId, attemptId: attempt._id, questions, passingScore: quizMeta?.passingScore ?? 70 })
      setAnswers({})
      setCurrent(0)
      setResult(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Cannot start quiz'),
  })

  const submitMut = useMutation({
    mutationFn: () => {
      if (!taking) throw new Error('No active attempt')
      const answersArr = taking.questions.map((q) => ({
        questionId: q._id,
        answer: answers[q._id] !== undefined ? q.options?.[answers[q._id]] : '',
      }))
      return quizAPI.submit(taking.attemptId, { answers: answersArr })
    },
    onSuccess: (res) => {
      const d = res.data.data
      setResult({ score: d.percentage ?? 0, passed: d.passed ?? false, passingScore: taking?.passingScore ?? 70 })
      setTaking(null)
      qc.invalidateQueries({ queryKey: ['myQuizzes'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to submit quiz'),
  })

  // Quiz-taking view
  if (taking && !result) {
    const q = taking.questions[current]
    if (!q) return null

    const isTrueFalse = q.type === 'true_false'
    const isShortAnswer = q.type === 'short_answer'
    const options = q.options && q.options.length > 0 ? q.options : (isTrueFalse ? ['True', 'False'] : [])

    const handleSelectOption = (optIdx: number) => {
      setAnswers(prev => {
        const next = { ...prev, [q._id]: optIdx }
        try { sessionStorage.setItem(`quiz_draft_${taking.attemptId}`, JSON.stringify(next)) } catch {}
        return next
      })
    }

    const handleTextAnswer = (text: string) => {
      setAnswers(prev => {
        const next = { ...prev, [q._id]: text as any }
        try { sessionStorage.setItem(`quiz_draft_${taking.attemptId}`, JSON.stringify(next)) } catch {}
        return next
      })
    }

    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-white">Quiz in Progress</h2>
          <button onClick={() => { setTaking(null); try { sessionStorage.removeItem(`quiz_draft_${taking.attemptId}`) } catch {} }} className="btn-ghost text-xs">Exit</button>
        </div>
        <ProgressBar
          value={((current + 1) / taking.questions.length) * 100}
          label={`Question ${current + 1} of ${taking.questions.length}`}
          className="mb-1"
        />
        <p className="text-xs text-slate-500">Question {current + 1} of {taking.questions.length}</p>
        <div className="card p-7">
          <p className="mb-6 text-lg font-semibold text-white">{q.question}</p>
          
          {isShortAnswer ? (
            <div>
              <label className="label">Your Answer</label>
              <textarea
                className="input h-24 resize-none"
                placeholder="Type your response here..."
                value={typeof answers[q._id] === 'string' ? (answers[q._id] as any) : ''}
                onChange={e => handleTextAnswer(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectOption(i)}
                  className={`w-full rounded-xl border px-5 py-3.5 text-left text-sm transition-all ${answers[q._id] === i ? 'border-brand-500 bg-brand-600/15 text-white' : 'border-white/[0.08] text-slate-300 hover:border-white/20 hover:bg-white/[0.03]'}`}
                >
                  <span className="mr-3 font-mono text-xs text-slate-500">{String.fromCharCode(65 + i)}.</span> {opt}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button type="button" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} className="btn-ghost">← Previous</button>
            {current < taking.questions.length - 1
              ? <button type="button" onClick={() => setCurrent(c => c + 1)} disabled={answers[q._id] === undefined} className="btn-primary">Next →</button>
              : <button type="button" onClick={() => submitMut.mutate()} disabled={submitMut.isPending || Object.keys(answers).length < taking.questions.length} className="btn-accent">
                  {submitMut.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Submit Quiz'}
                </button>}
          </div>
        </div>
      </div>
    )
  }

  // Result view
  if (result) {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <div className={`card p-8 ${result.passed ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          {result.passed ? <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-400" /> : <XCircle size={48} className="mx-auto mb-4 text-red-400" />}
          <h2 className="mb-2 font-display text-2xl font-bold text-white">{result.passed ? 'Quiz Passed!' : 'Not Quite'}</h2>
          <div className="my-4 font-mono text-5xl font-bold" style={{ color: result.passed ? '#34d399' : '#f87171' }}>{result.score}%</div>
          <p className="text-sm text-slate-400">Passing score: {result.passingScore}%</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => { setResult(null); setCurrent(0) }} className="btn-outline">Back to Quizzes</button>
          </div>
        </div>
      </div>
    )
  }

  // Quiz list view
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Quizzes</h1>
      {isLoading ? (
        <div role="status" aria-label="Loading quizzes" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon={Brain} title="No quizzes available yet" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {quizzes.map(q => {
            const attempts = q.myAttempts ?? q.attempts ?? 0
            const maxAttempts = q.maxAttempts ?? 3
            const bestScore = q.bestScore ?? q.myBestScore ?? null
            const passed = bestScore != null && bestScore >= (q.passingScore ?? 70)
            const failed = bestScore != null && !passed
            const status = passed ? 'passed' : failed ? 'failed' : 'available'
            return (
              <div key={q._id} className="card-hover p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div><h3 className="font-semibold text-white">{q.title}</h3><p className="mt-1 text-xs text-slate-500">{q.course?.title ?? '—'}</p></div>
                  <span className={`badge flex-shrink-0 ${status === 'passed' ? 'badge-green' : status === 'failed' ? 'badge-red' : 'badge-indigo'}`}>
                    {status === 'passed' ? 'Passed' : status === 'failed' ? 'Failed' : 'Available'}
                  </span>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                  {[['Questions', q.questions?.length ?? q.questionCount ?? 0], ['Duration', `${q.duration ?? 30}m`], ['Pass', `${q.passingScore ?? 70}%`]].map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-ink-700 p-2"><div className="font-mono text-sm font-bold text-white">{v}</div><div className="text-[10px] text-slate-500">{l}</div></div>
                  ))}
                </div>
                {bestScore != null && (
                  <div className="mb-4 flex items-center gap-2 text-sm"><Trophy size={13} className="text-amber-400" /><span className="text-slate-400">Best score: <span className="font-medium text-white">{bestScore}%</span></span><span className="text-slate-600">({attempts}/{maxAttempts} attempts)</span></div>
                )}
                <button
                  onClick={() => startMut.mutate(q._id)}
                  disabled={attempts >= maxAttempts || startMut.isPending}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${attempts >= maxAttempts ? 'cursor-not-allowed bg-white/5 text-slate-600' : 'btn-primary'}`}>
                  {startMut.isPending ? <Loader2 size={14} className="animate-spin" /> : attempts >= maxAttempts ? 'Max Attempts Reached' : status === 'available' ? <><Brain size={14} /> Start Quiz</> : <><Brain size={14} /> Retake</>}
                  {attempts < maxAttempts && !startMut.isPending && <ChevronRight size={14} />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
