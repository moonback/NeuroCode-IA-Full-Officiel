declare module 'pdfjs-dist/build/pdf.worker.mjs' {
    const worker: any;
    export default worker;
  }
  
  declare module 'pdfjs-dist' {
    export interface PDFDocumentProxy {
      numPages: number;
      getPage(pageNumber: number): Promise<PDFPageProxy>;
      destroy(): Promise<void>;
    }
  
    export interface PDFPageProxy {
      getTextContent(params?: {}): Promise<PDFTextContent>;
      getViewport(params: { scale: number }): PDFViewport;
      render(params: any): PDFRenderTask;
      destroy(): Promise<void>;
      cleanup(): void;
    }
  
    export interface PDFTextContent {
      items: PDFTextItem[];
      styles: { [key: string]: any };
    }
  
    export interface PDFTextItem {
      str: string;
      transform: number[];
      width: number;
      height: number;
      dir: string;
    }
  
    export interface PDFViewport {
      width: number;
      height: number;
    }
  
    export interface PDFRenderTask {
      promise: Promise<void>;
    }
  
    export interface PDFDocumentLoadingTask {
      promise: Promise<PDFDocumentProxy>;
    }
  
    export interface GetDocumentParams {
      url?: string;
      data?: Uint8Array | ArrayBuffer;
      password?: string;
      disableFontFace?: boolean;
    }
  
    export function getDocument(params: GetDocumentParams): PDFDocumentLoadingTask;
    export function getDocument(data: Uint8Array | ArrayBuffer): PDFDocumentLoadingTask;
    export function getDocument(url: string): PDFDocumentLoadingTask;
  
    // eslint-disable-next-line @typescript-eslint/naming-convention
    export const GlobalWorkerOptions: {
      workerSrc: string;
    };
  }