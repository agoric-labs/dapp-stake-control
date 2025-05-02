import { AppState } from './interfaces/interfaces';
import { create } from 'zustand';

export const useAppStore = create<AppState>((set) => ({
  contractInstance: null,
  loading: false,
  error: undefined,
  type: 3,
  tab: 1,
  currentOffers: null,
  latestInvitation: '',
  network: 'localhost',
}));
