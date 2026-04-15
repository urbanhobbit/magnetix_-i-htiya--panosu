export type Stage = 'pool' | 'selected' | 'processed';

export interface Need {
  id: string;
  text: string;
  stage: Stage;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  stage: Stage;
}
