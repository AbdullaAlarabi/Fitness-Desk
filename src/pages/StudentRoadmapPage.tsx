import { useParams } from 'react-router-dom'
import { AssessmentRoadmap } from '../components/AssessmentRoadmap'
import { StudyScheduleTimeline } from '../components/StudyScheduleTimeline'
import { useAuth } from '../features/auth/AuthProvider'
import { useStudentOverview } from '../features/student/useStudentOverview'

export function StudentRoadmapPage() {
  const { assessmentId } = useParams()
  const { user } = useAuth()
  const overview = useStudentOverview(user?.id)

  return (
    <AssessmentRoadmap
      overview={overview}
      viewerRole="student"
      assessmentId={assessmentId}
      eyebrow="Assessment roadmap"
      title={assessmentId ? 'Assessment learning path' : 'Your route to each exam'}
      description="Finish each step in order. A chapter unlocks only after its quiz gate passes; revision and mocks follow sequentially."
      allAssessmentsPath="/student/roadmap"
      leadContent={
        assessmentId ? undefined : (
          <StudyScheduleTimeline overview={overview} viewerRole="student" />
        )
      }
    />
  )
}
