import { TrackerData, Task, CellState } from './types';

const STORAGE_KEY = 'ramadan-tracker-2025';

const defaultTasks: Task[] = [
  { id: '1', name: 'قراءة القرآن', parentId: null, order: 0, cells: {} },
  { id: '2', name: 'الصلاة', parentId: null, order: 1, cells: {} },
  { id: '2a', name: 'الفجر', parentId: '2', order: 0, cells: {} },
  { id: '2b', name: 'الظهر', parentId: '2', order: 1, cells: {} },
  { id: '2c', name: 'العصر', parentId: '2', order: 2, cells: {} },
  { id: '2d', name: 'المغرب', parentId: '2', order: 3, cells: {} },
  { id: '2e', name: 'العشاء', parentId: '2', order: 4, cells: {} },
  { id: '3', name: 'صلاة التراويح', parentId: null, order: 2, cells: {} },
];

export function loadData(): TrackerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const data: TrackerData = { tasks: defaultTasks, ramadanYear: 2025 };
  saveData(data);
  return data;
}

export function saveData(data: TrackerData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function cycleCell(current: CellState): CellState {
  if (current === 'none') return 'done';
  if (current === 'done') return 'missed';
  return 'none';
}

export const RAMADAN_DAYS = 30;
