import pool from "../config/db.js";

// Create a new enquiry
export const submitEnquiry = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { businessId, message , phone  } = req.body;
    console.log(userId,businessId,message, phone)

    if (!userId || !businessId || !message || !phone) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }

    const createdAt = new Date();
    const query = `
      INSERT INTO enquiries (user_id, business_id, phone, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [userId, businessId, phone, message, createdAt]);

    res.status(201).json({
      msg: 'Enquiry submitted successfully',
      enquiry: {
        id: result.insertId,
        user_id: userId,
        business_id: businessId,
        phone,
        message,
        created_at: createdAt,
      },
    });
  } catch (error) {
    console.error('Submit Enquiry Error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get all enquiries for all businesses owned by logged-in user
// export const getAllEnquiriesForOwner = async (req, res) => {
//   try {
//     const ownerId = req.user?.id;
//     console.log("Decoded ownerId:", ownerId);

//     if (!ownerId) return res.status(401).json({ msg: 'Unauthorized' });

//     const query = `
//     SELECT
//       b.id AS business_id,
//       b.name AS business_name,
//       e.id AS enquiry_id,
//       e.phone AS user_phone,
//       e.message,
//       e.created_at,
//       u.email
//     FROM businesses b
//     LEFT JOIN enquiries e ON e.business_id = b.id
//     LEFT JOIN users u ON e.user_id = u.id
//     WHERE b.owner_id = ?
//     ORDER BY b.name ASC, e.created_at DESC
//     `;

//     const [rows] = await pool.query(query, [ownerId]);
//     console.log("DB Rows:", rows);

//     const grouped = {};
//     rows.forEach(row => {
//       const { business_id, business_name, enquiry_id, message, created_at, email } = row;

//       if (!grouped[business_id]) {
//         grouped[business_id] = {
//           name: business_name,
//           enquiries: [],
//         };
//       }

//       if (enquiry_id !== null) {
//         grouped[business_id].enquiries.push({
//           id: enquiry_id,
//           message,
//           created_at,
//           email,
//         });
//       }
//     });

//     res.json(grouped);

//   } catch (error) {
//     console.error('Get Enquiries Error:', error);
//     res.status(500).json({ msg: 'Server error', error: error.message });
//   }
// };


export const getAllEnquiriesForOwner = async (req, res) => {
  try {
    const ownerId = req.user?.id;
    console.log("TOKEN USER:", req.user.id);

    if (!ownerId) return res.status(401).json({ msg: 'Unauthorized' });

    const query = `
      SELECT
        b.id AS business_id,
        b.name AS business_name,
        e.id AS enquiry_id,
        e.phone AS user_phone,
        e.message,
        e.created_at,
        u.email
      FROM businesses b
      LEFT JOIN enquiries e ON e.business_id = b.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE b.owner_id = ?
      ORDER BY b.name ASC, e.created_at DESC
    `;

    const [rows] = await pool.query(query, [ownerId]);

    const grouped = {};
    rows.forEach(row => {
      const { business_id, business_name, enquiry_id, message, created_at, email, user_phone } = row;

      if (!grouped[business_id]) {
        grouped[business_id] = {
          name: business_name,
          enquiries: [],
        };
      }

      if (enquiry_id !== null) {
        grouped[business_id].enquiries.push({
          id: enquiry_id,
          message,
          created_at,
          email,
          phone: user_phone,
        });
      }
    });

    res.json(grouped);

  } catch (error) {
    console.error('Get Enquiries Error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};


// All enquiries
export const getAllEnquiriesForAdmin = async (req, res) => {
  try {
    // Get pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
    
        // Get total count
        const [countRows] = await pool.query(` SELECT COUNT(*) AS total FROM enquiries`);
        const total = countRows[0].total;
        const totalPages = Math.ceil(total / limit);

    const query = `
      SELECT 
        e.id AS enquiry_id,
        u.name AS user_name,
        u.email AS user_email,
        e.phone AS user_phone,
        e.message,
        e.created_at,
        b.id AS business_id,
        b.name AS business_name
      FROM enquiries e
      JOIN businesses b ON e.business_id = b.id
      JOIN users u ON e.user_id = u.id
      ORDER BY b.name ASC, e.created_at DESC
       LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(query, [limit, offset]);

    res.json({
      page,
      limit,
      total,
      totalPages,
      data: rows
    });

    // res.json(rows); // Return flat array (simpler for frontend)
  } catch (err) {
    console.error("Error fetching admin enquiries:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

