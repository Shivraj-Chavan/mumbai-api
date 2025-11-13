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
