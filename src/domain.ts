export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Field extends Rect {
  id: string;
  page: number;
  label: string;
  value: string;
  kind: 'text' | 'checkbox' | 'choice';
  source: 'native' | 'detected' | 'manual';
  nativeName?: string;
  options?: string[];
  readOnly?: boolean;
}
export interface DocumentFile {
  name: string;
  bytes: Uint8Array;
}
declare global {
  interface Window {
    desktop?: {
      open(): Promise<DocumentFile | null>;
      save(name: string, bytes: Uint8Array): Promise<boolean>;
      print(): Promise<boolean>;
      ready(): void;
      onFile(callback: (file: DocumentFile) => void): () => void;
      onClose(callback: () => void): () => void;
      allowClose(): void;
      setDirty(dirty: boolean): void;
    };
  }
}
