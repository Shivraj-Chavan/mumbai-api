import pool from "../config/db.js";

export const getAllCategoriesSubcategories = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id AS category_id, 
        c.name AS category_name, 
        c.slug AS category_slug,
        c.sequence AS category_sequence,
        s.id AS subcategory_id, 
        s.name AS subcategory_name, 
        s.slug AS subcategory_slug,
        s.sequence AS subcategory_sequence
      FROM categories c
      LEFT JOIN subcategories s ON c.id = s.category_id
      ORDER BY c.sequence ASC, s.sequence ASC;
    `;

    const [rows] = await pool.query(query);

    const categoriesMap = {};
    rows.forEach((row) => {
      if (!categoriesMap[row.category_id]) {
        categoriesMap[row.category_id] = {
          id: row.category_id,
          name: row.category_name,
          slug: row.category_slug,
          sequence: row.category_sequence, 
          subcategories: [],
        };
      }

      if (row.subcategory_id) {
        categoriesMap[row.category_id].subcategories.push({
          id: row.subcategory_id,
          name: row.subcategory_name,
          slug: row.subcategory_slug,
          sequence: row.subcategory_sequence, 
        });
      }
    });

    let result = Object.values(categoriesMap);

    result.sort((a, b) => a.sequence - b.sequence);
    result.forEach((cat) => {
      cat.subcategories.sort((a, b) => a.sequence - b.sequence);
    });

    result = result.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      subcategories: cat.subcategories.map((sub) => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
      })),
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

    
export const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(`SELECT id, name ,slug FROM categories ORDER BY sequence ASC;`);
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};




// GET ALL (with subcategories)
export const getAllCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      "SELECT * FROM categories ORDER BY sequence ASC"
    );

    const [subs] = await pool.query(
      "SELECT * FROM subcategories ORDER BY sequence ASC"
    );

    const result = categories.map((cat) => ({
      ...cat,
      status: cat.blocked ? "inactive" : "active",
      subcategories: subs.filter((s) => s.category_id === cat.id),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD CATEGORY
export const addCategory = async (req, res) => {
  try {
    const { name, slug, sequence } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "Name & slug required" });
    }

    await pool.query(
      `INSERT INTO categories (name, slug, sequence, blocked, created_at)
       VALUES (?, ?, ?, 0, NOW())`,
      [name, slug, sequence || 0]
    );

    res.json({ message: "Category added" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE CATEGORY
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, sequence, blocked } = req.body;

    await pool.query(
      `UPDATE categories 
       SET name=?, slug=?, sequence=?, blocked=? 
       WHERE id=?`,
      [name, slug, sequence, blocked ?? 0, id]
    );

    res.json({ message: "Category updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE CATEGORY (hard delete)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // delete subcategories first (safe if no FK cascade)
    await pool.query("DELETE FROM subcategories WHERE category_id=?", [id]);

    await pool.query("DELETE FROM categories WHERE id=?", [id]);

    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};