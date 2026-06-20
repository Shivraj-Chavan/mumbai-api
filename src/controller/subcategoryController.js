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



// ADD SUBCATEGORY
export const addSubcategory = async (req, res) => {
  try {
    const { name, slug, categoryId, sequence } = req.body;

    if (!name || !slug || !categoryId) {
      return res.status(400).json({ message: "All fields required" });
    }

    await pool.query(
      `INSERT INTO subcategories (name, slug, category_id, sequence, blocked, created_at)
       VALUES (?, ?, ?, ?, 0, NOW())`,
      [name, slug, categoryId, sequence || 0]
    );

    res.json({ message: "Subcategory added" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE SUBCATEGORY
export const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, categoryId, sequence, blocked } = req.body;

    await pool.query(
      `UPDATE subcategories 
       SET name=?, slug=?, category_id=?, sequence=?, blocked=? 
       WHERE id=?`,
      [name, slug, categoryId, sequence, blocked ?? 0, id]
    );

    res.json({ message: "Subcategory updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE SUBCATEGORY
export const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM subcategories WHERE id=?", [id]);

    res.json({ message: "Subcategory deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
