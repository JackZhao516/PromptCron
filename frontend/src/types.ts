export interface PromptSchedule {
  id: string;
  emails: string[];
  prompt: string;
  emailTitle: string;
  promptVariables: { [key: string]: string[] };
  schedule: {
    type: 'daily' | 'weekly';
    time: string; // HH:mm format
    timezone: string; // e.g., 'America/New_York'
    days?: string[]; // ['monday', 'wednesday', etc.]
  };
}

export type ScheduleType = 'daily' | 'weekly';

export interface ScheduleFormData {
  emails: string[];
  prompt: string;
  emailTitle: string;
  promptVariables: { [key: string]: string[] };
  scheduleType: ScheduleType;
  time: string;
  timezone: string;
  selectedDays: string[];
}

export interface PromptVariable {
  name: string;
  values: string[];
}

export type SortField = 'emailTitle';
export type SortOrder = 'asc' | 'desc'; 