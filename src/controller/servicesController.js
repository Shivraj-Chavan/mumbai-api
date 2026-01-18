import pool from "../config/db.js";

// export const getAllServices = async (req, res) => {
//     try {
//       // Pagination
//       const limit = parseInt(req.query.limit) || 10;
//       const page = parseInt(req.query.page) || 1;
//       const offset = (page - 1) * limit;
  
//       // Filters
//       const category_id = req.query.category_id;
//       const subcategory_id = req.query.subcategory_id;
  
//       let where = [];
//       let params = [];
  
//       if (category_id) {
//         where.push("s.category_id = ?");
//         params.push(category_id);
//       }
//       if (subcategory_id) {
//         where.push("s.subcategory_id = ?");
//         params.push(subcategory_id);
//       }
  
//       const whereSQL = where.length ? "WHERE " + where.join(" AND ") : "";
  
//       //  Fetch services
//       const [services] = await pool.query(
//         `
//         SELECT 
//           s.id,
//           s.name AS service_name,
//           s.created_at,
//           c.name AS category_name,
//           sc.name AS subcategory_name
//         FROM services s
//         LEFT JOIN categories c ON c.id = s.category_id
//         LEFT JOIN subcategories sc ON sc.id = s.subcategory_id
//         ${whereSQL}
//         ORDER BY s.id DESC
//         LIMIT ? OFFSET ?
//         `,
//         [...params, limit, offset] //  Must be numbers, not strings
//       );
  
//       //  Total count for pagination
//       const [[{ total }]] = await pool.query(
//         `SELECT COUNT(*) AS total FROM services s ${whereSQL}`,
//         params
//       );
  
//       // Response
//       res.json({
//         data: services,
//         pagination: {
//           page,
//           limit,
//           total,
//           totalPages: Math.ceil(total / limit),
//         },
//       });
  
//     } catch (err) {
//       console.error("getAllServices error:", err);
//       res.status(500).json({ message: "Failed to fetch services" });
//     }
//   };
  

// export const createServices = async (req, res) => {
//     try {
//       const { category_id, subcategory_id, services } = req.body;
//       console.log({category_id,subcategory_id,services});
  
//       if (!category_id || !subcategory_id || !Array.isArray(services)) {
//         return res.status(400).json({ message: "Invalid payload" });
//       }
  
//       if (!services.length) {
//         return res.status(400).json({ message: "No services provided" });
//       }
  
//       const values = services
//         .map((s) => s.trim())
//         .filter(Boolean)
//         .map((name) => [category_id, subcategory_id, name]);
  
//       if (!values.length) {
//         return res.status(400).json({ message: "Empty service names" });
//       }
  
//       await pool.query(
//         `
//         INSERT INTO services (category_id, subcategory_id, name)
//         VALUES ?
//         `,
//         [values]
//       );
  
//       res.status(201).json({
//         message: "Services added successfully",
//         count: values.length
//       });
  
//     } catch (err) {
//       console.error("Create Services Error:", err);
  
//       if (err.code === "ER_DUP_ENTRY") {
//         return res.status(409).json({
//           message: "One or more services already exist in this subcategory"
//         });
//       }
  
//       res.status(500).json({ message: "Server error" });
//     }
//   };




// export const getAllServices = async (req, res) => {
//   try {
//     const { subcategory_id, status, category_id } = req.query;

//     let sql = `
//       SELECT 
//         s.id,
//         s.name,
//         s.status,
//         s.created_at,

//         c.name AS category_name,
//         sc.name AS subcategory_name

//       FROM services s
//       LEFT JOIN categories c 
//         ON c.id = s.category_id
//       LEFT JOIN subcategories sc 
//         ON sc.id = s.subcategory_id
//       WHERE 1 = 1
//     `;

//     const params = [];

//     if (category_id) {
//       sql += " AND s.category_id = ?";
//       params.push(category_id);
//     }

//     if (subcategory_id) {
//       sql += " AND s.subcategory_id = ?";
//       params.push(subcategory_id);
//     }

//     if (status) {
//       sql += " AND s.status = ?";
//       params.push(status);
//     }

//     sql += " ORDER BY s.id DESC";

//     const [rows] = await pool.query(sql, params);

//     res.json({
//       data: rows
//     });

//   } catch (err) {
//     console.error("Fetch services error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };





// export const createServices = async (req, res) => {
//   try {
//     const { category_id, subcategory_id, services } = req.body;

//     if (!category_id || !subcategory_id || !Array.isArray(services)) {
//       return res.status(400).json({ message: "Invalid payload" });
//     }

//     if (!services.length) {
//       return res.status(400).json({ message: "No services provided" });
//     }

//     // Decide status
//     const status = req.user?.role === "admin" ? "active" : "inactive";

//     const values = services
//       .map(s => s.trim())
//       .filter(Boolean)
//       .map(name => [category_id, subcategory_id, name, status]);

//     if (!values.length) {
//       return res.status(400).json({ message: "Empty service names" });
//     }

//     await pool.query(
//       `
//       INSERT INTO services (category_id, subcategory_id, name, status)
//       VALUES ?
//       `,
//       [values]
//     );

//     res.status(201).json({
//       message: `Services added successfully as ${status}`,
//       count: values.length
//     });

//   } catch (err) {
//     console.error("Create Services Error:", err);

//     if (err.code === "ER_DUP_ENTRY") {
//       return res.status(409).json({
//         message: "One or more services already exist"
//       });
//     }

//     res.status(500).json({ message: "Server error" });
//   }
// };


export const getAllServices = async (req, res) => {
  try {
    const {
      subcategory_id,
      status,
      category_id,
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(parseInt(limit) || 10, 100); // safety cap
    const offset = (pageNum - 1) * limitNum;

    let baseSql = `
      FROM services s
      LEFT JOIN categories c 
        ON c.id = s.category_id
      LEFT JOIN subcategories sc 
        ON sc.id = s.subcategory_id
      WHERE 1 = 1
    `;

    const params = [];

    if (category_id) {
      baseSql += " AND s.category_id = ?";
      params.push(category_id);
    }

    if (subcategory_id) {
      baseSql += " AND s.subcategory_id = ?";
      params.push(subcategory_id);
    }

    if (status) {
      baseSql += " AND s.status = ?";
      params.push(status);
    }

    // 👉 Total count query (for pagination meta)
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const [[{ total }]] = await pool.query(countSql, params);

    // 👉 Data query
    const dataSql = `
      SELECT 
        s.id,
        s.name,
        s.status,
        s.created_at,
        c.name AS category_name,
        sc.name AS subcategory_name
      ${baseSql}
      ORDER BY s.id DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limitNum, offset];
    const [rows] = await pool.query(dataSql, dataParams);

    res.json({
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    console.error("Fetch services error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const createServices = async (req, res) => {
  try {
    const { category_id, subcategory_id, services } = req.body;

    const rawRole = req.user?.role || "user";
    const userRole = String(rawRole).toLowerCase();

    const isAdmin = ["admin", "sub-admin"].includes(userRole);

    const status = isAdmin ? "active" : "inactive";

    console.log("ROLE DEBUG =>", {
      rawRole,
      userRole,
      isAdmin,
      status
    });

    if (!category_id || !subcategory_id || !Array.isArray(services)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    if (!services.length) {
      return res.status(400).json({ message: "No services provided" });
    }

    const values = services
      .map(s => String(s).trim())
      .filter(Boolean)
      .map(name => [category_id, subcategory_id, name, status]);

    if (!values.length) {
      return res.status(400).json({ message: "Empty service names" });
    }

    await pool.query(
      `
        INSERT INTO services (category_id, subcategory_id, name, status)
        VALUES ?
      `,
      [values]
    );

    return res.status(201).json({
      message: isAdmin
        ? "Service added and activated successfully"
        : "Service submitted for admin approval",
      count: values.length,
      status
    });

  } catch (err) {
    console.error("Create Services Error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "One or more services already exist in this subcategory"
      });
    }

    return res.status(500).json({ message: "Server error" });
  }
};


export const updateServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await pool.query(
      `UPDATE services SET status = ? WHERE id = ?`,
      [status, id]
    );

    return res.json({
      message: `Service ${status === "active" ? "activated" : "deactivated"} successfully`,
      status
    });

  } catch (err) {
    console.error("Update Service Status Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

  


  export const deleteService = async (req, res) => {
    const serviceId = Number(req.params.id);
    console.log("DELETE HIT → ID:", serviceId);
  
    if (!serviceId) {
      return res.status(400).json({ message: "Valid Service ID is required" });
    }
  
    try {
      const [rows] = await pool.query(
        "SELECT id FROM services WHERE id = ?",
        [serviceId]
      );
  
      if (!rows.length) {
        return res.status(404).json({ message: "Service not found" });
      }
  
      const [result] = await pool.query(
        "DELETE FROM services WHERE id = ?",
        [serviceId]
      );
  
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: "Delete failed" });
      }
  
      return res.status(200).json({ message: "Service deleted successfully" });
  
    } catch (err) {
      console.error("Delete service error:", err);
      return res.status(500).json({
        message: "Delete failed",
        error: err.message
      });
    }
  };



  export const updateService = async (req, res) => {
    try {
      const serviceId = req.params.id;
      const { name } = req.body;
  
      if (!name) {
        return res.status(400).json({ message: "Service name required" });
      }
  
      const result = await pool.query(
        "UPDATE services SET name = ? WHERE id = ?",
        [name, serviceId]
      );
  
      return res.status(200).json({ message: "Service updated successfully" });
  
    } catch (err) {
      console.error("Update Service Error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  };
  