export type UserIdentity = {
  id?: string | null;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export function getTextInitials(value?: string | null, fallback = "U"): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return fallback;
  }

  const parts = normalizedValue.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return normalizedValue.slice(0, 2).toUpperCase();
}

export function getUserDisplayName(
  user?: UserIdentity | null,
  fallback = "Anonymous"
): string {
  const displayName = user?.display_name?.trim();

  if (displayName) {
    return displayName;
  }

  const fullName = [user?.firstname, user?.lastname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  if (fullName) {
    return fullName;
  }

  const username = user?.username?.trim();

  if (username) {
    return username.startsWith("@") ? username : `@${username}`;
  }

  if (user?.id) {
    return `@${user.id.slice(0, 8)}`;
  }

  return fallback;
}

export function getUserInitials(
  user?: UserIdentity | null,
  fallback = "?"
): string {
  const fullName = [user?.firstname, user?.lastname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  if (fullName) {
    return getTextInitials(fullName, fallback);
  }

  const displayName = user?.display_name?.trim();

  if (displayName) {
    return getTextInitials(displayName, fallback);
  }

  const username = user?.username?.replace(/^@/, "").trim();

  if (username) {
    return getTextInitials(username, fallback);
  }

  if (user?.id) {
    return user.id.slice(0, 2).toUpperCase();
  }

  return fallback;
}
