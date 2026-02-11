
export interface TranscriptItem {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  translation?: string;
  vocabulary?: string;
  phrases?: string;
  grammar?: string;
  improvedVersion?: string;
  homework?: string; // 老师布置的作业
  isHomeworkCorrection?: boolean; // 是否是针对作业的批改回复
  // Add audioBase64 to store voice recordings for playback
  audioBase64?: string;
  timestamp: number;
}

export interface DailyStats {
  minutesSpoken: number;
  date: string; // YYYY-MM-DD
  homeworkAssigned?: string; // 今日布置的作业内容
  homeworkCompleted?: boolean; // 今日作业是否已提交
}

export enum AppStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}
