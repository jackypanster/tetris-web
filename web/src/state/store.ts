/**
 * Minimal reactive狀態存取。完整的 RxJS time-travel store 可於未來里程碑補完。
 */

export interface StoreListener<T> {
  (value: T): void
}

export class SimpleStore<T> {
  private value: T
  private listeners = new Set<StoreListener<T>>()

  constructor(initialValue: T) {
    this.value = initialValue
  }

  get(): T {
    return this.value
  }

  set(next: T): void {
    this.value = next
    this.listeners.forEach(listener => listener(next))
  }

  update(mutator: (current: T) => T): void {
    this.set(mutator(this.value))
  }

  subscribe(listener: StoreListener<T>): () => void {
    this.listeners.add(listener)
    listener(this.value)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
