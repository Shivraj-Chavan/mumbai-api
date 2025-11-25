import pool from "../config/db.js";

export async function logAdminAction(adminId, action, targetType, targetId) {
  try {
    await pool.execute(
      `INSERT INTO admin_actions (admin_id, action, target_type, target_id, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, action, targetType, targetId, new Date()]
    );
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
}
