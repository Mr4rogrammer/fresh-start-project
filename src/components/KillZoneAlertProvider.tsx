import { useKillZones } from "@/hooks/useKillZones";

/**
 * Invisible component that mounts the useKillZones hook globally
 * so background 1-minute checks and toast alerts fire on every page.
 */
export const KillZoneAlertProvider = () => {
  useKillZones();
  return null;
};
