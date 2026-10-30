import type { User } from "./types";
export function profileChanges(
  values: { name: string; username: string; phone: string; bio: string },
  user: User,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) =>
        value !== (user[key as keyof User] ?? "") &&
        (key !== "phone" || value.trim() !== ""),
    ),
  );
}
export function optionalPhone(phone: string): { phone?: string } {
  return phone.trim() ? { phone: phone.trim() } : {};
}
