import slugify from "slugify";
import pool from "../config/db.js";
import { isAdminOrSubadmin } from "../utils/checkAdmin.js";

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

  try {
    const userId = req.user.id; 
    const user = req.user; 
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    console.log(user);
    console.log(userId);
    
    const {
      owner_id: providedOwnerId,
      name,
      category_id,
      subcategory_id,
      pin_code,
      address,
      landmark,
      sector,
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
    const slug = await getUniqueSlug(name, area);

    // Validate required fields
    if (!name) return res.status(400).json({ msg: "Business name is required" });
    if (!category_id) return res.status(400).json({ msg: "Category is required" });
    if (!area) return res.status(400).json({ msg: "Area is required" });


    // Ensure latitude and longitude are numbers or null
    // const latValue = latitude ? parseFloat(latitude) : null;
    // const lngValue = longitude ? parseFloat(longitude) : null;
    const latValue = latitude && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null;
    const lngValue = longitude && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null;

   console.log( { latitude: latValue, longitude: lngValue,});

    const values = [
      owner_id ?? null,
      name ?? null,
      category_id ?? null, 
      subcategory_id ?? null,
      pin_code ?? null,
      address ?? null,
      landmark ?? null,
      sector ?? null,
      area ?? null,
      phone ?? null,
      wp_number ?? null,
      email ?? null,
      description ?? null,
      website ?? null,
      JSON.stringify(timing ?? []),
      slug,
      latValue,
      lngValue,
    ];

    console.log("Final Data to Insert into DB:", values);

    const query = `
      INSERT INTO businesses (
        owner_id, name, category_id, subcategory_id, 
        pin_code, address, landmark, sector, area, 
        phone, wp_number, email, description, website, timing, slug, latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await pool.query(query, values);
    const newBusinessId = result.insertId;

    // Log admin action only if sub-admin
    // if (user.role === "sub-admin") {
    //   await pool.query(
    //     `INSERT INTO admin_actions (admin_id, action, target_type, target_id, created_at)
    //      VALUES (?, ?, ?, ?, ?)`,
    //     [user.id, "Created business", "Business", newBusinessId, new Date()]
    //   );
    //   console.log("Admin action logged for sub-admin");
    // }

    res.status(201).json({ msg: "Business created successfully", id: newBusinessId });
  } catch (error) {
    console.error("BUSINESS create error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
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
export const getBusinesses = async (req, res) => {
  try {

    let {
      categoryslug,
      subcategoryslug,
      name,
      location,
      isVerified=1,
      page = 1,
      limit = 10,
    } = req.query;
    console.log('Raw query:', { categoryslug, subcategoryslug, name, location, page, limit, isVerified });

    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));
    const offset = (page - 1) * limit;

    let query = `
      SELECT b.*, 
             c.name AS category_name, 
             s.name AS subcategory_name 
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN subcategories s ON b.subcategory_id = s.id
      WHERE 1=1
    `;
    const values = [];

    if (isVerified !== undefined) {
      query += ` AND b.is_verified = ?`;
      // values.push(isVerified === "true");
      values.push(isVerified === "true");

    }
    
    if (categoryslug) {
      query += ` AND b.category_id IN (SELECT id FROM categories WHERE slug = ?)`;
      values.push(categoryslug);
    }

    if (subcategoryslug) {
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

    query += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
    values.push(limit, offset);

    const [rows] = await pool.query(query, values);

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM businesses b
      LEFT JOIN categories c ON b.category_id = c.id
      LEFT JOIN subcategories s ON b.subcategory_id = s.id
      WHERE 1=1
    `;
    const countValues = [];

    if (isVerified !== undefined) {
      countQuery += ` AND b.is_Verified = ?`;
      countValues.push(isVerified === "true");
    }

    if (categoryslug) {
      countQuery += ` AND b.category_id IN (SELECT id FROM categories WHERE slug = ?)`;
      countValues.push(categoryslug);
    }

    if (subcategoryslug) {
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

    // Step 1: Get all businesses by user
    const [businessRows] = await pool.query(
      "SELECT * FROM businesses WHERE owner_id = ?",
      [userId]
    );
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
      status: b.status || "pending",  // ensures front-end badge works
      images: imagesMap[b.id] || []
    }));
    
    console.log("Final business payload:", businesses);
    res.status(200).json({ businesses });
  } catch (error) {
    console.error("Error fetching businesses by user ID:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    // Join with users to check owner status
    // const [rows] = await pool.execute(`
    //   SELECT b.* FROM businesses b
    //   JOIN users u ON b.owner_id = u.id
    //   WHERE b.id = ? AND u.is_active = 1
    // `, [id]);

// const [rows] = await pool.execute(`
//       SELECT b.* FROM businesses b
//       JOIN users u ON b.owner_id = u.id
//       WHERE b.id = ? AND u.is_active = 1
//     `, [id]);

const [rows] = await pool.execute(
  `SELECT * FROM businesses WHERE id = ?`,
  [id]
);

    console.log(rows);
    

    if (rows.length === 0) {
      return res.status(404).json({ msg: "Business not found or owner is inactive" });
    }
    console.log("Business fetched:", rows[0]);

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
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
      sector = null,
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

    const latValue = parseNumber(latitude);
    const lngValue = parseNumber(longitude);

    console.log("Latitude:", latValue, "Longitude:", lngValue);


     // Admin updates directly
    // if (role === "admin") {
    
  if (isAdminOrSubadmin(user)) {
      console.log(` ${role} is updating the business directly...`);
  // }
     
      const [result] = await pool.execute(
        `UPDATE businesses SET 
          owner_id = ?, 
          name = ?, 
          category_id = ?, 
          subcategory_id = ?, 
          pin_code = ?, 
          address = ?, 
          landmark = ?, 
          sector = ?, 
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
          sector,
          area,
          phone,
          wp_number,
          email,
          description,
          website,   
          typeof timing === "string" ? timing : JSON.stringify(timing),
          slug,
          is_verified,
          latValue,          
          lngValue,          
          id,
        ]
      );
      console.log("Update result:", result);

      if (result.affectedRows === 0) {
        return res.status(404).json({ msg: "Business not found or nothing to update" });
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
      const [existing] = await pool.execute(`SELECT id FROM update_businesses WHERE id = ? AND is_verified = 0`, [id]);

      if (existing.length > 0) {
        return res.status(409).json({ msg: "An update request is already pending for this business" });
      }

      await pool.execute(
        `INSERT INTO update_businesses (
          id, owner_id, name, category_id, subcategory_id, pin_code, address,
          landmark, sector, area, phone, wp_number, email, description, website, timing, slug, latitude, longitude, is_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?,?)`,
        [
          id,
          userId,
          name,
          category_id,
          subcategory_id,
          pin_code,
          address,
          landmark,
          sector,
          area,
          phone,
          wp_number,
          email,
          description,
          website,
          JSON.stringify(timing),
          slug,
          latValue,
          lngValue,
          is_verified,
        ]
      );
      console.log("Owner update inserted into update_businesses table.");

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

    // 1 Get total count of pending updates
    const [[countResult]] = await pool.query(`SELECT COUNT(*) AS total FROM update_businesses`);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
  try {
    const [updates] = await pool.query(`SELECT * FROM update_businesses LIMIT ? OFFSET ?`, [limit, offset]);
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
export const approveUpdate = async (req, res) => {
  const id = req.params.id;
  const user = req.user;

  try {
    const [[pending]] = await pool.query(`SELECT * FROM update_businesses WHERE id = ?`, [id]);
    console.log("Fetched pending update:", pending);
    const [images] = await pool.query(`SELECT * FROM update_business_images WHERE id = ?`, [id]);
    console.log("Fetched pending images:", images);


    if (!pending) return res.status(404).json({ msg: "Pending update not found" });
     console.warn(" No pending update found for ID:", id);

      // Only allow admin or subadmin
    if (!["admin", "sub-admin"].includes(user?.role)) {
      return res.status(403).json({ msg: "Permission denied" });
    }
     
    // Update the original business in businesses with the new data.
    await pool.query(
      `UPDATE businesses SET  name=?, description=?, timing=?, website=?, phone=?, wp_number=?, address=?, area=?, landmark=?, sector=?, pin_code=?, category_id=?, subcategory_id=?, email=?, slug=?, owner_id=?, latitude=?, longitude=? 
        WHERE id=?`,
      [
        pending.name,
        pending.description,
        pending.timing,
        pending.website,
        pending.phone,
        pending.wp_number,
        pending.address,
        pending.area,
        pending.landmark,
        pending.sector,
        pending.pin_code,
        pending.category_id,
        pending.subcategory_id,
        pending.email,
        await getUniqueSlug(pending.name, pending.area, id), 
        pending.owner_id,
        pending.latitude ? parseFloat(pending.latitude) : null,
        pending.longitude ? parseFloat(pending.longitude) : null,
        true,
        id
      ]
    );
    console.log("Replacing existing business images...");

    // Delete old image
    // await pool.query(`DELETE FROM business_images WHERE business_id = ?`, [id]);
    // if (images.length > 0) {
    //   const imageData = images.map((img) => [id, img.image_url]);

    //   // Insert new approved images
    //   await pool.query(`INSERT INTO business_images (business_id, image_url) VALUES ?`, [imageData]);
    //   console.log("New images added:", images.length);
    // }else {
    //   console.log("No new images provided.");
    // }
    if (images.length > 0) {
      console.log("Replacing existing business images...");
    
      // Delete old images only if new ones are present
      // await pool.query(`DELETE FROM business_images WHERE business_id = ?`, [id]);
    
      const imageData = images.map((img) => [id, img.image_url]);
      await pool.query(`INSERT INTO business_images (business_id, image_url) VALUES ?`, [imageData]);
      console.log("New images added:", images.length);
    } else {
      console.log("No new images provided — keeping existing images.");
    }
    
    // Clean up pending update
    await pool.query(`DELETE FROM update_businesses WHERE id = ?`, [id]);
    await pool.query(`DELETE FROM update_business_images WHERE business_id = ?`, [id]);
    
    // Log action
    // const actionText = user?.role === "sub-admin" ? "Subadmin approved business update" : "Admin approved business update";
    if (user.role === 'sub-admin') {
    await pool.query(
      `INSERT INTO admin_actions (admin_id, action, target_type, target_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [user.id, "Subadmin approved business update", "Business", id]
    );
  };

    // Send Business Registration SMS
    const recipientPhone = pending.phone || pending.wp_number;
    if (recipientPhone) {
      try {
        const smsResponse = await sendSms("businessConfirmation", recipientPhone, {});
        console.log("SMS Response:", JSON.stringify(smsResponse, null, 2));
      } catch (err) {
        console.error("Failed to send BusinessRegistration SMS:", err.message);
      }
    }

    res.json({ msg: "Business update approved" });
  } catch (err) {
    console.error("Error approving update:", err);
    res.status(500).json({ msg: "Approval failed" , error: err.message });
  }
};

// Admin rejects update
export const rejectUpdate = async (req, res) => {
  try {
    const businessId = req.params.id;
    console.log("Admin rejecting update for business:", businessId);

    // 1. Fetch images linked to this business update
    const [images] = await pool.query(
      "SELECT image_url FROM update_business_images WHERE business_id = ?",
      [businessId]
    );

    // 2. Remove images from filesystem
    for (const img of images) {
      const parts = img.image_url.split("/");
      const fileName = parts[parts.length - 1];
      const filePath = path.join(__dirname, "../../uploads/business_photos", fileName);

      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(` Deleted file: ${filePath}`);
      } catch (err) {
        console.warn(` Could not delete file: ${filePath} (${err.message})`);
      }
    }

    // 3. Delete records from DB
    await pool.query("DELETE FROM update_business_images WHERE business_id = ?", [businessId]);
    await pool.query("DELETE FROM update_businesses WHERE id = ?", [businessId]);

    // log action
    await pool.query(
      "INSERT INTO admin_actions (admin_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, "Rejected business update", "Business", businessId]
    );

    res.json({ msg: "Update rejected and all images removed" });
  } catch (err) {
    console.error("Reject update failed:", err);
    res.status(500).json({ error: "Rejection failed", details: err.message });
  }
};
