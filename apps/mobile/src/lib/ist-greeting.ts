const IST = "Asia/Kolkata";

export function getIstGreeting(now: Date): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: IST,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function getIstDateLine(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday").toUpperCase();
  const day = get("day");
  const month = get("month").toUpperCase();
  return `${weekday} · ${day} ${month}`;
}
