const express = require("express");
const mongoose = require("mongoose"); // ហៅ Mongoose មកប្រើ
const cors = require("cors");
const app = express();

// --- 1. CONFIGURATION ---
const PORT = process.env.PORT || 3000;

// 🔥🔥🔥 ដាក់ LINK DATABASE របស់បងនៅទីនេះ (ជំនួសកន្លែង <db_password> ជាមួយលេខកូដពិត)
// Link នេះមានឈ្មោះ hadighany25_db_user និងលេខកូដត្រូវហើយ
const MONGODB_URI =
  "mongodb+srv://hadighany25_db_user:9c8LrvOSWkamJiYM@cluster0.htkcu39.mongodb.net/u-pay-db?appName=Cluster0";
// ភ្ជាប់ទៅ MongoDB Atlas
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

// --- 2. DATABASE MODELS (Schema) ---
// បង្កើតប្លង់ទិន្នន័យសម្រាប់ User នីមួយៗ
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pin: { type: String, default: "1234" },
  balance: { type: Number, default: 0.0 },
  accountNumber: { type: String, unique: true },
  role: { type: String, default: "user" }, // 'user' or 'admin'
  profileImage: { type: String, default: null },
  transactions: { type: Array, default: [] }, // ទុកប្រវត្តិ
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

// --- 4. API ROUTES (Async/Await) ---

// [AUTH] Register
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // ឆែកមើលថាឈ្មោះជាន់គ្នាអត់?
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.json({ success: false, message: "Username នេះមានគេប្រើហើយ" });

    // បង្កើតលេខគណនី Random
    let accNum;
    let isUnique = false;
    while (!isUnique) {
      accNum = Math.floor(100000000 + Math.random() * 900000000).toString();
      const checkAcc = await User.findOne({ accountNumber: accNum });
      if (!checkAcc) isUnique = true;
    }

    // បង្កើត User ថ្មីក្នុង Database
    const newUser = new User({
      username,
      password,
      accountNumber: accNum,
      balance: 0.0,
    });

    await newUser.save(); // រក្សាទុកចូល MongoDB
    res.json({ success: true, message: "ចុះឈ្មោះជោគជ័យ", user: newUser });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server Error" });
  }
});

// [AUTH] Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Admin Hardcoded
    if (username === "admin" && password === "123") {
      return res.json({
        success: true,
        user: { username: "admin", role: "admin" },
      });
    }

    // រកមើល User ក្នុង DB
    const user = await User.findOne({ username, password });

    if (user) {
      res.json({ success: true, user });
    } else {
      res.json({ success: false, message: "ឈ្មោះ ឬ លេខសម្ងាត់មិនត្រឹមត្រូវ" });
    }
  } catch (err) {
    res.json({ success: false, message: "Server Error" });
  }
});

// [ADMIN] Get All Users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "-password -pin"); // យកទាំងអស់ តែដក password/pin ចេញ
    res.json(users);
  } catch (err) {
    res.json([]);
  }
});

// [ADMIN] Update User
app.post("/api/admin/update", async (req, res) => {
  try {
    const { id, newName, newBalance, newAccountNum } = req.body;
    // ចំណាំ: MongoDB ប្រើ _id មិនមែន id ទេ តែដើម្បីងាយស្រួលយើងរកតាម username ឬ acc វិញល្អជាង
    // ក្នុងករណីនេះយើងសន្មតថា Front-end ផ្ញើ _id មក (ឬយើងកែតាម Account Number)

    // *ដើម្បីងាយស្រួលសម្រាប់កូដចាស់ យើងរកតាម Account Number ចាស់*
    // ប៉ុន្តែល្អបំផុតគឺប្រើ _id. ឥឡូវសាកល្បង Update តាមគណនីសិន

    res.json({
      success: false,
      message:
        "មុខងារនេះត្រូវការកែសម្រួល Front-end បន្តិចដើម្បីស្គាល់ ID របស់ MongoDB",
    });
  } catch (err) {
    res.json({ success: false });
  }
});

// [TRANSACTION] Transfer
app.post("/api/transfer", async (req, res) => {
  try {
    const { senderUsername, receiverAccount, amount, remark, pin } = req.body;
    const transferAmount = parseFloat(amount);

    const sender = await User.findOne({ username: senderUsername });
    const receiver = await User.findOne({ accountNumber: receiverAccount });

    if (!sender)
      return res.json({ success: false, message: "រកមិនឃើញអ្នកផ្ញើ" });
    if (!receiver)
      return res.json({ success: false, message: "រកមិនឃើញលេខគណនីអ្នកទទួល" });
    if (sender.accountNumber === receiverAccount)
      return res.json({ success: false, message: "មិនអាចផ្ទេរចូលខ្លួនឯង" });
    if (sender.balance < transferAmount)
      return res.json({ success: false, message: "ប្រាក់មិនគ្រប់គ្រាន់" });
    if (sender.pin !== pin)
      return res.json({ success: false, message: "PIN មិនត្រឹមត្រូវ" });

    // Update Balance
    sender.balance -= transferAmount;
    receiver.balance += transferAmount;

    const date = getFormattedDate();
    const refId = "TRX" + Date.now().toString().slice(-8);
    const note = remark || "General Transfer";

    // Add Transaction Records
    sender.transactions.unshift({
      type: "Transfer Out",
      amount: -transferAmount,
      date,
      partner: receiver.username,
      partnerAcc: receiverAccount,
      remark: note,
      refId,
    });
    receiver.transactions.unshift({
      type: "Received",
      amount: transferAmount,
      date,
      partner: sender.username,
      partnerAcc: sender.accountNumber,
      remark: note,
      refId,
    });

    // Save both to DB
    await sender.save();
    await receiver.save();

    res.json({
      success: true,
      message: "ផ្ទេរប្រាក់ជោគជ័យ!",
      newBalance: sender.balance,
      slipData: { ...sender.transactions[0], senderName: sender.username },
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Transaction Failed" });
  }
});

// [TRANSACTION] Payment
app.post("/api/payment", async (req, res) => {
  try {
    const { username, billerName, billId, amount, pin } = req.body;
    const payAmount = parseFloat(amount);

    const user = await User.findOne({ username });

    if (!user) return res.json({ success: false, message: "User Error" });
    if (user.balance < payAmount)
      return res.json({ success: false, message: "ប្រាក់មិនគ្រប់គ្រាន់" });
    if (user.pin !== pin)
      return res.json({ success: false, message: "PIN មិនត្រឹមត្រូវ" });

    user.balance -= payAmount;

    const date = getFormattedDate();
    const refId = "PAY" + Date.now().toString().slice(-8);

    const trxRecord = {
      type: "Bill Payment",
      amount: -payAmount,
      date,
      partner: billerName,
      remark: `Bill: ${billId}`,
      refId,
    };

    user.transactions.unshift(trxRecord);
    await user.save();

    res.json({
      success: true,
      message: "បង់វិក្កយបត្រជោគជ័យ",
      newBalance: user.balance,
      slipData: { ...trxRecord, senderName: user.username, billId },
    });
  } catch (err) {
    res.json({ success: false, message: "Payment Failed" });
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
    if (!/^\d{4}$/.test(newPin))
      return res.json({ success: false, message: "PIN ត្រូវតែ 4 ខ្ទង់" });

    user.pin = newPin;
    await user.save();
    res.json({ success: true, message: "ប្តូរ PIN ជោគជ័យ" });
  } catch (err) {
    res.json({ success: false, message: "Error" });
  }
});

// [CHECK] Account Check
app.post("/api/check-account", async (req, res) => {
  try {
    const { accountNumber } = req.body;
    const user = await User.findOne({ accountNumber });
    if (user) res.json({ success: true, username: user.username });
    else res.json({ success: false, message: "User not found" });
  } catch (err) {
    res.json({ success: false });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
