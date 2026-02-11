
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppStatus, TranscriptItem, DailyStats } from './types';
import { GeminiLiveSession } from './services/geminiService';
import { LiveServerMessage } from '@google/genai';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import StatsSidebar from './components/StatsSidebar';
import WelcomeOverlay from './components/WelcomeOverlay';

// 使用最终版独立的存储键，确保数据纯净
const STORAGE_KEY = 'linguist_ai_final_history';
const STATS_KEY = 'linguist_ai_final_stats';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [transcript, setTranscript] = useState<TranscriptItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [dailyStats, setDailyStats] = useState<DailyStats>(() => {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      const today = new Date().toISOString().split('T')[0];
      if (saved) {
        const stats = JSON.parse(saved);
        if (stats.date === today) return stats;
        // 跨天逻辑：保留未完成的作业，清空时长
        return { 
          minutesSpoken: 0, 
          date: today, 
          homeworkAssigned: stats.homeworkCompleted ? undefined : stats.homeworkAssigned,
          homeworkCompleted: false 
        };
      }
      return { minutesSpoken: 0, date: today };
    } catch (e) {
      return { minutesSpoken: 0, date: new Date().toISOString().split('T')[0] };
    }
  });
  
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const lastHomeworkRef = useRef<string | undefined>(dailyStats.homeworkAssigned);

  // 监听浏览器刷新，防止数据意外丢失
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === AppStatus.ACTIVE) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transcript));
  }, [transcript]);

  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(dailyStats));
  }, [dailyStats]);

  const parseStructuredResponse = (text: string) => {
    const cleanSection = (tag: string, content: string) => {
      const regex = new RegExp(`===\\s*${tag}\\s*===\\s*([\\s\\S]*?)(?====|$)`, 'i');
      const match = content.match(regex);
      return match ? match[1].trim() : '';
    };

    // 默认回退逻辑：如果模型没按格式出，取第一个标签前的作为对话内容
    let natural = cleanSection('Spoken English Transcript', text);
    if (!natural) {
      natural = text.split('===')[0].trim();
    }

    const translation = cleanSection('Chinese Translation', text);
    const knowledgeText = cleanSection('Knowledge Points \\(核心知识点\\)', text);
    const homework = cleanSection("Today's Homework \\(今日作业\\)", text);
    const improved = cleanSection('Advanced Level Up', text);

    // 解析内部知识点
    const vocabMatch = knowledgeText.match(/- 词汇 \(Vocab\):\s*([\s\S]*?)(?=- 地道表达|- 语法要点|$)/i);
    const phrasesMatch = knowledgeText.match(/- 地道表达 \(Phrases\):\s*([\s\S]*?)(?=- 语法要点|$)/i);
    const grammarMatch = knowledgeText.match(/- 语法要点 \(Grammar\):\s*([\s\S]*?)$/i);

    return {
      natural,
      translation,
      vocabulary: vocabMatch ? vocabMatch[1].trim() : '',
      phrases: phrasesMatch ? phrasesMatch[1].trim() : '',
      grammar: grammarMatch ? grammarMatch[1].trim() : '',
      homework,
      improved
    };
  };

  const handleMessage = useCallback((message: LiveServerMessage, tutorAudioBase64?: string, userAudioBase64?: string) => {
    if (message.serverContent?.inputTranscription) {
      setCurrentInput(prev => prev + message.serverContent!.inputTranscription!.text);
    }
    if (message.serverContent?.outputTranscription) {
      setCurrentOutput(prev => prev + message.serverContent!.outputTranscription!.text);
    }
    
    if (message.serverContent?.turnComplete) {
      setCurrentOutput(fullOutput => {
        setCurrentInput(fullInput => {
          const parsed = parseStructuredResponse(fullOutput);
          const turnId = Date.now().toString();

          setTranscript(prev => [
            ...prev,
            { id: `${turnId}-u`, sender: 'user', text: fullInput || "Voice interaction", audioBase64: userAudioBase64, timestamp: Date.now() },
            { 
              id: `${turnId}-t`, sender: 'tutor', text: parsed.natural, translation: parsed.translation,
              vocabulary: parsed.vocabulary, phrases: parsed.phrases, grammar: parsed.grammar,
              improvedVersion: parsed.improved, homework: parsed.homework,
              audioBase64: tutorAudioBase64, timestamp: Date.now() + 1 
            }
          ]);

          if (parsed.homework) {
            lastHomeworkRef.current = parsed.homework;
          }

          // 智能检测作业提交
          const inputLower = fullInput.toLowerCase();
          const isCheckIn = inputLower.includes('homework') || inputLower.includes('作业') || inputLower.includes('批改') || inputLower.includes('submission');
          if (isCheckIn) {
            setDailyStats(prev => ({ ...prev, homeworkCompleted: true }));
          }

          return "";
        });
        return "";
      });
      setCurrentInput("");
      setCurrentOutput("");
    }
  }, []);

  const startSession = async () => {
    try {
      setErrorMessage(null);
      setStatus(AppStatus.CONNECTING);
      startTimeRef.current = Date.now();
      
      const session = new GeminiLiveSession();
      sessionRef.current = session;
      
      let context = `Mode: Practice. Current Date: ${dailyStats.date}. `;
      if (dailyStats.homeworkAssigned && !dailyStats.homeworkCompleted) {
        context = `Mode: Homework Grading. The user is submitting: "${dailyStats.homeworkAssigned}". Provide specific feedback, corrections, and a score out of 10. `;
      }

      await session.start({
        onMessage: handleMessage,
        onError: (e) => { setErrorMessage(e?.message); setStatus(AppStatus.ERROR); stopSession(); },
        onClose: () => { finalizeStop(); if (status !== AppStatus.ERROR) setStatus(AppStatus.IDLE); }
      }, context);
      
      setStatus(AppStatus.ACTIVE);
    } catch (err: any) {
      setErrorMessage(err.message);
      setStatus(AppStatus.ERROR);
    }
  };

  const finalizeStop = () => {
    if (startTimeRef.current > 0) {
      const durationMs = Date.now() - startTimeRef.current;
      const minutes = Math.ceil(durationMs / 60000);
      
      setDailyStats(prev => {
        // 如果没有明确作业，且通话时长超过一定时间，自动生成一个基于词汇的作业
        const autoHomework = lastHomeworkRef.current || (minutes >= 1 ? "Review the vocabulary and phrases from today's conversation." : undefined);
        return { 
          ...prev, 
          minutesSpoken: prev.minutesSpoken + minutes,
          homeworkAssigned: prev.homeworkAssigned || autoHomework
        };
      });
      startTimeRef.current = 0;
    }
  };

  const stopSession = () => {
    sessionRef.current?.stop();
    finalizeStop();
    setStatus(AppStatus.IDLE);
  };

  const clearHistory = () => {
    if (window.confirm('警告：这将永久删除所有练习历史、单词本和当前的作业进度。确定吗？')) {
      setTranscript([]);
      setDailyStats({ minutesSpoken: 0, date: new Date().toISOString().split('T')[0] });
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STATS_KEY);
      window.location.reload(); // 重置所有内存状态
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#020617] text-slate-100">
      <Header onClearHistory={clearHistory} />
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        <div className="hidden lg:flex w-[24rem] flex-col">
          <StatsSidebar stats={dailyStats} />
        </div>
        <div className="flex-1 flex flex-col glass-morphism rounded-[3rem] overflow-hidden relative border border-white/5 shadow-inner">
          <ChatInterface 
            status={status} transcript={transcript} currentInput={currentInput}
            currentOutput={currentOutput} onStart={startSession}
            onStop={stopSession} scrollRef={scrollRef}
          />
        </div>
      </main>
      {status === AppStatus.IDLE && transcript.length === 0 && <WelcomeOverlay onStart={startSession} />}
    </div>
  );
};

export default App;
