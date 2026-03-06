export const buildingAreas: Record<string, string[]> = {
  HQ: ["Front Desk", "Electrical Room", "Server Room", "Conference Wing"],
  Warehouse: ["Dock 1", "Dock 2", "Storage Aisle", "Packing Zone"],
  Plant: ["Line 1", "Line 2", "Control Room", "Maintenance Bay"],
  "Remote Office": ["Lobby", "Office Floor", "Break Room", "Roof Unit"]
};

export const buildingOptions = Object.keys(buildingAreas);
export const urgencyOptions = ["HIGH", "MEDIUM", "LOW"] as const;
