import type { Address } from '@circles-sdk/utils';
import type { WalletType } from '$lib/utils/walletType';

export interface StorageSchema {
  version: number;
  walletType?: WalletType;
  avatar?: Address;
  group?: Address;
  privateKey?: string;
}

const STORAGE_KEY = 'Circles.Storage';
const CURRENT_VERSION = 1;

export class CirclesStorage {
  private static instance: CirclesStorage;

  private constructor() {
    this.migrate();
  }

  static getInstance(): CirclesStorage {
    if (!CirclesStorage.instance) {
      CirclesStorage.instance = new CirclesStorage();
    }
    return CirclesStorage.instance;
  }

  private migrate() {
    const data = this.read();

    if (data?.version === CURRENT_VERSION) return;

    const migratedData: StorageSchema = {
      walletType: localStorage.getItem('walletType') as WalletType,
      avatar: localStorage.getItem('avatar') as Address,
      group: localStorage.getItem('group') as Address,
      privateKey: localStorage.getItem('privateKey') || undefined,
      ...data,
      version: CURRENT_VERSION
    };

    this.write(migratedData);

    ['walletType', 'avatar', 'group', 'privateKey'].forEach(key => {
      localStorage.removeItem(key);
    });
  }

  get data(): StorageSchema {
    return this.read() || { version: CURRENT_VERSION };
  }

  set data(updates: Partial<StorageSchema>) {
    this.write({
      ...this.data,
      ...updates,
    });
  }

  get walletType(): WalletType | undefined {
    return this.data.walletType;
  }

  get avatar(): Address | undefined {
    return this.data.avatar;
  }

  get group(): Address | undefined {
    return this.data.group;
  }

  get privateKey(): string | undefined {
    return this.data.privateKey;
  }

  private write(data: StorageSchema) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  private read(): StorageSchema | undefined {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : undefined;
  }
}
