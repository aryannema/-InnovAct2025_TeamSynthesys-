export function cn(...cls: (string | undefined | false | null)[]) {
  return cls.filter(Boolean).join(" ");
}
