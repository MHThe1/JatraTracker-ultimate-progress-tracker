import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/subjects/[id] - Update subject settings (daily goal, days, dates)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dailyMinutesGoal, daysOfWeek, startDate, finishDate } = body;

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    // Update subject
    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: {
        dailyMinutesGoal: dailyMinutesGoal !== undefined ? dailyMinutesGoal : null,
        daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : null,
        startDate: startDate || null,
        finishDate: finishDate || null,
      },
    });

    return NextResponse.json({
      id: updatedSubject.id,
      name: updatedSubject.name,
      goalId: updatedSubject.goalId,
      studyTime: updatedSubject.studyTime,
      dailyMinutesGoal: updatedSubject.dailyMinutesGoal || undefined,
      daysOfWeek: updatedSubject.daysOfWeek ? JSON.parse(updatedSubject.daysOfWeek) : undefined,
      startDate: updatedSubject.startDate || undefined,
      finishDate: updatedSubject.finishDate || undefined,
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json(
      { error: 'Failed to update subject' },
      { status: 500 }
    );
  }
}
