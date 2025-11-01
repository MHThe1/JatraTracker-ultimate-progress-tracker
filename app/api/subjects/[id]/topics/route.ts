import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Topic } from '@/types';

// POST /api/subjects/[id]/topics - Add a topic to a subject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subjectId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Topic name is required' },
        { status: 400 }
      );
    }

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    const topic = await prisma.topic.create({
      data: {
        name: name.trim(),
        subjectId,
        studyTime: 0,
      },
    });

    const transformedTopic: Topic = {
      id: topic.id,
      name: topic.name,
      subjectId: topic.subjectId,
      studyTime: topic.studyTime,
    };

    return NextResponse.json(transformedTopic, { status: 201 });
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}
