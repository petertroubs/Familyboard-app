
import React, { useState } from 'react';
import { Child, ConfigService, ConfigGage } from '../types';
import { 
  Star, TrendingUp, TrendingDown, Utensils, Home, 
  Zap, Play, Pause, Monitor, AlertCircle, ChevronRight, 
  Plus, History, RefreshCcw, Bell
} from 'lucide-react';

const IconMap: Record<string, any> = {
  Utensils, Home, Zap
};

interface ChildCardProps {
  child: Child;
  services: ConfigService[];
  gages: ConfigGage[];
  onAddPoints: (childId: string, points: number, reason: string) => void;
  onToggleGage: (childId: string, gageId: string) => void;
  onRemoveChild: (childId: string) => void;
  onSelect: (child: Child) => void;
  onOpenGoals: (child: Child) => void;
  onOpenAvatarPicker: (child: Child) => void;
  onToggleTimer: (childId: string) => void;
  onResetTimer: (childId: string) => void;
}

export const ChildCard: React.FC<ChildCardProps> = ({ 
  child, services, gages, onAddPoints, onToggleGage, onSelect, onToggleTimer, onResetTimer
}) => {
  const [showQuickGages, setShowQuickGages] = useState(false);
  
  const minutes = Math.floor(child.screenTimeRemaining / 60);
  const seconds = child.screenTimeRemaining % 60;
  const limitInSeconds = (child.screenTimeLimit || 60) * 60;
  const timeProgress = (child.screenTimeRemaining / limitInSeconds) * 100;

  return (
    <div className={`rounded-[3rem] p-8 shadow-xl shadow-slate-200/50 border group transition-all bg-white ${child.isTimerRunning ? 'ring-4 ring-indigo-100' : 'border-slate-100'}`}>
      
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6 cursor-pointer" onClick={() => onSelect(child)}>
          <div className="relative group/avatar">
            <img src={child.avatar} className="w-20 h-20 rounded-[2.2rem] object-cover shadow-2xl ring-4 ring-white transition-transform group-hover/avatar:scale-105" />
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white p-1.5 rounded-xl border-4 border-white"><Star size={14} fill="currentColor" /></div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{child.name}</h3>
            <div className="flex items-center gap-2">
              <div className="dynamic-primary-text font-black text-2xl tracking-tighter">{child.score}</div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Points</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
           {child.activeGages?.map(gid => {
             const g = gages.find(x => x.id === gid);
             return g ? (
               <div key={gid} className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[8px] font-black uppercase flex items-center gap-1 border border-rose-100 animate-in fade-in slide-in-from-right-2">
                 <AlertCircle size={10}/> {g.label}
               </div>
             ) : null;
           })}
        </div>
      </div>

      {/* Screen Time Component */}
      <div className={`bg-slate-50 p-6 rounded-[2.5rem] mb-8 border border-white space-y-4 transition-colors ${child.isTimerRunning ? 'bg-indigo-50/50' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-xl shadow-sm ${child.isTimerRunning ? 'bg-indigo-500 text-white animate-pulse' : 'bg-white text-slate-400'}`}>
                <Monitor size={18} />
             </div>
             <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Temps d'écran</span>
          </div>
          <div className={`font-mono font-black text-lg ${child.screenTimeRemaining === 0 ? 'text-rose-500 animate-pulse' : 'text-slate-700'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
        
        <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
           <div className={`h-full transition-all duration-1000 rounded-full ${timeProgress < 15 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, timeProgress)}%` }} />
        </div>

        <div className="flex gap-3">
          <button onClick={() => onToggleTimer(child.id)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 ${child.isTimerRunning ? 'bg-amber-400 text-white shadow-amber-100' : 'bg-emerald-500 text-white shadow-emerald-100'}`}>
            {child.isTimerRunning ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
            {child.isTimerRunning ? 'Pause' : 'Commencer'}
          </button>
          <button onClick={() => onResetTimer(child.id)} className="p-4 bg-white text-slate-400 rounded-2xl border border-slate-100 shadow-sm active:rotate-180 transition-all"><RefreshCcw size={18}/></button>
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => onAddPoints(child.id, 1, 'Action Positive')} className="flex items-center justify-center gap-3 py-6 bg-emerald-50 text-emerald-600 rounded-[2rem] border-2 border-emerald-100/50 font-black uppercase text-xs shadow-md shadow-emerald-50 active:scale-95 transition-all">
            <Plus size={20}/> Bravo
          </button>
          <button onClick={() => setShowQuickGages(!showQuickGages)} className={`flex items-center justify-center gap-3 py-6 rounded-[2rem] font-black uppercase text-xs shadow-md active:scale-95 transition-all ${showQuickGages ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-rose-50 text-rose-600 border-2 border-rose-100/50 shadow-rose-50'}`}>
            <AlertCircle size={20}/> Gages
          </button>
        </div>

        {showQuickGages && (
          <div className="p-4 bg-slate-50 rounded-[2rem] grid grid-cols-1 gap-2 animate-in slide-in-from-top-4 duration-300">
             {gages.map(g => {
               const isActive = child.activeGages?.includes(g.id);
               return (
                 <button key={g.id} onClick={() => { onToggleGage(child.id, g.id); }} className={`w-full text-left p-4 rounded-2xl border transition-all text-[10px] font-black uppercase flex justify-between items-center group ${isActive ? 'bg-rose-500 border-rose-600 text-white' : 'bg-white border-slate-100 text-slate-500'}`}>
                   {g.label}
                   <span className={isActive ? 'text-white' : 'text-rose-400'}>{g.points} pts</span>
                 </button>
               );
             })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 pt-2">
           {services.slice(0, 3).map(s => {
             const Icon = IconMap[s.iconName] || Zap;
             return (
               <button key={s.id} onClick={() => onAddPoints(child.id, s.points, s.name)} className="flex flex-col items-center justify-center p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all">
                 <Icon size={20} className="dynamic-primary-text mb-2" />
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">{s.name}</span>
                 <span className="text-[10px] font-black dynamic-primary-text mt-1">+{s.points}</span>
               </button>
             );
           })}
        </div>
      </div>
    </div>
  );
};
