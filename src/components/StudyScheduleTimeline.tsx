import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CircleDot,
  Clock3,
  Flag,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { useStudentOverview } from '../features/student/useStudentOverview'
import { formatShortDate, getTodayString } from '../lib/date'
import type { UserRole } from '../types/auth'
import type { LearningUnit, StudyTask } from '../types/database'
import { StatusBadge, type StatusTone } from './StatusBadge'

type ScheduleStatus = 'complete' | 'today' | 'overdue' | 'upcoming' | 'milestone'

const statusStyle: Record<
  ScheduleStatus,
  { badge: StatusTone; label: string; dot: string; card: string }
> = {
  complete: {
    badge: 'complete',
    label: 'Completed',
    dot: 'bg-teal text-white',
    card: 'border-teal/25 bg-teal-50/70',
  },
  today: {
    badge: 'on-track',
    label: 'Today',
    dot: 'bg-navy text-white ring-4 ring-gold/20',
    card: 'border-navy bg-white shadow-card',
  },
  overdue: {
    badge: 'needs-attention',
    label: 'Overdue',
    dot: 'bg-risk text-white',
    card: 'border-risk/25 bg-red-50/60',
  },
  upcoming: {
    badge: 'pending',
    label: 'Upcoming',
    dot: 'bg-gold text-white',
    card: 'border-gold/25 bg-gold-50/50',
  },
  milestone: {
    badge: 'pending',
    label: 'Exam date',
    dot: 'bg-navy text-gold-100',
    card: 'border-gold/35 bg-navy text-white',
  },
}

function taskPath(task: StudyTask, unit?: LearningUnit) {
  if (!task.learning_unit_id) return undefined
  if (task.task_type === 'mock' || unit?.unit_type === 'mock') {
    return `/student/mock/${task.learning_unit_id}`
  }
  if (task.task_type === 'revision' || unit?.unit_type === 'revision') {
    return `/student/revision/${task.learning_unit_id}`
  }
  if (task.task_type === 'chapter' || unit?.unit_type === 'chapter') {
    return `/student/chapter/${task.learning_unit_id}`
  }
  return undefined
}

export function getScheduleStatus(
  task: StudyTask,
  completedTaskIds: Set<string>,
  today: string,
): ScheduleStatus {
  if (completedTaskIds.has(task.id)) return 'complete'
  if (task.completion_mode === 'milestone' || task.task_type === 'exam') return 'milestone'
  if (task.task_date === today) return 'today'
  if (task.task_date < today) return 'overdue'
  return 'upcoming'
}

function TimelineIcon({ status }: { status: ScheduleStatus }) {
  if (status === 'complete') return <Check aria-hidden="true" size={18} strokeWidth={3} />
  if (status === 'today') return <CircleDot aria-hidden="true" size={18} />
  if (status === 'overdue') return <AlertTriangle aria-hidden="true" size={17} />
  if (status === 'milestone') return <Flag aria-hidden="true" size={17} />
  return <Clock3 aria-hidden="true" size={17} />
}

export function StudyScheduleTimeline({
  overview,
  viewerRole,
}: {
  overview: ReturnType<typeof useStudentOverview>
  viewerRole: UserRole
}) {
  const today = getTodayString()
  const courseById = new Map(overview.courses.map((course) => [course.id, course]))
  const unitById = new Map(overview.units.map((unit) => [unit.id, unit]))
  const tasks = [...overview.tasks].sort(
    (left, right) =>
      left.task_date.localeCompare(right.task_date) ||
      left.display_order - right.display_order,
  )
  const completedCount = tasks.filter((task) =>
    overview.completedTaskIds.has(task.id),
  ).length
  const currentIndex = tasks.findIndex(
    (task) => getScheduleStatus(task, overview.completedTaskIds, today) === 'today',
  )

  return (
    <section className="overflow-hidden rounded-card border border-navy/10 bg-surface shadow-card">
      <div className="border-b border-navy/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              Exact dated plan
            </p>
            <h2 className="mt-1 text-xl font-bold text-navy sm:text-2xl">
              Full study timeline
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Every approved task in date order, from the first chapter through the final exam.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-navy-50 px-4 py-3">
            <CalendarDays aria-hidden="true" className="text-teal-700" size={20} />
            <div>
              <p className="text-xs font-semibold text-muted">Plan progress</p>
              <p className="font-bold text-navy">
                {completedCount}/{tasks.length} tasks completed
              </p>
            </div>
          </div>
        </div>
      </div>

      {tasks.length ? (
        <ol className="p-4 sm:p-6" aria-label="Full dated study schedule">
          {tasks.map((task, index) => {
            const status = getScheduleStatus(task, overview.completedTaskIds, today)
            const style = statusStyle[status]
            const course = task.course_id ? courseById.get(task.course_id) : undefined
            const unit = task.learning_unit_id
              ? unitById.get(task.learning_unit_id)
              : undefined
            const to = taskPath(task, unit)
            const isMilestone = status === 'milestone'

            return (
              <li
                key={task.id}
                className="relative grid gap-3 pb-4 last:pb-0 sm:grid-cols-[8rem_2.5rem_minmax(0,1fr)] sm:gap-4"
                aria-current={index === currentIndex ? 'step' : undefined}
              >
                {index < tasks.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-4 left-5 top-10 w-px bg-navy/15 sm:left-[10.25rem]"
                  />
                )}
                <div className="pl-14 sm:pl-0 sm:pt-3 sm:text-right">
                  <p
                    className={`text-sm font-bold ${
                      isMilestone ? 'text-gold-600' : 'text-navy'
                    }`}
                  >
                    {formatShortDate(task.task_date)}
                  </p>
                  {course && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">
                      {course.code}
                    </p>
                  )}
                </div>

                <div className="absolute left-0 top-0 sm:static">
                  <span
                    className={`relative z-10 grid size-10 place-items-center rounded-xl ${style.dot}`}
                  >
                    <TimelineIcon status={status} />
                  </span>
                </div>

                <article className={`ml-10 rounded-xl border p-4 sm:ml-0 ${style.card}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold uppercase tracking-[0.14em] ${
                          isMilestone ? 'text-gold-100' : 'text-teal-700'
                        }`}
                      >
                        {task.task_type}
                      </p>
                      <h3
                        className={`mt-1 font-bold leading-6 ${
                          isMilestone ? 'text-white' : 'text-navy'
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p
                          className={`mt-2 text-sm leading-6 ${
                            isMilestone ? 'text-white/70' : 'text-muted'
                          }`}
                        >
                          {task.description}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={style.badge} label={style.label} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {to && (
                      <Link
                        className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold ${
                          isMilestone
                            ? 'bg-white text-navy hover:bg-gold-50'
                            : 'border border-navy/10 bg-white text-navy hover:bg-navy-50'
                        }`}
                        to={to}
                      >
                        {viewerRole === 'coach' ? 'Preview task' : 'Open task'}
                        <ArrowRight aria-hidden="true" size={16} />
                      </Link>
                    )}
                    {viewerRole === 'student' &&
                      task.completion_mode === 'manual' &&
                      !overview.completedTaskIds.has(task.id) && (
                        <button
                          className="min-h-10 rounded-lg bg-navy px-3 text-sm font-bold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          disabled={overview.completingTaskId === task.id}
                          onClick={() => void overview.completeTask(task)}
                        >
                          {overview.completingTaskId === task.id
                            ? 'Saving…'
                            : 'Mark complete'}
                        </button>
                      )}
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="p-8 text-center text-sm text-muted">
          No dated study tasks are available.
        </p>
      )}
    </section>
  )
}
