import {
  ArrowRight,
  Check,
  CircleDot,
  Clock3,
  LockKeyhole,
  Map as RouteMap,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { useStudentOverview } from '../features/student/useStudentOverview'
import { formatShortDate } from '../lib/date'
import {
  calculateReadiness,
  calculateWeightedAssessmentCompletion,
  getRoadmapUnitStatuses,
  type RoadmapUnitStatus,
} from '../lib/progress'
import type { UserRole } from '../types/auth'
import type { LearningUnit } from '../types/database'
import { ErrorState } from './ErrorState'
import { LoadingState } from './LoadingState'
import { PageContainer } from './PageContainer'
import { ProgressBar } from './ProgressBar'
import { StatusBadge } from './StatusBadge'

const unitStateStyle: Record<
  RoadmapUnitStatus,
  { card: string; icon: string; label: string }
> = {
  completed: {
    card: 'border-teal/25 bg-teal-50',
    icon: 'bg-teal text-white',
    label: 'Complete',
  },
  current: {
    card: 'border-navy bg-white shadow-card',
    icon: 'bg-navy text-white',
    label: 'Current',
  },
  upcoming: {
    card: 'border-gold/25 bg-gold-50',
    icon: 'bg-gold text-white',
    label: 'Up next · locked',
  },
  locked: {
    card: 'border-navy/10 bg-slate-50/80',
    icon: 'bg-slate-200 text-slate-500',
    label: 'Locked',
  },
}

function unitPath(unit: LearningUnit) {
  if (unit.unit_type === 'chapter') return `/student/chapter/${unit.id}`
  if (unit.unit_type === 'revision') return `/student/revision/${unit.id}`
  return `/student/mock/${unit.id}`
}

function UnitIcon({ status }: { status: RoadmapUnitStatus }) {
  if (status === 'completed') return <Check aria-hidden="true" size={19} strokeWidth={3} />
  if (status === 'current') return <CircleDot aria-hidden="true" size={19} />
  if (status === 'upcoming') return <Clock3 aria-hidden="true" size={18} />
  return <LockKeyhole aria-hidden="true" size={17} />
}

export function AssessmentRoadmap({
  overview,
  viewerRole,
  assessmentId,
  eyebrow,
  title,
  description,
  allAssessmentsPath,
  leadContent,
}: {
  overview: ReturnType<typeof useStudentOverview>
  viewerRole: UserRole
  assessmentId?: string
  eyebrow: string
  title: string
  description: string
  allAssessmentsPath: string
  leadContent?: ReactNode
}) {
  const courseById = new Map(overview.courses.map((course) => [course.id, course]))
  const visibleAssessments = assessmentId
    ? overview.assessments.filter((assessment) => assessment.id === assessmentId)
    : overview.assessments

  if (overview.loading) {
    return (
      <PageContainer eyebrow={eyebrow} title="Loading exam paths">
        <LoadingState />
      </PageContainer>
    )
  }

  if (overview.error && overview.assessments.length === 0) {
    return (
      <PageContainer eyebrow={eyebrow} title="Roadmap unavailable">
        <ErrorState message={overview.error} onRetry={() => void overview.reload()} />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={
        assessmentId ? (
          <Link
            className="flex min-h-11 items-center rounded-xl border border-navy/15 bg-white px-4 text-sm font-semibold text-navy hover:bg-navy-50"
            to={allAssessmentsPath}
          >
            All assessments
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {overview.error && <ErrorState message={overview.error} onRetry={() => void overview.reload()} />}
        {leadContent}
        {leadContent && (
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              Assessment paths
            </p>
            <h2 className="mt-1 text-2xl font-bold text-navy">
              Chapters, revision, and mock progression
            </h2>
          </div>
        )}
        {visibleAssessments.map((assessment) => {
          const course = courseById.get(assessment.course_id)
          const units = overview.units
            .filter((unit) => unit.assessment_id === assessment.id)
            .sort((left, right) => left.unlock_order - right.unlock_order)
          const statuses = getRoadmapUnitStatuses(
            units,
            overview.attempts,
            overview.manuallyCompletedUnitIds,
            overview.manuallyUnlockedUnitIds,
          )
          const completion = calculateWeightedAssessmentCompletion(
            units,
            overview.attempts,
            overview.manuallyCompletedUnitIds,
          )
          const readiness = calculateReadiness(units, overview.attempts)

          return (
            <section
              key={assessment.id}
              className="overflow-hidden rounded-card border border-navy/10 bg-surface shadow-card"
            >
              <div className="border-b border-navy/10 p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                      {course?.code ?? 'Course'} · {assessment.assessment_type}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-navy sm:text-2xl">
                      {assessment.title}
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                      Exam: {formatShortDate(assessment.exam_date)}
                    </p>
                  </div>
                  <div className="grid min-w-56 gap-3 sm:w-64">
                    <ProgressBar value={completion} label="Completion" />
                    <ProgressBar value={readiness} label="Readiness" tone="gold" />
                  </div>
                </div>
              </div>

              <ol
                className="grid gap-3 p-4 sm:p-6 md:grid-cols-7 md:gap-2"
                aria-label={`${assessment.title} learning units`}
              >
                {units.map((unit, index) => {
                  const status = statuses.get(unit.id) ?? 'locked'
                  const navigable =
                    viewerRole === 'coach' ||
                    status === 'completed' ||
                    status === 'current'
                  const style = unitStateStyle[status]
                  const content = (
                    <>
                      <div className="flex items-center gap-3 md:flex-col md:items-start">
                        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.icon}`}>
                          <UnitIcon status={status} />
                        </span>
                        <div className="min-w-0 flex-1 md:w-full">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                            Step {index + 1}
                          </p>
                          <h3 className="mt-1 text-sm font-bold leading-5 text-navy">
                            {unit.short_title}
                          </h3>
                        </div>
                        {navigable && (
                          <ArrowRight
                            aria-hidden="true"
                            className="ml-auto shrink-0 text-teal-700 md:hidden"
                            size={18}
                          />
                        )}
                      </div>
                      <div className="mt-3 md:mt-4">
                        <StatusBadge
                          status={
                            status === 'completed'
                              ? 'complete'
                              : status === 'current'
                                ? 'on-track'
                                : status === 'upcoming'
                                  ? 'pending'
                                  : 'locked'
                          }
                          label={
                            overview.manuallyUnlockedUnitIds.has(unit.id) && status !== 'completed'
                              ? 'Coach unlocked'
                              : viewerRole === 'coach' &&
                                  (status === 'locked' || status === 'upcoming')
                                ? 'Coach access'
                                : style.label
                          }
                        />
                      </div>
                    </>
                  )

                  return (
                    <li key={unit.id} className="relative">
                      {index < units.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute left-5 top-12 h-[calc(100%+0.75rem)] w-px bg-navy/10 md:left-[calc(50%+1.5rem)] md:top-5 md:h-px md:w-[calc(100%-1.25rem)]"
                        />
                      )}
                      {navigable ? (
                        <Link
                          className={`relative block min-h-full rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-card ${style.card}`}
                          to={unitPath(unit)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          aria-disabled="true"
                          className={`relative min-h-full rounded-xl border p-4 ${style.card}`}
                        >
                          {content}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}

        {visibleAssessments.length === 0 && (
          <div className="rounded-card border border-dashed border-navy/20 bg-white/60 p-10 text-center">
            <RouteMap className="mx-auto text-muted" aria-hidden="true" />
            <p className="mt-4 font-bold text-navy">Assessment not found</p>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
