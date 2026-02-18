export type CellState = 'none' | 'done' | 'missed';

export interface Task {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  cells: Record<number, CellState>; // day number -> state
}

export interface TrackerData {
  tasks: Task[];
  ramadanYear: number;
}
