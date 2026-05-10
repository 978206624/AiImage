export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.indexOf("@");
  if (at < 1) return email;
  const name = email.slice(0, at);
  const domain = email.slice(at);
  if (name.length <= 2) return `${name[0]}***${domain}`;
  return `${name[0]}***${name[name.length - 1]}${domain}`;
}

export function maskKey(key: string | null | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return key;
  return `${key.slice(0, 5)}****${key.slice(-4)}`;
}
