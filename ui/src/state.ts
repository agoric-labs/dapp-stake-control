import { AppState } from './interfaces/interfaces';
import { create } from 'zustand';

export const useAppStore = create<AppState>((set) => ({
  contractInstance: null,
  balance: 0,
  loading: false,
  error: undefined,
  type: 3,
  tab: 1,
  currentOffers: null,
}));
