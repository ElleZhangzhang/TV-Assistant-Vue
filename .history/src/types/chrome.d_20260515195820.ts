type ChromeStorageChange = {
  oldValue?: unknown
  newValue?: unknown
}

declare const chrome: {
  storage: {
    local: {
      get: (key: string, callback: (result: Record<string, unknown>) => void) => void
      set: (items: Record<string, unknown>, callback?: () => void) => void
      remove: (keys: string | string[], callback?: () => void) => void
    }
    onChanged: {
      addListener: (
        callback: (changes: Record<string, ChromeStorageChange>, areaName: string) => void
      ) => void
    }
  }
  runtime: {
    sendMessage: (message: unknown, callback?: () => void) => void
    lastError?: { message?: string }
  }
}
