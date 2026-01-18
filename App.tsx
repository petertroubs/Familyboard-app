
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Sparkles, X, Trophy, Settings, Check, 
  Zap, Utensils, Home, Trash2, Users, Star, Medal,
  Tv, BookOpen, Calendar as CalendarIcon, 
  Copy, History, Target, Award, Gift, Monitor, 
  ChevronRight, Heart, Mic, Newspaper, ExternalLink, 
  Lightbulb, LogIn, Lock, LayoutDashboard, Camera, 
  ListChecks, ImageIcon, ShieldCheck, Share2, 
  Palette, Info, HelpCircle, AlertCircle, StickyNote as NoteIcon,
  Calendar, Clock, Mail, LogOut, UserPlus, Bell, CheckCircle2,
  ChevronLeft, Archive, Bookmark, RefreshCcw, Volume2, Pin, PinOff, Tag, Upload, 
  Dumbbell, TargetIcon, Smile, TrendingUp, TrendingDown, Eye, EyeOff, ThumbsUp, ThumbsDown, Cloud, CloudOff, Loader2
} from 'lucide-react';
import { Child, AppConfig, AgendaEntry, StickyNote, UserAccount, PointLog, NoteSection } from './types';
import { ChildCard } from './components/ChildCard';
import { supabase, testConnection, fetchFamilyData, createFamily } from './services/supabaseClient';

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
  // --- AUTH & CLOUD STATE ---
  const [user, setUser] = useState<UserAccount | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFamilyName, setAuthFamilyName] = useState("");
  const [familyId, setFamilyId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // --- APP STATE ---
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [children, setChildren] = useState<Child[]>([]);
  const [agenda, setAgenda] = useState<AgendaEntry[]>([]);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [activeView, setActiveView] = useState<'board' | 'agenda' | 'notes' | 'parents' | 'admin'>('board');
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(todayStr);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals
  const [isNewChildOpen, setIsNewChildOpen] = useState(false);
  const [newChildData, setNewChildData] = useState({ 
    name: '', age: 6, passion: '', favoriteAnimal: '', dreamJob: '', avatar: PREDEFINED_AVATARS[0], cardBackground: ''
  });
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventData, setNewEventData] = useState({ title: '', description: '', date: '', time: '18:00' });
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNoteData, setNewNoteData] = useState({ text: '', color: NOTE_COLORS[0] });
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  const alarmAudio = useRef<HTMLAudioElement | null>(null);

  // --- 1. INITIALISATION & AUTH CHECK ---
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Gérer la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) handlePostLogin(session.user.email!);
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) handlePostLogin(session.user.email!);
      else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePostLogin = async (email: string) => {
    setIsLoading(true);
    try {
      const data = await fetchFamilyData(email);
      if (data) {
        setUser({ email, familyName: data.family.family_name, isAuthenticated: true });
        setFamilyId(data.family.id);
        setChildren(data.children as any);
        setAgenda(data.agenda as any);
        setNotes(data.notes as any);
        setIsCloudActive(true);
      } else {
        // Cas où l'auth existe mais pas l'entrée famille (rare)
        setUser({ email, familyName: "Ma Famille", isAuthenticated: true });
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. ACTIONS AUTH ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsLoading(true);

    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        // Créer la famille dans la foulée
        await createFamily(authEmail, authFamilyName || "Ma Famille");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setChildren([]);
    setAgenda([]);
    setNotes([]);
  };

  // --- 3. SYNCHRONISATION DES ACTIONS (OPTIMISTE) ---
  const handleAddChildForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildData.name.trim() || !familyId) return;

    const newChild: Partial<Child> = {
      ...newChildData,
      score: 0,
      dailyChallenges: [],
      personalGoals: [],
      screenTimeLimit: 60,
      screenTimeRemaining: 3600,
      isTimerRunning: false,
    };

    // Optimiste
    const tempId = crypto.randomUUID();
    const optimisticChild = { ...newChild, id: tempId } as Child;
    setChildren([...children, optimisticChild]);
    setIsNewChildOpen(false);

    // Cloud
    if (supabase) {
      const { data, error } = await supabase.from('children').insert([{ ...newChild, family_id: familyId }]).select().single();
      if (!error) {
        setChildren(prev => prev.map(c => c.id === tempId ? data : c));
      }
    }
  };

  const handlePointAction = async (childId: string, points: number, reason: string) => {
    const child = children.find(c => c.id === childId);
    if (!child) return;

    const newScore = Math.max(0, child.score + points);
    
    // Optimiste
    setChildren(children.map(c => c.id === childId ? { ...c, score: newScore } : c));

    // Cloud
    if (supabase) {
      await supabase.from('children').update({ score: newScore }).eq('id', childId);
      await supabase.from('point_history').insert([{ 
        child_id: childId, 
        type: points >= 0 ? 'positive' : 'negative', 
        reason, 
        points 
      }]);
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteData.text || !familyId) return;

    const newNote = { ...newNoteData, isPinned: false, isArchived: false, family_id: familyId };
    
    // Optimiste
    const tempId = crypto.randomUUID();
    setNotes([{ ...newNote, id: tempId, date: Date.now() } as any, ...notes]);
    setIsAddNoteOpen(false);

    // Cloud
    if (supabase) {
      const { data, error } = await supabase.from('sticky_notes').insert([newNote]).select().single();
      if (!error) setNotes(prev => prev.map(n => n.id === tempId ? data : n));
    }
  };

  // --- RENDU ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Chargement de la session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <div className="inline-block p-4 bg-indigo-50 text-indigo-600 rounded-[2rem] mb-2 animate-bounce">
              <Sparkles size={32} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">
              {authMode === 'login' ? 'Bon retour !' : 'Bienvenue !'}
            </h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {authMode === 'login' ? 'Votre tableau de bord vous attend' : 'Créez votre espace famille'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 px-2">Email</label>
                <input required type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none" placeholder="famille@exemple.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 px-2">Mot de passe</label>
                <input required type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none" placeholder="••••••••" />
              </div>
              {authMode === 'register' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-2">Nom de la famille</label>
                  <input required type="text" value={authFamilyName} onChange={e => setAuthFamilyName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none" placeholder="Les Martin" />
                </div>
              )}
            </div>
            <button type="submit" className="w-full dynamic-primary-bg text-white py-5 rounded-[2rem] font-black uppercase shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
              {authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">
              {authMode === 'login' ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 transition-all duration-700" style={{ backgroundColor: config.theme.backgroundColor }}>
      <header className="glass-panel sticky top-0 z-40 px-6 py-5 flex items-center justify-between border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <div className="dynamic-primary-bg p-3 rounded-2xl shadow-lg text-white"><Sparkles size={24} /></div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-slate-800">{config.appName}</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{user?.familyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isCloudActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            {isCloudActive ? <><Cloud size={14}/> Cloud Sync</> : <><CloudOff size={14}/> Local Mode</>}
          </div>
          <button onClick={handleLogout} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 transition-colors">
            <LogOut size={20}/>
          </button>
        </div>
      </header>

      <main className="p-6">
        {activeView === 'board' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Le Tableau</h2>
              <button onClick={() => setIsNewChildOpen(true)} className="dynamic-primary-bg text-white px-6 py-4 rounded-[2rem] shadow-xl flex items-center gap-2 font-black uppercase text-sm active:scale-95 transition-all">
                <Plus size={20} /> Profil
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              {children.length === 0 ? (
                <div className="bg-white p-12 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-6 bg-slate-50 text-slate-300 rounded-full"><Users size={48}/></div>
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Aucun enfant n'a encore été ajouté.</p>
                  <button onClick={() => setIsNewChildOpen(true)} className="dynamic-primary-text font-black uppercase text-[10px] tracking-widest border-b-2 dynamic-primary-border">Commencer maintenant</button>
                </div>
              ) : (
                children.map(child => (
                  <ChildCard 
                    key={child.id} 
                    child={child} 
                    services={config.services} 
                    gages={config.gages}
                    onAddPoints={handlePointAction} 
                    onToggleGage={() => {}} 
                    onRemoveChild={() => {}} 
                    onSelect={setSelectedChild} 
                    onOpenGoals={() => {}} 
                    onOpenAvatarPicker={() => {}}
                    onToggleTimer={() => {}}
                    onResetTimer={() => {}}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Autres vues (Agenda, Notes, etc.) resteraient ici... */}
        {activeView === 'notes' && (
          <div className="space-y-8 pb-20">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Le Mur</h2>
              <button onClick={() => setIsAddNoteOpen(true)} className="bg-amber-400 text-white p-4 rounded-3xl shadow-lg active:scale-95 transition-all"><Plus/></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {notes.filter(n => !n.isArchived).map(note => (
                <div key={note.id} className="aspect-square p-6 rounded-[2.5rem] shadow-sm relative group animate-in zoom-in" style={{ backgroundColor: note.color }}>
                  <p className="text-xs font-black text-slate-800 leading-snug">{note.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

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

      {/* MODAL AJOUT ENFANT */}
      {isNewChildOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-[3rem] p-8 sm:p-10 space-y-10 my-8 shadow-2xl relative">
            <button onClick={() => setIsNewChildOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full"><X size={24}/></button>
            <div className="text-center space-y-2"><h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Nouveau Profil</h2></div>
            {/* Fix: use handleAddChildForm instead of handleAddChildChildForm */}
            <form onSubmit={handleAddChildForm} className="space-y-8">
              <input required type="text" value={newChildData.name} onChange={e => setNewChildData({...newChildData, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] font-black text-2xl outline-none" placeholder="Prénom de l'enfant" />
              <button type="submit" className="w-full dynamic-primary-bg text-white py-6 rounded-[2.5rem] font-black uppercase shadow-xl text-lg">Valider ✨</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOTE */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-8 space-y-8 shadow-2xl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Note Express</h2><button onClick={() => setIsAddNoteOpen(false)} className="p-2 bg-slate-100 rounded-full"><X/></button></div>
            <form onSubmit={handleAddNoteSubmit} className="space-y-6">
              <textarea required value={newNoteData.text} onChange={e => setNewNoteData({...newNoteData, text: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold min-h-[120px] outline-none" placeholder="Message important..." />
              <div className="flex flex-wrap gap-3">{NOTE_COLORS.map(c => <button key={c} type="button" onClick={() => setNewNoteData({...newNoteData, color: c})} className={`w-10 h-10 rounded-full border-4 ${newNoteData.color === c ? 'border-indigo-500' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
              <button type="submit" className="w-full dynamic-primary-bg text-white py-5 rounded-[2rem] font-black uppercase shadow-lg">Épingler</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
