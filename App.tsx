
import React, { useState, useEffect } from 'react';
import { 
  Plus, Sparkles, X, Trophy, Settings, 
  Zap, Utensils, Home, Users, Star, 
  Tv, BookOpen, Calendar as CalendarIcon, 
  Monitor, ChevronRight, Heart, LayoutDashboard, 
  Palette, AlertCircle, StickyNote as NoteIcon,
  Calendar, Mail, LogOut, Cloud, CloudOff, Loader2,
  ShieldAlert, CheckCircle2, ArrowRight, ShieldCheck, Lock,
  LogIn
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
  appName: "Family Team",
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

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const App: React.FC = () => {
  // --- AUTH & CLOUD STATE ---
  const [user, setUser] = useState<UserAccount | null>(null);
  const [, setSession] = useState<Session | null>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authFamilyName, setAuthFamilyName] = useState("");
  const [authFeedback, setAuthFeedback] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isGdprOpen, setIsGdprOpen] = useState(false);
  const [showSetupFamily, setShowSetupFamily] = useState(false);

  // --- APP STATE ---
  const [config] = useState<AppConfig>(DEFAULT_CONFIG);
  const [children, setChildren] = useState<Child[]>([]);
  const [agenda] = useState<AgendaEntry[]>([]);
  const [notes] = useState<StickyNote[]>([]);
  const [activeView, setActiveView] = useState<'board' | 'agenda' | 'notes' | 'parents' | 'admin'>('board');
  
  const [isNewChildOpen, setIsNewChildOpen] = useState(false);
  const [newChildData, setNewChildData] = useState({ 
    name: '', age: 6, passion: '', favoriteAnimal: '', dreamJob: '', avatar: PREDEFINED_AVATARS[0], cardBackground: ''
  });

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
        setShowSetupFamily(false);
      } else {
        // Utilisateur connecté mais pas de famille (typiquement OAuth Google première fois)
        setUser({ email, familyName: "Configuration en cours", isAuthenticated: true });
        setIsCloudActive(false);
        setShowSetupFamily(true);
      }
    } catch (err: any) {
      setAuthFeedback({ message: `Erreur Sync: ${err.message}`, type: 'error' });
      setIsCloudActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      setAuthFeedback({ message: error.message, type: 'error' });
      setIsLoading(false);
    }
  };

  const handleFinalizeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authFamilyName.trim() || !user) return;
    setIsLoading(true);
    try {
      await createFamily(user.email, authFamilyName);
      await handlePostLogin(user.email);
    } catch (err: any) {
      setAuthFeedback({ message: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    
    if (!supabase) {
      setAuthFeedback({ message: "Erreur : La connexion avec Supabase n'est pas configurée.", type: 'error' });
      return;
    }

    if (authMode === 'register' && authPassword !== authConfirmPassword) {
      setAuthFeedback({ message: "Les mots de passe ne correspondent pas.", type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'register') {
        if (!authFamilyName.trim()) throw new Error("Veuillez donner un nom à votre équipe familiale.");
        
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPassword,
        });
        
        if (signUpError) throw signUpError;
        
        try {
          await createFamily(authEmail, authFamilyName);
        } catch (createErr) {
          console.warn("La table families est inaccessible.", createErr);
        }

        if (data.user && data.session === null) {
          setAuthFeedback({ 
            message: "📧 Super ! Votre équipe est prête. Vérifiez vos e-mails pour valider.", 
            type: 'success' 
          });
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
    } finally {
      setIsLoading(false);
    }
  };

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
    setAuthFeedback(null);
    setShowSetupFamily(false);
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

  // --- VIEW: SETUP FAMILY (For first time Google Login) ---
  if (showSetupFamily) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[3.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
           <div className="text-center space-y-4">
              <div className="inline-block p-5 bg-emerald-50 text-emerald-600 rounded-[2.5rem] mb-2">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Bienvenue !</h2>
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Finalisez votre inscription</p>
           </div>
           <form onSubmit={handleFinalizeSetup} className="space-y-6">
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="text" value={authFamilyName} onChange={e => setAuthFamilyName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="Nom de votre famille" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-5 rounded-[2rem] font-black uppercase shadow-xl dynamic-primary-bg text-white hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Démarrer l\'aventure ✨'}
              </button>
           </form>
           <button onClick={handleLogout} className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors">Annuler</button>
        </div>
      </div>
    );
  }

  // --- VIEW: AUTHENTICATION ---
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[3.5rem] p-10 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 dynamic-primary-bg opacity-20"></div>
          
          <div className="text-center space-y-4">
            <div className="inline-block p-5 bg-indigo-50 text-indigo-600 rounded-[2.5rem] mb-2 shadow-inner">
              <Sparkles size={40} className="animate-pulse" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Family Team</h2>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Votre projet de famille commence ici</p>
          </div>

          <div className="space-y-4">
            {/* Bouton Google OAuth */}
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm font-black uppercase text-[11px] text-slate-600 tracking-tight"
            >
              <GoogleIcon />
              Continuer avec Google
            </button>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">OU</span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authFeedback && (
                <div className={`p-4 rounded-2xl text-[11px] font-black uppercase text-center border animate-in fade-in zoom-in flex items-center justify-center gap-2 ${authFeedback.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                  {authFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {authFeedback.message}
                </div>
              )}

              <div className="space-y-4">
                {authMode === 'register' && (
                  <div className="relative animate-in slide-in-from-top-2">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input required type="text" value={authFamilyName} onChange={e => setAuthFamilyName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="Nom de votre famille" />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="E-mail" />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input required type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="Mot de passe" />
                </div>

                {authMode === 'register' && (
                  <div className="relative animate-in slide-in-from-top-2">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input required type="password" value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="Confirmer le mot de passe" />
                  </div>
                )}
              </div>

              <button type="submit" disabled={isLoading} className="w-full py-5 rounded-[2rem] font-black uppercase shadow-xl dynamic-primary-bg text-white hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'register' ? 'Créer mon équipe ✨' : 'Me connecter')}
              </button>
            </form>
          </div>

          <div className="text-center pt-2 space-y-4">
            <button 
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthFeedback(null); }} 
              className="text-[11px] font-black uppercase text-indigo-600 border-b-2 border-indigo-100 hover:text-indigo-800 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              {authMode === 'login' ? (
                <>Pas encore de compte ? Inscription <ArrowRight size={14}/></>
              ) : (
                <>Déjà membre ? Connexion <ArrowRight size={14}/></>
              )}
            </button>

            <button 
              onClick={() => setIsGdprOpen(true)}
              className="text-[9px] font-black uppercase text-slate-300 hover:text-slate-500 transition-colors flex items-center justify-center gap-1.5 mx-auto pt-2"
            >
              <ShieldCheck size={12}/> Règles RGPD & Confidentialité
            </button>
          </div>
        </div>

        {/* Modal RGPD */}
        {isGdprOpen && (
          <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-white rounded-[3.5rem] p-10 space-y-8 relative shadow-2xl animate-in zoom-in duration-300">
              <button onClick={() => setIsGdprOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                <X size={24}/>
              </button>
              
              <div className="flex items-center gap-4 text-indigo-600">
                <div className="p-4 bg-indigo-50 rounded-3xl"><ShieldCheck size={32}/></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Confidentialité</h2>
              </div>

              <div className="space-y-6 text-slate-600 leading-relaxed font-medium">
                <p>
                  Chez <strong className="text-indigo-600 uppercase font-black">Family Team</strong>, la protection de votre foyer est notre priorité. Voici nos engagements :
                </p>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-2 h-2 mt-2 bg-emerald-500 rounded-full shrink-0"></div>
                    <p className="text-sm"><span className="font-bold text-slate-800">Pas d'analyse :</span> Vos données (prénoms, scores, notes) ne font l'objet d'aucune analyse comportementale ou publicitaire.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 mt-2 bg-emerald-500 rounded-full shrink-0"></div>
                    <p className="text-sm"><span className="font-bold text-slate-800">Aucun transfert :</span> Nous ne vendons et ne transférons aucune information à des tiers.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 mt-2 bg-emerald-500 rounded-full shrink-0"></div>
                    <p className="text-sm"><span className="font-bold text-slate-800">Utilité technique :</span> Vos informations sont stockées uniquement pour permettre le fonctionnement de l'application et la synchronisation entre vos appareils familiaux.</p>
                  </div>
                </div>

                <p className="text-[11px] bg-slate-50 p-4 rounded-2xl italic">
                  Toutes les données sont chiffrées et sécurisées via notre infrastructure Supabase. Vous restez maître de vos informations à tout moment.
                </p>
              </div>

              <button 
                onClick={() => setIsGdprOpen(false)} 
                className="w-full py-5 rounded-[2rem] font-black uppercase shadow-xl dynamic-primary-bg text-white hover:scale-[1.02] active:scale-95 transition-all"
              >
                J'ai compris ✨
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW: DASHBOARD ---
  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: config.theme.backgroundColor }}>
      <header className="glass-panel sticky top-0 z-40 px-6 py-5 flex items-center justify-between border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <div className="dynamic-primary-bg p-3 rounded-2xl shadow-lg text-white"><Sparkles size={24} /></div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-slate-800">Family Team</h1>
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
