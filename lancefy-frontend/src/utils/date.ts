export function formatDbDate(
  value?: string | null,
  locale: string = "en"
) {
  if (!value) return "-";

  const isoLike = value.replace(" ", "T");
  const date = new Date(isoLike);

  if (isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(
    locale === "th" ? "th-TH" : "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}
