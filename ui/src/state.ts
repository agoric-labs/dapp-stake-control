import { AppState } from './interfaces/interfaces';
import { create } from 'zustand';

export const useAppStore = create<AppState>((set) => ({
  contractInstance: null,
  loading: false,
  tab: 1,
  currentOffers: null,
  latestInvitation: '',
  network: 'localhost',
  isNetworkChanging: false,
  watcher: null,
  wallet: null,
  brands: null,
}));
