import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Goal, Subject, Topic } from '@/types';

// GET /api/goals/[id] - Get a specific goal with subjects and topics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        subjects: {
          include: {
            topics: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Transform to match our types
    const transformedGoal = {
      id: goal.id,
      name: goal.name,
      createdAt: goal.createdAt,
      totalStudyTime: goal.totalStudyTime,
      startDate: goal.startDate || undefined,
      finishDate: goal.finishDate || undefined,
      subjects: goal.subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        goalId: subject.goalId,
        studyTime: subject.studyTime,
        dailyMinutesGoal: subject.dailyMinutesGoal || undefined,
        daysOfWeek: subject.daysOfWeek ? JSON.parse(subject.daysOfWeek) : undefined,
        startDate: subject.startDate || undefined,
        finishDate: subject.finishDate || undefined,
        topics: subject.topics.map((topic) => ({
          id: topic.id,
          name: topic.name,
          subjectId: topic.subjectId,
          studyTime: topic.studyTime,
        })),
      })),
    };

    return NextResponse.json(transformedGoal);
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal' },
      { status: 500 }
    );
  }
}

// PATCH /api/goals/[id] - Update goal (dates)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { startDate, finishDate } = body;

    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        startDate: startDate || null,
        finishDate: finishDate || null,
      },
    });

    return NextResponse.json({
      id: updatedGoal.id,
      name: updatedGoal.name,
      createdAt: updatedGoal.createdAt,
      totalStudyTime: updatedGoal.totalStudyTime,
      startDate: updatedGoal.startDate || undefined,
      finishDate: updatedGoal.finishDate || undefined,
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}