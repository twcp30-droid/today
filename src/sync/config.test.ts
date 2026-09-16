import { isSyncConfigured, readSyncConfig } from "./config";

describe("sync config", () => {
  it("is off when env keys are missing", () => {
    expect(readSyncConfig({ VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" })).toBeNull();
    expect(isSyncConfigured({ VITE_SUPABASE_URL: undefined, VITE_SUPABASE_ANON_KEY: undefined })).toBe(
      false,
    );
  });

  it("rejects placeholders and http", () => {
    expect(
      readSyncConfig({
        VITE_SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
        VITE_SUPABASE_ANON_KEY: "your-anon-key",
      }),
    ).toBeNull();
    expect(
      readSyncConfig({
        VITE_SUPABASE_URL: "http://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "eyJhbGciOi.real-looking",
      }),
    ).toBeNull();
  });

  it("accepts a https project url and anon key", () => {
    const config = readSyncConfig({
      VITE_SUPABASE_URL: "https://abcd.supabase.co/",
      VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon",
    });
    expect(config).toEqual({
      url: "https://abcd.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon",
    });
  });
});
