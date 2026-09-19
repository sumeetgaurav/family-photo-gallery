const IST_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatIST(iso: string | null | undefined): string {
  if (!iso) return "Never";
  return `${IST_FORMATTER.format(new Date(iso))} IST`;
}
