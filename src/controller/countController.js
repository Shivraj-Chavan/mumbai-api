import pool from "../config/db.js";

export const trackVisit = async (req, res) => {
  try {
    await pool.query(`UPDATE website_visits SET count = count + 1 WHERE id = 1`);
    const [[row]] = await pool.query(`SELECT count FROM website_visits WHERE id = 1`);
    console.log({row})
    res.status(200).json({ visitCount: row.count });
  } catch (error) {
    res.status(500).json({ msg: "Failed to track visit", error: error.message });
  }
};
