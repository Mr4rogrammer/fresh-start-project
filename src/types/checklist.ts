// Checklist types for multi-level task management system
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  children: ChecklistItem[];
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  isDuplicate?: boolean;
}
