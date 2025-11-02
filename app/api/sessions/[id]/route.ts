import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { StudySession } from '@/types';

// PATCH /api/sessions/[id] - Update a session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { duration, date, comment, subjectId, topicId } = body;

    const session = await prisma.studySession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Calculate the difference in duration for updating totals
    const durationDiff = duration ? duration - session.duration : 0;

    // Prepare update data
    const updateData: any = {};
    if (duration !== undefined) updateData.duration = duration;
    if (date !== undefined) updateData.date = date;
    if (comment !== undefined) updateData.comment = comment || null;
    if (subjectId !== undefined) updateData.subjectId = subjectId || null;
    if (topicId !== undefined) updateData.topicId = topicId || null;

    // Update timestamps if date changed
    if (date && date !== session.date) {
      const [year, month, day] = date.split('-').map(Number);
      const newTimestamp = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
      updateData.startTime = newTimestamp;
      updateData.endTime = newTimestamp;
    }

    const updatedSession = await prisma.studySession.update({
      where: { id },
      data: updateData,
    });

    // Update study time totals if duration or subject changed
    if (durationDiff !== 0 || subjectId !== undefined) {
      const oldDuration = session.duration;
      const newDuration = duration !== undefined ? duration : oldDuration;

      // Update goal total
      await prisma.goal.update({
        where: { id: session.goalId },
        data: {
          totalStudyTime: {
            increment: durationDiff,
          },
        },
      });

      // Update old subject if subject changed
      if (subjectId !== undefined && session.subjectId) {
        await prisma.subject.update({
          where: { id: session.subjectId },
          data: {
            studyTime: {
              increment: -oldDuration, // Remove old time
            },
          },
        });
      }

      // Update new subject
      const targetSubjectId = subjectId !== undefined ? subjectId : session.subjectId;
      if (targetSubjectId) {
        await prisma.subject.update({
          where: { id: targetSubjectId },
          data: {
            studyTime: {
              increment: durationDiff + (subjectId !== undefined ? oldDuration : 0),
            },
          },
        });
      }

      // Handle topic time updates
      if (topicId !== undefined && session.topicId) {
        await prisma.topic.update({
          where: { id: session.topicId },
          data: {
            studyTime: {
              increment: -oldDuration,
            },
          },
        });
      }

      if (topicId !== undefined && topicId) {
        await prisma.topic.update({
          where: { id: topicId },
          data: {
            studyTime: {
              increment: duration !== undefined ? duration : oldDuration,
            },
          },
        });
      }
    }

    const transformedSession: StudySession = {
      id: updatedSession.id,
      goalId: updatedSession.goalId,
      subjectId: updatedSession.subjectId || undefined,
      topicId: updatedSession.topicId || undefined,
      startTime: updatedSession.startTime,
      endTime: updatedSession.endTime || undefined,
      duration: updatedSession.duration,
      date: updatedSession.date,
      comment: updatedSession.comment || undefined,
    };

    return NextResponse.json(transformedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id] - Delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await prisma.studySession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Delete the session
    await prisma.studySession.delete({
      where: { id },
    });

    // Update study time totals (subtract the session duration)
    await prisma.goal.update({
      where: { id: session.goalId },
      data: {
        totalStudyTime: {
          increment: -session.duration,
        },
      },
    });

    if (session.subjectId) {
      await prisma.subject.update({
        where: { id: session.subjectId },
        data: {
          studyTime: {
            increment: -session.duration,
          },
        },
      });
    }

    if (session.topicId) {
      await prisma.topic.update({
        where: { id: session.topicId },
        data: {
          studyTime: {
            increment: -session.duration,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

