import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { StudySession } from '@/types';

// POST /api/sessions - Start, stop, or add a study session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalId, subjectId, topicId, action, duration, date, comment } = body; // action: 'start', 'stop', or 'add'

    if (!action || (action !== 'start' && action !== 'stop' && action !== 'add')) {
      return NextResponse.json(
        { error: "Action must be 'start', 'stop', or 'add'" },
        { status: 400 }
      );
    }

    if (action === 'start') {
      // Validate required fields for starting a session
      if (!goalId) {
        return NextResponse.json(
          { error: 'Goal ID is required' },
          { status: 400 }
        );
      }

      if (!subjectId) {
        return NextResponse.json(
          { error: 'Subject ID is required to start a session' },
          { status: 400 }
        );
      }
      // Start a new session
      const startTime = new Date().toISOString();
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const session = await prisma.studySession.create({
        data: {
          goalId,
          subjectId, // Required - timer is always tied to a subject
          topicId: topicId || null,
          startTime,
          date,
          duration: 0,
        },
      });

      const transformedSession: StudySession = {
        id: session.id,
        goalId: session.goalId,
        subjectId: session.subjectId || undefined,
        topicId: session.topicId || undefined,
        startTime: session.startTime,
        endTime: undefined,
        duration: session.duration,
        date: session.date,
        comment: session.comment || undefined,
      };

      return NextResponse.json(transformedSession, { status: 201 });
    } else if (action === 'stop') {
      // Stop an existing session
      const { sessionId } = body;
      
      if (!sessionId) {
        return NextResponse.json(
          { error: 'Session ID is required to stop a session' },
          { status: 400 }
        );
      }

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      if (session.endTime) {
        return NextResponse.json(
          { error: 'Session already stopped' },
          { status: 400 }
        );
      }

      const endTime = new Date().toISOString();
      const startTime = new Date(session.startTime);
      const endTimeDate = new Date(endTime);
      const duration = Math.round((endTimeDate.getTime() - startTime.getTime()) / 1000 / 60); // minutes

      const updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          endTime,
          duration,
        },
      });

      // Update study time for goal, subject, and topic
      await prisma.goal.update({
        where: { id: session.goalId },
        data: {
          totalStudyTime: {
            increment: duration,
          },
        },
      });

      if (session.subjectId) {
        await prisma.subject.update({
          where: { id: session.subjectId },
          data: {
            studyTime: {
              increment: duration,
            },
          },
        });
      }

      if (session.topicId) {
        await prisma.topic.update({
          where: { id: session.topicId },
          data: {
            studyTime: {
              increment: duration,
            },
          },
        });
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
    } else if (action === 'add') {
      // Add a custom session manually
      if (!goalId) {
        return NextResponse.json(
          { error: 'Goal ID is required' },
          { status: 400 }
        );
      }

      if (!subjectId) {
        return NextResponse.json(
          { error: 'Subject ID is required' },
          { status: 400 }
        );
      }

      if (!duration || duration <= 0) {
        return NextResponse.json(
          { error: 'Valid duration in minutes is required' },
          { status: 400 }
        );
      }

      // Use provided date or default to today
      const sessionDate = date || new Date().toISOString().split('T')[0];
      // Create a timestamp at noon UTC on the specified date to avoid timezone issues
      const [year, month, day] = sessionDate.split('-').map(Number);
      const sessionStartTime = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();

      const newSession = await prisma.studySession.create({
        data: {
          goalId,
          subjectId,
          topicId: topicId || null,
          startTime: sessionStartTime,
          endTime: sessionStartTime,
          duration,
          date: sessionDate,
          comment: comment || null,
        },
      });

      // Update study time for goal, subject, and topic
      await prisma.goal.update({
        where: { id: goalId },
        data: {
          totalStudyTime: {
            increment: duration,
          },
        },
      });

      await prisma.subject.update({
        where: { id: subjectId },
        data: {
          studyTime: {
            increment: duration,
          },
        },
      });

      if (topicId) {
        await prisma.topic.update({
          where: { id: topicId },
          data: {
            studyTime: {
              increment: duration,
            },
          },
        });
      }

      const transformedSession: StudySession = {
        id: newSession.id,
        goalId: newSession.goalId,
        subjectId: newSession.subjectId || undefined,
        topicId: newSession.topicId || undefined,
        startTime: newSession.startTime,
        endTime: newSession.endTime || undefined,
        duration: newSession.duration,
        date: newSession.date,
        comment: newSession.comment || undefined,
      };

      return NextResponse.json(transformedSession, { status: 201 });
    }
  } catch (error) {
    console.error('Error handling session:', error);
    return NextResponse.json(
      { error: 'Failed to handle session' },
      { status: 500 }
    );
  }
}

// GET /api/sessions - Get all study sessions (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');
    const subjectId = searchParams.get('subjectId');
    const topicId = searchParams.get('topicId');

    const where: any = {};
    if (goalId) where.goalId = goalId;
    if (subjectId) where.subjectId = subjectId;
    if (topicId) where.topicId = topicId;

    const sessions = await prisma.studySession.findMany({
      where,
      orderBy: {
        startTime: 'desc',
      },
      include: {
        goal: {
          select: { name: true },
        },
        subject: {
          select: { name: true },
        },
        topic: {
          select: { name: true },
        },
      },
    });

    const transformedSessions: StudySession[] = sessions.map((session) => ({
      id: session.id,
      goalId: session.goalId,
      subjectId: session.subjectId || undefined,
      topicId: session.topicId || undefined,
      startTime: session.startTime,
      endTime: session.endTime || undefined,
      duration: session.duration,
      date: session.date,
      comment: session.comment || undefined,
    }));

    return NextResponse.json(transformedSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
