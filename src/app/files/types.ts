// Block-based Database System Types
// Notion-level database functionality with advanced property types

export type BlockType = 
  | 'database'
  | 'database_row' 
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'embed'
  | 'divider'
  | 'code'
  | 'quote'
  | 'bulleted_list'
  | 'numbered_list'
  | 'toggle'
  | 'callout'

export interface Block {
  id: string;
  type: BlockType;
  content: any;
  properties: Record<string, any>;
  children: Block[];
  parentId?: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy?: string;
  lastEditedBy?: string;
}

export type PropertyType = 
  | 'title'
  | 'text' 
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'date_range'
  | 'person'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by'
  | 'rating'
  | 'status'
  | 'progress'
  | 'currency'

export interface PropertyConfig {
  // Select/Multi-select options
  options?: SelectOption[];
  
  // Formula configuration
  formula?: string;
  
  // Relation configuration
  relationDatabase?: string;
  relationType?: 'one_to_one' | 'one_to_many' | 'many_to_many';
  
  // Rollup configuration
  rollupProperty?: string;
  rollupFunction?: 'count' | 'sum' | 'average' | 'min' | 'max';
  
  // Number formatting
  numberFormat?: 'number' | 'currency' | 'percent';
  
  // Date formatting
  dateFormat?: 'full' | 'relative' | 'date_only' | 'date_time';
  
  // Rating configuration
  maxRating?: number;
  
  // File configuration
  allowMultiple?: boolean;
  acceptedTypes?: string[];
}

export interface SelectOption {
  id: string;
  name: string;
  color: SelectColor;
}

export type SelectColor = 
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red';

export interface DatabaseProperty {
  id: string;
  name: string;
  type: PropertyType;
  config: PropertyConfig;
  visible: boolean;
  width?: number;
}

export interface DatabaseView {
  id: string;
  name: string;
  type: ViewType;
  filters: Filter[];
  sorts: Sort[];
  grouping?: Grouping;
  properties: ViewProperty[];
}

export type ViewType = 
  | 'table'
  | 'board'  // カンバン
  | 'timeline'
  | 'calendar'
  | 'gallery'
  | 'list'

export interface Filter {
  id: string;
  property: string;
  condition: FilterCondition;
  value: any;
  operator?: 'and' | 'or';
}

export type FilterCondition = 
  | 'equals'
  | 'does_not_equal'
  | 'contains'
  | 'does_not_contain'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_checked'
  | 'is_not_checked'
  | 'on_or_before'
  | 'on_or_after'
  | 'between'

export interface Sort {
  property: string;
  direction: 'ascending' | 'descending';
}

export interface Grouping {
  property: string;
  type: 'status' | 'select' | 'person' | 'date';
}

export interface ViewProperty {
  property: string;
  visible: boolean;
  width?: number;
  wrap?: boolean;
}

export interface DatabaseSchema {
  id: string;
  title: string;
  description?: string;
  properties: DatabaseProperty[];
  views: DatabaseView[];
  permissions: Permission[];
  icon?: string;
  cover?: string;
}

export interface Permission {
  type: 'user' | 'role';
  id: string;
  access: 'read' | 'write' | 'admin';
}

export interface DatabaseRow {
  id: string;
  properties: Record<string, PropertyValue>;
  createdTime: string;
  lastEditedTime: string;
  createdBy?: string;
  lastEditedBy?: string;
}

export type PropertyValue = 
  | string
  | number
  | boolean
  | Date
  | string[]
  | FileAttachment[]
  | Person[]
  | SelectOption
  | SelectOption[]
  | FormulaResult;

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedTime: string;
}

export interface Person {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface FormulaResult {
  type: 'text' | 'number' | 'boolean' | 'date';
  value: any;
}

// UI State Types
export interface EditingCell {
  rowId: string;
  propertyId: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  type: 'row' | 'property' | 'cell' | 'view';
  targetId: string;
  data?: any;
}

export interface BlockEditorState {
  selectedBlocks: Set<string>;
  draggedBlock?: Block;
  dropTarget?: string;
  editingBlock?: string;
  focusedProperty?: string;
}