// Mock implementation of zustand for build purposes
// In production, install zustand: npm install zustand

import { useState, useEffect } from 'react';

type StateCreator<T> = (set: any, get: any, api: any) => T;

export function create<T>(stateCreator: StateCreator<T>) {
  const store = {
    state: {} as T,
    listeners: new Set<() => void>(),

    setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => {
      const nextState = typeof partial === 'function'
        ? (partial as Function)(store.state)
        : partial;
      store.state = { ...store.state, ...nextState };
      store.listeners.forEach(listener => listener());
    },

    getState: () => store.state,

    subscribe: (listener: () => void) => {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    }
  };

  // Initialize state
  const set = store.setState;
  const get = store.getState;
  const api = { setState: set, getState: get, subscribe: store.subscribe };

  store.state = stateCreator(set, get, api);

  // Return hook-like function
  const useStore = (selector?: (state: T) => any) => {
    const [state, setLocalState] = useState(store.state);

    useEffect(() => {
      const listener = () => setLocalState(store.state);
      const unsubscribe = store.subscribe(listener);
      return () => { unsubscribe(); };
    }, []);

    if (selector) {
      return selector(state);
    }
    return state;
  };

  // Add setState and getState to the hook
  (useStore as any).setState = set;
  (useStore as any).getState = get;
  (useStore as any).subscribe = store.subscribe;

  return useStore as any;
}

export const persist = (config: any, options: any) => {
  return (set: any, get: any, api: any) => {
    const initialState = config((args: any) => {
      set(args);
      if (options?.name) {
        try {
          localStorage.setItem(options.name, JSON.stringify(get()));
        } catch (e) {
          console.error('Error persisting state:', e);
        }
      }
    }, get, api);

    // Hydrate from localStorage
    if (options?.name) {
      try {
        const stored = localStorage.getItem(options.name);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge stored state with initial state
          // We need to defer this to ensure the store is initialized
          setTimeout(() => {
            set({ ...initialState, ...parsed });
          }, 0);
          return { ...initialState, ...parsed };
        }
      } catch (e) {
        console.error('Error hydrating state:', e);
      }
    }


    if (options?.name && typeof window !== 'undefined') {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === options.name && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            set({ ...parsed });
          } catch (e) {
            console.error('Error hydrating from storage event:', e);
          }
        }
      };

      window.addEventListener('storage', handleStorage);
      // Clean up not really possible here as we return state, but it's a mock so it's fine for now.
    }

    return initialState;
  };
};
