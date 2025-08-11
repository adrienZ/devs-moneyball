import { searchLocations } from "../../services/locationService";
import { defineEventHandler, getQuery } from "h3";

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event);
  if (!q || typeof q !== "string") return [];
  return await searchLocations(q);
});
