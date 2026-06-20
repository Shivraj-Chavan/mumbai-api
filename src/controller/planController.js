import pool from "../config/db.js";


export const getPlans = async (req, res) => {
    try {
        const [plans] = await pool.query(`
          SELECT * FROM plans 
          ORDER BY FIELD(LOWER(name), 'Free', 'Silver', 'Gold', 'Platinum')`);
          console.log("Fetched plans:",JSON.stringify(plans, null, 2)); 
         res.json(plans);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch plans" });
      }
};

export const saveBusinessPlan = async (req, res) => {
  let { business_id, plan_duration, plan_price, plan_id, startDate, endDate } = req.body;

  if (!business_id || !plan_price || !plan_id || !startDate || !endDate) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    // Ensure dates are in YYYY-MM-DD format
    const formatDate = (date) => {
      if (!date) return null;
      if (typeof date === "string") return date.slice(0, 10); // already string
      return new Date(date).toISOString().slice(0, 10); // if Date object
    };

    startDate = formatDate(startDate);
    endDate = formatDate(endDate);

    const [result] = await pool.query(
      `INSERT INTO business_plans 
       (business_id, plan_duration, plan_price, plan_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [business_id, plan_duration, plan_price, plan_id, startDate, endDate]
    );

    res.json({ message: "Plan selected successfully", id: result.insertId });
  } catch (err) {
    console.error("Plan selection failed:", err);
    res.status(500).json({ error: "Failed to save plan" });
  }
};

export const savePlan = async (req, res) => {
  const { business_id, plan_price, plan_id } = req.body;

  if (!business_id || !plan_price || !plan_id) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {                                   
    const startDate = new Date();
    let endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30); 

    const [result] = await pool.query(
      `INSERT INTO business_plans 
       (business_id, plan_price, plan_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [
        business_id,
        plan_price,
        plan_id,
        startDate.toISOString().slice(0, 10),
        endDate.toISOString().slice(0, 10),
      ]
    );

    res.json({ message: "Plan selected successfully", id: result.insertId });
  } catch (err) {
    console.error("Plan selection failed:", err);
    res.status(500).json({ error: "Failed to save plan" });
  }
};


export const getSelectedPlan = async (req, res) => {
  const { business_id } = req.params;
  console.log('businessid', business_id);

  if (!business_id) {
    return res.status(400).json({ error: "Missing business_id" });
  }

  try {
    const [selected] = await pool.query(
      `SELECT p.*, bp.plan_duration, bp.start_date, bp.end_date
       FROM business_plans bp
       JOIN plans p ON bp.plan_id = p.id
       WHERE bp.business_id = ?
       ORDER BY bp.id DESC
       LIMIT 1`,
      [business_id]
    );

    console.table(selected);

    if (!selected.length) {
      return res.status(404).json({ error: "No plan selected by this business" });
    }

    const plan = selected[0];

    // Check active status
    let isActive = true;
    if (plan.end_date) {
      const today = new Date();
      const endDate = new Date(plan.end_date);
      isActive = endDate >= today;
    }

    res.json({
      ...plan,
      isActive
    });
  } catch (err) {
    console.error("Failed to fetch selected plan:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getBusinessPlansStatus = async (req, res) => {
  try {
    let { search, plan_status, page = 1, limit = 10 } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));
    const offset = (page - 1) * limit;

    // Base query
    let query = `
      SELECT 
        b.id AS business_id,
        b.name AS business_name,
        b.phone AS business_phone,
        p.transaction_id,
        p.plan AS plan_id,
        pl.name AS plan_name,
        p.amount,
        p.status AS payment_status,
        p.created_at AS payment_time,
        bp.start_date,
        bp.end_date
      FROM payments p
      JOIN businesses b ON p.business_id = b.id
      LEFT JOIN business_plans bp 
        ON bp.business_id = b.id AND bp.plan_id = p.plan
      LEFT JOIN plans pl ON pl.id = p.plan
      WHERE 1=1
    `;
    let values = [];

    // 🔹 Single search for both name & phone
    if (search) {
      query += ` AND (b.name LIKE ? OR b.phone LIKE ?)`;
      values.push(`%${search}%`, `%${search}%`);
    }

    if (plan_status) {
      query += ` AND p.status = ?`;
      values.push(plan_status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    console.log("Final Query:", query);
    console.log("Values:", values);

    const [rows] = await pool.execute(query, values);

    // Count query for pagination
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM payments p
      JOIN businesses b ON p.business_id = b.id
      WHERE 1=1
    `;
    let countValues = [];

    if (search) {
      countQuery += ` AND (b.name LIKE ? OR b.phone LIKE ?)`;
      countValues.push(`%${search}%`, `%${search}%`);
    }

    if (plan_status) {
      countQuery += ` AND p.status = ?`;
      countValues.push(plan_status);
    }

    const [[countResult]] = await pool.execute(countQuery, countValues);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Format result
    const result = rows.map(r => ({
      business_id: r.business_id,
      business_name: r.business_name,
      business_phone: r.business_phone,
      plan_id: r.plan_id,
      plan_name: r.plan_name || "N/A",
      amount: r.amount,
      transaction_id: r.transaction_id,
      payment_status: r.payment_status,
      payment_time: r.payment_time,
      plan_start: r.start_date,
      plan_end: r.end_date
    }));

    res.status(200).json({
      page,
      limit,
      total,
      totalPages,
      data: result
    });
  } catch (error) {
    console.error("Error fetching business plan status:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

