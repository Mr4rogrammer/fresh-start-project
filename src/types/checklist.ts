// Checklist types for multi-level task management system
export type ChecklistItemType = 'checkbox' | 'text' | 'dropdown' | 'radio';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  children: ChecklistItem[];
  // Form builder fields
  type?: ChecklistItemType; // defaults to 'checkbox' for backward compatibility
  options?: string[]; // for dropdown and radio types
  value?: string; // user-entered value for text/dropdown/radio
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  isDuplicate?: boolean;
}
