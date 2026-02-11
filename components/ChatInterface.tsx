
import React, { useState, useEffect } from 'react';
import { AppStatus, TranscriptItem } from '../types';
import { decode, decodeAudioData } from '../services/audioUtils';

interface Props {
  status: AppStatus;
  transcript: TranscriptItem[];
  currentInput: string;
  currentOutput: string;
  onStart: () => void;
  onStop: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const ChatInterface: React.FC<Props> = ({ 
  status, transcript, currentInput, currentOutput, onStart, onStop, scrollRef 
}) => {
  const [activeReplayId, setActiveReplayId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, currentInput, currentOutput]);

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  };

  const handleReplay = async (id: string, sender: 'user' | 'tutor', base64?: string) => {
    if (!base64) return;
    setActiveReplayId(id);
    const sampleRate = sender === 'user' ? 16000 : 24000;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    try {
      const buffer = await decodeAudioData(decode(base64), ctx, sampleRate, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => { setActiveReplayId(null); ctx.close(); };
      source.start();
    } catch (e) {
      setActiveReplayId(null);
      ctx.close();
    }
  };

  const formatList = (text: string) => {
    if (!text) return null;
    // 过滤掉所有可能存在的标签
    const cleanText = text.replace(/===[\s\S]*?===/g, '');
    return cleanText.split(';').map(s => s.trim()).filter(Boolean).map((item, i) => (
      <div key={i} className="mb-2.5 flex items-start gap-3 text-[14px] leading-relaxed group">
        <span className="text-indigo-500 font-bold mt-1 group-hover:scale-125 transition-transform">✦</span>
        <span className="text-indigo-50/90 font-medium">{item};</span>
      </div>
    ));
  };

  const parseForStreaming = (text: string) => {
    if (!text) return { natural: '', translation: '' };
    // 永远只取第一个标签前的作为对话展示，防止 === 泄漏
    const parts = text.split('===');
    const mainText = parts[0].trim();
    
    // 尝试寻找翻译
    const translationMatch = text.match(/===\s*Chinese Translation\s*===\s*([\s\S]*?)(?====|$)/i);
    return {
      natural: mainText,
      translation: translationMatch ? translationMatch[1].trim() : ''
    };
  };

  const streamingData = parseForStreaming(currentOutput);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-12 custom-scrollbar pb-72">
        {transcript.map((item) => (
          <div key={item.id} className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[92%] rounded-[2rem] p-8 shadow-2xl border ${item.sender === 'user' ? 'bg-indigo-600 border-indigo-500 rounded-tr-none' : 'bg-slate-800 border-slate-700 rounded-tl-none'}`}>
              <div className="flex items-center gap-2 mb-5 opacity-40 uppercase text-[10px] font-black tracking-[0.2em]">
                {item.sender === 'user' ? '👤 STUDENT' : '🧑‍🏫 COACH ARIA'}
              </div>
              
              <div className="space-y-6 mb-8">
                <p className={`text-[19px] font-bold leading-[1.6] ${item.sender === 'tutor' ? 'text-indigo-50' : 'text-white'}`}>
                  {item.text}
                </p>
                {item.translation && (
                  <div className="flex items-start gap-4 bg-black/30 p-6 rounded-2xl border border-white/5 group shadow-inner">
                    <p className="text-[15px] text-slate-400 font-medium italic flex-1 leading-relaxed">{item.translation}</p>
                    <button onClick={() => speakText(item.translation!)} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 transition-all opacity-0 group-hover:opacity-100">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    </button>
                  </div>
                )}
              </div>

              {item.audioBase64 && (
                <button onClick={() => handleReplay(item.id, item.sender, item.audioBase64)} className={`flex items-center gap-3 text-[11px] font-black uppercase tracking-widest px-8 py-3.5 rounded-2xl border transition-all ${activeReplayId === item.id ? 'bg-white text-indigo-700 shadow-white/20' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/20 shadow-lg'}`}>
                   <span className={activeReplayId === item.id ? 'animate-pulse' : ''}>{activeReplayId === item.id ? '🔊 PLAYING...' : '▶ REPLAY VOICE'}</span>
                </button>
              )}

              {item.sender === 'tutor' && (
                <div className="mt-10 space-y-8 pt-10 border-t border-slate-700/50">
                  <div className="grid grid-cols-1 gap-6">
                    {item.vocabulary && (
                      <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/20 shadow-xl">
                        <div className="text-[11px] text-indigo-400 font-black uppercase mb-4 flex items-center gap-3 tracking-[0.15em]"><span>🔤</span> Vocabulary 核心词汇</div>
                        <div className="pl-3">{formatList(item.vocabulary)}</div>
                      </div>
                    )}
                    {item.phrases && (
                      <div className="bg-amber-500/5 p-6 rounded-2xl border border-amber-500/20 shadow-xl">
                        <div className="text-[11px] text-amber-400 font-black uppercase mb-4 flex items-center gap-3 tracking-[0.15em]"><span>🔗</span> Phrases 地道表达</div>
                        <div className="pl-3">{formatList(item.phrases)}</div>
                      </div>
                    )}
                    {item.grammar && (
                      <div className="bg-purple-500/5 p-6 rounded-2xl border border-purple-500/20 shadow-xl">
                        <div className="text-[11px] text-purple-400 font-black uppercase mb-4 flex items-center gap-3 tracking-[0.15em]"><span>⚙️</span> Grammar 语法解析</div>
                        <div className="text-[14px] text-purple-50/90 leading-relaxed pl-3 whitespace-pre-line border-l-2 border-purple-500/30">{item.grammar}</div>
                      </div>
                    )}
                  </div>

                  {item.improvedVersion && (
                    <div className="bg-indigo-950/40 p-7 rounded-2xl border border-indigo-500/30 shadow-2xl relative overflow-hidden group">
                      <div className="absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-20 transition-all text-4xl rotate-12">🚀</div>
                      <div className="text-[11px] text-indigo-300 font-black uppercase mb-4 tracking-widest">Advanced Level Up 进阶地道表达</div>
                      <div className="text-[16px] text-indigo-100 font-semibold leading-relaxed italic border-l-4 border-indigo-500 pl-6 py-1">
                        {item.improvedVersion}
                      </div>
                    </div>
                  )}

                  {item.homework && (
                    <div className="bg-emerald-500/10 p-7 rounded-2xl border border-emerald-500/30 shadow-xl border-dashed">
                      <div className="text-[11px] text-emerald-400 font-black uppercase mb-4 flex items-center gap-3 tracking-widest"><span>📝</span> Today's Assignment 今日练习作业</div>
                      <div className="text-[15px] text-emerald-50 font-bold leading-relaxed bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/10">
                        {item.homework}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {currentOutput && (
          <div className="flex flex-col items-start opacity-90 animate-pulse">
            <div className="max-w-[85%] rounded-[2rem] p-8 bg-slate-800/90 border border-indigo-500/40 backdrop-blur-2xl shadow-2xl">
              <div className="text-[10px] font-black text-indigo-400 uppercase mb-5 tracking-widest">Aria is speaking...</div>
              <p className="text-[19px] font-bold text-indigo-50 leading-relaxed">{streamingData.natural}</p>
              {streamingData.translation && <p className="text-[15px] text-slate-500 mt-6 border-l-2 border-indigo-500/30 pl-5 italic leading-relaxed">{streamingData.translation}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-12 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent backdrop-blur-xl flex flex-col items-center border-t border-white/5">
        {status === AppStatus.ACTIVE ? (
          <div className="flex items-center gap-16">
            <div className="flex flex-col items-center gap-4">
               <div className="w-24 h-24 rounded-full bg-indigo-600 pulse-animation flex items-center justify-center shadow-[0_0_60px_rgba(79,70,229,0.6)] border-4 border-white/10">
                 <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 005.93 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-1.93v-2.07z" /></svg>
               </div>
               <span className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse">Recording...</span>
            </div>
            <button onClick={onStop} className="bg-red-500 hover:bg-red-600 px-12 py-5 rounded-2xl font-black text-sm border-b-8 border-red-900 active:border-b-0 active:translate-y-2 shadow-[0_15px_40px_rgba(239,68,68,0.4)] transition-all">FINISH & ASSIGN HOMEWORK</button>
          </div>
        ) : status === AppStatus.CONNECTING ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-16 h-16 border-[6px] border-indigo-500 border-t-transparent rounded-full animate-spin shadow-indigo-500/30 shadow-2xl"></div>
            <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">Syncing with Aria...</span>
          </div>
        ) : (
          <button onClick={onStart} className="bg-indigo-600 hover:bg-indigo-500 px-28 py-10 rounded-[4rem] font-black text-4xl shadow-[0_40px_80px_rgba(79,70,229,0.5)] transition-all hover:scale-105 border-b-[16px] border-indigo-950 active:border-b-0 active:translate-y-4 uppercase tracking-tighter">Start Daily Session</button>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
