import pool from "../config/db.js";

export const getSubcategoriesByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT s.id, s.name, s.slug 
      FROM subcategory s
      JOIN category c ON s.category_id = c.id
      WHERE c.slug = ?
      ORDER BY s.sequence ASC, s.name ASC;
    `;

    const [subcategories] = await pool.query(query, [slug]);

    if (subcategories.length === 0) {
      return res.status(404).json({ msg: "Category not found or has no subcategories" });
    }

    res.status(200).json(subcategories);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
