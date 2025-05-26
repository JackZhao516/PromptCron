export type SortOrder = 'asc' | 'desc';

export interface Schedule {
  type: 'daily' | 'weekly';
  time: string;
  timezone: string;
  days?: string[];
}

export interface PromptSchedule {
  id: string;
  email_title: string;
  emails: string[];
  prompt: string;
  prompt_variables?: Record<string, string[]>;
  schedule: Schedule;
  start_date?: string;
  end_date?: string;
}

export type ScheduleType = 'daily' | 'weekly';

export interface ScheduleFormData {
  emails: string[];
  prompt: string;
  email_title: string;
  prompt_variables: Record<string, string[]>;
  scheduleType: ScheduleType;
  time: string;
  timezone: string;
  selectedDays: string[];
}

export interface PromptVariable {
  name: string;
  values: string[];
}

export type SortField = 'email_title'; 