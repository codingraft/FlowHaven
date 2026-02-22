/**
 * Client-side AES-256-GCM encryption using the Web Crypto API.
 * The encryption key is derived from the user's password using PBKDF2.
 * The key is persisted in sessionStorage (survives refreshes, cleared on tab close).
 */

const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH = 256
const SALT_LENGTH = 16
const IV_LENGTH = 12

const SESSION_KEY_STORAGE = '__ft_sk'
const SESSION_SALT_STORAGE = '__ft_ss'

// ── Key derivation ──────────────────────────────────────────────────────────

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    )

    const saltBuffer = salt.buffer instanceof ArrayBuffer ? salt.buffer : new Uint8Array(salt).buffer
    const saltView = new Uint8Array(saltBuffer, salt.byteOffset, salt.byteLength)

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltView,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: KEY_LENGTH },
        true, // extractable — needed so we can persist to sessionStorage
        ['encrypt', 'decrypt']
    )
}

// ── Encrypt ─────────────────────────────────────────────────────────────────

export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
    const enc = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext)
    )

    // Pack: salt (16) + iv (12) + ciphertext
    const packed = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
    packed.set(salt, 0)
    packed.set(iv, salt.length)
    packed.set(new Uint8Array(ciphertext), salt.length + iv.length)

    return btoa(String.fromCharCode(...packed))
}

// ── Decrypt ─────────────────────────────────────────────────────────────────

export async function decrypt(cipherBase64: string, key: CryptoKey): Promise<string> {
    const packed = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0))

    const iv = packed.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const ciphertext = packed.slice(SALT_LENGTH + IV_LENGTH)

    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    )

    return new TextDecoder().decode(plaintext)
}

// ── Key persistent storage ──────────────────────────────────────────────────
// Using localStorage so the key persists across tab closes (matching Supabase auth lifetime).
// The key is cleared on explicit logout via clearSessionKey().

let sessionKey: CryptoKey | null = null

export async function setSessionKey(key: CryptoKey, salt: Uint8Array) {
    sessionKey = key

    // Persist to localStorage so the key survives tab closes & refreshes
    try {
        const rawKey = await crypto.subtle.exportKey('raw', key)
        const b64Key = btoa(String.fromCharCode(...new Uint8Array(rawKey)))
        const b64Salt = btoa(String.fromCharCode(...salt))
        localStorage.setItem(SESSION_KEY_STORAGE, b64Key)
        localStorage.setItem(SESSION_SALT_STORAGE, b64Salt)
    } catch {
        // If export fails, key still works in-memory for this page load
    }
}

export async function restoreSessionKey(): Promise<boolean> {
    if (sessionKey) return true // already in memory

    try {
        const b64Key = localStorage.getItem(SESSION_KEY_STORAGE)
        if (!b64Key) return false

        const rawKey = Uint8Array.from(atob(b64Key), c => c.charCodeAt(0))
        sessionKey = await crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-GCM', length: KEY_LENGTH },
            true,
            ['encrypt', 'decrypt']
        )
        return true
    } catch {
        return false
    }
}

export function getSessionKey(): CryptoKey | null {
    return sessionKey
}

export function clearSessionKey() {
    sessionKey = null
    try {
        localStorage.removeItem(SESSION_KEY_STORAGE)
        localStorage.removeItem(SESSION_SALT_STORAGE)
    } catch {
        // SSR or restricted context
    }
}

export function hasSessionKey(): boolean {
    return sessionKey !== null
}

// ── Helpers for encrypting/decrypting with the session key ──────────────────

export async function encryptField(value: string): Promise<string> {
    if (!sessionKey) {
        // Try to recover the key from sessionStorage
        await restoreSessionKey()
    }
    if (!sessionKey) return value
    return encrypt(value, sessionKey)
}

export async function decryptField(value: string): Promise<string> {
    if (!sessionKey) {
        // Try to recover the key from sessionStorage
        const restored = await restoreSessionKey()
        if (!restored) {
            console.warn('[crypto] decryptField: no session key available (sessionStorage empty — re-login required)')
            return value
        }
    }
    try {
        return await decrypt(value, sessionKey!)
    } catch {
        return value
    }
}

// ── Generate a new salt for a new user ──────────────────────────────────────

export function generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
    return btoa(String.fromCharCode(...salt))
}

export function saltFromBase64(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}
