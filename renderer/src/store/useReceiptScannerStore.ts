import { create } from 'zustand';

interface ReceiptScannerState {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useReceiptScannerStore = create<ReceiptScannerState>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}));
