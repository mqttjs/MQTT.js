export function sleep (time?: number): {promise: Promise<void>, cancel: () => void } {
    let cancel: () => void;
    let outerReject: (reason?: any) => void;
    let timer: number;
    let promise = new Promise<void>((resolve, reject) => {
      outerReject = reject;
      timer = setTimeout(resolve, time);
        
    });
    cancel = () => {
      clearTimeout(timer);
      outerReject(new Error('sleep cancelled'))
  }
    return { promise, cancel }
}

/**
 {promise: Promise<void>, cancel: () => void}
 */