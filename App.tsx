
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
  Dumbbell, TargetIcon, Smile, TrendingUp, TrendingDown, Eye, EyeOff, ThumbsUp, ThumbsDown, Cloud, CloudOff, Loader2,
  Shield, WifiOff
} from 'lucide-react';
import { Child, AppConfig, AgendaEntry, StickyNote, UserAccount } from './types';
import { ChildCard } from './components/ChildCard';
import { supabase, fetchFamilyData, createFamily } from './services/supabaseClient';

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
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authFamilyName, setAuthFamilyName] = useState("");
  const [authError, setAuthError] = useState("");
  const [familyId, setFamilyId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // --- APP STATE ---
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [children, setChildren] = useState<Child[]>([]);
  const [agenda, setAgenda] = useState<AgendaEntry[]>([]);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [activeView, setActiveView] = useState<'board' | 'agenda' | 'notes' | 'parents' | 'admin'>('board');
  
  // Modals
  const [isNewChildOpen, setIsNewChildOpen] = useState(false);
  const [newChildData, setNewChildData] = useState({ 
    name: '', age: 6, passion: '', favoriteAnimal: '', dreamJob: '', avatar: PREDEFINED_AVATARS[0], cardBackground: ''
  });
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNoteData, setNewNoteData] = useState({ text: '', color: NOTE_COLORS[0] });

  // --- INITIALISATION ---
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

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
        setIsCloudActive(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePostLogin = async (email: string) => {
    setIsLoading(true);
    setAuthError("");
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
        // Utilisateur sans famille créée (bug ou inscription interrompue)
        setUser({ email, familyName: "Configuration requise", isAuthenticated: true });
        setIsCloudActive(false);
      }
    } catch (err: any) {
      setAuthError(`Erreur Sync: ${err.message}`);
      setIsCloudActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACTIONS AUTH ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!supabase) {
      setAuthError("Configuration Supabase manquante. Vérifiez vos variables d'environnement.");
      return;
    }

    if (authMode === 'register') {
      if (authPassword !== authConfirmPassword) {
        setAuthError("Les mots de passe ne correspondent pas.");
        return;
      }
      if (authPassword.length < 6) {
        setAuthError("Le mot de passe doit faire au moins 6 caractères.");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (authMode === 'register') {
        const { error: signUpError } = await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPassword,
          options: { data: { family_name: authFamilyName } }
        });
        if (signUpError) throw signUpError;
        
        // Créer l'entrée famille immédiatement
        await createFamily(authEmail, authFamilyName || "Ma Famille");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: authEmail, 
          password: authPassword 
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Bouton de secours si la famille n'a pas été créée
  const handleManualFamilyCreation = async () => {
    if (!user?.email || !authFamilyName) return;
    setIsLoading(true);
    try {
      await createFamily(user.email, authFamilyName);
      await handlePostLogin(user.email);
    } catch (err: any) {
      setAuthError(`Échec de l'initialisation: ${err.message}`);
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
    setFamilyId(null);
  };

  const handleAddChildForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildData.name.trim() || !familyId) return;

    const newChild = {
      ...newChildData,
      score: 0,
      dailyChallenges: [],
      personalGoals: [],
      screenTimeLimit: 60,
      screenTimeRemaining: 3600,
      isTimerRunning: false,
    };

    const tempId = crypto.randomUUID();
    setChildren(prev => [...prev, { ...newChild, id: tempId } as Child]);
    setIsNewChildOpen(false);

    if (supabase) {
      const { data, error } = await supabase.from('children').insert([{ ...newChild, family_id: familyId }]).select().single();
      if (!error) {
        setChildren(prev => prev.map(c => c.id === tempId ? data : c));
      } else {
        setAuthError(`Erreur Cloud: ${error.message}`);
      }
    }
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
      } catch (err) {
        console.error("Failed to sync points:", err);
      }
    }
  };

  // --- RENDU ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Connexion sécurisée...</p>
      </div>
    );
  }

  // Écran de configuration de secours (si auth OK mais pas de famille)
  if (user && !familyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl space-y-8">
           <div className="text-center space-y-4">
             <div className="inline-block p-4 bg-amber-50 text-amber-500 rounded-full animate-bounce"><AlertCircle size={32}/></div>
             <h2 className="text-2xl font-black uppercase text-slate-800">Presque prêt !</h2>
             <p className="text-xs font-bold text-slate-400 uppercase">Nous devons initialiser votre espace famille.</p>
           </div>
           <div className="space-y-4">
             <input type="text" value={authFamilyName} onChange={e => setAuthFamilyName(e.target.value)} placeholder="Nom de votre famille" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-100" />
             <button onClick={handleManualFamilyCreation} className="w-full dynamic-primary-bg text-white py-5 rounded-2xl font-black uppercase shadow-lg">Créer l'espace</button>
             <button onClick={handleLogout} className="w-full text-xs font-black uppercase text-slate-400 py-2">Déconnexion</button>
           </div>
           {authError && <p className="text-[10px] text-rose-500 font-bold uppercase text-center">{authError}</p>}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        {/* Diagnostic connection */}
        {!supabase && (
          <div className="fixed top-6 left-6 right-6 z-[100] p-4 bg-rose-500 text-white rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
            <WifiOff size={24}/>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Alerte Développeur</p>
              <p className="text-xs font-bold">Supabase n'est pas configuré. Vérifiez vos clés d'API.</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-md bg-white rounded-[3.5rem] p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in duration-700 border border-slate-100 relative">
          <div className="text-center space-y-4">
            <div className="inline-block p-5 bg-indigo-50 text-indigo-600 rounded-[2.5rem] mb-2 shadow-inner">
              <Sparkles size={40} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Bienvenue</h2>
              <p className="text-sm font-bold text-indigo-500/80 uppercase tracking-widest">Votre Familyteam vous attend</p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {authError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 overflow-hidden">
                <AlertCircle size={18} className="text-rose-500 flex-shrink-0" />
                <p className="text-[11px] font-black uppercase text-rose-600 tracking-tight leading-tight break-words">{authError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 px-3">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="votre@email.com" />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-3">Nom de famille</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input required type="text" value={authFamilyName} onChange={e => setAuthFamilyName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="Ex: Les Martin" />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 px-3">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="••••••••" />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="space-y-1 animate-in fade-in slide-in-from-right-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-3">Confirmer mot de passe</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input required type="password" value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="••••••••" />
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={!supabase} className={`w-full py-5 rounded-[2rem] font-black uppercase shadow-xl transition-all flex items-center justify-center gap-3 ${supabase ? 'dynamic-primary-bg text-white hover:scale-[1.02] active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              {authMode === 'login' ? <LogIn size={20}/> : <UserPlus size={20}/>}
              {authMode === 'login' ? 'Ouvrir le tableau' : 'Créer ma Familyteam'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(""); }} className="text-[11px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors border-b-2 border-indigo-100">
              {authMode === 'login' ? "Nouveau ici ? Créer un compte famille" : "Déjà membre ? Se connecter"}
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
           <a href="#" className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 tracking-widest transition-colors flex items-center gap-1.5">
             <Shield size={10}/> Conditions Générales de Vente (CGV)
           </a>
           <p className="text-[8px] font-bold text-slate-300 uppercase">© 2024 Family Board Pro</p>
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
            {isCloudActive ? <><Cloud size={14}/> Cloud Sync</> : <><CloudOff size={14}/> Offline Mode</>}
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
                <div className="bg-white p-12 rounded-[3.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
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
                    onSelect={() => {}} 
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
          <div className="w-full max-w-2xl bg-white rounded-[3.5rem] p-8 sm:p-10 space-y-10 my-8 shadow-2xl relative">
            <button onClick={() => setIsNewChildOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full"><X size={24}/></button>
            <div className="text-center space-y-2"><h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Nouveau Profil</h2></div>
            <form onSubmit={handleAddChildForm} className="space-y-8">
              <input required type="text" value={newChildData.name} onChange={e => setNewChildData({...newChildData, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] font-black text-2xl outline-none border-2 border-transparent focus:border-indigo-100 transition-all" placeholder="Prénom de l'enfant" />
              <button type="submit" className="w-full dynamic-primary-bg text-white py-6 rounded-[2.5rem] font-black uppercase shadow-xl text-lg">Valider ✨</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
