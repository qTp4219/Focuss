import React, { useState, useRef, useEffect, Component } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { 
  Inbox, 
  Calendar, 
  Tag as TagIcon, 
  Folder, 
  Filter as FilterIcon, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  ChevronRight,
  Menu,
  X,
  Clock,
  Repeat,
  Star,
  ChevronDown,
  Pencil,
  LogOut,
  LogIn,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useOmniNote } from './useOmniNote';
import { ViewType, Note, DueDate, Filter, DueDateType } from './types';
import { signInWithGoogle, logout } from './firebase';

class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const errInfo = JSON.parse(this.state.error?.message || "");
        if (errInfo.error) message = `Firestore Error: ${errInfo.error} (${errInfo.operationType})`;
      } catch (e) {
        message = this.state.error?.message || message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
          <div className="max-w-md w-full bg-white p-8 rounded-[32px] shadow-xl text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Application Error</h2>
            <p className="text-zinc-500 text-sm mb-8">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-black/20 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick,
  count,
  onStar,
  isStarred,
  onEdit,
  onDelete
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void,
  count?: number,
  onStar?: (e: React.MouseEvent) => void,
  isStarred?: boolean,
  onEdit?: (e: React.MouseEvent) => void,
  onDelete?: (e: React.MouseEvent) => void,
  key?: React.Key
}) => (
  <div className="group/item relative">
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-black text-white shadow-md' 
          : 'text-zinc-600 hover:bg-zinc-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={active ? 'text-white' : 'text-zinc-400'} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
            {count}
          </span>
        )}
      </div>
    </button>
    <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1">
      {onDelete && (
        <button
          onClick={onDelete}
          className={`p-1.5 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover/item:opacity-100 ${
            active ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-zinc-300 hover:text-rose-500 hover:bg-rose-50'
          }`}
        >
          <Trash2 size={14} />
        </button>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className={`p-1.5 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover/item:opacity-100 ${
            active ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <Pencil size={14} />
        </button>
      )}
      {onStar && (
        <button
          onClick={onStar}
          className={`p-1.5 rounded-lg transition-all ${
            isStarred 
              ? 'text-amber-400 opacity-100' 
              : 'text-zinc-300 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 hover:text-amber-400'
          }`}
        >
          <Star size={14} fill={isStarred ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  </div>
);

const NoteCard = ({ note, onToggle, onDelete, onEdit }: { note: Note, onToggle: () => void, onDelete: () => void, onEdit: () => void, key?: React.Key }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="group bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
  >
    <div className="flex items-start gap-4">
      <button 
        onClick={onToggle}
        className={`mt-1 transition-colors duration-200 ${note.completed ? 'text-emerald-500' : 'text-zinc-300 hover:text-zinc-400'}`}
      >
        {note.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </button>
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-semibold truncate ${note.completed ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
          {note.title}
        </h3>
        <p className={`text-xs mt-1 line-clamp-2 ${note.completed ? 'text-zinc-300' : 'text-zinc-500'}`}>
          {note.content}
        </p>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {note.category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-medium uppercase tracking-wider">
              <Folder size={10} />
              {note.category}
            </span>
          )}
          {note.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-50 text-zinc-400 border border-zinc-100 rounded-full text-[10px] font-medium uppercase tracking-wider">
              <TagIcon size={10} />
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
          {note.dueDate && (
            <div className="flex items-center gap-1">
              {note.dueDate.type === 'fixed' ? <Clock size={10} /> : <Repeat size={10} />}
              <span>
                {note.dueDate.type === 'fixed' ? new Date(note.dueDate.date!).toLocaleDateString() : note.dueDate.type}
              </span>
            </div>
          )}
          {note.deadline && (
            <div className="flex items-center gap-1 text-rose-400">
              <Calendar size={10} />
              <span>Deadline: {new Date(note.deadline).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button 
          onClick={onEdit}
          className="p-2 text-zinc-300 hover:text-black hover:bg-zinc-100 rounded-lg transition-all duration-200"
        >
          <Pencil size={16} />
        </button>
        <button 
          onClick={onDelete}
          className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all duration-200"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </motion.div>
);

export default function App() {
  const { 
    user,
    isAuthReady,
    filteredNotes, 
    notes,
    filters, 
    categories, 
    tags, 
    currentView, 
    setCurrentView,
    toggleComplete,
    deleteNote,
    addNote,
    updateNote,
    addFilter,
    updateFilter,
    deleteFilter,
    toggleStar,
    isStarred,
    starredViews
  } = useOmniNote();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
  
  const [collapsedSections, setCollapsedSections] = useState({
    filters: false,
    categories: false,
    tags: false
  });

  const [newNote, setNewNote] = useState({ 
    title: '', 
    content: '', 
    category: '', 
    tags: [] as string[],
    dueDate: undefined as DueDate | undefined,
    deadline: undefined as string | undefined
  });

  // Auto-pick category if in category view
  useEffect(() => {
    if (isAddingNote && typeof currentView === 'object' && currentView.type === 'category') {
      setNewNote(prev => ({ ...prev, category: currentView.value }));
    }
  }, [isAddingNote, currentView]);

  const [newFilter, setNewFilter] = useState({
    name: '',
    conditions: {
      category: '',
      tags: [] as string[],
      hasDeadline: false,
      hasDueDate: false
    }
  });

  // Mobile Swipe Logic
  const views: ViewType[] = [
    'inbox', 
    'today', 
    ...starredViews
  ];

  const currentIndex = views.findIndex(v => {
    if (typeof v === 'string') return v === currentView;
    if (typeof currentView === 'string') return false;
    if (v.type !== currentView.type) return false;
    if (v.type === 'filter') return v.id === (currentView as any).id;
    if (v.type === 'category' || v.type === 'tag') return v.value === (currentView as any).value;
    return false;
  });

  const [direction, setDirection] = useState(0);

  const handleSwipe = (dir: number) => {
    const nextIndex = currentIndex + dir;
    if (nextIndex >= 0 && nextIndex < views.length) {
      setDirection(dir);
      setCurrentView(views[nextIndex]);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title) return;
    
    if (editingNote) {
      updateNote(editingNote.id, newNote);
    } else {
      addNote({
        ...newNote,
        tags: newNote.tags
      });
    }

    setNewNote({ 
      title: '', 
      content: '', 
      category: '', 
      tags: [],
      dueDate: undefined,
      deadline: undefined
    });
    setIsAddingNote(false);
    setEditingNote(null);
  };

  const handleAddFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilter.name) return;

    const conditions = {
      ...newFilter.conditions,
      category: newFilter.conditions.category || undefined,
      tags: newFilter.conditions.tags.length > 0 ? newFilter.conditions.tags : undefined
    };

    if (editingFilter) {
      updateFilter(editingFilter.id, {
        name: newFilter.name,
        conditions
      });
    } else {
      addFilter({
        name: newFilter.name,
        conditions
      });
    }

    setNewFilter({ name: '', conditions: { category: '', tags: [], hasDeadline: false, hasDueDate: false } });
    setIsAddingFilter(false);
    setEditingFilter(null);
  };

  const getViewLabel = (view: ViewType) => {
    if (view === 'inbox') return 'Inbox';
    if (view === 'today') return 'Today';
    if (typeof view === 'object') {
      if (view.type === 'category') return view.value;
      if (view.type === 'tag') return `#${view.value}`;
      if (view.type === 'filter') return filters.find(f => f.id === view.id)?.name || 'Filter';
    }
    return '';
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F8]">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F9F9F8] text-zinc-900 font-sans selection:bg-black selection:text-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-bottom border-zinc-100 px-4 py-4 flex items-center justify-between">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-zinc-600">
          <Menu size={20} />
        </button>
        <h1 className="text-sm font-bold uppercase tracking-widest">{getViewLabel(currentView)}</h1>
        <button onClick={() => setIsAddingNote(true)} className="p-2 -mr-2 text-black">
          <Plus size={20} />
        </button>
      </header>

      {/* Sidebar / Drawer */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed md:sticky top-0 left-0 h-screen w-[280px] bg-white border-r border-zinc-100 z-50 p-6 flex flex-col gap-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">F</div>
                  <span className="font-bold tracking-tight text-lg">Focuss</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-zinc-400">
                  <X size={20} />
                </button>
              </div>

              {user ? (
                <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-2xl">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-xl" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 bg-zinc-200 rounded-xl flex items-center justify-center text-zinc-500 font-bold">
                      {user.displayName?.[0] || user.email?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{user.displayName || 'User'}</p>
                    <button onClick={() => logout()} className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-rose-500 transition-colors flex items-center gap-1">
                      <LogOut size={10} />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => signInWithGoogle()}
                  className="flex items-center gap-3 p-4 bg-zinc-900 text-white rounded-2xl hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-black/10"
                >
                  <LogIn size={20} />
                  <span className="font-bold text-sm">Sign in with Google</span>
                </button>
              )}

              <nav className="flex flex-col gap-1">
                <p className="px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Main</p>
                <SidebarItem 
                  icon={Inbox} 
                  label="Inbox" 
                  active={currentView === 'inbox'} 
                  onClick={() => { setCurrentView('inbox'); setIsSidebarOpen(false); }}
                  count={notes.filter(n => !n.dueDate && !n.deadline).length}
                />
                <SidebarItem 
                  icon={Calendar} 
                  label="Today" 
                  active={currentView === 'today'} 
                  onClick={() => { setCurrentView('today'); setIsSidebarOpen(false); }}
                  count={notes.filter(n => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    let isDueToday = false;
                    if (n.dueDate) {
                      if (n.dueDate.type === 'fixed') {
                        const d = new Date(n.dueDate.date!);
                        d.setHours(0, 0, 0, 0);
                        if (d.getTime() === today.getTime()) isDueToday = true;
                      } else if (n.dueDate.type === 'daily') {
                        isDueToday = true;
                      } else if (n.dueDate.type === 'specific_days') {
                        if (n.dueDate.daysOfWeek?.includes(today.getDay())) isDueToday = true;
                      }
                    }

                    let isDeadlineToday = false;
                    if (n.deadline) {
                      const d = new Date(n.deadline);
                      d.setHours(0, 0, 0, 0);
                      if (d.getTime() === today.getTime()) isDeadlineToday = true;
                    }

                    return isDueToday || isDeadlineToday;
                  }).length}
                />
                {starredViews.map((view, idx) => {
                  const label = getViewLabel(view);
                  const icon = typeof view === 'string' ? Inbox : (view.type === 'category' ? Folder : (view.type === 'tag' ? TagIcon : FilterIcon));
                  return (
                    <SidebarItem 
                      key={idx}
                      icon={icon}
                      label={label}
                      active={currentIndex === (2 + idx)}
                      onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
                      onStar={(e) => { e.stopPropagation(); toggleStar(view); }}
                      isStarred={true}
                      onEdit={typeof view === 'object' && view.type === 'filter' ? () => {
                        const f = filters.find(filter => filter.id === view.id);
                        if (f) {
                          setEditingFilter(f);
                          setNewFilter({
                            name: f.name,
                            conditions: {
                              category: f.conditions.category || '',
                              tags: f.conditions.tags || [],
                              hasDeadline: !!f.conditions.hasDeadline,
                              hasDueDate: !!f.conditions.hasDueDate
                            }
                          });
                          setIsAddingFilter(true);
                        }
                      } : undefined}
                    />
                  );
                })}
              </nav>

              <nav className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-4 mb-2">
                  <button 
                    onClick={() => setCollapsedSections(prev => ({ ...prev, filters: !prev.filters }))}
                    className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
                  >
                    <ChevronDown size={10} className={`transition-transform ${collapsedSections.filters ? '-rotate-90' : ''}`} />
                    Filters
                  </button>
                  <button onClick={() => setIsAddingFilter(true)} className="text-zinc-400 hover:text-black transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
                {!collapsedSections.filters && filters.map(f => {
                  const view: ViewType = { type: 'filter', id: f.id };
                  return (
                    <SidebarItem 
                      key={f.id}
                      icon={FilterIcon} 
                      label={f.name} 
                      active={typeof currentView === 'object' && currentView.type === 'filter' && currentView.id === f.id} 
                      onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
                      onStar={(e) => { e.stopPropagation(); toggleStar(view); }}
                      isStarred={isStarred(view)}
                      onEdit={() => {
                        setEditingFilter(f);
                        setNewFilter({
                          name: f.name,
                          conditions: {
                            category: f.conditions.category || '',
                            tags: f.conditions.tags || [],
                            hasDeadline: !!f.conditions.hasDeadline,
                            hasDueDate: !!f.conditions.hasDueDate
                          }
                        });
                        setIsAddingFilter(true);
                      }}
                      onDelete={() => deleteFilter(f.id)}
                      count={notes.filter(note => {
                        const { conditions } = f;
                        if (conditions.category && note.category !== conditions.category) return false;
                        if (conditions.tags && !conditions.tags.every(t => note.tags.includes(t))) return false;
                        if (conditions.hasDeadline !== undefined && !!note.deadline !== conditions.hasDeadline) return false;
                        if (conditions.hasDueDate !== undefined && !!note.dueDate !== conditions.hasDueDate) return false;
                        return true;
                      }).length}
                    />
                  );
                })}
              </nav>

              <nav className="flex flex-col gap-1">
                <button 
                  onClick={() => setCollapsedSections(prev => ({ ...prev, categories: !prev.categories }))}
                  className="flex items-center gap-2 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 hover:text-zinc-600 transition-colors"
                >
                  <ChevronDown size={10} className={`transition-transform ${collapsedSections.categories ? '-rotate-90' : ''}`} />
                  Categories
                </button>
                {!collapsedSections.categories && categories.map(cat => {
                  const view: ViewType = { type: 'category', value: cat };
                  return (
                    <SidebarItem 
                      key={cat}
                      icon={Folder} 
                      label={cat} 
                      active={typeof currentView === 'object' && currentView.type === 'category' && currentView.value === cat} 
                      onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
                      onStar={(e) => { e.stopPropagation(); toggleStar(view); }}
                      isStarred={isStarred(view)}
                      count={notes.filter(n => n.category === cat).length}
                    />
                  );
                })}
              </nav>

              <nav className="flex flex-col gap-1">
                <button 
                  onClick={() => setCollapsedSections(prev => ({ ...prev, tags: !prev.tags }))}
                  className="flex items-center gap-2 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 hover:text-zinc-600 transition-colors"
                >
                  <ChevronDown size={10} className={`transition-transform ${collapsedSections.tags ? '-rotate-90' : ''}`} />
                  Tags
                </button>
                {!collapsedSections.tags && (
                  <div className="flex flex-wrap gap-2 px-4 mt-2">
                    {tags.map(tag => {
                      const view: ViewType = { type: 'tag', value: tag };
                      const starred = isStarred(view);
                      return (
                        <button
                          key={tag}
                          onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
                          className={`group/tag relative px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                            typeof currentView === 'object' && currentView.type === 'tag' && currentView.value === tag
                              ? 'bg-black text-white'
                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                          }`}
                        >
                          <span>#{tag}</span>
                          <Star 
                            size={10} 
                            fill={starred ? "currentColor" : "none"} 
                            className={`${starred ? 'text-amber-400' : 'text-zinc-300 opacity-0 group-hover/tag:opacity-100'}`}
                            onClick={(e) => { e.stopPropagation(); toggleStar(view); }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </nav>

              <div className="mt-auto pt-6 border-t border-zinc-100">
                <button 
                  onClick={() => setIsAddingNote(true)}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-2xl font-semibold text-sm shadow-lg shadow-black/10 hover:shadow-black/20 transition-all active:scale-[0.98]"
                >
                  <Plus size={18} />
                  New Note
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-h-screen relative overflow-hidden flex flex-col">
        <div className="flex-1 relative">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, info) => {
                if (window.innerWidth < 768) {
                  if (info.offset.x > 100) handleSwipe(-1);
                  else if (info.offset.x < -100) handleSwipe(1);
                }
              }}
              className="absolute inset-0 w-full h-full overflow-y-auto no-scrollbar"
            >
              <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">
                <header className="hidden md:flex items-end justify-between mb-12">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">Current View</p>
                    <h2 className="text-4xl font-bold tracking-tight">{getViewLabel(currentView)}</h2>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Notes</p>
                      <p className="text-xl font-bold">{filteredNotes.length}</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingNote(true)}
                      className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-black/10 hover:shadow-black/20 transition-all active:scale-[0.98]"
                    >
                      <Plus size={18} />
                      New Note
                    </button>
                  </div>
                </header>

                <div className="flex flex-col gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredNotes.length > 0 ? (
                      filteredNotes.map(note => (
                        <NoteCard 
                          key={note.id} 
                          note={note} 
                          onToggle={() => toggleComplete(note.id)}
                          onDelete={() => deleteNote(note.id)}
                          onEdit={() => {
                            setEditingNote(note);
                            setNewNote({
                              title: note.title,
                              content: note.content,
                              category: note.category || '',
                              tags: note.tags,
                              dueDate: note.dueDate,
                              deadline: note.deadline
                            });
                            setIsAddingNote(true);
                          }}
                        />
                      ))
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                      >
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 text-zinc-300">
                          <Inbox size={32} />
                        </div>
                        <h3 className="text-zinc-900 font-semibold">All clear</h3>
                        <p className="text-zinc-400 text-sm mt-1">No notes found in this view.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Add Note Modal */}
      <AnimatePresence>
        {isAddingNote && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingNote(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full h-full md:h-auto md:max-w-xl bg-white md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <form onSubmit={handleAddNote} className="flex-1 flex flex-col p-6 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold tracking-tight">{editingNote ? 'Edit Note' : 'New Note'}</h2>
                  <button type="button" onClick={() => { setIsAddingNote(false); setEditingNote(null); }} className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pb-10">
                  <div className="space-y-4">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Note Title"
                      className="w-full bg-transparent border-none p-0 text-2xl font-bold placeholder:text-zinc-200 focus:ring-0"
                      value={newNote.title}
                      onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <textarea
                      placeholder="Write your thoughts..."
                      className="w-full bg-transparent border-none p-0 text-base text-zinc-600 placeholder:text-zinc-200 focus:ring-0 resize-none min-h-[120px]"
                      value={newNote.content}
                      onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Folder size={12} />
                        Category
                      </label>
                      <select
                        className="w-full bg-zinc-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black transition-all appearance-none"
                        value={newNote.category}
                        onChange={e => setNewNote(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="">No Category</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <TagIcon size={12} />
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        placeholder="work, urgent, personal"
                        className="w-full bg-zinc-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black transition-all"
                        value={newNote.tags.join(', ')}
                        onChange={e => setNewNote(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} />
                        Due Date
                      </label>
                      <div className="flex flex-col gap-2">
                        <select
                          className="w-full bg-zinc-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black transition-all appearance-none"
                          value={newNote.dueDate?.type || ''}
                          onChange={e => {
                            const type = e.target.value as DueDateType;
                            setNewNote(prev => ({ 
                              ...prev, 
                              dueDate: type ? { type, date: type === 'fixed' ? new Date().toISOString().split('T')[0] : undefined } : undefined 
                            }));
                          }}
                        >
                          <option value="">No Due Date</option>
                          <option value="fixed">Specific Date</option>
                          <option value="daily">Daily</option>
                        </select>
                        {newNote.dueDate?.type === 'fixed' && (
                          <input
                            type="date"
                            className="w-full bg-zinc-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black transition-all"
                            value={newNote.dueDate.date}
                            onChange={e => setNewNote(prev => ({ 
                              ...prev, 
                              dueDate: { ...prev.dueDate!, date: e.target.value } 
                            }))}
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} />
                        Hard Deadline
                      </label>
                      <input
                        type="date"
                        className="w-full bg-zinc-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black transition-all"
                        value={newNote.deadline || ''}
                        onChange={e => setNewNote(prev => ({ ...prev, deadline: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6 flex gap-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingNote(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm text-zinc-500 hover:bg-zinc-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-black/10 hover:shadow-black/20 transition-all active:scale-[0.98]"
                  >
                    {editingNote ? 'Save Changes' : 'Create Note'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Filter Modal */}
      <AnimatePresence>
        {isAddingFilter && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingFilter(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleAddFilter} className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold tracking-tight">{editingFilter ? 'Edit Filter' : 'Create Filter'}</h2>
                  <button type="button" onClick={() => { setIsAddingFilter(false); setEditingFilter(null); }} className="p-2 text-zinc-400 hover:text-zinc-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Filter Name</label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="e.g. Work Urgent"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black transition-all"
                      value={newFilter.name}
                      onChange={e => setNewFilter(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Category</label>
                    <select
                      className="w-full bg-zinc-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-black transition-all appearance-none"
                      value={newFilter.conditions.category}
                      onChange={e => setNewFilter(prev => ({ ...prev, conditions: { ...prev.conditions, category: e.target.value } }))}
                    >
                      <option value="">Any</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-zinc-300 text-black focus:ring-black"
                        checked={newFilter.conditions.hasDeadline}
                        onChange={e => setNewFilter(prev => ({ ...prev, conditions: { ...prev.conditions, hasDeadline: e.target.checked } }))}
                      />
                      <span className="text-xs font-medium text-zinc-600">Has Deadline</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-zinc-300 text-black focus:ring-black"
                        checked={newFilter.conditions.hasDueDate}
                        onChange={e => setNewFilter(prev => ({ ...prev, conditions: { ...prev.conditions, hasDueDate: e.target.checked } }))}
                      />
                      <span className="text-xs font-medium text-zinc-600">Has Due Date</span>
                    </label>
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingFilter(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm text-zinc-500 hover:bg-zinc-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-black/10 hover:shadow-black/20 transition-all active:scale-[0.98]"
                  >
                    {editingFilter ? 'Save Changes' : 'Save Filter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
