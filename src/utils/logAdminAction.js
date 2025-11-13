import pool from "../config/db";

export async function logAdminAction(adminId, action, targetType, targetId) {
  await pool.admin_actions.create({
    data: {
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
    },
  });
}
