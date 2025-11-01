import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Subject } from '@/types';

// POST /api/goals/[id]/subjects - Add a subject to a goal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Subject name is required' },
        { status: 400 }
      );
    }

    // Verify goal exists
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        goalId,
        studyTime: 0,
      },
    });

    const transformedSubject: Subject = {
      id: subject.id,
      name: subject.name,
      goalId: subject.goalId,
      studyTime: subject.studyTime,
    };

    return NextResponse.json(transformedSubject, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}
