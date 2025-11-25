import pool from "../config/db.js";


// Submit contact form
export const submitContactForm = async(req,res) =>{
    const {businessName, username, phone, enquiry} = req.body;

    // if (!businessName || !username || !phone || !enquiry) {
    //     return res.status(400).json({ message: "All fields are required" });
    //   }

      try {
        const query = `INSERT INTO contact_us (business_name, user_name, phone, enquiry) VALUES (?, ?, ?, ?)`;
        await pool.execute(query, [businessName, username, phone, enquiry]);
        res.status(201).json({ message: "Contact form submitted successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
}


// Get all contact
export const getAllContacts = async (req, res) => {
  try {
    // ✅ Get pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // ✅ Get total count
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM contact_us`);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    // ✅ Fetch contacts (unviewed first, then viewed, both sorted by date)
    const [rows] = await pool.query(
      `SELECT * 
       FROM contact_us 
       ORDER BY viewed ASC, created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // ✅ Send response
    res.status(200).json({
      contacts: rows,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


//Marked Viewed
export const markedViewed = async (req,res)=>{
  const { id } = req.params;
  console.log("id :",id)

  try {
    const [result] = await pool.query(
      "UPDATE contact_us SET viewed = ? WHERE id = ?",
      [true, id]
    );
    console.dir(result, { depth: null });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json({
      success: true,
      message: `Contact marked as viewed `,
    });
  } catch (err) {
    console.error("Error updating view status:", err);
    res.status(500).json({ error: "Failed to update view status" });
  }
}