export type DueDateType = 'fixed' | 'daily' | 'specific_days';

export interface DueDate {
  type: DueDateType;
  date?: string; // ISO string for fixed
  daysOfWeek?: number[]; // 0-6 for specific_days
}

export interface Note {
  id: string;
  title: string;
  content: string;
  dueDate?: DueDate;
  deadline?: string; // ISO string
  category?: string;
  tags: string[];
  createdAt: string;
  completed: boolean;
}

export interface Filter {
  id: string;
  name: string;
  conditions: {
    category?: string;
    tags?: string[];
    hasDeadline?: boolean;
    hasDueDate?: boolean;
  };
}

export type ViewType = 
  | 'inbox' 
  | 'today' 
  | { type: 'category'; value: string } 
  | { type: 'tag'; value: string } 
  | { type: 'filter'; id: string };

export interface StarredItem {
  view: ViewType;
}
