import { EmptyState } from '../components/EmptyState'
import { AssessmentRoadmap } from '../components/AssessmentRoadmap'
import { PageContainer } from '../components/PageContainer'
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
      description="The same live seven-step assessment timelines shown to the student, with coach preview access to locked content."
      allAssessmentsPath="/coach/roadmap"
    />
  )
}
