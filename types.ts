
export interface PointLog {
  id: string;
  type: 'positive' | 'negative';
  reason: string;
  timestamp: number;
  points: number;
}

export interface DailyChallenge {
  id: string;
  task: string;
  points: number;
  completed: boolean;
}

export interface ConfigGoal {
  id: string;
  points: number;
  label: string;
  iconName: string;
}

export interface ConfigService {
  id: string;
  name: string;
  points: number;
  iconName: string;
}

export interface ConfigGage {
  id: string;
  label: string;
  points?: number;
}

export interface AgendaEntry {
  id: string;
  title: string;
  description?: string;
  date: string; // Format YYYY-MM-DD
  time: string;
  category: 'school' | 'leisure' | 'health' | 'other';
}

export interface NoteSection {
  id: string;
  name: string;
}

export interface StickyNote {
  id: string;
  text: string;
  color: string;
  date: number;
  isArchived?: boolean;
  isPinned?: boolean;
  sectionId?: string;
}

export interface AppConfig {
  appName: string;
  appLogo?: string;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    borderRadius: string; 
  };
  services: ConfigService[];
  gages: ConfigGage[];
  globalGoals: ConfigGoal[];
  possibleIndividualRewards: ConfigGoal[];
}

export interface UserAccount {
  email: string;
  familyName: string;
  isAuthenticated: boolean;
}

export interface CustomQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  score: number;
  history: PointLog[];
  avatar: string;
  cardBackground?: string; // URL ou base64
  dailyChallenges: DailyChallenge[];
  personalGoals: ConfigGoal[];
  passion?: string;
  favoriteAnimal?: string;
  dreamJob?: string;
  customQuestions?: CustomQuestion[];
  screenTimeLimit: number; 
  screenTimeRemaining: number; 
  isTimerRunning: boolean;
  activeGages?: string[];
}
