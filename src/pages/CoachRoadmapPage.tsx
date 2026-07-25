import { EmptyState } from '../components/EmptyState'
import { AssessmentRoadmap } from '../components/AssessmentRoadmap'
import { PageContainer } from '../components/PageContainer'
import { StudyScheduleTimeline } from '../components/StudyScheduleTimeline'
import { useCoachStudentOverview } from '../features/coach/useCoachStudentOverview'

export function CoachRoadmapPage() {
  const { student, overview, loading } = useCoachStudentOverview()

  if (!loading && !student) {
    return (
      <PageContainer eyebrow="Student roadmap" title="Roadmap unavailable">
        <EmptyState
          title="No student profile found"
          description="Create the student profile before reviewing its assessment timeline."
        />
      </PageContainer>
    )
  }

  return (
    <AssessmentRoadmap
      overview={overview}
      viewerRole="coach"
      eyebrow="Student roadmap"
      title={`${student?.display_name ?? 'Student'}'s route to each exam`}
      description="The exact dated plan and seven-step assessment paths shown to the student, with coach preview access."
      allAssessmentsPath="/coach/roadmap"
      leadContent={<StudyScheduleTimeline overview={overview} viewerRole="coach" />}
    />
  )
}
