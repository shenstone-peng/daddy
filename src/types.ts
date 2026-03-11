export type Tab = 'dashboard' | 'tasks' | 'reminders';

export type TaskCategory =
  | 'appointment'
  | 'admin'
  | 'health'
  | 'home'
  | 'learning'
  | 'shopping';

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'done';

export type MilestoneKind = 'checkup' | 'prep' | 'learning' | 'admin';

export interface PregnancyProfile {
  partnerName: string;
  dueDate: string;
  city: string;
  hospital: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  category: TaskCategory;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  reminderDate?: string;
  system: boolean;
  calendarExported: boolean;
}

export interface MilestoneEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  week: number;
  kind: MilestoneKind;
  location?: string;
  exported: boolean;
}

export interface AppState {
  profile: PregnancyProfile | null;
  tasks: TaskItem[];
  milestones: MilestoneEvent[];
}

export interface CalendarExportEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  location?: string;
}
