import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BaseProduct } from '@/lib/products/types';

interface BuildState {
    cpu: BaseProduct | null;
    gpu: BaseProduct | null;
    motherboard: BaseProduct | null;
    ram: BaseProduct | null;
    storage: BaseProduct[];
    psu: BaseProduct | null;

    // Actions
    setCpu: (item: BaseProduct | null) => void;
    setGpu: (item: BaseProduct | null) => void;
    setMotherboard: (item: BaseProduct | null) => void;
    setRam: (item: BaseProduct | null) => void;
    setStorage: (item: BaseProduct | BaseProduct[] | null) => void;
    setPsu: (item: BaseProduct | null) => void;
    setBuild: (build: {
        cpu?: BaseProduct | null;
        gpu?: BaseProduct | null;
        motherboard?: BaseProduct | null;
        ram?: BaseProduct | null;
        storage?: BaseProduct | BaseProduct[] | null;
        psu?: BaseProduct | null;
    }) => void;
    resetBuild: () => void;
    setComponent: (category: string, item: BaseProduct) => void;
    removeComponent: (category: string, storageId?: string) => void;
    clearBuild: () => void;
}

export const useBuildStore = create<BuildState>()(
    persist(
        (set) => ({
            cpu: null,
            gpu: null,
            motherboard: null,
            ram: null,
            storage: [],
            psu: null,

            setCpu: (item) => set({ cpu: item }),
            setGpu: (item) => set({ gpu: item }),
            setMotherboard: (item) => set({ motherboard: item }),
            setRam: (item) => set({ ram: item }),
            setStorage: (item) => {
                if (!item) {
                    set({ storage: [] });
                    return;
                }
                set({ storage: Array.isArray(item) ? item : [item] });
            },
            setPsu: (item) => set({ psu: item }),
            setBuild: (build) => set({
                cpu: build.cpu ?? null,
                gpu: build.gpu ?? null,
                motherboard: build.motherboard ?? null,
                ram: build.ram ?? null,
                storage: Array.isArray(build.storage)
                    ? build.storage
                    : (build.storage ? [build.storage] : []),
                psu: build.psu ?? null,
            }),
            resetBuild: () => {
                set({
                    cpu: null,
                    gpu: null,
                    motherboard: null,
                    ram: null,
                    storage: [],
                    psu: null,
                });
            },

            setComponent: (category, item) => {
                set((state) => {
                    if (category === 'storage') {
                        const exists = state.storage.find((s) => s.id === item.id);
                        if (exists) return state; // Don't add duplicate storage
                        return { storage: [...state.storage, item] };
                    }
                    return { [category]: item };
                });
            },

            removeComponent: (category, storageId) => {
                set((state) => {
                    if (category === 'storage' && storageId) {
                        return {
                            storage: state.storage.filter((s) => s.id !== storageId),
                        };
                    }
                    return { [category]: null };
                });
            },

            clearBuild: () => {
                set({
                    cpu: null,
                    gpu: null,
                    motherboard: null,
                    ram: null,
                    storage: [],
                    psu: null,
                });
            },
        }),
        {
            name: 'ez-config-build',
            storage: createJSONStorage(() => localStorage),
            version: 1,
            migrate: (persistedState: any, version: number) => {
                if (version === 0) {
                    // Migration from v0 (where storage might have been a single item or null)
                    return {
                        ...persistedState,
                        storage: Array.isArray(persistedState.storage) ? persistedState.storage : [],
                    };
                }
                return persistedState;
            },
        }
    )
);
