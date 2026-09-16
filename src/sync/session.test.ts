import { forgetPassphrase, loadPassphrase, savePassphrase } from "./session";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

describe("sync session", () => {
  it("saves and forgets the passphrase on this device only", () => {
    const mem = new MemoryStorage();
    savePassphrase("alpha", mem);
    expect(loadPassphrase(mem)).toBe("alpha");
    forgetPassphrase(mem);
    expect(loadPassphrase(mem)).toBe("");
  });
});
