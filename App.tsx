
import React, { useState, useEffect } from 'react';
import { 
  Plus, Sparkles, X, Trophy, Settings, 
  Zap, Utensils, Home, Users, Star, 
  Tv, BookOpen, Calendar as CalendarIcon, 
  Monitor, ChevronRight, Heart, LayoutDashboard, 
  Palette, AlertCircle, StickyNote as NoteIcon,
  Calendar, Mail, LogOut, Cloud, CloudOff, Loader2,
  ShieldAlert
} from 'lucide-react';
import { Child, AppConfig, AgendaEntry, StickyNote, UserAccount } from './types';
import { ChildCard } from './components/ChildCard';
import { supabase, fetchFamilyData, createFamily } from './services/supabaseClient';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

const PREDEFINED_AVATARS = [
  'https://picsum.photos/id/64/200', 'https://picsum.photos/id/65/200', 'https://picsum.photos/id/66/200',
  'https://picsum.photos/id/67/200', 'https://picsum.photos/id/69/200', 'https://picsum.photos/id/91/200',
  'https://picsum.photos/id/103/200', 'https://picsum.photos/id/177/200', 'https://picsum.photos/id/202/200',
];

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
  const [, setSession] = useState<Session | null>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFamilyName, setAuthFamilyName] = useState("");
  const [authFeedback, setAuthFeedback] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  // --- APP STATE ---
  const [config] = useState<AppConfig>(DEFAULT_CONFIG);
  const [children, setChildren] = useState<Child[]>([]);
  const [agenda] = useState<AgendaEntry[]>([]);
  const [notes] = useState<StickyNote[]>([]);
  const [activeView, setActiveView] = useState<'board' | 'agenda' | 'notes' | 'parents' | 'admin'>('board');
  
  // Modals
  const [isNewChildOpen, setIsNewChildOpen] = useState(false);
  const [newChildData, setNewChildData] = useState({ 
    name: '', age: 6, passion: '', favoriteAnimal: '', dreamJob: '', avatar: PREDEFINED_AVATARS[0], cardBackground: ''
  });

  // --- TIMER LOGIC ---
  useEffect(() => {
    const timer = setInterval(() => {
      setChildren(prev => prev.map(child => {
        if (child.isTimerRunning && child.screenTimeRemaining > 0) {
          const newTime = child.screenTimeRemaining - 1;
          return { ...child, screenTimeRemaining: newTime, isTimerRunning: newTime > 0 };
        }
        return child;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- INITIALISATION ---
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      if (session) handlePostLogin(session.user.email!);
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      if (session) handlePostLogin(session.user.email!);
      else {
        setUser(null);
        setIsLoading(false);
        setIsCloudActive(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePostLogin = async (email: string) => {
    setIsLoading(true);
    setAuthFeedback(null);
    try {
      const data = await fetchFamilyData(email);
      if (data) {
        setUser({ email, familyName: data.family.family_name, isAuthenticated: true });
        setFamilyId(data.family.id);
        setChildren(data.children.map((c: any) => ({
          ...c,
          activeGages: c.active_gages || [],
          screenTimeLimit: c.screen_time_limit || 60,
          screenTimeRemaining: c.screen_time_remaining || 3600,
          isTimerRunning: false,
          history: c.history || []
        })));
        setIsCloudActive(true);
      } else {
        setUser({ email, familyName: "Configuration requise", isAuthenticated: true });
        setIsCloudActive(false);
      }
    } catch (err: any) {
      setAuthFeedback({ message: `Erreur Sync: ${err.message}`, type: 'error' });
      setIsCloudActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    
    if (!supabase) {
      setAuthFeedback({ message: "Configuration Supabase manquante dans le fichier .env", type: 'error' });
      return;
    }

    if (authMode === 'register' && !authFamilyName.trim()) {
      setAuthFeedback({ message: "Le nom de la famille est requis", type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPassword,
        });
        
        if (signUpError) throw signUpError;
        
        // Créer la famille même si l'email n'est pas encore confirmé
        await createFamily(authEmail, authFamilyName || "Ma Famille");

        if (data.user && data.session === null) {
          setAuthFeedback({ 
            message: "✅ Compte créé ! Veuillez confirmer votre e-mail pour vous connecter.", 
            type: 'success' 
          });
          setIsLoading(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: authEmail, 
          password: authPassword 
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setAuthFeedback({ message: err.message, type: 'error' });
      setIsLoading(false);
    }
  };

  // ... (Autres handlers inchangés)

  const handleToggleTimer = (childId: string) => {
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, isTimerRunning: !c.isTimerRunning } : c));
  };

  const handleResetTimer = (childId: string) => {
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, screenTimeRemaining: c.screenTimeLimit * 60, isTimerRunning: false } : c));
  };

  const handleToggleGage = async (childId: string, gageId: string) => {
    const gage = config.gages.find(g => g.id === gageId);
    if (!gage) return;

    setChildren(prev => prev.map(c => {
      if (c.id === childId) {
        const alreadyHas = (c.activeGages || []).includes(gageId);
        const newGages = alreadyHas ? c.activeGages?.filter(id => id !== gageId) : [...(c.activeGages || []), gageId];
        const newScore = !alreadyHas && gage.points ? Math.max(0, c.score + gage.points) : c.score;
        if (supabase) supabase.from('children').update({ active_gages: newGages, score: newScore }).eq('id', childId).then();
        return { ...c, activeGages: newGages, score: newScore };
      }
      return c;
    }));
  };

  const handlePointAction = async (childId: string, points: number, reason: string) => {
    const child = children.find(c => c.id === childId);
    if (!child) return;
    const newScore = Math.max(0, child.score + points);
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, score: newScore } : c));
    
    if (supabase) {
      try {
        await supabase.from('children').update({ score: newScore }).eq('id', childId);
        await supabase.from('point_history').insert([{ child_id: childId, type: points >= 0 ? 'positive' : 'negative', reason, points }]);
      } catch (err) { console.error("Failed to sync points:", err); }
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setChildren([]);
    setFamilyId(null);
  };

  const handleAddChildForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildData.name.trim() || !familyId) return;

    const tempId = crypto.randomUUID();
    const newChild: Child = {
      id: tempId,
      name: newChildData.name,
      age: newChildData.age,
      passion: newChildData.passion,
      favoriteAnimal: newChildData.favoriteAnimal,
      dreamJob: newChildData.dreamJob,
      avatar: newChildData.avatar,
      cardBackground: newChildData.cardBackground,
      score: 0,
      history: [],
      dailyChallenges: [],
      personalGoals: [],
      screenTimeLimit: 60,
      screenTimeRemaining: 3600,
      isTimerRunning: false,
      activeGages: [],
    };

    setChildren(prev => [...prev, newChild]);
    setIsNewChildOpen(false);

    if (supabase) {
      const { data, error } = await supabase.from('children').insert([{ 
        name: newChild.name, age: newChild.age, passion: newChild.passion, favorite_animal: newChild.favoriteAnimal,
        dream_job: newChild.dreamJob, avatar: newChild.avatar, card_background: newChild.cardBackground, family_id: familyId,
        score: 0, active_gages: [], screen_time_limit: 60, screen_time_remaining: 3600
      }]).select().single();
      if (!error) setChildren(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c));
    }
  };

  if (isLoading && !authFeedback) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[3.5rem] p-10 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 dynamic-primary-bg opacity-20"></div>
          
          <div className="text-center space-y-4">
            <div className="inline-block p-5 bg-indigo-50 text-indigo-600 rounded-[2.5rem] mb-2 shadow-inner">
              <Sparkles size={40} className="animate-pulse" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Family Board</h2>
          </div>

          {!supabase && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3">
              <ShieldAlert className="text-rose-500 shrink-0" size={20} />
              <p className="text-[10px] font-bold text-rose-700 uppercase">Config Supabase manquante. Vérifiez votre fichier .env</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {authFeedback && (
              <div className={`p-4 rounded-2xl text-[11px] font-black uppercase text-center border animate-in fade-in zoom-in ${authFeedback.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                {authFeedback.message}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="E-mail" />
              </div>

              {authMode === 'register' && (
                <div className="relative animate-in slide-in-from-top-2">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="text" value={authFamilyName} onChange={e => setAuthFamilyName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="Nom de votre famille" />
                </div>
              )}

              <div className="relative">
                <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="Mot de passe" />
              </div>
            </div>

            <button type="submit" disabled={!supabase} className="w-full py-5 rounded-[2rem] font-black uppercase shadow-xl dynamic-primary-bg text-white hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">
              {authMode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <div className="text-center">
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthFeedback(null); }} className="text-[11px] font-black uppercase text-indigo-600 border-b-2 border-indigo-100 hover:text-indigo-800 transition-colors">
              {authMode === 'login' ? "Nouveau ici ? S'inscrire" : "Déjà un compte ? Connexion"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ... (Rendu principal inchangé)
  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: config.theme.backgroundColor }}>
      <header className="glass-panel sticky top-0 z-40 px-6 py-5 flex items-center justify-between border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <div className="dynamic-primary-bg p-3 rounded-2xl shadow-lg text-white"><Sparkles size={24} /></div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-slate-800">{config.appName}</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{user?.familyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isCloudActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            {isCloudActive ? <Cloud size={14}/> : <CloudOff size={14}/>} {isCloudActive ? 'Cloud' : 'Offline'}
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
                <Plus size={20} /> Enfant
              </button>
            </div>
            <div className="grid grid-cols-1 gap-8">
              {children.length === 0 ? (
                <div className="bg-white p-12 rounded-[3.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-6 bg-slate-50 text-slate-300 rounded-full"><Users size={48}/></div>
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Aucun enfant ajouté.</p>
                </div>
              ) : (
                children.map(child => (
                  <ChildCard key={child.id} child={child} services={config.services} gages={config.gages} onAddPoints={handlePointAction} onToggleGage={handleToggleGage} onRemoveChild={() => {}} onSelect={() => {}} onOpenGoals={() => {}} onOpenAvatarPicker={() => {}} onToggleTimer={handleToggleTimer} onResetTimer={handleResetTimer} />
                ))
              )}
            </div>
          </div>
        )}
        {activeView === 'agenda' && (
           <div className="space-y-6">
             <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">L'Agenda</h2>
             <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 min-h-[400px] flex flex-col items-center justify-center gap-4">
                <CalendarIcon size={48} className="text-slate-200" />
                <p className="text-xs font-black uppercase text-slate-400">Aucun événement cette semaine</p>
                <button className="dynamic-primary-bg text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">+ Ajouter</button>
             </div>
           </div>
        )}
        {activeView === 'notes' && (
           <div className="space-y-6">
             <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Notes & Rappels</h2>
             <div className="grid grid-cols-2 gap-4">
                {notes.length === 0 ? (
                  <div className="col-span-2 bg-amber-50 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-amber-200">
                    <NoteIcon size={40} className="text-amber-300" />
                    <p className="text-[10px] font-black uppercase text-amber-500">Zéro Post-it !</p>
                  </div>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="p-6 rounded-3xl shadow-sm rotate-1 flex flex-col justify-between min-h-[150px]" style={{ backgroundColor: note.color }}>
                      <p className="font-bold text-slate-800">{note.text}</p>
                      <span className="text-[8px] font-black uppercase text-slate-400">{new Date(note.date).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
             </div>
           </div>
        )}
        {activeView === 'parents' && (
          <div className="space-y-6">
             <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Le Coaching</h2>
             <div className="grid grid-cols-1 gap-4">
                {[
                  { title: "Gérer les écrans", icon: Monitor, color: "bg-blue-50 text-blue-600" },
                  { title: "Motivation & Points", icon: Star, color: "bg-amber-50 text-amber-600" },
                  { title: "Routine du soir", icon: Zap, color: "bg-purple-50 text-purple-600" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 shadow-sm">
                    <div className={`p-4 rounded-2xl ${item.color}`}><item.icon size={24}/></div>
                    <div className="flex-1">
                       <h3 className="font-black uppercase text-sm text-slate-800">{item.title}</h3>
                       <p className="text-[10px] font-bold text-slate-400">Lire les conseils d'expert</p>
                    </div>
                    <ChevronRight className="text-slate-300" size={20} />
                  </div>
                ))}
             </div>
          </div>
        )}
        {activeView === 'admin' && (
          <div className="space-y-6">
             <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Réglages</h2>
             <div className="bg-white rounded-[3rem] p-8 space-y-8 shadow-xl">
                <div className="space-y-4">
                   <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Compte</h3>
                   <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                      <div className="p-3 bg-white rounded-xl shadow-sm"><Mail size={18} className="text-slate-400"/></div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-800 uppercase">{user.email}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Administrateur</p>
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                   <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Interface</h3>
                   <button className="w-full flex justify-between items-center p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4">
                         <Palette size={18} className="text-indigo-500" />
                         <span className="text-[10px] font-black uppercase text-slate-700">Couleur du thème</span>
                      </div>
                      <div className="w-6 h-6 rounded-full dynamic-primary-bg"></div>
                   </button>
                </div>
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
      {isNewChildOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-[3.5rem] p-10 space-y-8 relative shadow-2xl">
            <button onClick={() => setIsNewChildOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full"><X size={24}/></button>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 text-center">Nouveau Profil</h2>
            <form onSubmit={handleAddChildForm} className="space-y-6">
              <input required type="text" value={newChildData.name} onChange={e => setNewChildData({...newChildData, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-100" placeholder="Prénom" />
              <button type="submit" className="w-full dynamic-primary-bg text-white py-5 rounded-[2rem] font-black uppercase shadow-xl">Valider ✨</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
