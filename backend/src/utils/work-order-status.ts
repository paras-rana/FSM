export const WORK_ORDER_STATUS = {
  CREATED: "CREATED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_FOR_PARTS: "WAITING_FOR_PARTS",
  COMPLETED: "COMPLETED",
  CHECKED_AND_CLOSED: "CHECKED_AND_CLOSED",
  REOPENED: "REOPENED",
  ARCHIVED: "ARCHIVED"
} as const;

export type WorkOrderStatus = keyof typeof WORK_ORDER_STATUS;

const transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  CREATED: ["ASSIGNED", "IN_PROGRESS"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED", "REOPENED"],
  IN_PROGRESS: ["WAITING_FOR_PARTS", "COMPLETED", "REOPENED"],
  WAITING_FOR_PARTS: ["IN_PROGRESS", "COMPLETED", "REOPENED"],
  COMPLETED: ["CHECKED_AND_CLOSED", "REOPENED"],
  CHECKED_AND_CLOSED: ["REOPENED", "ARCHIVED"],
  REOPENED: ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED"],
  ARCHIVED: []
};

export const canTransitionStatus = (from: WorkOrderStatus, to: WorkOrderStatus): boolean => {
  return transitions[from]?.includes(to) ?? false;
};
