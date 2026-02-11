
import React from 'react';

interface Props {
  onStart: () => void;
}

const WelcomeOverlay: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-6">
      <div className="max-w-xl w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20"></div>
          <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mx-auto relative z-10">
            <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            Ready to Speak <br/> 
            <span className="text-indigo-500">Fluent English?</span>
          </h2>
          <p className="text-lg text-slate-400">
            LinguistAI is your dedicated 24/7 speaking companion. 
            Improve your conversation, catch your mistakes, and build a massive vocabulary through voice.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <button 
            onClick={onStart}
            className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95"
          >
            Start Now
          </button>
          <div className="text-slate-500 text-sm">
            Press to start voice session. No typing required.
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-800">
          <div>
            <div className="text-indigo-400 font-bold">Real-time</div>
            <p className="text-[10px] text-slate-500 uppercase">Live Voice Feedback</p>
          </div>
          <div>
            <div className="text-emerald-400 font-bold">Auto-Correct</div>
            <p className="text-[10px] text-slate-500 uppercase">Grammar Checking</p>
          </div>
          <div>
            <div className="text-amber-400 font-bold">Smart Vocab</div>
            <p className="text-[10px] text-slate-500 uppercase">Contextual Learning</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeOverlay;
