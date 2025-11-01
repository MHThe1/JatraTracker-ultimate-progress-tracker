export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  studyTime: number; // in minutes
}

export interface Subject {
  id: string;
  name: string;
  goalId: string;
  studyTime: number; // in minutes
  dailyMinutesGoal?: number; // Daily study goal in minutes
  daysOfWeek?: string[]; // Array of days: ["monday", "tuesday", ...]
  startDate?: string; // YYYY-MM-DD format
  finishDate?: string; // YYYY-MM-DD format
}

export interface StudySession {
  id: string;
  goalId: string;
  subjectId?: string;
  topicId?: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  date: string; // YYYY-MM-DD format
}

export interface Goal {
  id: string;
  name: string;
  createdAt: string;
  totalStudyTime: number; // in minutes
  startDate?: string; // YYYY-MM-DD format
  finishDate?: string; // YYYY-MM-DD format
}

export interface WeeklySummary {
  week: string; // YYYY-WW format
  totalMinutes: number;
  sessions: number;
  subjects: { name: string; minutes: number }[];
}

