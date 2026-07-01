import pool from "../config/db.js";
import { logAdminAction } from "../utils/logAdminAction.js";

export const getAllSubadmins = async (req, res) => {
    console.log("Controller: getAllSubadmins called");
    try {
      let { page = 1, limit = 10, search = "", is_blocked } = req.query;
      
      page = parseInt(page, 10);
      limit = parseInt(limit, 10);
      const offset = (page - 1) * limit;
  
      let baseQuery = "SELECT * FROM users WHERE role='sub-admin'";
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
      let countQuery = "SELECT COUNT(*) as total FROM users WHERE role ='sub-admin'";
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


export const createSubadmin = async (req, res) => {
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
        "INSERT INTO users (name, phone, email, created_by , role) VALUES (?, ?, ?, ?,?)",
        [
          name || null,
          phone,
          email || null,
          adminId,
          "sub-admin" 
        ]
      );
  
      const userId = result.insertId;
  
      if (adminId) {
        await logAdminAction(adminId, "ADDED_Sub-Admin", "user", userId);
      }
  
      return res.status(201).json({ message: "Sub-Admin created successfully", user: { id: userId, name, phone, email } });
    } catch (error) {
      console.error("createUser error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };



  export const updateSubadmin = async (req, res) => {
    const { id } = req.params;
    const { name, phone, email , is_blocked } = req.body;
  
    console.log("Controller: updateSubadmin", { id, name, phone, email });
  
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Phone must be 10 digits.",
      });
    }
  
    if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return res.status(400).json({
        message: "Invalid email address.",
      });
    }
  
    try {
      // Check subadmin exists
      const [user] = await pool.execute(
        "SELECT * FROM users WHERE id = ? AND role = 'sub-admin'",
        [id]
      );
  
      if (user.length === 0) {
        return res.status(404).json({
          message: "Sub Admin not found.",
        });
      }
  
      // Check duplicate phone
      const [existingPhone] = await pool.execute(
        "SELECT id FROM users WHERE phone = ? AND id != ?",
        [phone, id]
      );
  
      if (existingPhone.length > 0) {
        return res.status(409).json({
          message: "Phone number already registered.",
        });
      }
  
      // Check duplicate email
      if (email) {
        const [existingEmail] = await pool.execute(
          "SELECT id FROM users WHERE email = ? AND id != ?",
          [email, id]
        );
  
        if (existingEmail.length > 0) {
          return res.status(409).json({
            message: "Email already registered.",
          });
        }
      }
  
      await pool.execute(
        `
          UPDATE users
      SET
          name=?,
          phone=?,
          email=?,
          is_blocked=?
      WHERE id=? AND role='sub-admin'
        `,
        [
          name || null,
          phone,
          email || null,
          Number(is_blocked),
          id,
        ]
      );
  
      const adminId = req.admin?.id || req.user?.id;
  
      if (adminId) {
        await logAdminAction(
          adminId,
          "UPDATED_SUB_ADMIN",
          "user",
          id
        );
      }
  
      return res.json({
        success: true,
        message: "Sub Admin updated successfully.",
        user: {
            id,
            name,
            phone,
            email,
            is_blocked: Number(is_blocked),
        },
    });
  
    } catch (error) {
      console.error("updateSubadmin error:", error);
  
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  };



  export const blockSubadmin = async (req, res) => {
    const { id } = req.params;
  
    console.log("Controller: blockSubadmin", { id });
  
    try {
      // Check sub-admin exists
      const [user] = await pool.execute(
        "SELECT id, is_blocked FROM users WHERE id = ? AND role = 'sub-admin'",
        [id]
      );
  
      if (user.length === 0) {
        return res.status(404).json({
          message: "Sub Admin not found.",
        });
      }
  
      // Toggle block status
      const newStatus = user[0].is_blocked ? 0 : 1;
  
      await pool.execute(
        "UPDATE users SET is_blocked = ? WHERE id = ?",
        [newStatus, id]
      );
  
      const adminId = req.admin?.id || req.user?.id;
  
      if (adminId) {
        await logAdminAction(
          adminId,
          newStatus ? "BLOCKED_SUB_ADMIN" : "UNBLOCKED_SUB_ADMIN",
          "user",
          id
        );
      }
  
      return res.json({
        success: true,
        message: newStatus
          ? "Sub Admin blocked successfully."
          : "Sub Admin unblocked successfully.",
        is_blocked: newStatus,
      });
    } catch (error) {
      console.error("blockSubadmin error:", error);
  
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };


  // export const deleteSubadmin = async (req, res) => {
  //   const { id } = req.params;
  
  //   console.log("Controller: deleteSubadmin", { id });
  
  //   try {
  //     const [user] = await pool.execute(
  //       "SELECT * FROM users WHERE id = ? AND role = 'sub-admin'",
  //       [id]
  //     );
  
  //     if (user.length === 0) {
  //       return res.status(404).json({
  //         message: "Sub Admin not found.",
  //       });
  //     }
  
  //     await pool.execute(
  //       "DELETE FROM users WHERE id = ? AND role = 'sub-admin'",
  //       [id]
  //     );
  
  //     const adminId = req.admin?.id || req.user?.id;
  
  //     if (adminId) {
  //       await logAdminAction(
  //         adminId,
  //         "DELETED_SUB_ADMIN",
  //         "user",
  //         id
  //       );
  //     }
  
  //     return res.json({
  //       message: "Sub Admin deleted successfully.",
  //     });
  
  //   } catch (error) {
  //     console.error("deleteSubadmin error:", error);
  
  //     return res.status(500).json({
  //       message: "Internal server error",
  //     });
  //   }
  // };





