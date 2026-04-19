import {create} from 'zustand'

interface PlayerState {
  isShuffled: boolean
  setIsShuffled: (val: boolean) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isShuffled: false,
  setIsShuffled: (val) => set({isShuffled: val}),
}))
