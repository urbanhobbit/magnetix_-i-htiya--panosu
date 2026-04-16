export type Stage = 'pool' | 'selected' | 'processed';

export type Level = 'L1' | 'L2' | 'L3';

export interface Need {
  id: string;
  text: string;
  stage: Stage;
  groupId?: string;
  consensus?: number; // 0-1, how many experts agreed
  originalNotes?: string[]; // L1 notes that contributed to this need
}

export interface Group {
  id: string;
  name: string;
  stage: Stage;
}

export interface L1Note {
  id: string;
  expertName: string;
  text: string;
  timestamp: string;
}
