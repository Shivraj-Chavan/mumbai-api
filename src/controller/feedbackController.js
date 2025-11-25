import pool from "../config/db.js";

// Add review
export const createReview = async (req, res) => {
  try {
    console.log('Request Body:', req.body);

    const user_id = req.user?.id;
    const { business_id, rating, comment } = req.body;

    if (!user_id || !business_id) {
      return res.status(400).json({ msg: "Missing user_id or business_id" });
    }

    const created_at = new Date();
    const values = [user_id, business_id, rating, comment, created_at];

    const query = `
      INSERT INTO reviews (
        user_id, business_id, rating, comment, created_at
      ) VALUES (?, ?, ?, ?, ?);
    `;

    console.log('Insert query:', query);
    console.log('Values:', values);

    const [result] = await pool.query(query, values);

    res.status(201).json({
      msg: 'Review added successfully',
      review: {
        id: result.insertId,
        user_id,
        business_id,
        rating,
        comment,
        created_at,
      },
    });
  } catch (error) {
    console.error('Create Review Error:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// GET all reviews without filtering
export const getAllReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        r.id AS review_id,
        r.user_id,   
        r.comment,
        r.rating,
        r.business_id,
        b.name,
        r.created_at
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `;
    const [reviews] = await pool.query(query, [userId]);
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Get All Reviews Error:', error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


// Get all reviews for a business
export const getReviews = async (req, res) => {
  try {
    const { business_id } = req.params;

    if (!business_id) {
      return res.status(400).json({ msg: "business_id is required" });
    }
    console.log('Received business_id param:', business_id)

    const query = `SELECT * FROM reviews WHERE business_id = ? ORDER BY created_at DESC `;

    const [reviews] = await pool.query(query, [business_id]);
    console.log('Reviews fetched:', reviews);
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Get Reviews Error:', error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// GET all reviews posted by a specific user (My Reviews)
// export const getReviewsByUser = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     if (!userId) {
//       return res.status(400).json({ msg: "userId is required" });
//     }

//     // Use user_id (underscore) for column name consistency
//     const query = `SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC`;
//     const [reviews] = await pool.query(query, [userId]);

//     res.status(200).json(reviews);
//   } catch (error) {
//     console.error('Get User Reviews Error:', error);
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };

// Delete review by id
// export const deleteReview = async (req, res) => {
//   try {
//     const { review_id } = req.params;
//     console.log('Attempting to delete review with id:', review_id);

//     const query = `DELETE FROM reviews WHERE id = ?`;
//     const [result] = await pool.query(query, [review_id]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ msg: 'Review not found' });
//     }

//     res.status(200).json({ msg: 'Review deleted' });
//   } catch (error) {
//     console.error('Error deleting review:', error);
//     res.status(500).json({ msg: 'Server error', error: error.message });
//   }
// };

// DELETE /reviews/:id
export const deleteReview = async (req, res) => {
  const reviewId = req.params.id;
  const currentUserId = req.user.id;

  try {
    // Step 1: Fetch the review and business owner ID
    const [result] = await pool.query(`
      SELECT r.*, b.owner_id AS business_owner_id
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.id = ?
    `, [reviewId]);
    if (result.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    
    const review = result[0];
    const isReviewer = review.user_id === currentUserId;
    const isBusinessOwner = review.business_owner_id === currentUserId;
    console.log({"koni takla ":review.user_id,"kon bgtay ":currentUserId,"business owner": review.business_owner_id})
    
    if (isReviewer) {
      // Reviewer can delete immediately
      await pool.query("DELETE FROM reviews WHERE id = ?", [reviewId]);
      return res.status(200).json({ message: "Review deleted successfully" });
    }

    if (isBusinessOwner) {
      // Raise a delete request instead of deleting
      await pool.query(`
        UPDATE reviews SET delete_query = 1 WHERE id = ?
      `, [reviewId]);


      return res.status(200).json({ message: "Delete request has been raised to admin" });
    }

    return res.status(403).json({ message: "Not authorized to delete this review" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Server error while processing delete" });
  }
};

export const getRaisedReviews = async (req, res) => {
  try {
    console.log("get rev raised ")
    const [raisedReviews] = await pool.query(`
      SELECT r.*, b.name AS business_name
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.delete_query = 1
    `);

    console.log({raisedReviews})
    res.json(raisedReviews);
  } catch (error) {
    console.error("Error fetching raised reviews:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Admin Delete 
export const adminDeleteReview = async (req, res) => {
  const { review_id } = req.params;

  try {        
    await pool.query("DELETE FROM reviews WHERE id = ?", [review_id]);
    res.json({ message: "Review permanently deleted by admin" });
  } catch (err) {
    console.error("Admin deletion error:", err);
    res.status(500).json({ message: "Failed to delete review" });
  }
};
