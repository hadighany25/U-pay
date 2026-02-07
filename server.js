const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors"); // បើបងមានប្រើ cors អាចបើកបាន
const app = express();

// --- 1. CONFIGURATION (កំណត់ការកំណត់) ---
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "users.json");

// Middleware សម្រាប់អនុញ្ញាតឱ្យ Upload រូបធំៗ (50MB)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public")); // បើកឱ្យចូលមើល file ក្នុង folder public

// --- 2. HELPER FUNCTIONS (មុខងារជំនួយ) ---

// អានទិន្នន័យពី users.json
const readUsers = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      // បើអត់ទាន់មាន file, បង្កើត file ថ្មីជាមួយ array ទទេ
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, "[]");
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Error reading users:", err);
    return [];
  }
};

// សរសេរទិន្នន័យចូល users.json
const writeUsers = (users) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error writing users:", err);
  }
};

// បង្កើតម៉ោងដែលត្រឹមត្រូវ (Timezone: Asia/Phnom_Penh)
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

// --- 3. API ROUTES (ផ្លូវតភ្ជាប់) ---

// [AUTH] ចុះឈ្មោះ (Register)
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  let users = readUsers();

  // ឆែកមើលថាឈ្មោះជាន់គ្នាអត់?
  if (users.find((u) => u.username === username)) {
    return res.json({ success: false, message: "Username នេះមានគេប្រើហើយ" });
  }

  // បង្កើតលេខគណនីថ្មី (Random 9 ខ្ទង់)
  let accNum;
  let isUnique = false;
  while (!isUnique) {
    accNum = Math.floor(100000000 + Math.random() * 900000000).toString();
    if (!users.find((u) => u.accountNumber === accNum)) isUnique = true;
  }

  const newUser = {
    id: Date.now(),
    username,
    password,
    pin: "1234", // Default PIN
    balance: 0.0,
    accountNumber: accNum,
    role: "user",
    profileImage: null, // ទុកដាក់រូប
    transactions: [],
  };

  users.push(newUser);
  writeUsers(users);
  res.json({ success: true, message: "ចុះឈ្មោះជោគជ័យ", user: newUser });
});

// [AUTH] ចូលប្រើប្រាស់ (Login)
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  // Admin Hardcoded (សម្រាប់ Admin ពិសេស)
  if (username === "admin" && password === "123") {
    return res.json({
      success: true,
      user: { username: "admin", role: "admin" },
    });
  }

  const users = readUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );

  if (user) {
    res.json({ success: true, user });
  } else {
    res.json({ success: false, message: "ឈ្មោះ ឬ លេខសម្ងាត់មិនត្រឹមត្រូវ" });
  }
});

// [ADMIN] ទាញយក Users ទាំងអស់ (សម្រាប់ Admin Dashboard)
app.get("/api/users", (req, res) => {
  const users = readUsers();
  // ផ្ញើទៅតែទិន្នន័យចាំបាច់ (Security Best Practice: កុំផ្ញើ password ទៅបើមិនចាំបាច់)
  const safeUsers = users.map((u) => ({
    id: u.id,
    username: u.username,
    accountNumber: u.accountNumber,
    balance: u.balance,
    transactions: u.transactions,
  }));
  res.json(safeUsers);
});

// [ADMIN] កែប្រែព័ត៌មាន User
app.post("/api/admin/update", (req, res) => {
  const { id, newName, newBalance, newAccountNum } = req.body;
  let users = readUsers();
  const idx = users.findIndex((u) => u.id === parseInt(id));

  if (idx !== -1) {
    users[idx].username = newName;
    users[idx].balance = parseFloat(newBalance);
    users[idx].accountNumber = newAccountNum;
    writeUsers(users);
    res.json({ success: true, message: "Updated successfully" });
  } else {
    res.json({ success: false, message: "User not found" });
  }
});

// [TRANSACTION] ផ្ទេរប្រាក់ (Transfer)
app.post("/api/transfer", (req, res) => {
  const { senderUsername, receiverAccount, amount, remark, pin } = req.body;
  let users = readUsers();
  const transferAmount = parseFloat(amount);

  const senderIdx = users.findIndex((u) => u.username === senderUsername);
  const receiverIdx = users.findIndex(
    (u) => u.accountNumber === receiverAccount,
  );

  // Validation (ការត្រួតពិនិត្យ)
  if (senderIdx === -1)
    return res.json({ success: false, message: "រកមិនឃើញអ្នកផ្ញើ" });
  if (receiverIdx === -1)
    return res.json({ success: false, message: "រកមិនឃើញលេខគណនីអ្នកទទួល" });
  if (users[senderIdx].accountNumber === receiverAccount)
    return res.json({
      success: false,
      message: "មិនអាចផ្ទេរចូលគណនីខ្លួនឯងបានទេ",
    });
  if (users[senderIdx].balance < transferAmount)
    return res.json({
      success: false,
      message: "គណនីរបស់អ្នកមិនមានប្រាក់គ្រប់គ្រាន់",
    });

  // ឆែក PIN
  if (users[senderIdx].pin && users[senderIdx].pin !== pin) {
    return res.json({ success: false, message: "លេខ PIN មិនត្រឹមត្រូវ" });
  }

  // អនុវត្តការកាត់លុយ និងថែមលុយ
  users[senderIdx].balance -= transferAmount;
  users[receiverIdx].balance += transferAmount;

  const date = getFormattedDate();
  const refId = "TRX" + Date.now().toString().slice(-8); // Generate Ref ID
  const note = remark || "General Transfer";

  // 1. កត់ត្រាប្រវត្តិសម្រាប់អ្នកផ្ញើ (Transfer Out)
  const senderTrx = {
    type: "Transfer Out",
    amount: -transferAmount, // លេខអវិជ្ជមាន
    date: date,
    partner: users[receiverIdx].username,
    partnerAcc: receiverAccount,
    remark: note,
    refId: refId,
  };
  if (!users[senderIdx].transactions) users[senderIdx].transactions = [];
  users[senderIdx].transactions.unshift(senderTrx);

  // 2. កត់ត្រាប្រវត្តិសម្រាប់អ្នកទទួល (Received)
  const receiverTrx = {
    type: "Received",
    amount: transferAmount, // លេខវិជ្ជមាន
    date: date,
    partner: users[senderIdx].username,
    partnerAcc: users[senderIdx].accountNumber,
    remark: note,
    refId: refId,
  };
  if (!users[receiverIdx].transactions) users[receiverIdx].transactions = [];
  users[receiverIdx].transactions.unshift(receiverTrx);

  writeUsers(users);

  // ផ្ញើលទ្ធផលត្រឡប់ទៅវិញ
  res.json({
    success: true,
    message: "ផ្ទេរប្រាក់ជោគជ័យ!",
    newBalance: users[senderIdx].balance,
    slipData: { ...senderTrx, senderName: users[senderIdx].username },
  });
});

// [TRANSACTION] បង់វិក្កយបត្រ (Payment)
app.post("/api/payment", (req, res) => {
  const { username, billerName, billId, amount, pin } = req.body;
  let users = readUsers();
  const payAmount = parseFloat(amount);
  const userIdx = users.findIndex((u) => u.username === username);

  if (userIdx === -1)
    return res.json({ success: false, message: "User error" });
  if (users[userIdx].balance < payAmount)
    return res.json({ success: false, message: "គណនីមិនមានប្រាក់គ្រប់គ្រាន់" });

  // ឆែក PIN
  if (users[userIdx].pin && users[userIdx].pin !== pin) {
    return res.json({ success: false, message: "លេខ PIN មិនត្រឹមត្រូវ" });
  }

  // កាត់លុយ
  users[userIdx].balance -= payAmount;

  const date = getFormattedDate();
  const refId = "PAY" + Date.now().toString().slice(-8);

  // កត់ត្រាប្រតិបត្តិការ
  const transactionRecord = {
    type: "Bill Payment",
    amount: -payAmount,
    date: date,
    partner: billerName,
    remark: `Bill ID: ${billId}`,
    refId: refId,
  };

  if (!users[userIdx].transactions) users[userIdx].transactions = [];
  users[userIdx].transactions.unshift(transactionRecord);

  writeUsers(users);

  res.json({
    success: true,
    message: "បង់វិក្កយបត្រជោគជ័យ",
    newBalance: users[userIdx].balance,
    slipData: {
      ...transactionRecord,
      senderName: users[userIdx].username,
      billId: billId,
    },
  });
});

// [SETTINGS] ប្តូរលេខសម្ងាត់ (Change Password)
app.post("/api/change-password", (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  let users = readUsers();
  const idx = users.findIndex((u) => u.username === username);

  if (idx !== -1 && users[idx].password === oldPassword) {
    users[idx].password = newPassword;
    writeUsers(users);
    res.json({ success: true, message: "ប្តូរលេខសម្ងាត់ជោគជ័យ" });
  } else {
    res.json({ success: false, message: "លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវ" });
  }
});

// [SETTINGS] ប្តូរលេខ PIN (Change PIN)
app.post("/api/change-pin", (req, res) => {
  const { username, password, newPin } = req.body;
  let users = readUsers();
  const idx = users.findIndex((u) => u.username === username);

  if (idx === -1)
    return res.json({ success: false, message: "User not found" });

  // ត្រូវមាន Password ទើបអនុញ្ញាតឱ្យដូរ PIN
  if (users[idx].password !== password) {
    return res.json({
      success: false,
      message: "លេខសម្ងាត់មិនត្រឹមត្រូវ (Incorrect Password)",
    });
  }

  // ឆែកមើលថា PIN ថ្មីមាន 4 ខ្ទង់ឬអត់
  if (!/^\d{4}$/.test(newPin)) {
    return res.json({ success: false, message: "PIN ត្រូវតែមានលេខ 4 ខ្ទង់" });
  }

  users[idx].pin = newPin;
  writeUsers(users);
  res.json({ success: true, message: "ប្តូរ PIN ជោគជ័យ" });
});

// [SETTINGS] ប្តូររូប Profile
app.post("/api/update-profile-pic", (req, res) => {
  const { username, image } = req.body;
  let users = readUsers();
  const idx = users.findIndex((u) => u.username === username);

  if (idx !== -1) {
    users[idx].profileImage = image;
    writeUsers(users);
    res.json({ success: true, message: "Profile updated" });
  } else {
    res.json({ success: false, message: "Update failed" });
  }
});

// [CHECK] ឆែកឈ្មោះតាមរយៈលេខគណនី
app.post("/api/check-account", (req, res) => {
  const { accountNumber } = req.body;
  const users = readUsers();
  const receiver = users.find((u) => u.accountNumber === accountNumber);

  if (receiver) {
    res.json({ success: true, username: receiver.username });
  } else {
    res.json({ success: false, message: "User not found" });
  }
});

// --- 4. START SERVER ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Timezone configured to: Asia/Phnom_Penh`);
});
