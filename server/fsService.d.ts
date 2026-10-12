export interface FsDirectory {
  name: string;
  path: string;
  absolutePath: string;
  itemCount: number;
  videoCount: number;
  hasManifest: boolean;
  isPackFolder: boolean;
  updatedAt?: string | null;
  updatedFormatted?: string | null;
  updatedFullDate?: string | null;
  timeAgo?: string | null;
  mtimeMs?: number;
  batchDate?: string | null;
  batchFullDate?: string | null;
}

export interface FsFile {
  name: string;
  path: string;
  absolutePath: string;
  sizeBytes: number;
  sizeMb: number;
  ext: string;
  isVideo: boolean;
  isCaption: boolean;
  isZip: boolean;
  isManifest: boolean;
  streamUrl: string;
  updatedAt?: string | null;
  updatedFormatted?: string | null;
  updatedFullDate?: string | null;
  timeAgo?: string | null;
  mtimeMs?: number;
}

export interface FsBookmark {
  label: string;
  path: string;
  icon: string;
}

export interface FsListResult {
  currentPath: string;
  absolutePath: string;
  parentPath: string;
  canGoUp: boolean;
  directories: FsDirectory[];
  files: FsFile[];
  bookmarks: FsBookmark[];
}

export interface FsIngestItem {
  name: string;
  path: string;
  absolutePath: string;
  sizeBytes: number;
  isVideo: boolean;
  isCaption: boolean;
  isZip: boolean;
  streamUrl: string;
}

export interface FsIngestResult {
  success: boolean;
  targetPath: string;
  itemCount: number;
  videoCount: number;
  items: FsIngestItem[];
}

export interface DateInfo {
  iso: string;
  formatted: string;
  fullDate: string;
  fullDateTime: string;
  timeAgo: string;
  timestamp: number;
}

export interface NameDateInfo {
  raw: string;
  formatted: string;
  fullDate: string;
  iso: string;
}

export function formatDateInfo(date: Date | string | number | null | undefined): DateInfo | null;
export function parseNameDate(name: string): NameDateInfo | null;
export function resolveSafePath(userPath: string, workspaceDir: string): string;
export function getBookmarks(workspaceDir: string): FsBookmark[];
export function listFiles(targetPath: string, workspaceDir: string): FsListResult;
export function ingestSelection(targetPath: string, selectedFiles?: string[], workspaceDir?: string): FsIngestResult;
export function handleFileStream(filePath: string, req: any, res: any): void;
