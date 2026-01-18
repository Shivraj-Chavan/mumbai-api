import pool from "../config/db.js";

export const getAdminDashboard = async (req, res) => {
  try {
    /* =======================
       BASIC COUNTS
    ======================== */
    const [[users]] = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE role = 'user'`
    );

    const [[businesses]] = await pool.query(
      `SELECT COUNT(*) AS count FROM businesses`
    );
    

    const [[reviews]] = await pool.query(
      `SELECT COUNT(*) AS count FROM reviews`
    );

    const [[contact_us]] = await pool.query(
      `SELECT COUNT(*) AS count FROM contact_us`
    );

    const [[enquiries]] = await pool.query(
      `SELECT COUNT(*) AS count FROM enquiries`
    );

    // Safe inactive services count (check if column exists)
    let inactive_services = { count: 0 };
    try {
      [[inactive_services]] = await pool.query(
        `SELECT COUNT(*) AS count FROM services WHERE status = 'inactive'`
      );
    } catch (err) {
      console.warn("No 'status' column in services table, skipping inactive_services count");
    }

    // Safe update_businesses count (check if column exists)
    let update_businesses = { count: 0 };

    try {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS count 
         FROM update_businesses 
         WHERE is_verified = 1`
      );
    
      update_businesses = rows[0]; 
    } catch (err) {
      console.warn(
        "update_businesses.status column missing → returning 0"
      );
    }
    

    /* =======================
       REGISTRATIONS BY MONTH
    ======================== */
    const [registrations] = await pool.query(`
      SELECT
        DATE_FORMAT(MIN(created_at), '%b %Y') AS month,
        SUM(role = 'user') AS users,
        SUM(role = 'business') AS business
      FROM users
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY YEAR(created_at), MONTH(created_at)
    `);

    /* =======================
       BUSINESS STATUS
    ======================== */
    let businessStatus = [];
    try {
      [businessStatus] = await pool.query(`
        SELECT status, COUNT(*) AS count
        FROM businesses
        GROUP BY status
      `);
    } catch (err) {
      console.warn("No 'status' column in businesses table, skipping businessStatus stats");
    }

    /* =======================
       REVIEW STATS
    ======================== */
    const [reviewStats] = await pool.query(`
      SELECT rating, COUNT(*) AS count
      FROM reviews
      GROUP BY rating
      ORDER BY rating DESC
    `);

    /* =======================
       QUICK STATS
    ======================== */
    const [[newUsers]] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE DATE(created_at) = CURDATE()
    `);

    const [[todayBusiness]] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE role = 'business'
      AND DATE(created_at) = CURDATE()
    `);

    let pendingBusiness = { count: 0 };
    try {
      [[pendingBusiness]] = await pool.query(`
        SELECT COUNT(*) AS count
        FROM businesses
        WHERE is_verified = 0
      `);
    } catch (err) {
      console.warn("No 'status' column in businesses table, skipping pendingBusiness count");
    }

    /* =======================
       RESPONSE
    ======================== */
    res.json({
      stats: {
        users: users.count,
        businesses: businesses.count,
        reviews: reviews.count,
        contact_us: contact_us.count,
        enquiries: enquiries.count,
        inactive_services: inactive_services.count,
        update_businesses: update_businesses.count
      },
      registrations,
      businessStatus,
      reviewStats,
      quickStats: {
        newUsers: newUsers.count,
        todayBusiness: todayBusiness.count,
        pendingBusiness: pendingBusiness.count
      }
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({
      message: "Dashboard fetch failed",
      error: err.message
    });
  }
};
