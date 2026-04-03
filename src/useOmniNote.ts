import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';
import { Note, Filter, ViewType, DueDate } from './types';
import { INITIAL_NOTES, INITIAL_FILTERS, INITIAL_CATEGORIES, INITIAL_TAGS } from './constants';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cleanData(data: any) {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    } else if (cleaned[key] !== null && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
      cleaned[key] = cleanData(cleaned[key]);
    }
  });
  return cleaned;
}

export function useOmniNote() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [tags, setTags] = useState<string[]>(INITIAL_TAGS);
  const [starredViews, setStarredViews] = useState<ViewType[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('today');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync: Notes
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }

    const q = query(
      collection(db, 'notes'), 
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Note[];
      setNotes(notesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Filters
  useEffect(() => {
    if (!user) {
      setFilters([]);
      return;
    }

    const q = query(collection(db, 'filters'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filtersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Filter[];
      setFilters(filtersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'filters');
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: User Settings
  useEffect(() => {
    if (!user) {
      setStarredViews([]);
      setCategories(INITIAL_CATEGORIES);
      setTags(INITIAL_TAGS);
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'settings', 'main');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.starredViews) setStarredViews(data.starredViews);
        if (data.categories) setCategories(data.categories);
        if (data.tags) setTags(data.tags);
      } else {
        // Initialize settings if they don't exist
        setDoc(docRef, {
          starredViews: [],
          categories: INITIAL_CATEGORIES,
          tags: INITIAL_TAGS
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/settings/main`));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/main`);
    });

    return () => unsubscribe();
  }, [user]);

  const addNote = async (note: Omit<Note, 'id' | 'createdAt' | 'completed'>) => {
    if (!user) return;
    try {
      const data = cleanData({
        ...note,
        uid: user.uid,
        completed: false,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'notes'), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notes');
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (!user) return;
    try {
      const data = cleanData(updates);
      await updateDoc(doc(db, 'notes', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${id}`);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'notes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notes/${id}`);
    }
  };

  const toggleComplete = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    await updateNote(id, { completed: !note.completed });
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

  const updateUserSettings = async (updates: Partial<{ starredViews: ViewType[], categories: string[], tags: string[] }>) => {
    if (!user) return;
    try {
      const data = cleanData(updates);
      await updateDoc(doc(db, 'users', user.uid, 'settings', 'main'), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/settings/main`);
    }
  };

  const toggleStar = (view: ViewType) => {
    const exists = starredViews.some(v => {
      if (typeof v === 'string' && typeof view === 'string') return v === view;
      if (typeof v === 'object' && typeof view === 'object') {
        if (v.type !== view.type) return false;
        if (v.type === 'filter') return v.id === (view as any).id;
        if (v.type === 'category' || v.type === 'tag') return v.value === (view as any).value;
      }
      return false;
    });

    const newStarred = exists 
      ? starredViews.filter(v => {
          if (typeof v === 'string' && typeof view === 'string') return v !== view;
          if (typeof v === 'object' && typeof view === 'object') {
            if (v.type !== view.type) return true;
            if (v.type === 'filter') return v.id !== (view as any).id;
            if (v.type === 'category' || v.type === 'tag') return v.value !== (view as any).value;
          }
          return true;
        })
      : [...starredViews, view];
    
    updateUserSettings({ starredViews: newStarred });
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
    user,
    isAuthReady,
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
    setCategories: (c: string[]) => updateUserSettings({ categories: c }),
    setTags: (t: string[]) => updateUserSettings({ tags: t }),
    addFilter: async (f: Omit<Filter, 'id' | 'uid'>) => {
      if (!user) return;
      const data = cleanData({ ...f, uid: user.uid });
      await addDoc(collection(db, 'filters'), data);
    },
    updateFilter: async (id: string, updates: Partial<Filter>) => {
      if (!user) return;
      const data = cleanData(updates);
      await updateDoc(doc(db, 'filters', id), data);
    },
    deleteFilter: async (id: string) => {
      if (!user) return;
      await deleteDoc(doc(db, 'filters', id));
    },
    toggleStar,
    isStarred
  };
}
