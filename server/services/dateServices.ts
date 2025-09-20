import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(utc);
dayjs.extend(isoWeek);

export const dateService = dayjs;

type Period = "daily" | "weekly" | "yearly";

export function periodStartISO(dateISO: string, period: Period): string {
  const d = dayjs.utc(dateISO);
  if (period === "daily") return d.startOf("day").format("YYYY-MM-DD");
  if (period === "weekly") return d.startOf("isoWeek").format("YYYY-MM-DD"); // lundi
  return d.startOf("year").format("YYYY-MM-DD");
}
