export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'table'
  | 'list-item'
  | 'page-break'
  | 'unknown';

export type TextStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
};

export type TableCell = {
  text: string;
  rowSpan?: number;
  colSpan?: number;
  style?: TextStyle;
};

export type TableRow = {
  cells: TableCell[];
};

export type DocumentImage = {
  src?: string;
  alt?: string;
  mimeType?: string;
  width?: number;
  height?: number;
};

export type DocumentBlock = {
  id: string;
  type: BlockType;
  text?: string;
  originalText?: string;
  wasHumanized?: boolean;
  style?: TextStyle;
  bbox?: BoundingBox;
  image?: DocumentImage;
  table?: { rows: TableRow[] };
  listLevel?: number;
  ordered?: boolean;
};

export type DocumentMetadata = {
  title?: string;
  author?: string;
  wordCount: number;
  textBlockCount: number;
  imageCount: number;
  tableCount: number;
  headingCount: number;
};

export type PageSize = {
  width: number;
  height: number;
};

export type ParsedDocument = {
  filename: string;
  format: 'pdf' | 'docx' | 'txt' | 'md';
  pageCount: number;
  blocks: DocumentBlock[];
  metadata: DocumentMetadata;
  plainText: string;
  pageSizes?: Record<number, PageSize>;
  sourcePdfKey?: string;
};
