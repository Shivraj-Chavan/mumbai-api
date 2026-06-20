import Razorpay from "razorpay";

import crypto from "crypto";
import pool from "../config/db.js";

const razorpay = new Razorpay({
  key_id: 'rzp_live_SyHTWcKFpfuXmx',
  key_secret:'gruvmdn7ba66mScqyp2qAMMV',
});

// create
export const initiatePayment = async (req, res) => {
  const { plan, plan_id,amount, business_id } = req.body;
  console.log("initiatePayment request body:", req.body);
  if (!plan || !plan_id || business_id == null) {
    console.warn("Missing plan or business_id");
    return res.status(400).json({ error: "Plan and business ID are required" });
  }

  // FREE PLAN → no Razorpay order
  if (amount === 0) {
    console.log("Free plan selected. Inserting directly to DB...");

    const transactionId = `FREE-${Date.now()}`;
    try {
      const insertQuery = `
        INSERT INTO payments (business_id, plan, amount, transaction_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;   
      console.log("Insert Query:", insertQuery);
      console.log(" Values:", [business_id, plan, 0, transactionId, "completed"]);

      await pool.execute(insertQuery, [business_id, plan, 0,  transactionId, "completed"]);
      console.log("Free plan inserted successfully.");
      return res.json({ success: true, message: "Free plan activated" });
    } catch (error) {
      console.error("DB error:", error);
      return res.status(500).json({ error: "Failed to insert free plan in DB" });
    }
  }

  // PAID PLANS → go through Razorpay
  try {
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };
    console.log("Razorpay order options:", options);
    const order = await razorpay.orders.create(options);
    console.log("Razorpay order created:", order);

    const insertQuery = `
      INSERT INTO payments (business_id, plan, amount, transaction_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    console.log("Insert Query:", insertQuery);
    console.log("Values:", [business_id, plan_id, amount, order.id, "pending"]);
    await pool.execute(insertQuery, [business_id, plan_id, amount, order.id, "pending"]);
    console.log("Payment record inserted with pending status.");

    res.json({
      success: true,
      transactionId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: "rzp_live_SyHTWcKFpfuXmx"
    });
  } catch (error) {
    console.error("Razorpay error:", error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    console.log("verifyPayment request body:", req.body);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      business_id,
      plan_id,
      amount,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !business_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Verify Signature
    const expectedSignature = crypto
      .createHmac("sha256","gruvmdn7ba66mScqyp2qAMMV")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    // Update Payment Record
    const [paymentResult] = await pool.execute(
      `
      UPDATE payments
      SET
        transaction_id = ?,
        status = 'completed'
      WHERE transaction_id = ?
      AND business_id = ?
      `,
      [
        razorpay_payment_id,
        razorpay_order_id,
        business_id,
      ]
    );

    if (paymentResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Save Business Plan
    if (plan_id) {
      const startDate = new Date();

      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      // Remove old active plan (optional)
      await pool.execute(
        `DELETE FROM business_plans WHERE business_id = ?`,
        [business_id]
      );

      await pool.execute(
        `
        INSERT INTO business_plans
        (
          business_id,
          plan_id,
          plan_price,
          start_date,
          end_date,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, NOW())
        `,
        [
          business_id,
          plan_id,
          amount || 0,
          startDate.toISOString().slice(0, 10),
          endDate.toISOString().slice(0, 10),
        ]
      );
 
   
    }

    return res.json({
      success: true,
      message: "Payment verified and plan activated",
    });
  } catch (error) {
    console.error("verifyPayment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// export const getPayments = async (req, res) => {
//   try {
//     const [rows] = await pool.query(`
//       SELECT *
//       FROM payments
//       ORDER BY id DESC
//     `);

//     res.json({
//       success: true,
//       data: rows,
//       totalPages: 1
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch payments"
//     });
//   }
// };