import crypto from "crypto";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import axios from "axios";

// const sendOtpViaConsole = async (phone, otp) => {
//   return { success: true, message: "OTP sent (mock)" };
// };


const sendOtpViaMSG91 = async (phone, otp) => {
  const options = {
    method: 'POST',
    url: 'https://control.msg91.com/api/v5/flow',
    headers: {
      accept: 'application/json',
      authkey: process.env.MSG91_AUTH_KEY,
      'content-type': 'application/json'
    },
    data: {
      template_id: process.env.MSG91_TEMPLATE_ID,
      realTimeResponse: "1",
      recipients: [
        {
          mobiles: `91${phone}`,
          var: otp,
        },
      ],
    },
  };

  try {
    const { data } = await axios.request(options);
    console.log(
      "MSG91 Response:",
      JSON.stringify(data, null, 2)
    );    return data;
  } catch (error) {
    console.error("MSG91 Error:", error.response?.data || error.message);
    throw new Error("Failed to send OTP via MSG91");
  }
};

const normalizePhone = (phone) => phone.replace(/\D+/g, "").trim();

export const sendOTP = async (req, res) => {
  try {
    let { phone } = req.body;
    console.log("Received from frontend:", req.body);

    if (!phone) return res.status(400).json({ msg: "Phone Number is required" });

    phone = normalizePhone(phone);
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ msg: "Invalid phone number" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    console.log(`Generated OTP for ${phone}: ${otp}`);

    await sendOtpViaMSG91(phone, otp);

    const OTP_EXPIRY_MINUTES = 5;
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Insert OTP into DB
    await pool.query(
      `INSERT INTO otp_verifications (phone, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?`,
      [phone, otp, expiresAt, otp, expiresAt]
    );

    return res.status(200).json({ msg: "OTP sent to your Phone Number" ,otp});
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ msg: "Something went wrong. Please try again.", error: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { name, phone, otp } = req.body;
    console.log("Received in verifyOTP:", { name: name || "", phone, otp });

    if (!phone || !otp) {
      return res.status(400).json({ msg: "Phone Number and OTP are required" });
    }

    const [[otpRecord]] = await pool.query(
      `SELECT * FROM otp_verifications 
       WHERE phone = ? AND otp = ? AND expires_at > NOW()`,
      [phone, otp]
    );

    if (!otpRecord) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    // Check if user already exists
    const [[existingUser]] = await pool.query(
      `SELECT * FROM users WHERE phone = ?`,
      [phone]
    );

    let userId, role, userName, userEmail;

    if (existingUser) {
      userId = existingUser.id;
      role = existingUser.role;
      userName = existingUser.name;
      userEmail = existingUser.email;
    } else {
      const [result] = await pool.query(
        `INSERT INTO users (name, phone, role) VALUES (?, ?, 'user')`,
        [name || "", phone]
      );
      userId = result.insertId;
      role = "user";
      userName = name || "";
      userEmail = `${phone}@mockemail.com`;
    }

    const secret = process.env.JWT_SECRET || "mock_secret_key";
    const token = jwt.sign({ userId, phone, role }, secret, {
      expiresIn: "15d",
    });

    return res.status(200).json({
      msg: "OTP verified successfully",
      role,
      token,
      name: userName,
      userEmail,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ msg: "Failed to verify OTP. Please try again.", error: error.message });
  }
};
