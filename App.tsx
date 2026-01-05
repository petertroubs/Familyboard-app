
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Sparkles, X, Trophy, Settings, Check, 
  Zap, Utensils, Home, Trash2, Users, Star, Medal,
  Tv, BookOpen, Calendar as CalendarIcon, 
  Copy, History, Target, Award, Gift, Monitor, 
  ChevronRight, Heart, Mic, Newspaper, ExternalLink, 
  Lightbulb, LogIn, Lock, LayoutDashboard, Camera, 
  ListChecks, Image as ImageIcon, ShieldCheck, Share2, 
  Palette, Info, HelpCircle, AlertCircle, StickyNote as NoteIcon,
  Calendar, Clock, Mail, LogOut, UserPlus, Bell, CheckCircle2,
  ChevronLeft, Archive, Bookmark, RefreshCcw, Volume2, Pin, PinOff, Tag, Upload, 
  Dumbbell, Target as TargetIcon, Smile, TrendingUp, TrendingDown, Eye, EyeOff, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Child, AppConfig, AgendaEntry, StickyNote, UserAccount, PointLog, NoteSection, CustomQuestion, ConfigGoal, DailyChallenge } from './types';
import { ChildCard } from './components/ChildCard';

const PREDEFINED_AVATARS = [
  'https://picsum.photos/id/64/200', 'https://picsum.photos/id/65/200', 'https://picsum.photos/id/66/200',
  'https://picsum.photos/id/67/200', 'https://picsum.photos/id/69/200', 'https://picsum.photos/id/91/200',
  'https://picsum.photos/id/103/200', 'https://picsum.photos/id/177/200', 'https://picsum.photos/id/202/200',
];

const NOTE_COLORS = ['#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3', '#f3e8ff', '#e0f2fe', '#ffedd5'];

const DEFAULT_CONFIG: AppConfig = {
  appName: "Family Board Pro",
  theme: { primaryColor: '#6366f1', backgroundColor: '#fdfbff', borderRadius: '2.5rem' },
  services: [
    { id: 's1', name: 'Débarrassage', points: 2, iconName: 'Utensils' },
    { id: 's2', name: 'Rangement chambre', points: 5, iconName: 'Home' },
    { id: 's3', name: 'Douche sans râler', points: 3, iconName: 'Zap' },
  ],
  gages: [
    { id: 'g1', label: 'Privé de dessert', points: -5 },
    { id: 'g2', label: 'Pas de tablette', points: -10 },
  ],
  globalGoals: [{ id: 'gg1', points: 500, label: "Parc d'attraction", iconName: 'Trophy' }],
  possibleIndividualRewards: [{ id: 'ir1', points: 50, label: "Nouveau Livre", iconName: 'BookOpen' }],
};

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState<UserAccount | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState("");
  const [authFamily, setAuthFamily] = useState("");

  const todayStr = new Date().toISOString().split('T')[0];

  // --- APP STATE ---
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [children, setChildren] = useState<Child[]>([]);
  const [agenda, setAgenda] = useState<AgendaEntry[]>([]);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [noteSections, setNoteSections] = useState<NoteSection[]>([{ id: 'default', name: 'Général' }]);
  const [activeView, setActiveView] = useState<'board' | 'agenda' | 'notes' | 'parents' | 'admin'>('board');
  const [agendaMode, setAgendaMode] = useState<'month' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(todayStr);
  
  // Modals & Popups
  const [isNewChildOpen, setIsNewChildOpen] = useState(false);
  const [newChildData, setNewChildData] = useState({ 
    name: '', age: 6, passion: '', favoriteAnimal: '', dreamJob: '', 
    customQuestions: [] as { question: string, answer: string }[],
    avatar: PREDEFINED_AVATARS[0], cardBackground: ''
  });
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventData, setNewEventData] = useState({ title: '', description: '', date: '', time: '18:00' });
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNoteData, setNewNoteData] = useState({ text: '', color: NOTE_COLORS[0], sectionId: 'default' });
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  
  const alarmAudio = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardBgInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem('fb_pro_master_v6');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.user) setUser(parsed.user);
      if (parsed.config) setConfig(parsed.config);
      if (parsed.children) setChildren(parsed.children);
      if (parsed.agenda) setAgenda(parsed.agenda);
      if (parsed.notes) setNotes(parsed.notes);
      if (parsed.noteSections) setNoteSections(parsed.noteSections);
    }
    alarmAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    localStorage.setItem('fb_pro_master_v6', JSON.stringify({ user, config, children, agenda, notes, noteSections }));
    const root = document.documentElement;
    root.style.setProperty('--primary-color', config.theme.primaryColor);
    root.style.setProperty('--app-bg', config.theme.backgroundColor);
    root.style.setProperty('--app-radius', config.theme.borderRadius);
  }, [user, config, children, agenda, notes, noteSections]);

  // --- NOTIFICATIONS & TIMER ---
  useEffect(() => {
    if (user && agenda.some(e => e.date === todayStr)) setShowNotification(true);
  }, [user, agenda]);

  useEffect(() => {
    const timer = setInterval(() => {
      setChildren(prev => prev.map(c => {
        if (c.isTimerRunning && c.screenTimeRemaining > 0) {
          const newVal = c.screenTimeRemaining - 1;
          if (newVal === 0) alarmAudio.current?.play().catch(() => {});
          return { ...c, screenTimeRemaining: newVal, isTimerRunning: newVal > 0 };
        }
        return c;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- HANDLERS ---
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({ email: authEmail, familyName: authFamily || "Ma Famille", isAuthenticated: true });
  };

  // Fix: Added togglePinNote function to update pinned status of notes
  const togglePinNote = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  // Fix: Added archiveNote function to mark notes as archived
  const archiveNote = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, isArchived: true } : n));
  };

  const handleAddChildForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildData.name.trim()) return;
    const newChild: Child = {
      id: crypto.randomUUID(),
      ...newChildData,
      score: 0,
      history: [],
      dailyChallenges: [],
      personalGoals: [],
      screenTimeLimit: 60,
      screenTimeRemaining: 3600,
      isTimerRunning: false,
      customQuestions: newChildData.customQuestions.map(q => ({ ...q, id: crypto.randomUUID() }))
    };
    setChildren([...children, newChild]);
    setIsNewChildOpen(false);
    setNewChildData({ name: '', age: 6, passion: '', favoriteAnimal: '', dreamJob: '', customQuestions: [], avatar: PREDEFINED_AVATARS[0], cardBackground: '' });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'cardBackground' | 'childCardBackground') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (target === 'avatar') setNewChildData({ ...newChildData, avatar: result });
        if (target === 'cardBackground') setNewChildData({ ...newChildData, cardBackground: result });
        if (target === 'childCardBackground' && selectedChild) {
           const updated = children.map(c => c.id === selectedChild.id ? { ...c, cardBackground: result } : c);
           setChildren(updated);
           setSelectedChild(updated.find(c => c.id === selectedChild.id) || null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventData.title || !newEventData.date) return;
    setAgenda([...agenda, { id: crypto.randomUUID(), ...newEventData, category: 'other' }]);
    setIsAddEventOpen(false);
    setNewEventData({ title: '', description: '', date: '', time: '18:00' });
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteData.text) return;
    setNotes([{ id: crypto.randomUUID(), ...newNoteData, date: Date.now(), isPinned: false }, ...notes]);
    setIsAddNoteOpen(false);
    setNewNoteData({ text: '', color: NOTE_COLORS[0], sectionId: 'default' });
  };

  const handlePointAction = (childId: string, points: number, reason: string) => {
    setChildren(children.map(c => {
      if (c.id === childId) {
        const log: PointLog = { id: crypto.randomUUID(), type: points >= 0 ? 'positive' : 'negative', reason, timestamp: Date.now(), points };
        return { ...c, score: Math.max(0, c.score + points), history: [log, ...c.history].slice(0, 10) };
      }
      return c;
    }));
  };

  const todayEvents = agenda.filter(e => e.date === todayStr);
  const pinnedNotes = notes.filter(n => n.isPinned && !n.isArchived);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/30 rounded-2xl opacity-20" />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = agenda.filter(e => e.date === dateStr);
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedAgendaDate;
      days.push(
        <button key={d} onClick={() => setSelectedAgendaDate(dateStr)} className={`h-24 p-2 rounded-2xl border transition-all flex flex-col items-center justify-between group relative ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''} ${isToday ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-100'}`}>
          <span className={`text-xs font-black ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{d}</span>
          <div className="flex flex-wrap gap-0.5 justify-center">{dayEvents.map(e => <div key={e.id} className="w-1.5 h-1.5 dynamic-primary-bg rounded-full" />)}</div>
        </button>
      );
    }
    return days;
  };

  // --- SUB-VIEWS ---
  const AdviceView = () => (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Le Coaching Parental</h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Grandir ensemble, un pas après l'autre</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-emerald-50 p-8 rounded-[3rem] space-y-6">
          <h3 className="text-lg font-black uppercase text-emerald-800 flex items-center gap-2"><ThumbsUp/> Les Bonnes Pratiques</h3>
          <ul className="space-y-4">
            {[
              "Renforcement positif : Félicitez l'effort, pas seulement le résultat.",
              "Règles claires : Établissez des attentes précises avec l'enfant.",
              "Consistance : Appliquez les règles de manière stable chaque jour.",
              "Temps de qualité : Passez 15 min par jour sans distraction avec lui."
            ].map((t, i) => (
              <li key={i} className="flex gap-4 items-start">
                <div className="p-1 bg-emerald-500 text-white rounded-full flex-shrink-0 mt-1"><Check size={12}/></div>
                <p className="text-xs font-bold text-emerald-700">{t}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-rose-50 p-8 rounded-[3rem] space-y-6">
          <h3 className="text-lg font-black uppercase text-rose-800 flex items-center gap-2"><ThumbsDown/> À Éviter</h3>
          <ul className="space-y-4">
            {[
              "Crier : Cela crée du stress et bloque l'apprentissage.",
              "Menaces vides : Ne promettez pas de gage que vous ne tiendrez pas.",
              "Comparaisons : Évitez de comparer avec les frères et sœurs.",
              "Négocier après coup : La règle est fixée avant l'action."
            ].map((t, i) => (
              <li key={i} className="flex gap-4 items-start">
                <div className="p-1 bg-rose-500 text-white rounded-full flex-shrink-0 mt-1"><X size={12}/></div>
                <p className="text-xs font-bold text-rose-700">{t}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 space-y-6 shadow-sm">
        <h3 className="text-lg font-black uppercase text-slate-800 flex items-center gap-2"><Lightbulb className="text-amber-500"/> Idées de Défis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { t: "Petit Chef", d: "Aider à préparer un gâteau de A à Z." },
            { t: "Mission Propreté", d: "Trier ses vieux jouets pour les donner." },
            { t: "Zen Master", d: "Faire 5 min de calme avant de dormir." }
          ].map((item, i) => (
            <div key={i} className="p-5 bg-slate-50 rounded-[2rem] space-y-2">
              <p className="text-sm font-black uppercase text-indigo-600">{item.t}</p>
              <p className="text-[10px] font-bold text-slate-500">{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AdminView = () => (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Configuration</h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Personnalisez votre expérience familiale</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black uppercase text-slate-800 flex items-center gap-2"><Palette/> Thème & Identité</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2">Nom de l'app</label>
              <input type="text" value={config.appName} onChange={e => setConfig({ ...config, appName: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2">Couleur principale</label>
              <div className="flex gap-2">
                {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'].map(c => (
                  <button key={c} onClick={() => setConfig({ ...config, theme: { ...config.theme, primaryColor: c } })} className={`w-10 h-10 rounded-full border-4 ${config.theme.primaryColor === c ? 'border-indigo-200' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black uppercase text-slate-800 flex items-center gap-2"><Trophy/> Objectif Collectif</h3>
          {config.globalGoals.map((goal, idx) => (
            <div key={goal.id} className="p-5 bg-slate-50 rounded-[2rem] space-y-3">
              <input type="text" value={goal.label} onChange={e => {
                const newGoals = [...config.globalGoals];
                newGoals[idx].label = e.target.value;
                setConfig({ ...config, globalGoals: newGoals });
              }} className="w-full bg-transparent font-black uppercase text-sm border-none outline-none" />
              <div className="flex items-center gap-4">
                <input type="number" value={goal.points} onChange={e => {
                  const newGoals = [...config.globalGoals];
                  newGoals[idx].points = parseInt(e.target.value) || 0;
                  setConfig({ ...config, globalGoals: newGoals });
                }} className="w-24 bg-white p-2 rounded-xl text-xs font-black" />
                <span className="text-[10px] font-black text-slate-300 uppercase">Points requis</span>
              </div>
            </div>
          ))}
        </section>
      </div>

      <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black uppercase text-slate-800 flex items-center gap-2"><Zap/> Services & Bons Comportements</h3>
          <button onClick={() => setConfig({ ...config, services: [...config.services, { id: crypto.randomUUID(), name: 'Nouveau', points: 5, iconName: 'Zap' }] })} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Plus/></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {config.services.map((s, idx) => (
            <div key={s.id} className="p-5 bg-slate-50 rounded-[2rem] space-y-3 relative group">
              <input type="text" value={s.name} onChange={e => {
                const newList = [...config.services];
                newList[idx].name = e.target.value;
                setConfig({ ...config, services: newList });
              }} className="w-full bg-transparent font-black uppercase text-xs border-none" />
              <input type="number" value={s.points} onChange={e => {
                const newList = [...config.services];
                newList[idx].points = parseInt(e.target.value) || 0;
                setConfig({ ...config, services: newList });
              }} className="w-full bg-white p-2 rounded-xl text-xs font-black" />
              <button onClick={() => setConfig({ ...config, services: config.services.filter(x => x.id !== s.id) })} className="absolute -top-2 -right-2 p-2 bg-rose-100 text-rose-600 rounded-full opacity-0 group-hover:opacity-100 transition-all"><X size={12}/></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  // Fix: Added auth wall to handle null user state and prevent application crash
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Bienvenue</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Connectez-vous à votre espace famille</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2">Email</label>
              <input required type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2">Nom de Famille</label>
              <input required type="text" value={authFamily} onChange={e => setAuthFamily(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
            </div>
            <button type="submit" className="w-full dynamic-primary-bg text-white py-5 rounded-[2rem] font-black uppercase shadow-lg">Entrer</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 transition-all duration-700" style={{ backgroundColor: config.theme.backgroundColor }}>
      <header className="glass-panel sticky top-0 z-40 px-6 py-5 flex items-center justify-between border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <div className="dynamic-primary-bg p-3 rounded-2xl shadow-lg text-white"><Sparkles size={24} /></div>
          <div><h1 className="text-lg font-black uppercase tracking-tight text-slate-800">{config.appName}</h1><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{user?.familyName}</p></div>
        </div>
        <button onClick={() => setUser(null)} className="p-3 bg-slate-100 rounded-2xl text-slate-400"><LogOut size={20}/></button>
      </header>

      {/* Main Container */}
      <main className="p-6">
        {activeView === 'board' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Le Tableau</h2>
              <button onClick={() => setIsNewChildOpen(true)} className="dynamic-primary-bg text-white px-6 py-4 rounded-[2rem] shadow-xl flex items-center gap-2 font-black uppercase text-sm"><Plus size={20} /> Créer un profil</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {todayEvents.length > 0 && (
                <section onClick={() => setActiveView('agenda')} className="bg-white/80 p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 cursor-pointer hover:border-indigo-100 transition-all">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest"><CalendarIcon size={14}/> Programme du jour</h3>
                  <div className="space-y-2">
                    {todayEvents.map(e => (
                      <div key={e.id} className="bg-slate-50 p-4 rounded-2xl border border-white flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800 uppercase">{e.title}</span>
                        <span className="text-[10px] font-black text-slate-400">{e.time}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {pinnedNotes.length > 0 && (
                <section className="bg-white/40 p-6 rounded-[2.5rem] border border-slate-100/50 shadow-sm space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest"><Pin size={14} className="text-amber-500"/> Post-its épinglés</h3>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {pinnedNotes.map(note => (
                      <div key={note.id} onClick={() => setActiveView('notes')} className="flex-shrink-0 w-32 h-32 p-4 rounded-3xl shadow-sm border border-black/5 flex flex-col justify-between cursor-pointer" style={{ backgroundColor: note.color }}>
                        <p className="text-[10px] font-bold text-slate-800 line-clamp-4 leading-tight">{note.text}</p>
                        <Pin size={10} className="text-slate-400 self-end"/>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8">
              {children.map(child => (
                <ChildCard key={child.id} child={child} services={config.services} gages={config.gages}
                  onAddPoints={handlePointAction} onToggleGage={() => {}} onRemoveChild={() => {}} onSelect={setSelectedChild} onOpenGoals={() => {}} onOpenAvatarPicker={() => {}}
                  onToggleTimer={(id) => setChildren(children.map(c => c.id === id ? { ...c, isTimerRunning: !c.isTimerRunning } : c))}
                  onResetTimer={(id) => setChildren(children.map(c => c.id === id ? { ...c, screenTimeRemaining: c.screenTimeLimit * 60, isTimerRunning: false } : c))}
                />
              ))}
            </div>
          </div>
        )}

        {activeView === 'agenda' && (
          <div className="space-y-8 pb-20">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Agenda</h2>
              <button onClick={() => setIsAddEventOpen(true)} className="bg-indigo-600 text-white p-4 rounded-3xl shadow-lg"><Plus/></button>
            </div>
            <div className="grid grid-cols-7 gap-2">{renderMonthGrid()}</div>
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Événements du {selectedAgendaDate}</h3>
              {agenda.filter(e => e.date === selectedAgendaDate).map(e => (
                <div key={e.id} className="p-5 bg-slate-50 rounded-2xl border border-white flex justify-between items-center">
                  <div><p className="text-sm font-black uppercase text-slate-700">{e.title}</p><p className="text-[10px] font-bold text-slate-400">{e.time}</p></div>
                  <button onClick={() => setAgenda(agenda.filter(x => x.id !== e.id))} className="p-2 text-rose-400"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'notes' && (
          <div className="space-y-8 pb-20">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Le Mur</h2>
              <button onClick={() => setIsAddNoteOpen(true)} className="bg-amber-400 text-white p-4 rounded-3xl shadow-lg"><Plus/></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {notes.filter(n => !n.isArchived).map(note => (
                <div key={note.id} className="aspect-square p-6 rounded-[2.5rem] shadow-sm relative group animate-in zoom-in" style={{ backgroundColor: note.color }}>
                  <p className="text-xs font-black text-slate-800 leading-snug">{note.text}</p>
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button onClick={() => togglePinNote(note.id)} className={`p-2 rounded-xl ${note.isPinned ? 'bg-amber-500 text-white' : 'bg-white/40'}`}><Pin size={14}/></button>
                    <button onClick={() => archiveNote(note.id)} className="p-2 bg-white/40 rounded-xl"><Bookmark size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'parents' && <AdviceView />}
        {activeView === 'admin' && <AdminView />}
      </main>

      {/* FOOTER NAV */}
      <nav className="fixed bottom-0 left-0 right-0 h-24 glass-panel border-t border-slate-200/50 flex items-center justify-between px-6 z-50">
        {[
          {id:'agenda', icon:Calendar, label:'Agenda'},
          {id:'notes', icon:NoteIcon, label:'Notes'},
          {id:'board', icon:LayoutDashboard, label:'Board', primary: true},
          {id:'parents', icon:Heart, label:'Conseils'},
          {id:'admin', icon:Settings, label:'Réglages'}
        ].map(nav => (
          <button key={nav.id} onClick={() => setActiveView(nav.id as any)} className={`flex flex-col items-center gap-1.5 transition-all relative ${nav.primary ? '-top-4' : ''}`}>
            <div className={`p-4 rounded-3xl transition-all ${activeView === nav.id ? (nav.primary ? 'dynamic-primary-bg text-white shadow-xl scale-110' : 'bg-indigo-50 text-indigo-600') : (nav.primary ? 'dynamic-primary-bg text-white/80' : 'text-slate-300 hover:text-slate-500')}`}>
              <nav.icon size={24} strokeWidth={activeView === nav.id ? 2.5 : 2} />
            </div>
            {!nav.primary && <span className={`text-[9px] font-black uppercase tracking-widest ${activeView === nav.id ? 'text-indigo-600' : 'text-slate-400'}`}>{nav.label}</span>}
          </button>
        ))}
      </nav>

      {/* MODALS */}
      {isNewChildOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-[3rem] p-8 sm:p-10 space-y-10 my-8 shadow-2xl relative">
            <button onClick={() => setIsNewChildOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full hover:bg-slate-200"><X size={24}/></button>
            <div className="text-center space-y-2"><h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Nouveau Profil</h2><p className="text-xs font-black text-slate-400 uppercase tracking-widest">C'est parti !</p></div>
            <form onSubmit={handleAddChildForm} className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                   <img src={newChildData.avatar} className="w-32 h-32 rounded-[2.5rem] object-cover border-8 border-slate-50 shadow-inner" />
                   <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-2xl border-4 border-white"><Camera size={20}/></div>
                </div>
                <div className="flex-1 w-full space-y-6">
                  <input required type="text" value={newChildData.name} onChange={e => setNewChildData({...newChildData, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] font-black text-2xl border-none outline-none" placeholder="Prénom" />
                  <div className="space-y-4 px-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Âge : <span className="text-indigo-600 text-sm">{newChildData.age} ans</span></label>
                    <input type="range" min="2" max="16" value={newChildData.age} onChange={e => setNewChildData({...newChildData, age: parseInt(e.target.value)})} className="w-full" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400 px-2">Passion</label><input type="text" value={newChildData.passion} onChange={e => setNewChildData({...newChildData, passion: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" /></div>
                <div className="space-y-2"><label className="text-[9px] font-black uppercase text-slate-400 px-2">Animal favori</label><input type="text" value={newChildData.favoriteAnimal} onChange={e => setNewChildData({...newChildData, favoriteAnimal: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" /></div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 px-2">Image de fond (facultatif)</label>
                <div className="flex items-center gap-4">
                   <button type="button" onClick={() => cardBgInputRef.current?.click()} className="flex-1 p-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 flex items-center justify-center gap-2"><Upload size={14}/> Importer une photo</button>
                   {newChildData.cardBackground && <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-indigo-200"><img src={newChildData.cardBackground} className="w-full h-full object-cover" /></div>}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileImport(e, 'avatar')} />
              <input ref={cardBgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileImport(e, 'cardBackground')} />
              <button type="submit" className="w-full dynamic-primary-bg text-white py-6 rounded-[2.5rem] font-black uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg">Valider le profil ✨</button>
            </form>
          </div>
        </div>
      )}

      {isAddEventOpen && (
        <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-8 space-y-8 shadow-2xl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black uppercase tracking-tighter">Nouvel Événement</h2><button onClick={() => setIsAddEventOpen(false)} className="p-2 bg-slate-100 rounded-full"><X/></button></div>
            <form onSubmit={handleAddEventSubmit} className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 px-2">Titre</label><input required type="text" value={newEventData.title} onChange={e => setNewEventData({...newEventData, title: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" placeholder="Dentiste, Judo..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 px-2">Date</label><input required type="date" value={newEventData.date} onChange={e => setNewEventData({...newEventData, date: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 px-2">Heure</label><input required type="time" value={newEventData.time} onChange={e => setNewEventData({...newEventData, time: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" /></div>
              </div>
              <button type="submit" className="w-full dynamic-primary-bg text-white py-5 rounded-[2rem] font-black uppercase shadow-lg">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {isAddNoteOpen && (
        <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-8 space-y-8 shadow-2xl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black uppercase tracking-tighter">Nouveau Post-it</h2><button onClick={() => setIsAddNoteOpen(false)} className="p-2 bg-slate-100 rounded-full"><X/></button></div>
            <form onSubmit={handleAddNoteSubmit} className="space-y-6">
              <textarea required value={newNoteData.text} onChange={e => setNewNoteData({...newNoteData, text: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold min-h-[120px]" placeholder="Votre message..." />
              <div className="flex flex-wrap gap-3">{NOTE_COLORS.map(c => <button key={c} type="button" onClick={() => setNewNoteData({...newNoteData, color: c})} className={`w-10 h-10 rounded-full border-4 ${newNoteData.color === c ? 'border-white ring-2 ring-indigo-500 shadow-lg' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
              <button type="submit" className="w-full dynamic-primary-bg text-white py-5 rounded-[2rem] font-black uppercase shadow-lg">Coller sur le mur</button>
            </form>
          </div>
        </div>
      )}

      {selectedChild && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-y-auto pb-20">
           <header className="p-8 flex justify-between items-center bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100">
             <div className="flex items-center gap-6">
                <img src={selectedChild.avatar} className="w-20 h-20 rounded-[2.2rem] object-cover shadow-2xl ring-4 ring-white" />
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">{selectedChild.name}</h2>
                  <p className="text-xs font-black dynamic-primary-text uppercase tracking-widest flex items-center gap-2"><Star size={14} fill="currentColor"/> {selectedChild.score} points</p>
                </div>
             </div>
             <button onClick={() => setSelectedChild(null)} className="p-4 bg-white rounded-3xl text-slate-400 shadow-sm border border-slate-50"><X size={28}/></button>
           </header>
           
           <div className="flex-1 p-8 space-y-12 max-w-5xl mx-auto w-full">
              <section className="bg-slate-50 p-8 rounded-[3rem] space-y-6">
                 <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Monitor size={18}/> Personnalisation visuelle</h3>
                 <div className="flex items-center gap-4">
                    <button onClick={() => cardBgInputRef.current?.click()} className="flex-1 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 flex items-center justify-center gap-2"><Upload size={14}/> Changer le fond de carte</button>
                    {selectedChild.cardBackground && <button onClick={() => {
                      const updated = children.map(c => c.id === selectedChild.id ? { ...c, cardBackground: '' } : c);
                      setChildren(updated);
                      setSelectedChild(updated.find(c => c.id === selectedChild.id) || null);
                    }} className="p-4 bg-rose-50 text-rose-500 rounded-2xl"><Trash2 size={20}/></button>}
                 </div>
                 <input ref={cardBgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileImport(e, 'childCardBackground')} />
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-6">
                   <div className="flex justify-between items-center"><h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Dumbbell size={18} className="text-indigo-600"/> Défis Individuels</h3><button onClick={() => {
                     const task = prompt("Nom du défi ?");
                     const points = parseInt(prompt("Points ?", "5") || "5");
                     if (task) setChildren(children.map(c => c.id === selectedChild.id ? { ...c, dailyChallenges: [...c.dailyChallenges, { id: crypto.randomUUID(), task, points, completed: false }] } : c));
                   }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Plus size={20}/></button></div>
                   <div className="space-y-3">
                     {selectedChild.dailyChallenges.map(d => (
                       <div key={d.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center">
                         <span className="text-xs font-black uppercase text-slate-700">{d.task} (+{d.points} pts)</span>
                         <button onClick={() => setChildren(children.map(c => c.id === selectedChild.id ? { ...c, dailyChallenges: c.dailyChallenges.filter(x => x.id !== d.id) } : c))} className="text-rose-400"><Trash2 size={16}/></button>
                       </div>
                     ))}
                   </div>
                </section>

                <section className="space-y-6">
                   <div className="flex justify-between items-center"><h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Gift size={18} className="text-amber-500"/> Objectifs & Récompenses</h3><button onClick={() => {
                     const label = prompt("Nom de l'objectif ?");
                     const points = parseInt(prompt("Points requis ?", "50") || "50");
                     if (label) setChildren(children.map(c => c.id === selectedChild.id ? { ...c, personalGoals: [...c.personalGoals, { id: crypto.randomUUID(), label, points, iconName: 'Gift' }] } : c));
                   }} className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Plus size={20}/></button></div>
                   <div className="space-y-3">
                     {selectedChild.personalGoals.map(g => (
                       <div key={g.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center">
                         <span className="text-xs font-black uppercase text-slate-700">{g.label} ({g.points} pts)</span>
                         <button onClick={() => setChildren(children.map(c => c.id === selectedChild.id ? { ...c, personalGoals: c.personalGoals.filter(x => x.id !== g.id) } : c))} className="text-rose-400"><Trash2 size={16}/></button>
                       </div>
                     ))}
                   </div>
                </section>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
