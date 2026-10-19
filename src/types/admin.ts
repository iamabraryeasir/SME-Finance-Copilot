export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  banned: boolean;
  banReason: string | null;
  joinedAt: string;
  companyName: string;
  currency: string;
  openingBalance: number;
  minReserveThreshold: number;
  isTelegramLinked: boolean;
  telegramUsername: string | null;
  stats: {
    invoicesCount: number;
    transactionsCount: number;
    alertsCount: number;
    documentsCount: number;
    conversationsCount: number;
  };
}

export interface AdminAuditItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  actor: "USER" | "AGENT" | "SYSTEM" | "TELEGRAM";
  actionType: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  status: "SUCCESS" | "FAILED" | "PENDING_APPROVAL";
  ipAddress: string | null;
  createdAt: string;
}
