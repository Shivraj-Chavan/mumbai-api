import slugify from "slugify";
import pool from "../config/db.js";
import { isAdminOrSubadmin } from "../utils/checkAdmin.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { fileURLToPath } from 'url';
import path from "path";

export const getAllRegistrationInq = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM registrationInq`
    );

    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);


    const [rows] = await pool.query(
      `SELECT * 
       FROM registrationInq 
       ORDER BY createdAt DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.status(200).json({
      registrations: rows,
      total,
      page,
      totalPages,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// Generate unique slug
export const getUniqueSlug = async (name, area, excludeId = null) => {
  let baseSlug = slugify(`${name}-${area}`, { lower: true, strict: true });
  let uniqueSlug = baseSlug;
  let count = 1;

  let query = "SELECT slug FROM businesses WHERE slug = ?";
  let params = [uniqueSlug];
  if (excludeId) {
    query += " AND id != ?";
    params.push(excludeId);
  }

  let [existing] = await pool.query(query, params);

  while (existing.length > 0) {
    uniqueSlug = `${baseSlug}-${count++}`;
    params[0] = uniqueSlug;
    [existing] = await pool.query(query, params);
  }

  return uniqueSlug;
};

// Create Business Controller
export const createBusiness = async (req, res) => {
  console.log("Creating business...");

  const rawServices = req.body.services;
let services = [];

try {
  services = typeof rawServices === "string"
    ? JSON.parse(rawServices)
    : rawServices || [];
} catch (err) {
  services = [];
}

  try {
    const user = req.user;
    if (!user) return res.status(401).json({ msg: "Unauthorized" });

    const userId = user.id;
    const {
      owner_id: providedOwnerId,
      name,
      category_id,
      subcategory_id,
      pin_code,
      address,
      landmark,
      area,
      phone,
      wp_number,
      email,
      description,
      website,
      timing,
      latitude,
      longitude,
    } = req.body;

    const owner_id = providedOwnerId || userId;

    // Required Validations
    if (!name) return res.status(400).json({ msg: "Business name is required" });
    if (!category_id) return res.status(400).json({ msg: "Category is required" });
    if (!area) return res.status(400).json({ msg: "Area is required" });

    const slug = await getUniqueSlug(name, area);

    // Parse timing JSON
    let timingClean = {};
    try {
      timingClean = typeof timing === "string" ? JSON.parse(timing) : timing;
    } catch {
      timingClean = {};
    }

    const timingString = JSON.stringify(timingClean);

    // Validate latitude & longitude
    const latValue = latitude && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null;
    const lngValue = longitude && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null;

    // Insert business
    const query = `
      INSERT INTO businesses (
        owner_id, name, category_id, subcategory_id,
        pin_code, address, landmark, area,
        phone, wp_number, email, description, website,
        timing, slug, latitude, longitude
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      owner_id ?? null,
      name ?? null,
      category_id ?? null,
      subcategory_id ?? null,
      pin_code ?? null,
      address ?? null,
      landmark ?? null,
      // sector ?? null,
      area ?? null,
      phone ?? null,
      wp_number ?? null,
      email ?? null,
      description ?? null,
      website ?? null,
      timingString,
      slug,
      latValue,
      lngValue
    ];
    console.log("INSERT VALUES COUNT:", values.length);

    const [result] = await pool.query(query, values);
    const business_id = result.insertId;

    console.log("Business created:", business_id);

    // LINK SERVICES TO BUSINESS
if (services.length) {
  for (const service of services) {

    // Only link existing services (id present)
    if (!service.id) continue;

    try {
      await pool.query(
        `
        INSERT IGNORE INTO business_services (business_id, service_id)
        VALUES (?, ?)
        `,
        [business_id, service.id]
      );
    } catch (err) {
      console.error("Failed linking service:", service.id, err.message);
    }
  }
}

    
    // STORE PHOTOS IN DATABASE
    if (req.files && req.files.length > 0) {
      const imgQuery = `
        INSERT INTO business_images (business_id, image_url, created_at)
        VALUES (?, ?, NOW())
      `;

      for (const file of req.files) {
        const imageUrl = file.filename; 
        await pool.query(imgQuery, [business_id, imageUrl]);
      }
    }

    const adminId = req.admin?.id || req.user?.id; 
    await logAdminAction(adminId, "ADDED_BUSINESS", "business", business_id);

    return res.status(201).json({
      msg: "Business created successfully",
      business_id
    });

  } catch (error) {
    console.error("BUSINESS create error:", error);
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};


// admin clicks Verify on your Unverified list.
export const verifyBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[VERIFY] Attempting to verify business with ID: ${id}`);
    const [result] = await pool.query(
      "UPDATE businesses SET is_verified = 1 WHERE id = ?",
      [id]
    );
     console.log("[VERIFY] MySQL result:", result);
    

    if (result.affectedRows === 0) {
      console.warn(`[VERIFY] Business with ID ${id} not found`);
      return res.status(404).json({ msg: "Business not found" });
    }
    
    console.log(`[VERIFY] Business with ID ${id} verified successfully`);
    res.status(200).json({ msg: "Business verified successfully" });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


// get business Controller
// export const getBusinesses = async (req, res) => {
//   try {

//     let {
//       categoryslug,
//       subcategoryslug,
//       name,
//       location,
//       isVerified=1,
//       page = 1,
//       limit = 10,
//     } = req.query;
//     console.log('Raw query params:', JSON.stringify({ categoryslug, subcategoryslug, name, location, page, limit, isVerified }));


//     page = Math.max(1, parseInt(page));
//     limit = Math.max(1, parseInt(limit));
//     const offset = (page - 1) * limit;

//     let query = `
//       SELECT b.*, 
//              c.name AS category_name, 
//              s.name AS subcategory_name 
//       FROM businesses b
//       LEFT JOIN categories c ON b.category_id = c.id
//       LEFT JOIN subcategories s ON b.subcategory_id = s.id
//       WHERE 1=1
//     `;
//     const values = [];

//     if (isVerified !== undefined) {
//       query += ` AND b.is_verified = ?`;
//       // values.push(isVerified === "true");
//       values.push(isVerified === "true");

//     }
    
//     if (categoryslug) {
//       query += ` AND b.category_id IN (SELECT id FROM categories WHERE slug = ?)`;
//       values.push(categoryslug);
//     }

//     if (subcategoryslug) {
//       query += ` AND b.subcategory_id IN (SELECT id FROM subcategories WHERE slug = ?)`;
//       values.push(subcategoryslug);
//     }

//     if (name) {
//       query += ` AND b.name LIKE ?`;
//       values.push(`%${name}%`);
//     }

//     if (location) {
//       query += ` AND (b.address LIKE ? OR b.city LIKE ? OR b.area LIKE ?)`;
//       values.push(`%${location}%`, `%${location}%`, `%${location}%`);
//     }

//     query += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
//     values.push(limit, offset);

//     const [rows] = await pool.query(query, values);

//     let countQuery = `
//       SELECT COUNT(*) AS total
//       FROM businesses b
//       LEFT JOIN categories c ON b.category_id = c.id
//       LEFT JOIN subcategories s ON b.subcategory_id = s.id
//       WHERE 1=1
//     `;
//     const countValues = [];

//     if (isVerified !== undefined) {
//       countQuery += ` AND b.is_Verified = ?`;
//       countValues.push(isVerified === "true");
//     }

//     if (categoryslug) {
//       countQuery += ` AND b.category_id IN (SELECT id FROM categories WHERE slug = ?)`;
//       countValues.push(categoryslug);
//     }

//     if (subcategoryslug) {
//       countQuery += ` AND b.subcategory_id IN (SELECT id FROM subcategories WHERE slug = ?)`;
//       countValues.push(subcategoryslug);
//     }

//     if (name) {
//       countQuery += ` AND b.name LIKE ?`;
//       countValues.push(`%${name}%`);
//     }

//     if (location) {
//       countQuery += ` AND (b.address LIKE ? OR b.city LIKE ? OR b.area LIKE ?)`;
//       countValues.push(`%${location}%`, `%${location}%`, `%${location}%`);
//     }

//     const [[countResult]] = await pool.query(countQuery, countValues);
//     const total = countResult.total;

//     return res.status(200).json({
//       success: true,
//       total,
//       page,
//       limit,
//       totalPages: Math.ceil(total / limit),
//       data: rows,
//     });

//   } catch (error) {
//     console.error("Error fetching businesses:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

// export const getBusinesses = async (req, res) => {
//   try {
//     // Destructure query params with defaults
//     let {
//       categoryslug,
//       subcategoryslug,
//       name,
//       location,
//       isVerified = "1",
//       page = 1,
//       limit = 10,
//     } = req.query;

//     // Make sure page & limit are numbers
//     page = Math.max(1, parseInt(page));
//     limit = Math.max(1, parseInt(limit));
//     const offset = (page - 1) * limit;

//     // Parse isVerified into 0 or 1
//     const verified = isVerified === "true" || isVerified === "1" ? 1 : 0;

//     console.log("Fetching businesses with params:", JSON.stringify({
//       categoryslug, subcategoryslug, name, location, page, limit, verified
//     }));

//     // Main query
//     let query = `
//       SELECT b.*,
//              c.name AS category_name,
//              s.name AS subcategory_name
//       FROM businesses b
//       LEFT JOIN categories c ON b.category_id = c.id
//       LEFT JOIN subcategories s ON b.subcategory_id = s.id
//       WHERE b.is_verified = ?
//     `;
//     const values = [verified];

//     // Optional filters
//     if (categoryslug) {
//       query += ` AND b.category_id IN (SELECT id FROM categories WHERE slug = ?)`;
//       values.push(categoryslug);
//     }

//     if (subcategoryslug && subcategoryslug !== "undefined") {
//       query += ` AND b.subcategory_id IN (SELECT id FROM subcategories WHERE slug = ?)`;
//       values.push(subcategoryslug);
//     }

//     if (name) {
//       query += ` AND b.name LIKE ?`;
//       values.push(`%${name}%`);
//     }

//     if (location) {
//       query += ` AND (b.address LIKE ? OR b.city LIKE ? OR b.area LIKE ?)`;
//       values.push(`%${location}%`, `%${location}%`, `%${location}%`);
//     }

//     query += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
//     values.push(limit, offset);

//     const [rows] = await pool.query(query, values);

//     // Count query for pagination
//     let countQuery = `
//       SELECT COUNT(*) AS total
//       FROM businesses b
//       LEFT JOIN categories c ON b.category_id = c.id
//       LEFT JOIN subcategories s ON b.subcategory_id = s.id
//       WHERE b.is_verified = ?
//     `;
//     const countValues = [verified];

//     if (categoryslug) {
//       countQuery += ` AND b.category_id IN (SELECT id FROM categories WHERE slug = ?)`;
//       countValues.push(categoryslug);
//     }

//     if (subcategoryslug && subcategoryslug !== "undefined") {
//       countQuery += ` AND b.subcategory_id IN (SELECT id FROM subcategories WHERE slug = ?)`;
//       countValues.push(subcategoryslug);
//     }

//     if (name) {
//       countQuery += ` AND b.name LIKE ?`;
//       countValues.push(`%${name}%`);
//     }

//     if (location) {
//       countQuery += ` AND (b.address LIKE ? OR b.city LIKE ? OR b.area LIKE ?)`;
//       countValues.push(`%${location}%`, `%${location}%`, `%${location}%`);
//     }

//     const [[countResult]] = await pool.query(countQuery, countValues);
//     const total = countResult.total;

//     return res.status(200).json({
//       success: true,
//       total,
//       page,
//       limit,
//       totalPages: Math.ceil(total / limit),
//       data: rows,
//     });

//   } catch (error) {
//     console.error("Error fetching businesses:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };


export const getBusinesses = async (req, res) => {
  try {
    let {
      categoryslug,
      subcategoryslug,
      name,
      location,
      isVerified = "1",
      page = 1,
      limit = 10,
      search
    } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));
    const offset = (page - 1) * limit;
    const verified = isVerified === "true" || isVerified === "1" ? 1 : 0;

    let query = `
    SELECT 
      b.*,
      c.name AS category_name,
      s.name AS subcategory_name,
  
      -- Images
      GROUP_CONCAT(DISTINCT bi.image_url) AS images,
  
      -- Services
      GROUP_CONCAT(DISTINCT sv.name) AS services
  
    FROM businesses b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN subcategories s ON b.subcategory_id = s.id
    LEFT JOIN business_images bi ON bi.business_id = b.id
    LEFT JOIN business_services bs ON bs.business_id = b.id
    LEFT JOIN services sv ON sv.id = bs.service_id
  
    WHERE b.is_verified = ?
  `;
  

    const values = [verified];

    if (categoryslug) {
      query += ` AND b.category_id IN (SELECT id FROM categories WHERE slug = ?)`;
      values.push(categoryslug);
    }

    if (subcategoryslug && subcategoryslug !== "undefined") {
      query += ` AND b.subcategory_id IN (SELECT id FROM subcategories WHERE slug = ?)`;
      values.push(subcategoryslug);
    }

    if (name) {
      query += ` AND b.name LIKE ?`;
      values.push(`%${name}%`);
    }

    if (location) {
      query += ` AND (b.address LIKE ? OR b.city LIKE ? OR b.area LIKE ?)`;
      values.push(`%${location}%`, `%${location}%`, `%${location}%`);
    }

    if (search) {
      query += ` AND (b.name LIKE ? OR b.phone LIKE ?)`;
      values.push(`%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY b.id ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
    values.push(limit, offset);

    const [rows] = await pool.query(query, values);

    // Count query (unchanged)
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN subcategories s ON b.subcategory_id = s.id
      WHERE b.is_verified = ?
    `;
    const countValues = [verified];

    if (categoryslug) {
      countQuery += ` AND b.category_id IN (SELECT id FROM categories WHERE slug = ?)`;
      countValues.push(categoryslug);
    }

    if (subcategoryslug && subcategoryslug !== "undefined") {
      countQuery += ` AND b.subcategory_id IN (SELECT id FROM subcategories WHERE slug = ?)`;
      countValues.push(subcategoryslug);
    }

    if (name) {
      countQuery += ` AND b.name LIKE ?`;
      countValues.push(`%${name}%`);
    }

    if (location) {
      countQuery += ` AND (b.address LIKE ? OR b.city LIKE ? OR b.area LIKE ?)`;
      countValues.push(`%${location}%`, `%${location}%`, `%${location}%`);
    }

    if (search) {
      countQuery += ` AND (b.name LIKE ? OR b.phone LIKE ?)`;
      countValues.push(`%${search}%`, `%${search}%`);
    }

    const [[countResult]] = await pool.query(countQuery, countValues);
    const total = countResult.total;

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: rows,
    });

  } catch (error) {
    console.error("Error fetching businesses:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};




export const getBusinessByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Fetching businesses for userId:", userId);

    const [businessRows] = await pool.query(`
      SELECT
        b.*,
        COALESCE(pl.name, 'Free') AS current_plan,
        bp.plan_id,
        bp.start_date,
        bp.end_date,
        bp.plan_price
      FROM businesses b
      LEFT JOIN business_plans bp
        ON bp.business_id = b.id
      LEFT JOIN plans pl
        ON pl.id = bp.plan_id
      WHERE b.owner_id = ?
    `, [userId]);
    
    console.log({"businessRows":businessRows})
    if (businessRows.length === 0) {
      return res.status(404).json({ msg: "No businesses found for this user" });
    }

    const businessIds = businessRows.map(b => b.id);

    // Step 2: Get all images related to these businesses
    const [imageRows] = await pool.query(
      "SELECT id, image_url, business_id FROM business_images WHERE business_id IN (?)",
      [businessIds]
    );
    console.log("Image rows:", imageRows);

    // Step 3: Group images by business_id
    const imagesMap = {};
    imageRows.forEach(img => {
      if (!imagesMap[img.business_id]) {
        imagesMap[img.business_id] = [];
      }
      imagesMap[img.business_id].push({
        id: img.id,
        url: img.image_url,
      });
    });
    
    // Step 4: Attach images to each business
    
    const businesses = businessRows.map(b => ({
      ...b,
      status: b.status || "pending", 
      images: imagesMap[b.id] || []
    }));
    
    console.log("Final business payload:", businesses);
    res.status(200).json({ businesses });
  } catch (error) {
    console.error("Error fetching businesses by user ID:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// export const getBusinessById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Join with users to check owner status
//     // const [rows] = await pool.execute(`
//     //   SELECT b.* FROM businesses b
//     //   JOIN users u ON b.owner_id = u.id
//     //   WHERE b.id = ? AND u.is_active = 1
//     // `, [id]);

// // const [rows] = await pool.execute(`
// //       SELECT b.* FROM businesses b
// //       JOIN users u ON b.owner_id = u.id
// //       WHERE b.id = ? AND u.is_active = 1
// //     `, [id]);

// const [rows] = await pool.execute(
//   `SELECT * FROM businesses WHERE id = ?`,
//   [id]
// );

//     console.log(rows);
    

//     if (rows.length === 0) {
//       return res.status(404).json({ msg: "Business not found or owner is inactive" });
//     }
//     console.log("Business fetched:", rows[0]);

//     res.status(200).json(rows[0]);
//   } catch (error) {
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };

export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch business
    const [[business]] = await pool.query(`
      SELECT
        b.*,
        COALESCE(pl.name, 'Free') AS current_plan,
        bp.plan_id,
        bp.start_date,
        bp.end_date,
        bp.plan_price,
        pl.duration
      FROM businesses b
      LEFT JOIN business_plans bp
        ON bp.business_id = b.id
      LEFT JOIN plans pl
        ON pl.id = bp.plan_id
      WHERE b.id = ?
    `, [id]);

    if (!business) {
      return res.status(404).json({ msg: "Business not found" });
    }

    // Fetch images
    const [photos] = await pool.query(
      "SELECT id, image_url FROM business_images WHERE business_id = ?",
      [id]
    );

    // Format images for frontend
    const formattedPhotos = photos.map((p) => ({
      id: p.id,
      url: p.image_url,
      isNew: false
    }));

    // Return business + photos merged
    res.status(200).json({
      ...business,
      photos: formattedPhotos
    });

  } catch (err) {
    console.error("Error in getBusinessById:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};



export const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user; 
    const userId = req.user.id;
    const role = req.user.role;

    console.log("Business ID:", id);
    console.log("Current User ID:", userId);
    console.log("User Role:", role);
    console.log("User:", user);

    const {
      owner_id = null,
      name = null,
      category_id = null,
      subcategory_id = null,
      pin_code = null,
      address = null,
      landmark = null,
      area = null,
      phone = null,
      wp_number = null,
      email = null,
      description=null,
      website = null,
      timing = [],
      is_verified = false,
      latitude = null,
      longitude = null,
    } = req.body;
    console.log("Request Body:", req.body);

    const slug = await getUniqueSlug(name, area, id);

      // Parse to floats for DB safety
      // const latValue = latitude ? parseFloat(latitude) : null;
      // const lngValue = longitude ? parseFloat(longitude) : null;

     const parseNumber = (val) => {
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    // const latValue = parseNumber(latitude);
    // const lngValue = parseNumber(longitude);
    const latValue = latitude?.lat ?? null;
    const lngValue = latitude?.lng ?? null;

    console.log("Latitude:", latValue, "Longitude:", lngValue);

    
  if (isAdminOrSubadmin(user)) {
      console.log(` ${role} is updating the business directly...`);
  // }

//   const cleanTiming = timing && typeof timing === "object" ? timing : {};
// const timingString = JSON.stringify(cleanTiming);

let cleanTiming = {};
if (timing) {
  if (typeof timing === "string") {
    try {
      cleanTiming = JSON.parse(timing);
    } catch (err) {
      console.warn("Failed to parse timing string, using empty object", err);
      cleanTiming = {};
    }
  } else if (typeof timing === "object") {
    cleanTiming = timing;
  }
}

const timingString = JSON.stringify(cleanTiming);
if (timingString.length > 65000) {
  return res.status(400).json({ msg: "Timing data too large" });
}
// const timingString = JSON.stringify(cleanTiming);
console.log("Timing JSON:", timingString);
console.log("Timing length:", timingString.length);

      const [result] = await pool.execute(
        `UPDATE businesses SET 
          owner_id = ?, 
          name = ?, 
          category_id = ?, 
          subcategory_id = ?, 
          pin_code = ?, 
          address = ?, 
          landmark = ?, 
          area = ?, 
          phone = ?, 
          wp_number = ?, 
          email = ?, 
          description = ?,
          website = ?, 
          timing = ?, 
          slug = ?,
          is_verified = ?,
          latitude = ?,
          longitude = ? 
        WHERE id = ?`,
        [
          owner_id,
          name,
          category_id,
          subcategory_id,
          pin_code,
          address,
          landmark,
          area,
          phone,
          wp_number,
          email,
          description,
          website,   
          // typeof timing === "string" ? timing : JSON.stringify(timing),
          timingString,
          slug,
          is_verified,
          latValue,          
          lngValue,          
          id,
        ]
      );
      console.log("Update result:", result);

      // if (result.affectedRows === 0) {
      //   return res.status(404).json({ msg: "Business not found or nothing to update" });
      // }

      if (req.files && req.files.length > 0) {
        const imgQuery = `
          INSERT INTO business_images (business_id, image_url, created_at)
          VALUES (?, ?, NOW())
        `;
      
        for (const file of req.files) {
          await pool.query(imgQuery, [id, file.filename]);
        }
      
        console.log("Images added for business:", id);
      }

      if (result.affectedRows === 0) {
  // maybe check if row exists
  const [exists] = await pool.execute(`SELECT id FROM businesses WHERE id = ?`, [id]);
  if (exists.length === 0) {
    return res.status(404).json({ msg: "Business not found" });
  }
}


      // Log subadmin action
      if (user.role === "sub-admin") {
      const actionText = is_verified ? "Verified business" : "Updated business";
      console.log(`Logging Sub-admin Action: ${actionText}`);
      await logAdminAction(userId, actionText, "Business", id);
      };

      // const recipientPhone = phone || wp_number;
      // if (recipientPhone) {
      //   try {
      //     const smsResponse = await sendSms("businessConfirmation", recipientPhone, {});
      //     console.log("SMS Response:", JSON.stringify(smsResponse, null, 2));
      //   } catch (err) {
      //     console.error("Failed to send BusinessRegistration SMS:", err.message);
      //   }
      // }

      // return res.status(200).json({ msg: "Business updated successfully by admin", slug });
      return res.status(200).json({
        msg: `Business ${is_verified ? "verified" : "updated"} successfully by ${role}`,
        slug,
      });

    } else {
      // Owner submit request for approval
      // const [existing] = await pool.execute(`SELECT id FROM update_businesses WHERE id = ? AND is_verified = 0`, [id]);

      // if (existing.length > 0) {
      //   return res.status(409).json({ msg: "An update request is already pending for this business" });
      // }

      const cleanTiming = timing && typeof timing === "object" ? timing : {};
const timingString = JSON.stringify(cleanTiming);

      await pool.execute(
        `INSERT INTO update_businesses (
          id, owner_id, name, category_id, subcategory_id, pin_code, address,
          landmark, area, phone, wp_number, email, description, website, timing, slug, latitude, longitude, is_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          name,
          category_id,
          subcategory_id,
          pin_code,
          address,
          landmark,
          area,
          phone,
          wp_number,
          email,
          description,
          website,
          // JSON.stringify(timing),
          timingString,
          slug,
          latValue,
          lngValue,
          is_verified,
        ]
      );
      console.log("Owner update inserted into update_businesses table.");
      if (req.files && req.files.length > 0) {
        const imgQuery = `
          INSERT INTO update_business_images (business_id, image_url, created_at)
          VALUES (?, ?, NOW())
        `;
      
        for (const file of req.files) {
          await pool.query(imgQuery, [id, file.filename]);
        }
      
        console.log("Images added for business:", id);
      }
      // Send Business Registration SMS
    // const recipientPhone = phone || wp_number;
    // if (recipientPhone) {
    //   try {
    //     const smsResponse = await sendSms("businessRegistration", recipientPhone, {});
    //     console.log("SMS Response:", JSON.stringify(smsResponse, null, 2));
    //   } catch (err) {
    //     console.error("Failed to send BusinessRegistration SMS:", err.message);
    //   }
    // }
      return res.status(200).json({ msg: "Business update submitted for admin approval", slug });
    }
    
  } catch (error) {
    console.error("Update business error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ msg: "Invalid business ID" });
    }

    const [result] = await pool.execute(
      "DELETE FROM businesses WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Business not found" });
    }

    res.status(200).json({ msg: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const getBusinessBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log('Received request for business with slug:', slug);

    const [rows] = await pool.query(
      "SELECT * FROM businesses WHERE slug = ? AND is_verified = 1",
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ msg: "Verified business not found" });
    }

    const business = rows[0];

    const [imageRows] = await pool.query(
      "SELECT id, image_url FROM business_images WHERE business_id = ?",
      [business.id]
    );

    const images = imageRows.map(img => ({
      id: img.id,
      url: img.image_url
    }));

    res.status(200).json({ business: { ...business, images } });
  } catch (error) {
    console.error("Error fetching business by slug:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};



export const getPendingUpdates = async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));
    const offset = (page - 1) * limit;

    const [[countResult]] = await pool.query(`SELECT COUNT(*) AS total FROM update_businesses`);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
      try {
        // const [updates] = await pool.query(`SELECT * FROM update_businesses LIMIT ? OFFSET ?`, [limit, offset]);
        const [updates] = await pool.query(
      `SELECT ub.*, 
              c.slug AS categorySlug,
              sc.slug AS subcategorySlug
      FROM update_businesses ub
      LEFT JOIN categories c ON ub.category_id = c.id
      LEFT JOIN subcategories sc ON ub.subcategory_id = sc.id
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [images] = await pool.query(`SELECT * FROM update_business_images`);

    const imagesByBusinessId = {};
    for (const img of images) {
      if (!imagesByBusinessId[img.business_id]) {
        imagesByBusinessId[img.business_id] = [];
      }
      imagesByBusinessId[img.business_id].push(img.image_url);
    }

    const updatesWithImages = updates.map(update => ({
      ...update,
      images: imagesByBusinessId[update.id] || [],
    }));

    console.log("Fetched pending updates:", updatesWithImages.length);
    res.json({page,
      limit,
      total,
      totalPages, data: updatesWithImages });
  } catch (err) {
    console.error("Failed to fetch pending updates:", err);
    res.status(500).json({ msg: "Failed to fetch pending updates" });
  }
};

// Admin approves update
// export const approveUpdate = async (req, res) => {
//   const id = req.params.id;
//   const user = req.user;
//    const adminId = req.user?.id;

//   try {
//     // const [[pending]] = await pool.query(`SELECT * FROM update_businesses WHERE id = ?`, [id]);
//     const [[pending]] = await pool.query(
//   `SELECT * FROM update_businesses WHERE business_id = ? ORDER BY created_at DESC LIMIT 1`,
//   [id]
// );
//     console.log("Fetched pending update:", pending);
//     const [images] = await pool.query(`SELECT * FROM update_business_images WHERE id = ?`, [id]);
//     console.log("Fetched pending images:", images);


//     if (!pending) return res.status(404).json({ msg: "Pending update not found" });
//      console.warn(" No pending update found for ID:", id);

//       // Only allow admin or subadmin
//     if (!["admin", "sub-admin"].includes(user?.role)) {
//       return res.status(403).json({ msg: "Permission denied" });
//     }
     
//     // Update the original business in businesses with the new data.
//     await pool.query(
//       `UPDATE businesses SET  name=?, description=?, timing=?, website=?, phone=?, wp_number=?, address=?, area=?, landmark=?, pin_code=?, category_id=?, subcategory_id=?, email=?, slug=?, owner_id=?, latitude=?, longitude=? ,is_verified=?
//         WHERE id=?`,
//       [
//         pending.name,
//         pending.description,
//         pending.timing,
//         pending.website,
//         pending.phone,
//         pending.wp_number,
//         pending.address,
//         pending.area,
//         pending.landmark,
//         pending.pin_code,
//         pending.category_id,
//         pending.subcategory_id,
//         pending.email,
//         await getUniqueSlug(pending.name, pending.area, id), 
//         pending.owner_id,
//         pending.latitude ? parseFloat(pending.latitude) : null,
//         pending.longitude ? parseFloat(pending.longitude) : null,
//         true,
//         id
//       ]
//     );
//     console.log("Replacing existing business images...");

//     // Delete old image
//     // await pool.query(`DELETE FROM business_images WHERE business_id = ?`, [id]);
//     // if (images.length > 0) {
//     //   const imageData = images.map((img) => [id, img.image_url]);

//     //   // Insert new approved images
//     //   await pool.query(`INSERT INTO business_images (business_id, image_url) VALUES ?`, [imageData]);
//     //   console.log("New images added:", images.length);
//     // }else {
//     //   console.log("No new images provided.");
//     // }
//     if (images.length > 0) {
//       console.log("Replacing existing business images...");
    
//       // Delete old images only if new ones are present
//       // await pool.query(`DELETE FROM business_images WHERE business_id = ?`, [id]);
    
//       const imageData = images.map((img) => [id, img.image_url]);
//       await pool.query(`INSERT INTO business_images (business_id, image_url) VALUES ?`, [imageData]);
//       console.log("New images added:", images.length);
//     } else {
//       console.log("No new images provided — keeping existing images.");
//     }
    
//     // Clean up pending update
//     await pool.query(`DELETE FROM update_businesses WHERE id = ?`, [id]);
//     await pool.query(`DELETE FROM update_business_images WHERE business_id = ?`, [id]);
    
//     // Log action
//     const actionText = user?.role === "sub-admin" ? "Subadmin approved business update" : "Admin approved business update";
//     if (user.role === 'sub-admin') {
//     await pool.query(
//       `INSERT INTO admin_actions (admin_id, action, target_type, target_id, created_at)
//        VALUES (?, ?, ?, ?, NOW())`,
//       [user.id, "Approved business update", "Business", id]
//     );
//   };

//   // Log action with admin_id only
//     // const actionText = req.user.role === "sub-admin" ? "Subadmin approved business update" : "Admin approved business update";
//     // await logAdminAction(adminId, actionText, "Business", id);
// //     await logAdminAction(
// //   req.user.id,
// //   "Approved business",
// //   "business",
// //   businessId
// // );

//     res.json({ msg: "Business update approved" });
//   } catch (err) {
//     console.error("Error approving update:", err);
//     res.status(500).json({ msg: "Approval failed" , error: err.message });
//   }
// };


export const approveUpdate = async (req, res) => {
  try {
    const businessId = req.params.id; 

    const [[pending]] = await pool.query(
      `SELECT * FROM update_businesses WHERE id = ?`,
      [businessId]
    );

    if (!pending) {
      return res.status(404).json({ msg: "Pending update not found" });
    }

    const [images] = await pool.query(
      `SELECT * FROM update_business_images WHERE business_id = ?`,
      [businessId]
    );

    await pool.query(`
      UPDATE businesses SET
      name=?, description=?, timing=?, website=?, phone=?, wp_number=?,
      address=?, area=?, landmark=?, pin_code=?, category_id=?,
      subcategory_id=?, email=?, owner_id=?, latitude=?, longitude=?
      WHERE id=?
    `,
      [
        pending.name, pending.description, pending.timing, pending.website,
        pending.phone, pending.wp_number, pending.address, pending.area,
        pending.landmark, pending.pin_code, pending.category_id,
        pending.subcategory_id, pending.email, pending.owner_id,
        pending.latitude, pending.longitude,
        businessId
      ]
    );

    if (images.length > 0) {
      // await pool.query(
      //   "DELETE FROM business_images WHERE business_id = ?",
      //   [businessId]
      // );

      const insertValues = images.map(img => [businessId, img.image_url]);
      await pool.query(
        "INSERT INTO business_images (business_id, image_url) VALUES ?",
        [insertValues]
      );
    }

    await pool.query(
      "DELETE FROM update_business_images WHERE business_id = ?",
      [businessId]
    );
    await pool.query(
      "DELETE FROM update_businesses WHERE id = ?",
      [businessId]
    );

    return res.json({ msg: "Business update approved successfully" });

  } catch (err) {
    console.error("Approve update failed:", err);
    return res.status(500).json({
      msg: "Approval failed",
      error: err.message,
    });
  }
};


// Admin rejects update
// export const rejectUpdate = async (req, res) => {
//   try {
//      console.log("Req.user in rejectUpdate:", req.user);
//     const businessId = req.params.id;
    
//     // const adminId = req.user?.id;
//     // if (!adminId) return res.status(401).json({ msg: "Unauthorized" });
//     // console.log("Admin rejecting update for business:", businessId , "adminId:", adminId);

//     // 1. Fetch images linked to this business update
//     const [images] = await pool.query(
//       "SELECT image_url FROM update_business_images WHERE business_id = ?",
//       [businessId]
//     );

//     // 2. Remove images from filesystem
//     for (const img of images) {
//       const parts = img.image_url.split("/");
//       const fileName = parts[parts.length - 1];
//       const filePath = path.join(__dirname, "../../uploads/business_photos", fileName);

//       try {
//         await fs.access(filePath);
//         await fs.unlink(filePath);
//         console.log(` Deleted file: ${filePath}`);
//       } catch (err) {
//         console.warn(` Could not delete file: ${filePath} (${err.message})`);
//       }
//     }

//     // 3. Delete records from DB
//     await pool.query("DELETE FROM update_business_images WHERE update_id  = ?", [businessId]);
//     await pool.query("DELETE FROM update_businesses WHERE id = ?", [businessId]);

//     // log action
//     // await pool.query(
//     //   "INSERT INTO admin_actions (admin_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, NOW())",
//     //   [req.user.id, "Rejected business update", "Business", businessId]
//     // );
//     // await logAdminAction(req.admin.id, "REJECTED_BUSINESS", "business", businessId);


//     res.json({ msg: "Update rejected and all images removed" });
//   } catch (err) {
//     console.error("Reject update failed:", err);
//     res.status(500).json({ error: "Rejection failed", details: err.message });
//   }
// };

export const rejectUpdate = async (req, res) => {
  try {
    const businessId = req.params.id;

    const [images] = await pool.query(
      "SELECT image_url FROM update_business_images WHERE business_id = ?",
      [businessId]
    );

    for (const img of images) {
      const fileName = img.image_url.split("/").pop();
      const filePath = path.join(__dirname, "../../uploads/business_photos", fileName);
      try { await fs.unlink(filePath); } catch {}
    }

    await pool.query("DELETE FROM update_business_images WHERE business_id = ?", [businessId]);
    await pool.query("DELETE FROM update_businesses WHERE id = ?", [businessId]);

    return res.json({ msg: "Update rejected successfully" });

  } catch (err) {
    console.error("Reject update failed:", err);
    return res.status(500).json({
      error: "Rejection failed",
      details: err.message
    });
  }
};



// Increment businesss counts
export const incrementBusinessViewCount = async (req, res) => {
  const { id } = req.params;

  try {
    // Insert a new view
    await pool.query('INSERT INTO business_views (business_id) VALUES (?)', [id]);

    // Get total views for this business
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS viewCount FROM business_views WHERE business_id = ?',
      [id]
    );

    const viewCount = rows[0]?.viewCount || 0;
    console.log('viewCount',viewCount)

    res.json({ business_id: id, viewCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


// get business
export const getBusinessImages = async (req, res) => {
  try {
    const { id } = req.params;

    const [images] = await pool.query(
      "SELECT id, image_url FROM business_images WHERE business_id = ?",
      [id]
    );

    res.status(200).json({ images });
  } catch (err) {
    console.error("Error fetching images:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};


// upload img for business
// export const uploadPhotosForBusiness = async (req, res) => {
//   console.log("Request Params:", req.params);
//   try {
//     const { businessId } = req.params;
//     console.log('businessid',businessId);
    
//     const files = req.files;

//     if (!files || files.length === 0) {
//       console.warn("No files received in request");
//       return res.status(400).json({ msg: "No files uploaded" });
//     }
//     // console.log(`Received ${files.length} files for business ID: ${businessId}`);
//     console.log(`Received ${files.length} files: ${files.map(f => f.originalname).join(", ")}`);

//     console.log("Checking payment plan for business:", businessId);
//     const [planResult] = await pool.query(
//       `SELECT plan FROM payments WHERE business_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1`,
//       [businessId]
//     );
//     console.log("Payment plan query result:", planResult);

//     const selectedPlan = planResult?.[0]?.plan?.toLowerCase() || 'free';
//     console.log(`Plan for business ${businessId}: ${selectedPlan}`);

//     // Define image limits by plan
//     const planLimits = {
//       free: 2,
//       silver: 5,
//       gold: 10,
//       platinum: 20,
//     };

//     const maxImages = planLimits[selectedPlan] || 2;
//     console.log(`Image limit for '${selectedPlan}' plan: ${maxImages}`);

//     // Check how many already uploaded
//     const [existingImages] = await pool.query(
//       `SELECT COUNT(*) AS count FROM business_images WHERE business_id = ?`,
//       [businessId]
//     );
//     console.log("Existing images query result:", existingImages);

//     const currentCount = existingImages[0]?.count || 0;
//     const newTotal = currentCount + files.length;

//     console.log(`Existing images: ${currentCount}, New uploads: ${files.length}, Total: ${newTotal}, Allowed: ${maxImages}`);

//     if (newTotal > maxImages) {
//       console.warn(`Upload exceeds limit! Allowed: ${maxImages}, Current: ${currentCount}`);
//       return res.status(400).json({
//         msg: `You can upload a maximum of ${maxImages} photos for the ${selectedPlan} plan. You already have ${currentCount}.`,
//       });
//     }

//     // File size validation
//     for (const file of files) {
//       console.log(`Checking size for: ${file.originalname}, Size: ${file.size} bytes`);
//       if (file.size > 5 * 1024 * 1024) {
//         return res.status(400).json({
//           msg: `File "${file.originalname}" exceeds 5MB limit.`,
//         });
//       }
//     }

//     const savedImageUrls = [];

//     for (let file of files) {
//       const imageUrl = `/uploads/${file.filename}`;
//       console.log(`Inserting image: ${imageUrl}`);

//       await pool.query(
//         "INSERT INTO business_images (business_id, image_url, created_at) VALUES (?, ?, NOW())",
//         [businessId, imageUrl]
//       );

//       savedImageUrls.push(imageUrl);
//     }
//     console.log(`Successfully saved ${savedImageUrls.length} images for business ${businessId}`);
//     res.status(201).json({
//       msg: "Photos uploaded successfully",
//       images: savedImageUrls,
//     });
//   } catch (err) {
//     console.error("Upload error:", err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// };

export const uploadPhotosForBusiness = async (req, res) => {
  console.log("Request Params:", req.params);
  try {
    const { businessId } = req.params;
    console.log('businessid',businessId);
    
    const files = req.files;

    if (!files || files.length === 0) {
      console.warn("No files received in request");
      return res.status(400).json({ msg: "No files uploaded" });
    }
    console.log(`Received ${files.length} files for business ID: ${businessId}`);

    console.log("Checking payment plan for business:", businessId);
    const [planResult] = await pool.query(
      `SELECT plan FROM payments WHERE business_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1`,
      [businessId]
    );
    console.log("Payment plan query result:", planResult);

    const selectedPlan = planResult?.[0]?.plan?.toLowerCase() || 'free';
    console.log(`Plan for business ${businessId}: ${selectedPlan}`);

    // Define image limits by plan
    const planLimits = {
      free: 5,
      silver: 8,
      gold: 10,
      platinum: 20,
    };

    const maxImages = planLimits[selectedPlan] || 5;
    console.log(`Image limit for '${selectedPlan}' plan: ${maxImages}`);

    // Check how many already uploaded
    const [existingImages] = await pool.query(
      `SELECT COUNT(*) AS count FROM business_images WHERE business_id = ?`,
      [businessId]
    );
    console.log("Existing images query result:", existingImages);

    const currentCount = existingImages[0]?.count || 0;
    const newTotal = currentCount + files.length;

    console.log(`Existing images: ${currentCount}, New uploads: ${files.length}, Total: ${newTotal}, Allowed: ${maxImages}`);

    if (newTotal > maxImages) {
      console.warn(`Upload exceeds limit! Allowed: ${maxImages}, Current: ${currentCount}`);
      return res.status(400).json({
        msg: `You can upload a maximum of ${maxImages} photos for the ${selectedPlan} plan. You already have ${currentCount}.`,
      });
    }

    // File size validation
    for (const file of files) {
      console.log(`Checking size for: ${file.originalname}, Size: ${file.size} bytes`);
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          msg: `File "${file.originalname}" exceeds 5MB limit.`,
        });
      }
    }

    const savedImageUrls = [];

    for (let file of files) {
      const imageUrl = `${file.filename}`;
      console.log(`Inserting image: ${imageUrl}`);

      await pool.query(
        "INSERT INTO business_images (business_id, image_url, created_at) VALUES (?, ?, NOW())",
        [businessId, imageUrl]
      );

      savedImageUrls.push(imageUrl);
    }
    console.log(`Successfully saved ${savedImageUrls.length} images for business ${businessId}`);
    res.status(201).json({
      msg: "Photos uploaded successfully",
      images: savedImageUrls,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};



// Delete images
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export const deleteImages = async (req, res) => {
//   try {
//     const businessId = req.params.id;
//     const photoUrl = req.body?.photoUrl;
//     console.log("REQ BODY:", req.body);


//     if (!photoUrl) {
//       return res.status(400).json({ error: "photoUrl is required" });
//     }

//     const parts = photoUrl.split("/");
//     const fileName = parts[parts.length - 1];
//     const dbPath = `/uploads/${fileName}`;
//     const filePath = path.join(__dirname, "../../uploads/business_photos", fileName);

//     await pool.query(
//       "DELETE FROM business_images WHERE image_url = ? AND business_id = ?",
//       [dbPath, businessId]
//     );

//     try {
//       await fs.access(filePath);
//       await fs.unlink(filePath);
//     } catch (err) {}

//     res.json({ message: "Photo deleted successfully" });
//   } catch (err) {
//     console.error("Server Error:", err);
//     res.status(500).json({ error: "Server error", details: err.message });
//   }
// };


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const deleteImages = async (req, res) => {
  try {
    console.log('DELETE IMAGE', req.query.photoUrl)
    console.log("DELETE IMAGE HIT");
    console.log("PARAMS:", req.params);
    console.log("QUERY:", req.query);

    const businessId = req.params.id;
    // const photoUrl = req.query.photoUrl;
    const photoUrl = req.query.photoUrl || req.body.photoUrl;

    if (!photoUrl) {
      return res.status(400).json({ error: "photoUrl is required" });
    }

    const fileName = path.basename(photoUrl);
    const filePath = path.join(
      __dirname,
      "../../uploads/business_photos",
      fileName
    );

    const [result] = await pool.query(
      "DELETE FROM business_images WHERE image_url = ? AND business_id = ?",
      [photoUrl, businessId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: "Image not found" });
    }

    //  Delete file (optional, non-fatal)
    try {
      await fs.unlink(filePath);
      console.log("🗑 File deleted from disk");
    } catch (fsErr) {
      console.warn("File not found on disk:", fsErr.message);
    }

    return res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    console.error(" DELETE IMAGE CRASH:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
};


// Owner submits business edit
export const submitBusinessUpdate = async (req, res) => {
  const businessId = req.params.id;
  const data = req.body;
  const user = req.user;
  
  try {
    if (user.role === 'admin' || user.role === 'sub-admin') {
      return res.status(403).json({ msg: "Admins/Sub-admins must update directly" });
    }

        // Parse and validate latitude/longitude
        const latValue = data.latitude ? parseFloat(data.latitude) : null;
        const lngValue = data.longitude ? parseFloat(data.longitude) : null;
    
    await pool.query(
      `REPLACE INTO update_businesses  (id, owner_id, name, description, timing, website, address, area, landmark, pin_code, phone, wp_number, category_id, subcategory_id, email, latitude, longitude, slug, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?, ?,?)`,
      [
        businessId,
        data.owner_id,
        data.name,
        data.description,
        data.timing,
        data.website,
        data.address,
        data.area,
        data.landmark,
        data.pin_code,
        data.phone,
        data.wp_number,
        data.category_id,
        data.subcategory_id,
        data.email ?? null,
        // 0, 
        latValue,
        lngValue,
        data.slug ?? null,
        data.is_verified
      ]
    ); 
    
    // await pool.query("DELETE FROM update_business_images WHERE business_id = ?", [businessId]);
    console.log("Old update images deleted for business:", businessId);

    // Send Business Registration SMS
    const recipientPhone = phone || wp_number;
    if (recipientPhone) {
      try {
        const smsResponse = await sendSms("businessConfirmation", recipientPhone, {});
        console.log("SMS Response:", JSON.stringify(smsResponse, null, 2));
      } catch (err) {
        console.error("Failed to send BusinessRegistration SMS:", err.message);
      }
    }

    res.json({ msg: "Update submitted for review" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to submit update" });
  }
};


// Owner uploads photos for update
export const uploadUpdatePhotos = async (req, res) => {
  const businessId = req.params.id;
  console.log('businessId',businessId)
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("FILES:", req.files);
  console.log("BODY:", req.body);

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: "No files uploaded" });
    }

    // if (req.files.length > 2) {
    //   return res.status(400).json({ msg: "Max 2 images allowed" });
    // }

     // STEP 1: Fetch selected plan
     const [planResult] = await pool.query(
      `SELECT plan FROM payments WHERE business_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1`,
      [businessId]
    );

    const selectedPlan = planResult?.[0]?.plan || "free";
    console.log(`Plan for business ${businessId}: ${selectedPlan}`);

    // STEP 2: Define limits
    const planLimits = {
      free: 5,
      silver: 8,
      gold: 10,
      platinum: 20,
    };

    const maxImages = planLimits[selectedPlan.toLowerCase()] || 5;
    console.log(`Max images allowed for '${selectedPlan}' plan: ${maxImages}`);


    // STEP 3: Validate
    if (req.files.length > maxImages) {
      console.warn(`Upload exceeds max limit (${maxImages}). Rejected.`);
      return res.status(400).json({
        msg: `Max ${maxImages} images allowed for ${selectedPlan} plan`,
      });
    }

    for (const file of req.files) {
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ msg: `File ${file.originalname} exceeds 5MB limit` });
      }
    }

     // Prepare image paths
     const photoData = req.files.map((file) => [businessId, `/uploads/${file.filename}`]);

     // Store image paths
     await pool.query(
       `INSERT INTO update_business_images (business_id, image_url) VALUES ?`, [photoData]
     );
 
     console.log("Images saved to update_business_images");
     res.json({ msg: "Images uploaded for review" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Image upload failed" });
  }
};


// sub-admin tracking
export const getAdminActions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      startDate = "",
      endDate = "",
    } = req.query;

    const offset = (page - 1) * limit;

    // Base WHERE
    let whereClauses = ["1=1"];
    const params = [];

    if (search) {
      whereClauses.push(`(
        aa.action LIKE ? OR
        aa.target_type LIKE ? OR
        aa.target_id LIKE ? OR
        u.name LIKE ?
      )`);
      const searchValue = `%${search}%`;
      params.push(searchValue, searchValue, searchValue, searchValue);
    }

    if (startDate && endDate) {
      whereClauses.push(`aa.created_at BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }

    const whereSQL = whereClauses.join(" AND ");

    // Fetch actions
    // const [actions] = await pool.query(
    //   `
    //   SELECT 
    //     aa.id,
    //     aa.admin_id,
    //     u.name AS admin_name,
    //     aa.action,
    //     aa.target_type,
    //     aa.target_id,
    //     aa.created_at
    //   FROM admin_actions aa
    //   LEFT JOIN users u ON u.id = aa.admin_id
    //   WHERE ${whereSQL}
    //   ORDER BY aa.created_at DESC
    //   LIMIT ? OFFSET ?
    //   `,
    //   [...params, parseInt(limit), parseInt(offset)]
    // );

    const [actions] = await pool.query(
  `SELECT id, admin_id, action, target_type, target_id, created_at
   FROM admin_actions
   ORDER BY created_at DESC
   LIMIT ? OFFSET ?`,
  [parseInt(limit), parseInt(offset)]
);


    // Count total
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM admin_actions aa
       LEFT JOIN users u ON u.id = aa.admin_id
       WHERE ${whereSQL}`,
      params
    );

    const totalPages = Math.ceil(countResult[0].total / limit);

    res.json({
      actions,
      totalPages,
      totalCount: countResult[0].total,
    });
  } catch (err) {
    console.error("Error fetching admin actions:", err);
    res.status(500).json({ message: "Error fetching admin actions", error: err.message });
  }
};



// Searching
export const globalSearchBusinesses = async (req, res) => {
  try {
    let { q = "", location = "", page = 1, limit = 10 } = req.query;
    q = String(q || "").trim();
    location = String(location || "").trim();
    let nodeName = "";
    if (!q) return res.status(400).json({ msg: "Search query is required" });

    page = Number.isFinite(Number(page)) ? Math.max(1, parseInt(page, 10)) : 1;
    limit = Number.isFinite(Number(limit)) ? Math.max(1, parseInt(limit, 10)) : 10;
    limit = Math.min(limit, 50);
    const offset = (page - 1) * limit;

    const nodePinCodes = {
      "Fort – CST – Nariman Point": ["400001", "400021"],
      "Colaba – Cuffe Parade": ["400005"],      
      "Malabar Hill – Walkeshwar": ["400006"],      
      "Grant Road – Mumbai Central": ["400007", "400008"],      
      "Byculla – Mazgaon": ["400011", "400010"],     
      "Dadar – Prabhadevi": ["400014", "400025"],      
      "Worli – Lower Parel": ["400018", "400013"],      
      "Sion – Matunga": ["400022", "400019"],      
      "Dharavi": ["400017"],      
      "Bandra West – Khar": ["400050", "400052"],     
      "Bandra East – BKC": ["400051"],      
      "Santacruz West – East": ["400054", "400055"],      
      "Vile Parle East – West": ["400057", "400056"],     
      "Juhu": ["400049"],     
      "Andheri West": ["400053"],      
      "Andheri East – MIDC": ["400069", "400093"],      
      "Jogeshwari": ["400060"],      
      "Goregaon East – West": ["400063", "400062"],     
      "Malad East – West": ["400097", "400064"],      
      "Kandivali East – West": ["400101", "400067"],      
      "Borivali East – West": ["400066", "400092"],      
      "Kurla – Nehru Nagar": ["400070", "400024"],     
      "Chembur": ["400071"],     
      "Ghatkopar East – West": ["400077", "400086"],      
      "Powai": ["400076"],      
      "Vikhroli": ["400083"],      
      "Bhandup": ["400078"],    
      "Mulund East – West": ["400081", "400080"],
      "Airport Zone": ["400099"]
    };

    const tokens = Array.from(new Set(q.split(/\s+/).map(t => t.trim()).filter(Boolean)));
    const tokenLikes = tokens.map(t => `%${t}%`);
    const nameLike = `%${q}%`;
    const areaLike = `%${q}%`;

    let matchedCategoryId = null;
    let matchedSubcategoryId = null;
    const categoryChecks = [q, ...tokens].slice(0, 6); 
    for (const text of categoryChecks) {
      const [catRows] = await pool.query(
        "SELECT id FROM category WHERE name LIKE ? LIMIT 1", [`%${text}%`]
      );
      if (catRows.length) {
        matchedCategoryId = catRows[0].id;
        break;
      }
    }
    for (const text of categoryChecks) {
      const [subRows] = await pool.query(
        "SELECT id FROM subcategory WHERE name LIKE ? LIMIT 1", [`%${text}%`]
      );
      if (subRows.length) {
        matchedSubcategoryId = subRows[0].id;
        break;
      }
    }

    let locationCondition = "";
    const locationValues = [];
    if (location) {
      if (nodePinCodes[location]) {
        const pins = nodePinCodes[location];
        const placeholders = pins.map(() => "?").join(",");
        locationCondition = ` AND b.pin_code IN (${placeholders})`;
        locationValues.push(...pins);
      } else if (/^\d{5,6}$/.test(location)) {
         // It's a pincode, check if it matches any node
    for (const [node, pins] of Object.entries(nodePinCodes)) {
      if (pins.includes(location)) {
        nodeName = node; 
        break;
      }}
        locationCondition = ` AND b.pin_code = ?`;
        locationValues.push(location);
      } else {
        nodeName = location;
        locationCondition = ` AND b.area LIKE ?`;
        locationValues.push(`%${location}%`);
      }
    }

    const whereBase = `b.is_verified = 1`;

    const useFullText = q.replace(/\s+/g, "").length >= 3;

    let selectRelevancePart = `
      ((b.category_id = ?)*10) +
      ((b.subcategory_id = ?)*9) +
      ((b.name LIKE ?)*8) +
      ((b.area LIKE ?)*4)
    `;

    let fromAndJoins = `
      FROM businesses b
      LEFT JOIN category c ON b.category_id = c.id
      LEFT JOIN subcategory sc ON b.subcategory_id = sc.id
    `;

    let mainQuery;
    let mainParams = [];
    if (useFullText) {
      selectRelevancePart += ` + (MATCH(b.description, b.name, b.area) AGAINST (? IN NATURAL LANGUAGE MODE))`;
      mainQuery = `
        SELECT b.*,
          (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url,
          (${selectRelevancePart}) AS relevance
        ${fromAndJoins}
        WHERE ${whereBase}
          AND MATCH(b.description, b.name, b.area) AGAINST (? IN NATURAL LANGUAGE MODE)
          ${locationCondition}
        ORDER BY relevance DESC, b.name ASC
        LIMIT ? OFFSET ?
      `;
      mainParams = [
        matchedCategoryId ?? 0,
        matchedSubcategoryId ?? 0,
        nameLike,
        areaLike,
        q, // fulltext score param
        q, // fulltext WHERE param
        ...locationValues,
        limit,
        offset
      ];
    } else {
      const searchConditions = [
        "b.name LIKE ?",
        "b.description LIKE ?",
        "c.name LIKE ?",
        "sc.name LIKE ?",
        "b.area LIKE ?"
      ].join(" OR ");
      mainQuery = `
        SELECT b.*,
          (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url,
          (${selectRelevancePart}) AS relevance
        ${fromAndJoins}
        WHERE ${whereBase}
          AND (${searchConditions})
          ${locationCondition}
        ORDER BY relevance DESC, b.name ASC
        LIMIT ? OFFSET ?
      `;
      mainParams = [
        matchedCategoryId ?? 0,
        matchedSubcategoryId ?? 0,
        nameLike,
        areaLike,
        nameLike,
        `%${q}%`,
        `%${q}%`,
        `%${q}%`,
        areaLike,
        ...locationValues,
        limit,
        offset
      ];
    }

    let dataRows;
    try {
      const [rows] = await pool.query(mainQuery, mainParams);
    
      if (rows.length > 0) {
        dataRows = rows;
      } else {
        throw new Error("Fallback to LIKE");
      }
    } catch (err) {
      const searchConditions = [
        "b.name LIKE ?",
        "b.description LIKE ?",
        "c.name LIKE ?",
        "sc.name LIKE ?",
        "b.area LIKE ?"
      ].join(" OR ");
      const fallbackQuery = `
        SELECT b.*,
          (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url,
          (
            ((b.category_id = ?)*10) +
            ((b.subcategory_id = ?)*9) +
            ((b.name LIKE ?)*8) +
            ((b.area LIKE ?)*4)
          ) AS relevance
        ${fromAndJoins}
        WHERE ${whereBase}
          AND (${searchConditions})
          ${locationCondition}
        ORDER BY relevance DESC, b.name ASC
        LIMIT ? OFFSET ?
      `;
      const fallbackParams = [
        matchedCategoryId ?? 0,
        matchedSubcategoryId ?? 0,
        nameLike,
        areaLike,
        nameLike,
        `%${q}%`,
        `%${q}%`,
        `%${q}%`,
        areaLike,
        ...locationValues,
        limit,
        offset
      ];
      const [fallbackRows] = await pool.query(fallbackQuery, fallbackParams);
      dataRows = fallbackRows;
    }

    let countQuery;
    let countParams;
    if (useFullText) {
      countQuery = `
        SELECT COUNT(*) AS total
        ${fromAndJoins}
        WHERE ${whereBase}
          AND MATCH(b.description, b.name, b.area) AGAINST (? IN NATURAL LANGUAGE MODE)
          ${locationCondition}
      `;
      countParams = [q, ...locationValues];
    } else {
      countQuery = `
        SELECT COUNT(*) AS total
        ${fromAndJoins}
        WHERE ${whereBase}
          AND (
            b.name LIKE ? OR
            b.description LIKE ? OR
            c.name LIKE ? OR
            sc.name LIKE ? OR
            b.area LIKE ?
          )
          ${locationCondition}
      `;
      countParams = [
        nameLike,
        `%${q}%`,
        `%${q}%`,
        `%${q}%`,
        areaLike,
        ...locationValues
      ];
    }
    const [[countResult]] = await pool.query(countQuery, countParams);
    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit) || 0;

    res.status(200).json({
      page,
      limit,
      total,
      totalPages,
      data: dataRows,
      nodeName,
    });
  } catch (error) {
    console.error("Error in global search:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const getBusinessPlansStatus = async (req, res) => {
  console.log("🔥 PAYMENTS API HIT");
  
  try {
    let { search, plan_status, page = 1, limit = 10 } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));
    const offset = (page - 1) * limit;

    // Base query
    let query = `
    SELECT
      p.id,
      p.business_id,
      b.name AS business_name,
      b.phone AS business_phone,
      p.transaction_id,
      p.plan,
      p.amount,
      p.status AS payment_status,
      p.created_at AS payment_time,
      bp.start_date,
      bp.end_date
    FROM payments p
    LEFT JOIN businesses b
      ON b.id = p.business_id
    LEFT JOIN business_plans bp
      ON bp.business_id = p.business_id
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
    console.log("Rows Found:", rows.length);
    console.log(rows);

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
    const result = rows.map((r) => ({
      business_id: r.business_id,
      business_name: r.business_name || "N/A",
      business_phone: r.business_phone || "N/A",
      plan_id: r.plan,
      plan_name: r.plan,
      amount: r.amount,
      transaction_id: r.transaction_id,
      payment_status: r.payment_status,
      payment_time: r.payment_time,
      plan_start: r.start_date,
      plan_end: r.end_date,
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




// export const globalSearchBusinesses = async (req, res) => {
//   try {
//     console.log("🔍 [SEARCH START]");
//     console.log("➡️ Raw Query:", req.query);

//     let { q = "", location = "", page = 1, limit = 10 } = req.query;
//     q = String(q || "").trim();
//     location = String(location || "").trim();
//     let nodeName = "";

//     console.log("🧹 Cleaned Inputs:", { q, location, page, limit });

//     if (!q) {
//       console.warn("⚠️ Empty search query");
//       return res.status(400).json({ msg: "Search query is required" });
//     }

//     page = Number.isFinite(Number(page)) ? Math.max(1, parseInt(page, 10)) : 1;
//     limit = Number.isFinite(Number(limit)) ? Math.max(1, parseInt(limit, 10)) : 10;
//     limit = Math.min(limit, 50);
//     const offset = (page - 1) * limit;

//     console.log("📄 Pagination:", { page, limit, offset });

//     const tokens = Array.from(new Set(q.split(/\s+/).map(t => t.trim()).filter(Boolean)));
//     console.log("🔤 Tokens:", tokens);

//     const nameLike = `%${q}%`;
//     const areaLike = `%${q}%`;

//     let matchedCategoryId = null;
//     let matchedSubcategoryId = null;

//     console.log("🔎 Checking category match...");
//     for (const text of [q, ...tokens].slice(0, 6)) {
//       const [catRows] = await pool.query(
//         "SELECT id FROM category WHERE name LIKE ? LIMIT 1",
//         [`%${text}%`]
//       );
//       if (catRows.length) {
//         matchedCategoryId = catRows[0].id;
//         console.log("✅ Matched Category:", matchedCategoryId);
//         break;
//       }
//     }

//     console.log("🔎 Checking subcategory match...");
//     for (const text of [q, ...tokens].slice(0, 6)) {
//       const [subRows] = await pool.query(
//         "SELECT id FROM subcategory WHERE name LIKE ? LIMIT 1",
//         [`%${text}%`]
//       );
//       if (subRows.length) {
//         matchedSubcategoryId = subRows[0].id;
//         console.log("✅ Matched Subcategory:", matchedSubcategoryId);
//         break;
//       }
//     }

//     let locationCondition = "";
//     const locationValues = [];

//     console.log("📍 Processing location:", location);

//     if (location) {
//       if (/^\d{5,6}$/.test(location)) {
//         locationCondition = ` AND b.pin_code = ?`;
//         locationValues.push(location);
//         console.log("📌 Using PIN filter:", location);
//       } else {
//         locationCondition = ` AND b.area LIKE ?`;
//         locationValues.push(`%${location}%`);
//         nodeName = location;
//         console.log("🏙️ Using AREA filter:", location);
//       }
//     }

//     const whereBase = `b.is_verified = 1`;
//     const useFullText = q.replace(/\s+/g, "").length >= 3;

//     console.log("⚡ FullText Enabled:", useFullText);

//     let mainQuery;
//     let mainParams = [];

//     if (useFullText) {
//       console.log("🚀 Running FULLTEXT search");

//       mainQuery = `
//         SELECT b.*, 
//         (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url
//         FROM businesses b
//         WHERE ${whereBase}
//         AND MATCH(b.description, b.name, b.area) AGAINST (? IN NATURAL LANGUAGE MODE)
//         ${locationCondition}
//         LIMIT ? OFFSET ?
//       `;

//       mainParams = [q, ...locationValues, limit, offset];
//     } else {
//       console.log("🐢 Running LIKE search");

//       mainQuery = `
//         SELECT b.*, 
//         (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url
//         FROM businesses b
//         WHERE ${whereBase}
//         AND (b.name LIKE ? OR b.description LIKE ? OR b.area LIKE ?)
//         ${locationCondition}
//         LIMIT ? OFFSET ?
//       `;

//       mainParams = [nameLike, nameLike, areaLike, ...locationValues, limit, offset];
//     }

//     console.log("📦 Executing Query...");
//     console.log("🧾 SQL:", mainQuery);
//     console.log("📥 Params:", mainParams);

//     let dataRows;

//     try {
//       const [rows] = await pool.query(mainQuery, mainParams);
//       dataRows = rows;
//       console.log("✅ Query Success. Rows:", rows.length);
//     } catch (err) {
//       console.error("❌ Main Query Failed:", err.message);

//       console.log("🔁 Running fallback query...");

//       const fallbackQuery = `
//         SELECT b.*, 
//         (SELECT image_url FROM business_images WHERE business_id = b.id LIMIT 1) AS image_url
//         FROM businesses b
//         WHERE ${whereBase}
//         AND (b.name LIKE ? OR b.description LIKE ? OR b.area LIKE ?)
//         ${locationCondition}
//         LIMIT ? OFFSET ?
//       `;

//       const fallbackParams = [nameLike, nameLike, areaLike, ...locationValues, limit, offset];

//       const [fallbackRows] = await pool.query(fallbackQuery, fallbackParams);
//       dataRows = fallbackRows;

//       console.log("✅ Fallback Success. Rows:", fallbackRows.length);
//     }

//     console.log("📊 Fetching total count...");

//     const [[countResult]] = await pool.query(
//       `SELECT COUNT(*) AS total FROM businesses b WHERE ${whereBase}`,
//     );

//     const total = Number(countResult?.total || 0);

//     console.log("📈 Total Results:", total);

//     res.status(200).json({
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//       data: dataRows,
//       nodeName,
//     });

//     console.log("🏁 [SEARCH END SUCCESS]\n");

//   } catch (error) {
//     console.error("🔥 [SEARCH ERROR]:", error);
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };