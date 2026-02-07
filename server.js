const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const port = 3000;

// អនុញ្ញាតឱ្យ Upload រូបធំៗ (50MB)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data", "users.json");

// --- Helper Functions ---
const readUsers = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, "[]");
      return [];
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "[]");
  } catch (err) {
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
};

const getFormattedDate = () => {
  const now = new Date();
  return now.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// --- API ROUTES ---

// 1. Register (ថែម Default PIN: 1234)
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  let users = readUsers();
  if (users.find((u) => u.username === username))
    return res.json({ success: false, message: "Username exists" });

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
    transactions: [],
  };
  users.push(newUser);
  writeUsers(users);
  res.json({ success: true, message: "Success", user: newUser });
});

// 2. Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "123")
    return res.json({
      success: true,
      user: { username: "admin", role: "admin" },
    });
  const users = readUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );
  user
    ? res.json({ success: true, user })
    : res.json({ success: false, message: "Invalid login" });
});

// 3. Admin APIs (Get Users & Update)
app.get("/api/users", (req, res) => {
  res.json(readUsers());
});

app.post("/api/admin/update", (req, res) => {
  const { id, newName, newBalance, newAccountNum } = req.body;
  let users = readUsers();
  const idx = users.findIndex((u) => u.id === parseInt(id));
  if (idx !== -1) {
    users[idx].username = newName;
    users[idx].balance = parseFloat(newBalance);
    users[idx].accountNumber = newAccountNum;
    writeUsers(users);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// 4. Transfer API (សំខាន់៖ ឆែក PIN & បង្កើត Slip Data)
app.post("/api/transfer", (req, res) => {
  const { senderUsername, receiverAccount, amount, remark, pin } = req.body;
  let users = readUsers();
  const transferAmount = parseFloat(amount);

  const senderIdx = users.findIndex((u) => u.username === senderUsername);
  const receiverIdx = users.findIndex(
    (u) => u.accountNumber === receiverAccount,
  );

  if (senderIdx === -1)
    return res.json({ success: false, message: "Sender error" });
  if (receiverIdx === -1)
    return res.json({ success: false, message: "Invalid receiver" });
  if (users[senderIdx].accountNumber === receiverAccount)
    return res.json({ success: false, message: "Cannot transfer to self" });
  if (users[senderIdx].balance < transferAmount)
    return res.json({ success: false, message: "Insufficient balance" });

  // ឆែក PIN
  if (users[senderIdx].pin && users[senderIdx].pin !== pin) {
    return res.json({ success: false, message: "Incorrect PIN Code" });
  }

  users[senderIdx].balance -= transferAmount;
  users[receiverIdx].balance += transferAmount;

  const date = getFormattedDate();
  const refId = "TRX" + Date.now().toString().slice(-8); // លេខសំគាល់ប្រតិបត្តិការ
  const note = remark || "General Transfer";

  // កត់ត្រា Sender
  const transactionData = {
    type: "Transfer Out",
    amount: -transferAmount,
    date: date,
    partner: users[receiverIdx].username,
    partnerAcc: receiverAccount,
    remark: note,
    refId: refId,
  };
  if (!users[senderIdx].transactions) users[senderIdx].transactions = [];
  users[senderIdx].transactions.unshift(transactionData);

  // កត់ត្រា Receiver
  if (!users[receiverIdx].transactions) users[receiverIdx].transactions = [];
  users[receiverIdx].transactions.unshift({
    type: "Received",
    amount: transferAmount,
    date: date,
    partner: users[senderIdx].username,
    partnerAcc: users[senderIdx].accountNumber,
    remark: note,
    refId: refId,
  });

  writeUsers(users);

  // ផ្ញើទិន្នន័យ Slip ទៅវិញ
  res.json({
    success: true,
    message: "Transfer successful!",
    newBalance: users[senderIdx].balance,
    slipData: { ...transactionData, senderName: users[senderIdx].username },
  });
});

// 6. Payment API (កែសម្រួល៖ ឆែក PIN & បង្កើត Slip)
app.post("/api/payment", (req, res) => {
  const { username, billerName, billId, amount, pin } = req.body; // ថែម PIN
  let users = readUsers();
  const payAmount = parseFloat(amount);
  const userIdx = users.findIndex((u) => u.username === username);

  if (userIdx === -1)
    return res.json({ success: false, message: "User error" });
  if (users[userIdx].balance < payAmount)
    return res.json({ success: false, message: "Insufficient balance" });

  // 1. ឆែក PIN
  if (users[userIdx].pin && users[userIdx].pin !== pin) {
    return res.json({ success: false, message: "Incorrect PIN Code" });
  }

  // 2. កាត់លុយ
  users[userIdx].balance -= payAmount;

  const date = getFormattedDate();
  const refId = "PAY" + Date.now().toString().slice(-8); // លេខសំគាល់វិក្កយបត្រ

  // 3. កត់ត្រាប្រតិបត្តិការ
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

  // 4. ផ្ញើទិន្នន័យ Slip ទៅវិញ
  res.json({
    success: true,
    message: "Payment successful",
    newBalance: users[userIdx].balance,
    slipData: {
      ...transactionRecord,
      senderName: users[userIdx].username,
      billId: billId,
    },
  });
});

// 6. Settings APIs (Change Password, PIN, Profile, Check Acc)
app.post("/api/change-password", (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  let users = readUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx !== -1 && users[idx].password === oldPassword) {
    users[idx].password = newPassword;
    writeUsers(users);
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Error" });
  }
});

// ... (កូដផ្សេងៗនៅដដែល)

// 10. Change PIN API (កែសម្រួល៖ ត្រូវមាន Password ទើបដូរបាន)
app.post("/api/change-pin", (req, res) => {
  const { username, password, newPin } = req.body; // ទទួល password មកជាមួយ
  let users = readUsers();
  const idx = users.findIndex((u) => u.username === username);

  if (idx === -1)
    return res.json({ success: false, message: "User not found" });

  // 1. ឆែក Password ថាត្រូវអត់?
  if (users[idx].password !== password) {
    return res.json({
      success: false,
      message: "លេខសម្ងាត់មិនត្រឹមត្រូវ (Incorrect Password)",
    });
  }

  // 2. ឆែក PIN ថាមាន ៤ ខ្ទង់អត់?
  if (!/^\d{4}$/.test(newPin)) {
    return res.json({ success: false, message: "PIN must be 4 digits" });
  }

  // 3. Update PIN
  users[idx].pin = newPin;
  writeUsers(users);

  res.json({ success: true, message: "PIN changed successfully" });
});

app.post("/api/update-profile-pic", (req, res) => {
  const { username, image } = req.body;
  let users = readUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx !== -1) {
    users[idx].profileImage = image;
    writeUsers(users);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post("/api/check-account", (req, res) => {
  const { accountNumber } = req.body;
  const users = readUsers();
  const receiver = users.find((u) => u.accountNumber === accountNumber);
  receiver
    ? res.json({ success: true, username: receiver.username })
    : res.json({ success: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
