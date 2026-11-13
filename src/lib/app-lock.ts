/**
 * App lock with the device's own unlock (Windows Hello face/fingerprint/PIN,
 * Face ID / Touch ID on phones), through the browser's WebAuthn API.
 * It is a local lock for the installed app: the signed-in session already
 * lives on this device; this only asks the person in front of it to prove
 * it's them before showing the dashboard.
 */
const KEY = "app-lock";
type Saved = { credId: string; enabled: boolean };

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

const read = (): Saved | null => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const write = (v: Saved | null) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {} };

export const isLockEnabled = () => !!read()?.enabled;

/** Whether this device has a built-in unlock the browser can use. */
export async function canUseDeviceUnlock() {
  try {
    return typeof window !== "undefined" && !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch { return false; }
}

/** Sets up the lock: shows the device prompt once to create a key on this device. */
export async function enableLock(email: string) {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: random(32),
      rp: { name: "أحمد الحربي", id: location.hostname },
      user: { id: random(16), name: email || "owner", displayName: "أحمد الحربي" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("ما تم التفعيل");
  write({ credId: b64(cred.rawId), enabled: true });
}

export const disableLock = () => write(null);

/** Asks for the face/fingerprint/PIN. True when the person verified. */
export async function unlock() {
  const saved = read();
  if (!saved) return true;
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        rpId: location.hostname,
        allowCredentials: [{ type: "public-key", id: unb64(saved.credId), transports: ["internal"] }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!res;
  } catch { return false; }
}
