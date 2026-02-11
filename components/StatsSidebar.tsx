
import React from 'react';
import { DailyStats } from '../types';

interface Props {
  stats: DailyStats;
}

const StatsSidebar: React.FC<Props> = ({ stats }) => {
  const goalMinutes = 30;
  const progress = Math.min(100, (stats.minutesSpoken / goalMinutes) * 100);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="glass-morphism rounded-[2.5rem] p-8 border border-white/5 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Goal Center</h3>
          <span className="text-xl">🎯</span>
        </div>
        
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
               <span className="text-[15px] font-bold text-slate-200">Speaking Duration</span>
               <span className="text-[11px] text-indigo-400 font-mono font-black">{stats.minutesSpoken}/{goalMinutes}m</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-[2px] border border-white/5 shadow-inner">
               <div 
                 className={`h-full transition-all duration-1000 rounded-full ${progress >= 100 ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)]'}`} 
                 style={{ width: `${progress}%` }}
               ></div>
            </div>
            {progress >= 100 && (
              <div className="flex items-center gap-2 mt-3 animate-bounce">
                <span className="text-[10px] text-green-400 font-black uppercase tracking-widest">Goal Reached!</span>
                <span>🏆</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
           <div className="text-[10px] text-slate-500 uppercase font-black text-center mb-6 tracking-[0.2em]">Pending Assignment</div>
           {stats.homeworkAssigned ? (
             <div className={`p-5 rounded-3xl border transition-all duration-500 ${stats.homeworkCompleted ? 'bg-green-500/10 border-green-500/30 opacity-60 grayscale-[0.5]' : 'bg-indigo-500/10 border-indigo-500/30 shadow-xl shadow-indigo-500/5'}`}>
               <p className="text-[13px] text-slate-300 italic mb-4 leading-relaxed font-medium">"{stats.homeworkAssigned}"</p>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 rounded-full ${stats.homeworkCompleted ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></div>
                   <span className={`text-[10px] font-black uppercase tracking-widest ${stats.homeworkCompleted ? 'text-green-500' : 'text-amber-500'}`}>
                     {stats.homeworkCompleted ? 'Completed' : 'To Be Submitted'}
                   </span>
                 </div>
                 {stats.homeworkCompleted && <span className="text-lg">✅</span>}
               </div>
             </div>
           ) : (
             <div className="text-center py-10 px-4 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700/50">
               <div className="text-3xl mb-3 opacity-30">📜</div>
               <p className="text-[12px] text-slate-600 italic font-medium">
                 Hit your 30m goal to unlock today's challenge
               </p>
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 glass-morphism rounded-[2.5rem] p-8 border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-slate-900 transition-colors">
         <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl group-hover:scale-110 transition-transform duration-500">
           <span className="text-3xl animate-pulse">🔥</span>
         </div>
         <h4 className="text-3xl font-black tracking-tight text-white">1 Day</h4>
         <p className="text-[11px] text-slate-500 uppercase tracking-[0.4em] mt-3 font-bold">Current Streak</p>
      </div>
    </div>
  );
};

export default StatsSidebar;
