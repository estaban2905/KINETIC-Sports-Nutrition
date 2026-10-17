/** Avatar con las iniciales del cliente, como data URI (sin pedir imágenes a terceros). */
export function initialsAvatar(name: string, email = ''): string {
  const source = name.trim() || email.split('@')[0] || '?';
  const initials = source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" fill="#262626"/>` +
    `<text x="48" y="48" dy=".35em" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#a3e635">${initials.replace(/[<>&"]/g, '')}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
