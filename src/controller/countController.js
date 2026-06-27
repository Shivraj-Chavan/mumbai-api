import pool from "../config/db.js";

export const trackVisit = async (req, res) => {
  try {
    await pool.query(`UPDATE website_visits SET count = count + 1 WHERE id = 1`);
    const [rows] = await pool.query("SELECT COUNT(*) AS count FROM website_visits");
    const visitCount = rows[0]?.count || 0;
    res.json({ visitCount });
  } catch (error) {
    console.error("Failed to track visit:", error);
    res.status(500).json({ msg: "Failed to track visit", error: error.message });
  }
};
