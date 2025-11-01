import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Goal } from '@/types';

// GET /api/goals - List all goals
export async function GET() {
  try {
    const goals = await prisma.goal.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        subjects: {
          include: {
            topics: true,
          },
        },
      },
    });

    // Transform Prisma results to match our TypeScript types
    const transformedGoals: Goal[] = goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      createdAt: goal.createdAt,
      totalStudyTime: goal.totalStudyTime,
      startDate: goal.startDate || undefined,
      finishDate: goal.finishDate || undefined,
    }));

    return NextResponse.json(transformedGoals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Goal name is required' },
        { status: 400 }
      );
    }

    const goal = await prisma.goal.create({
      data: {
        name: name.trim(),
        createdAt: new Date().toISOString(),
        totalStudyTime: 0,
      },
    });

    const transformedGoal: Goal = {
      id: goal.id,
      name: goal.name,
      createdAt: goal.createdAt,
      totalStudyTime: goal.totalStudyTime,
    };

    return NextResponse.json(transformedGoal, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}
