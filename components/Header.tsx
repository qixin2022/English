
import React from 'react';

interface Props {
  onClearHistory: () => void;
}

const Header: React.FC<Props> = ({ onClearHistory }) => {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          LinguistAI
        </h1>
      </div>
      
      <nav className="flex items-center gap-4">
        <button 
          onClick={onClearHistory}
          className="text-[10px] text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors"
        >
          Clear History
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-medium">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          AI Tutor Online
        </div>
      </nav>
    </header>
  );
};

export default Header;
