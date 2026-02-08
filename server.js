const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

// --- 1. CONFIGURATION ---
const PORT = process.env.PORT || 3000;

// 🔥 Link MongoDB របស់បង (admin88)
const MONGODB_URI =
  "mongodb+srv://admin88:Admin12345678@cluster0.htkcu39.mongodb.net/u-pay-db?appName=Cluster0";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

// --- 2. DATABASE MODELS ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pin: { type: String, default: "1234" },
  balance: { type: Number, default: 0.0 },
  accountNumber: { type: String, unique: true },
  role: { type: String, default: "user" },

  // 🔥 New Status Fields (សម្រាប់ Admin)
  isFrozen: { type: Boolean, default: false }, // គណនីត្រូវបានបង្កក?
  pinAttempts: { type: Number, default: 0 }, // ចំនួនវាយ PIN ខុស
  lastActive: { type: Date, default: Date.now }, // សម្រាប់ឆែក Online/Offline

  transactions: { type: Array, default: [] },
});

const User = mongoose.model("User", userSchema);

// --- 3. HELPER FUNCTIONS ---
const getFormattedDate = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

// --- 4. API ROUTES ---

// [AUTH] Register
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.json({ success: false, message: "Username នេះមានគេប្រើហើយ" });

    let accNum;
    let isUnique = false;
    while (!isUnique) {
      accNum = Math.floor(100000000 + Math.random() * 900000000).toString();
      const checkAcc = await User.findOne({ accountNumber: accNum });
      if (!checkAcc) isUnique = true;
    }

    const newUser = new User({
      username,
      password,
      accountNumber: accNum,
      balance: 0.0,
    });
    await newUser.save();
    res.json({ success: true, message: "Account created!", user: newUser });
  } catch (err) {
    res.json({ success: false, message: "Error" });
  }
});

// [AUTH] Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Admin Login
    if (username === "admin" && password === "123") {
      return res.json({
        success: true,
        user: { username: "admin", role: "admin" },
      });
    }

    const user = await User.findOne({ username, password });
    if (user) {
      // Update Status
      user.lastActive = new Date();
      user.pinAttempts = 0; // Reset PIN attempts on success
      await user.save();

      res.json({ success: true, user });
    } else {
      res.json({ success: false, message: "ឈ្មោះ ឬ លេខសម្ងាត់មិនត្រឹមត្រូវ" });
    }
  } catch (err) {
    res.json({ success: false, message: "Server Error" });
  }
});

// 🔥 [SYSTEM] Heartbeat (សម្រាប់ប្រាប់ថា Online)
app.post("/api/heartbeat", async (req, res) => {
  try {
    const { username } = req.body;
    await User.findOneAndUpdate({ username }, { lastActive: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// [ADMIN] Get All Users (With Online Logic)
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "-password -pin").sort({ _id: -1 });
    const now = new Date();

    // Add isOnline property dynamically
    const usersWithStatus = users.map((u) => {
      const diff = (now - new Date(u.lastActive)) / 1000; // seconds
      return {
        ...u.toObject(),
        isOnline: diff < 30, // Online if active in last 30s
      };
    });

    res.json(usersWithStatus);
  } catch (err) {
    res.json([]);
  }
});

// [ADMIN] Update User & Freeze
app.post("/api/admin/update", async (req, res) => {
  try {
    const { id, username, balance, accountNumber, isFrozen } = req.body;
    const updateData = {
      username,
      balance: parseFloat(balance),
      accountNumber,
      isFrozen: isFrozen,
    };

    // បើ Admin ដោះសោរ (Unfreeze) -> Reset PIN count
    if (isFrozen === false) {
      updateData.pinAttempts = 0;
    }

    await User.findByIdAndUpdate(id, updateData);
    res.json({ success: true, message: "Update Success" });
  } catch (err) {
    res.json({ success: false, message: "Update Failed" });
  }
});

// [SERVICE] Check Account (ពេលវេរលុយ)
app.post("/api/check-account", async (req, res) => {
  try {
    const { accountNumber } = req.body;
    const user = await User.findOne({ accountNumber });
    if (user) res.json({ success: true, username: user.username });
    else res.json({ success: false, message: "Not found" });
  } catch (err) {
    res.json({ success: false });
  }
});

// [TRANSACTION] Transfer Money
app.post("/api/transfer", async (req, res) => {
  try {
    const { senderUsername, receiverAccount, amount, remark, pin } = req.body;
    const transferAmount = parseFloat(amount);
    const sender = await User.findOne({ username: senderUsername });
    const receiver = await User.findOne({ accountNumber: receiverAccount });

    if (!sender) return res.json({ success: false, message: "User Error" });

    // Update Active Time
    sender.lastActive = new Date();
    await sender.save();

    // 1. Check Freeze
    if (sender.isFrozen)
      return res.json({
        success: false,
        message: "គណនីត្រូវបានបង្កក! (Account Frozen)",
      });

    // 2. Check PIN & Attempts
    if (sender.pin !== pin) {
      sender.pinAttempts += 1;
      if (sender.pinAttempts >= 3) {
        sender.isFrozen = true;
        await sender.save();
        return res.json({
          success: false,
          message: "PIN ខុស 3 ដង! គណនីត្រូវបានបង្កក។",
        });
      }
      await sender.save();
      return res.json({
        success: false,
        message: `PIN ខុស! (សល់ ${3 - sender.pinAttempts} ដង)`,
      });
    }
    sender.pinAttempts = 0; // Reset if correct

    // 3. Validation
    if (!receiver)
      return res.json({ success: false, message: "រកមិនឃើញអ្នកទទួល" });
    if (sender.accountNumber === receiverAccount)
      return res.json({ success: false, message: "មិនអាចវេរចូលខ្លួនឯង" });
    if (sender.balance < transferAmount)
      return res.json({ success: false, message: "អត់លុយគ្រប់គ្រាន់" });

    // 4. Process
    sender.balance -= transferAmount;
    receiver.balance += transferAmount;

    const date = getFormattedDate();
    const refId = "TRX" + Date.now().toString().slice(-8);

    sender.transactions.unshift({
      type: "Transfer Out",
      amount: -transferAmount,
      date,
      partner: receiver.username,
      partnerAcc: receiverAccount,
      remark,
      refId,
    });
    receiver.transactions.unshift({
      type: "Received",
      amount: transferAmount,
      date,
      partner: sender.username,
      partnerAcc: sender.accountNumber,
      remark,
      refId,
    });

    await sender.save();
    await receiver.save();

    res.json({
      success: true,
      message: "ជោគជ័យ!",
      newBalance: sender.balance,
      slipData: { ...sender.transactions[0], senderName: sender.username },
    });
  } catch (err) {
    res.json({ success: false, message: "Failed" });
  }
});

// [TRANSACTION] Bill Payment
app.post("/api/payment", async (req, res) => {
  try {
    const { username, billerName, billId, amount, pin } = req.body;
    const payAmount = parseFloat(amount);
    const user = await User.findOne({ username });

    if (!user) return res.json({ success: false, message: "User Error" });

    // Active Update
    user.lastActive = new Date();
    await user.save();

    // Freeze Check
    if (user.isFrozen)
      return res.json({ success: false, message: "គណនីត្រូវបានបង្កក!" });

    // PIN Check
    if (user.pin !== pin) {
      user.pinAttempts += 1;
      if (user.pinAttempts >= 3) {
        user.isFrozen = true;
        await user.save();
        return res.json({
          success: false,
          message: "PIN ខុស 3 ដង! គណនីត្រូវបានបង្កក។",
        });
      }
      await user.save();
      return res.json({ success: false, message: "PIN មិនត្រឹមត្រូវ" });
    }
    user.pinAttempts = 0;

    if (user.balance < payAmount)
      return res.json({ success: false, message: "អត់លុយគ្រប់គ្រាន់" });

    // Process
    user.balance -= payAmount;
    const date = getFormattedDate();
    const refId = "PAY" + Date.now().toString().slice(-8);

    const record = {
      type: "Bill Payment",
      amount: -payAmount,
      date,
      partner: billerName,
      remark: `Bill: ${billId}`,
      refId,
    };
    user.transactions.unshift(record);
    await user.save();

    res.json({
      success: true,
      message: "បង់វិក្កយបត្រជោគជ័យ",
      newBalance: user.balance,
      slipData: { ...record, senderName: user.username, billId },
    });
  } catch (err) {
    res.json({ success: false, message: "Failed" });
  }
});

// [SETTINGS] Change Password
app.post("/api/change-password", async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    const user = await User.findOne({ username });

    if (user && user.password === oldPassword) {
      user.password = newPassword;
      await user.save();
      res.json({ success: true, message: "ប្តូរលេខសម្ងាត់ជោគជ័យ" });
    } else {
      res.json({ success: false, message: "លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវ" });
    }
  } catch (err) {
    res.json({ success: false, message: "Error" });
  }
});

// [SETTINGS] Change PIN
app.post("/api/change-pin", async (req, res) => {
  try {
    const { username, password, newPin } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.password !== password)
      return res.json({ success: false, message: "Password ខុស" });

    user.pin = newPin;
    // Reset attempts when PIN is changed successfully
    user.pinAttempts = 0;
    user.isFrozen = false;

    await user.save();
    res.json({ success: true, message: "ប្តូរ PIN ជោគជ័យ" });
  } catch (err) {
    res.json({ success: false, message: "Error" });
  }
});

// --- Start Server ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
