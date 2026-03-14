import React, { useState, useEffect, useMemo } from 'react';
import { Note, Filter, ViewType, DueDate } from './types';
import { INITIAL_NOTES, INITIAL_FILTERS, INITIAL_CATEGORIES, INITIAL_TAGS } from './constants';

export function useOmniNote() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('omninote_notes');
    return saved ? JSON.parse(saved) : INITIAL_NOTES;
  });

  const [filters, setFilters] = useState<Filter[]>(() => {
    const saved = localStorage.getItem('omninote_filters');
    return saved ? JSON.parse(saved) : INITIAL_FILTERS;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('omninote_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [tags, setTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('omninote_tags');
    return saved ? JSON.parse(saved) : INITIAL_TAGS;
  });

  const [starredViews, setStarredViews] = useState<ViewType[]>(() => {
    const saved = localStorage.getItem('omninote_starred');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentView, setCurrentView] = useState<ViewType>('today');

  useEffect(() => {
    localStorage.setItem('omninote_starred', JSON.stringify(starredViews));
  }, [starredViews]);

  useEffect(() => {
    localStorage.setItem('omninote_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('omninote_filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('omninote_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('omninote_tags', JSON.stringify(tags));
  }, [tags]);

  const addNote = (note: Omit<Note, 'id' | 'createdAt' | 'completed'>) => {
    const newNote: Note = {
      ...note,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      completed: false,
    };
    setNotes(prev => [newNote, ...prev]);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const toggleComplete = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, completed: !n.completed } : n));
  };

  const filteredNotes = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return notes.filter(note => {
      if (currentView === 'inbox') {
        return !note.dueDate && !note.deadline;
      }

      if (currentView === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check due date
        let isDueToday = false;
        if (note.dueDate) {
          if (note.dueDate.type === 'fixed') {
            const d = new Date(note.dueDate.date!);
            d.setHours(0, 0, 0, 0);
            if (d.getTime() === today.getTime()) isDueToday = true;
          } else if (note.dueDate.type === 'daily') {
            isDueToday = true;
          } else if (note.dueDate.type === 'specific_days') {
            if (note.dueDate.daysOfWeek?.includes(today.getDay())) isDueToday = true;
          }
        }

        // Check deadline
        let isDeadlineToday = false;
        if (note.deadline) {
          const d = new Date(note.deadline);
          d.setHours(0, 0, 0, 0);
          if (d.getTime() === today.getTime()) isDeadlineToday = true;
        }

        return isDueToday || isDeadlineToday;
      }

      if (typeof currentView === 'object') {
        if (currentView.type === 'category') {
          return note.category === currentView.value;
        }
        if (currentView.type === 'tag') {
          return note.tags.includes(currentView.value);
        }
        if (currentView.type === 'filter') {
          const filter = filters.find(f => f.id === currentView.id);
          if (!filter) return false;
          const { conditions } = filter;
          if (conditions.category && note.category !== conditions.category) return false;
          if (conditions.tags && !conditions.tags.every(t => note.tags.includes(t))) return false;
          if (conditions.hasDeadline !== undefined && !!note.deadline !== conditions.hasDeadline) return false;
          if (conditions.hasDueDate !== undefined && !!note.dueDate !== conditions.hasDueDate) return false;
          return true;
        }
      }
      return false;
    });
  }, [notes, currentView, filters]);

  const toggleStar = (view: ViewType) => {
    setStarredViews(prev => {
      const exists = prev.some(v => {
        if (typeof v === 'string' && typeof view === 'string') return v === view;
        if (typeof v === 'object' && typeof view === 'object') {
          if (v.type !== view.type) return false;
          if (v.type === 'filter') return v.id === (view as any).id;
          if (v.type === 'category' || v.type === 'tag') return v.value === (view as any).value;
        }
        return false;
      });

      if (exists) {
        return prev.filter(v => {
          if (typeof v === 'string' && typeof view === 'string') return v !== view;
          if (typeof v === 'object' && typeof view === 'object') {
            if (v.type !== view.type) return true;
            if (v.type === 'filter') return v.id !== (view as any).id;
            if (v.type === 'category' || v.type === 'tag') return v.value !== (view as any).value;
          }
          return true;
        });
      }
      return [...prev, view];
    });
  };

  const isStarred = (view: ViewType) => {
    return starredViews.some(v => {
      if (typeof v === 'string' && typeof view === 'string') return v === view;
      if (typeof v === 'object' && typeof view === 'object') {
        if (v.type !== view.type) return false;
        if (v.type === 'filter') return v.id === (view as any).id;
        if (v.type === 'category' || v.type === 'tag') return v.value === (view as any).value;
      }
      return false;
    });
  };

  return {
    notes,
    filteredNotes,
    filters,
    categories,
    tags,
    currentView,
    starredViews,
    setCurrentView,
    addNote,
    updateNote,
    deleteNote,
    toggleComplete,
    setCategories,
    setTags,
    setFilters,
    updateFilter: (id: string, updates: Partial<Filter>) => {
      setFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    },
    deleteFilter: (id: string) => {
      setFilters(prev => prev.filter(f => f.id !== id));
    },
    toggleStar,
    isStarred
  };
}
