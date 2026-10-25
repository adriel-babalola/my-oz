import { addDays, format } from 'date-fns'
import type { Deadline } from '../types/deadline'
import { curveTFor } from './dates'

function build(
  id: string,
  offset: number,
  title: string,
  description: string,
): Deadline {
  const dueDate = format(addDays(new Date(), offset), 'yyyy-MM-dd')
  return {
    id,
    title,
    description,
    dueDate,
    source: 'Sample deadline',
    confidence: 'high',
    verified: true,
    curveT: curveTFor(dueDate),
  }
}

export function createSampleDeadlines(): Deadline[] {
  return [
    build(
      'sample-1',
      3,
      'Submit My Oz to Hack Club',
      'Polish the Yellow Brick Road flythrough, record a short demo, and send in the project.',
    ),
    build(
      'sample-2',
      14,
      'EMU Scholarship application',
      'Finish the personal statement, attach the transcript, and submit before midnight.',
    ),
    build(
      'sample-3',
      34,
      'Robotics build log',
      'Document the drivetrain changes and upload the weekly progress entry.',
    ),
  ]
}
