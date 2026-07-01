import pool from "../config/db.js";
import { logAdminAction } from "../utils/logAdminAction.js";

export const getAllUsers = async (req, res) => {
  console.log("Controller: getAllUsers called");
  try {
    let { page = 1, limit = 10, search = "", is_blocked } = req.query;
    
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const offset = (page - 1) * limit;

    let baseQuery = "SELECT * FROM users WHERE role='user'";
    const params = [];

    // Search filter
    if (search) {
      baseQuery += " AND (name LIKE ? OR phone LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Blocked filter
    if (typeof is_blocked !== "undefined") {
      baseQuery += " AND is_blocked = ?";
      params.push(Number(is_blocked));
    }

    if(req.user.role == "sub-admin"){
      baseQuery += " AND created_by = ?";
      params.push(req.user.id);
    }

    // Sort AFTER filters
    baseQuery += " ORDER BY created_at DESC";

    // Pagination
    baseQuery += ` LIMIT ${limit} OFFSET ${offset}`;

    console.log("Final Query:", baseQuery);
    console.log("Query Params:", params);

    const [rows] = await pool.execute(baseQuery, params);

    // Count Query (NO ORDER BY here)
    let countQuery = "SELECT COUNT(*) as total FROM users WHERE role='user'";
    const countParams = [];

    if (search) {
      countQuery += " AND (name LIKE ? OR phone LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }
     
    if(req.user.role == "sub-admin"){
      countQuery += " AND created_by = ?";
      countParams.push(req.user.id);
    }

    if (typeof is_blocked !== "undefined") {
      countQuery += " AND is_blocked = ?";
      countParams.push(Number(is_blocked));
    }

    const [countResult] = await pool.execute(countQuery, countParams);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return res.json({
      data: rows,
      pagination: {
        total,
        page,
        totalPages,
        limit,
      },
    });

  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({ message: "Failed to get users" });
  }
};


export const getMyProfile = async (req, res) => {
  console.log("Controller: getMyProfile called, user id:", req.user?.id);
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: "User id missing" });
    }
    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [userId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(rows[0]);
  } catch (error) {
    console.error("getMyProfile error:", error);
    return res.status(500).json({ message: "Failed to get profile" });
  }
};

// export const updateUserProfile = async (req, res) => {
//   const { id } = req.params;
//   const { name, phone, profile_image } = req.body;
//   console.log("Controller: updateUserProfile", id, { name, phone, profile_image });

//   try {
//     const [result] = await pool.execute(
//       "UPDATE users SET name = ?, phone = ?, profile_image = ? WHERE id = ?",
//       [name, phone, profile_image, id]
//     );
//     console.log("Update result:", result);
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     return res.json({ message: "Profile updated successfully" });
//   } catch (error) {
//     console.error("updateUserProfile error:", error);
//     return res.status(500).json({ message: "Failed to update profile" });
//   }
// };


export const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { name = null, phone = null, email = null, is_blocked = 0, profile_image = null } = req.body;

  try {
    const [result] = await pool.execute(
      "UPDATE users SET name = ?, phone = ?, email = ?, is_blocked = ?, profile_image = ? WHERE id = ?",
      [
        name ?? null,
        phone ?? null,
        email ?? null,
        is_blocked ?? 0,       
        profile_image ?? null,
        id
      ]
    );


    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return updated user
    const [updatedRows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);

     // Log admin action 
    if (req.admin?.id) {
      await logAdminAction(req.admin.id, "UPDATED_USER PROFILE", "user", id);
    }

    return res.json({ message: "Profile updated successfully", data: updatedRows[0] });
  } catch (error) {
    console.error("updateUserProfile error:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};


export const createUser = async (req, res) => {
  const { name, phone, email } = req.body;
  console.log("Controller: createUser", { name, phone, email });

  if (!phone || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ message: "Phone must be 10 digits." });
  }
  if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  try {
    const [existing] = await pool.execute("SELECT * FROM users WHERE phone = ?", [phone]);
    console.log('existing',existing);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Phone number already registered." });
    }
    const adminId = req.admin?.id || req.user?.id; 
    const [result] = await pool.execute(
      "INSERT INTO users (name, phone, email, created_by) VALUES (?, ?, ?, ?)",
      [
        name || null,
        phone,
        email || null,
        adminId,
      ]
    );

    const userId = result.insertId;

    if (adminId) {
      await logAdminAction(adminId, "ADDED_USER", "user", userId);
    }

    return res.status(201).json({ message: "User created successfully", user: { id: userId, name, phone, email } });
  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// user profile 
export const completeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    const [result] = await pool.execute(
      "UPDATE users SET name=?, email=? WHERE id=?",
      [name, email, userId]
    );

    res.json({
      msg: "Profile updated",
      name,
      email,
      phone: req.user.phone,
      role: req.user.role,
      token: req.user.token
    });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong" });
  }
};

