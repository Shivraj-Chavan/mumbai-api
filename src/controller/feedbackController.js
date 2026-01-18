// import { log } from "console";
import pool from "../config/db.js";

// // Add review
// export const createReview = async (req, res) => {
//   try {
//     console.log('Request Body:', req.body);

//     const user_id = req.user?.id;
//     const { business_id, rating, comment } = req.body;

//     if (!user_id || !business_id) {
//       return res.status(400).json({ msg: "Missing user_id or business_id" });
//     }

//     const created_at = new Date();
//     const values = [user_id, business_id, rating, comment, created_at];

//     const query = `
//       INSERT INTO reviews (
//         user_id, business_id, rating, comment, created_at
//       ) VALUES (?, ?, ?, ?, ?);
//     `;

//     console.log('Insert query:', query);
//     console.log('Values:', values);

//     const [result] = await pool.query(query, values);

//     res.status(201).json({
//       msg: 'Review added successfully',
//       review: {
//         id: result.insertId,
//         user_id,
//         business_id,
//         rating,
//         comment,
//         created_at,
//       },
//     });
//   } catch (error) {
//     console.error('Create Review Error:', error);
//     res.status(500).json({ msg: 'Server error', error: error.message });
//   }
// };

// // GET all reviews without filtering
// export const getAllReviews = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const query = `
//       SELECT 
//         r.id AS review_id,
//         r.user_id,   
//         r.comment,
//         r.rating,
//         r.business_id,
//         b.name,
//         r.created_at
//       FROM reviews r
//       JOIN businesses b ON r.business_id = b.id
//       WHERE r.user_id = ?
//       ORDER BY r.created_at DESC
//     `;
//     const [reviews] = await pool.query(query, [userId]);
//     res.status(200).json(reviews);
//   } catch (error) {
//     console.error('Get All Reviews Error:', error);
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };


// // Get all reviews for a business
// export const getReviews = async (req, res) => {
//   try {
//     const { business_id } = req.params;

//     if (!business_id) {
//       return res.status(400).json({ msg: "business_id is required" });
//     }
//     console.log('Received business_id param:', business_id)

//     const query = `SELECT * FROM reviews WHERE business_id = ? ORDER BY created_at DESC `;

//     const [reviews] = await pool.query(query, [business_id]);
//     console.log('Reviews fetched:', reviews);
//     res.status(200).json(reviews);
//   } catch (error) {
//     console.error('Get Reviews Error:', error);
//     res.status(500).json({ msg: "Server error", error: error.message });
//   }
// };

// // GET all reviews posted by a specific user (My Reviews)
// // export const getReviewsByUser = async (req, res) => {
// //   try {
// //     const { userId } = req.params;

// //     if (!userId) {
// //       return res.status(400).json({ msg: "userId is required" });
// //     }

// //     // Use user_id (underscore) for column name consistency
// //     const query = `SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC`;
// //     const [reviews] = await pool.query(query, [userId]);

// //     res.status(200).json(reviews);
// //   } catch (error) {
// //     console.error('Get User Reviews Error:', error);
// //     res.status(500).json({ msg: "Server error", error: error.message });
// //   }
// // };



// // DELETE /reviews/:id
// // export const deleteReview = async (req, res) => {
// //   const reviewId = req.params.id;
// //   const currentUserId = req.user.id;

// //   try {
// //     // Step 1: Fetch the review and business owner ID
// //     const [result] = await pool.query(`
// //       SELECT r.*, b.owner_id AS business_owner_id
// //       FROM reviews r
// //       JOIN businesses b ON r.business_id = b.id
// //       WHERE r.id = ?
// //     `, [reviewId]);
// //     if (result.length === 0) {
// //       return res.status(404).json({ message: "Review not found" });
// //     }

    
// //     const review = result[0];
// //     const isReviewer = review.user_id === currentUserId;
// //     const isBusinessOwner = review.business_owner_id === currentUserId;
// //     console.log({"koni takla ":review.user_id,"kon bgtay ":currentUserId,"business owner": review.business_owner_id})
    
// //     if (isReviewer) {
// //       // Reviewer can delete immediately
// //       await pool.query("DELETE FROM reviews WHERE id = ?", [reviewId]);
// //       return res.status(200).json({ message: "Review deleted successfully" });
// //     }

// //     if (isBusinessOwner) {
// //       // Raise a delete request instead of deleting
// //       await pool.query(`
// //         UPDATE reviews SET delete_query = 1 WHERE id = ?
// //       `, [reviewId]);


// //       return res.status(200).json({ message: "Delete request has been raised to admin" });
// //     }

// //     return res.status(403).json({ message: "Not authorized to delete this review" });
// //   } catch (error) {
// //     console.error("Delete review error:", error);
// //     res.status(500).json({ message: "Server error while processing delete" });
// //   }
// // };


// export const deleteReview = async (req, res) => {
//   const { review_id } = req.params;
//   const user = req.user;
//   console.log({review_id,user})

//   try {
//     // 1️⃣ Fetch review + relations
//     const [[review]] = await pool.query(
//       `SELECT 
//         r.id,
//         r.user_id AS review_user_id,
//         r.delete_requested,
//         b.owner_id AS business_owner_id
//       FROM reviews r
//       JOIN businesses b ON r.business_id = b.id
//       WHERE r.id = ?`,
//       [review_id]
//     );

//     if (!review) {
//       return res.status(404).json({ message: "Review not found" });
//     }

//     // 2️⃣ ADMIN → delete immediately
//     if (user.role === "admin" || user.role === "sub-admin") {
//       await pool.query(
//         "DELETE FROM reviews WHERE id = ?",
//         [review_id]
//       );

//       return res.json({ message: "Review deleted by admin" });
//     }

//     // 3️⃣ USER → delete own review
//     if (user.id === review.review_user_id) {
//       await pool.query(
//         "DELETE FROM reviews WHERE id = ?",
//         [review_id]
//       );

//       return res.json({ message: "Your review has been deleted" });
//     }

//     // 4️⃣ BUSINESS OWNER → request deletion
//     if (
//       user.role === "business-owner" &&
//       user.id === review.business_owner_id
//     ) {
//       if (review.delete_requested === 1) {
//         return res.status(400).json({
//           message: "Delete request already sent to admin"
//         });
//       }

//       await pool.query(
//         `UPDATE reviews
//          SET delete_requested = 1,
//              delete_requested_by = ?
//          WHERE id = ?`,
//         [user.id, review_id]
//       );

//       return res.json({
//         message: "Delete request sent to admin for approval"
//       });
//     }

//     // 5️⃣ Everyone else → blocked
//     return res.status(403).json({
//       message: "You are not allowed to perform this action"
//     });

//   } catch (err) {
//     console.error("Review delete/request error:", err);
//     return res.status(500).json({
//       message: "Failed to process request"
//     });
//   }
// };




// // export const getRaisedReviews = async (req, res) => {
// //   try {
// //     res.setHeader("Cache-Control", "no-store");

// //     // const [raisedReviews] = await pool.query(`
// //     //   SELECT r.*, b.name AS business_name
// //     //   FROM reviews r
// //     //   JOIN businesses b ON r.business_id = b.id
// //     //   WHERE r.delete_query = 1
// //     // `);

// //     const [raisedReviews] = await pool.query(`
// //       SELECT 
// //         r.*,
// //         b.name AS business_name,
// //         u.name AS user_name,
// //         u.phone AS user_phone
// //       FROM reviews r
// //       LEFT JOIN businesses b ON r.business_id = b.id
// //       LEFT JOIN users u ON r.user_id = u.id
// //       WHERE r.delete_query = 1
// //       ORDER BY r.created_at DESC
// //     `);
  
// //     console.log("Raised Reviews:", raisedReviews);

// //     res.json({ raisedReviews });
// //   } catch (error) {
// //     console.error("Error fetching raised reviews:", error);
// //     res.status(500).json({ message: "Server error" });
// //   }
// // };

// export const getRaisedReviews = async (req, res) => {
//   try {
//     const [raisedReviews] = await pool.query(`
//       SELECT 
//         r.*,
//         b.name AS business_name,
//         u.name AS user_name,
//         u.phone AS user_phone
//       FROM reviews r
//       LEFT JOIN businesses b ON r.business_id = b.id
//       LEFT JOIN users u ON r.user_id = u.id
//       WHERE r.delete_query = 1
//       ORDER BY r.created_at DESC
//     `);
//     console.log(raisedReviews)

//     res.json({ raisedReviews });
//   } catch (error) {
//     console.error("Error fetching raised reviews:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };





// // Admin Delete 
// // export const adminDeleteReview = async (req, res) => {
// //   const reviewId = req.params.id;

// //   try {        
// //     await pool.query(
// //       "DELETE FROM reviews WHERE id = ?",
// //       [reviewId]
// //     );
// //     res.json({ message: "Review permanently deleted by admin" });
// //   } catch (err) {
// //     console.error("Admin deletion error:", err);
// //     res.status(500).json({ message: "Failed to delete review" });
// //   }
// // };



// // Admin: Permanently delete a review
// export const adminDeleteReview = async (req, res) => {
//   console.log("CONTROLLER HIT");
//   console.log("req.params:", req.params);

//   const review_id = req.params.review_id;

//   try {
//     const [result] = await pool.query(
//       "DELETE FROM reviews WHERE id = ?",
//       [review_id]
//     );

//     console.log("affectedRows:", result.affectedRows);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Review not found" });
//     }

//     return res.json({
//       message: "Review permanently deleted by admin"
//     });

//   } catch (err) {
//     console.error("Delete error:", err);
//     return res.status(500).json({ message: "Failed to delete review" });
//   }
// };



// // PUT /api/admin/reviews/:id/reject
// export const rejectDeleteRequest = async (req, res) => {
//   const reviewId = req.params.id;

//   await pool.query(
//     `UPDATE reviews SET delete_query = 0 WHERE id = ?`,
//     [reviewId]
//   );

//   res.json({ msg: "Delete request rejected" });
// };



// // GET all reviews for the business(es) owned by current user
// export const getReviewsForOwner = async (req, res) => {
//   try {
//     const currentUserId = req.user.id; // business owner id

//     // Step 1: Get all businesses owned by this user
//     const [businesses] = await pool.query(
//       `SELECT id FROM businesses WHERE owner_id = ?`,
//       [currentUserId]
//     );

//     if (!businesses.length) {
//       return res.status(404).json({ msg: "You don't own any businesses" });
//     }

//     const businessIds = businesses.map(b => b.id);

//     // Step 2: Fetch all reviews for these businesses
//     const [reviews] = await pool.query(
//       `SELECT r.*, b.name AS business_name, u.name AS user_name, u.phone AS user_phone
//        FROM reviews r
//        LEFT JOIN businesses b ON r.business_id = b.id
//        LEFT JOIN users u ON r.user_id = u.id
//        WHERE r.business_id IN (?)
//        ORDER BY r.created_at DESC`,
//       [businessIds]
//     );

//     res.status(200).json({ reviews });
//   } catch (err) {
//     console.error("Error fetching owner reviews:", err);
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// };





export const createReview = async (req, res) => {
  try {
    console.log('Request Body:', req.body);

    const user_id = req.user?.id;
    const { business_id, rating, comment } = req.body;

    if (!user_id || !business_id) {
      return res.status(400).json({ msg: "Missing user_id or business_id" });
    }

        // Check if this user already reviewed this business
        const [existing] = await pool.query(
          `SELECT id FROM reviews WHERE user_id = ? AND business_id = ?`,
          [user_id, business_id]
        );
    
        if (existing.length > 0) {
          return res.status(400).json({ msg: "You have already submitted a review for this business." });
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
// export const deleteReview = async (req, res) => {
//   const reviewId = req.params.id;
//   const currentUserId = req.user.id;

//   try {
//     // Step 1: Fetch the review and business owner ID
//     const [result] = await pool.query(`
//       SELECT r.*, b.owner_id AS business_owner_id
//       FROM reviews r
//       JOIN businesses b ON r.business_id = b.id
//       WHERE r.id = ?
//     `, [reviewId]);
//     if (result.length === 0) {
//       return res.status(404).json({ message: "Review not found" });
//     }

    
//     const review = result[0];
//     const isReviewer = review.user_id === currentUserId;
//     const isBusinessOwner = review.business_owner_id === currentUserId;
//     console.log({"koni takla ":review.user_id,"kon bgtay ":currentUserId,"business owner": review.business_owner_id})
    
//     if (isReviewer) {
//       // Reviewer can delete immediately
//       await pool.query("DELETE FROM reviews WHERE id = ?", [reviewId]);
//       return res.status(200).json({ message: "Review deleted successfully" });
//     }

//     if (isBusinessOwner) {
//       // Raise a delete request instead of deleting
//       await pool.query(`
//         UPDATE reviews SET delete_query = 1 WHERE id = ?
//       `, [reviewId]);


//       return res.status(200).json({ message: "Delete request has been raised to admin" });
//     }

//     return res.status(403).json({ message: "Not authorized to delete this review" });
//   } catch (error) {
//     console.error("Delete review error:", error);
//     res.status(500).json({ message: "Server error while processing delete" });
//   }
// };


// DELETE /reviews/:id
export const deleteReview = async (req, res) => {
  const reviewId = req.params.id;
  const user = req.user; // { id, role }

  try {
    // Fetch review + business owner
    const [[review]] = await pool.query(
      `
      SELECT 
        r.id,
        r.user_id,
        r.delete_query,
        b.owner_id AS business_owner_id
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.id = ?
      `,
      [reviewId]
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // ADMIN → delete instantly
    if (user.role === "admin" || user.role === "sub-admin") {
      await pool.query("DELETE FROM reviews WHERE id = ?", [reviewId]);
      return res.json({ message: "Review deleted by admin" });
    }

    // REVIEW OWNER → delete instantly
    if (user.id === review.user_id) {
      await pool.query("DELETE FROM reviews WHERE id = ?", [reviewId]);
      return res.json({ message: "Your review has been deleted" });
    }

    //  BUSINESS OWNER → raise delete request
    if (user.id === review.business_owner_id) {
      if (review.delete_query === 1) {
        return res.status(400).json({
          message: "Delete request already raised"
        });
      }

      await pool.query(
        "UPDATE reviews SET delete_query = 1 WHERE id = ?",
        [reviewId]
      );

      return res.json({
        message: "Delete request raised for admin approval"
      });
    }

    // Everyone else → blocked
    return res.status(403).json({
      message: "Not authorized to delete this review"
    });

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
