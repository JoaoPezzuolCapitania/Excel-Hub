/* eslint-disable @typescript-eslint/no-explicit-any */

// Minimal Office.js type declarations for the ExcelHub Add-in

declare namespace Office {
  interface HostInfo {
    host: string;
    platform: string;
  }

  function onReady(
    callback?: (info: HostInfo) => void
  ): Promise<HostInfo>;

  namespace context {
    namespace ui {
      interface DialogOptions {
        width?: number;
        height?: number;
        displayInIframe?: boolean;
      }

      interface Dialog {
        close(): void;
        addEventHandler(
          eventType: typeof EventType.DialogMessageReceived,
          handler: (arg: { message: string; origin: string | undefined }) => void
        ): void;
        addEventHandler(
          eventType: typeof EventType.DialogEventReceived,
          handler: (arg: { error: number }) => void
        ): void;
      }

      function displayDialogAsync(
        startAddress: string,
        options?: DialogOptions,
        callback?: (result: AsyncResult<Dialog>) => void
      ): void;

      function messageParent(message: string): void;
    }

    namespace document {
      function getFileAsync(
        fileType: FileType,
        options: { sliceSize?: number },
        callback: (result: AsyncResult<File>) => void
      ): void;
    }
  }

  enum FileType {
    Compressed = "compressed",
    Pdf = "pdf",
    Text = "text",
  }

  enum EventType {
    DialogMessageReceived = "dialogMessageReceived",
    DialogEventReceived = "dialogEventReceived",
  }

  interface AsyncResult<T> {
    status: "succeeded" | "failed";
    value: T;
    error?: { code: number; message: string };
  }

  interface File {
    size: number;
    sliceCount: number;
    getSliceAsync(
      sliceIndex: number,
      callback: (result: AsyncResult<Slice>) => void
    ): void;
    closeAsync(callback?: (result: AsyncResult<void>) => void): void;
  }

  interface Slice {
    data: ArrayBuffer;
    index: number;
    size: number;
  }
}

declare namespace Excel {
  function createWorkbook(base64?: string): Promise<void>;

  function run(
    callback: (context: RequestContext) => Promise<void>
  ): Promise<void>;

  interface RequestContext {
    workbook: Workbook;
    sync(): Promise<void>;
  }

  interface Workbook {
    name: string;
  }
}
