import { Note, Filter, ViewType } from './types';

export const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: 'Welcome to OmniNote',
    content: 'This is your inbox. Notes without a due date or deadline appear here.',
    tags: ['getting-started'],
    createdAt: new Date().toISOString(),
    completed: false,
  },
  {
    id: '2',
    title: 'Daily Standup',
    content: 'Recurring daily meeting notes.',
    dueDate: { type: 'daily' },
    category: 'Work',
    tags: ['meeting'],
    createdAt: new Date().toISOString(),
    completed: false,
  },
  {
    id: '3',
    title: 'Project Deadline',
    content: 'Finish the responsive layout.',
    deadline: new Date().toISOString(),
    category: 'Development',
    tags: ['urgent'],
    createdAt: new Date().toISOString(),
    completed: false,
  }
];

export const INITIAL_FILTERS: Filter[] = [
  {
    id: 'f1',
    name: 'Urgent Tasks',
    conditions: {
      tags: ['urgent'],
      hasDeadline: true
    }
  }
];

export const INITIAL_CATEGORIES = ['Work', 'Personal', 'Development', 'Health'];
export const INITIAL_TAGS = ['urgent', 'meeting', 'getting-started', 'hobby'];
