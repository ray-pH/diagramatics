// Simple encoding/decoding utilities using btoa, atob and encodeURIComponent, decodeURIComponent
// can be used to store user code and pass it in the URL

export function encode(s: string): string {
    return btoa(encodeURIComponent(s));
}

export function decode(s: string): string {
    return decodeURIComponent(atob(s));
}
