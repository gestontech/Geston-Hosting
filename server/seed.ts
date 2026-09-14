import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Package } from "./models/Package.js";
import { Team } from "./models/Team.js";
import { User } from "./models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "";

async function ensureAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  if (!adminEmail) throw new Error("ADMIN_EMAIL is required to seed admin user");
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminPassword) throw new Error("ADMIN_PASSWORD is required to seed admin user");
  const adminUsername = (process.env.ADMIN_USERNAME || "").toLowerCase().trim() || undefined;

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  if (adminUsername) {
    await User.updateMany(
      { username: adminUsername, email: { $ne: adminEmail } },
      { $unset: { username: 1 } }
    );
  }

  let admin = await User.findOne({ email: adminEmail });
  if (!admin && adminUsername) {
    admin = await User.findOne({ username: adminUsername });
  }

  if (!admin) {
    await User.create({
      email: adminEmail,
      username: adminUsername,
      passwordHash,
      txCoins: 999999,
      usedFreeTrial: false,
      trialPhoneNumbers: [],
      bots: [],
      isModerator: true,
      authProvider: "local",
    });
    return;
  }

  const update: Record<string, unknown> = {
    email: adminEmail,
    passwordHash,
    txCoins: 999999,
    isModerator: true,
    authProvider: "local",
  };
  if (adminUsername) update.username = adminUsername;

  await User.updateOne({ _id: admin._id }, { $set: update });
}

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const packageCount = await Package.countDocuments();
  if (packageCount === 0) {
    await Package.insertMany([
      { name: "Starter",   ksPrice: 30,  txAmount: 10,  bonusTx: 0,  isBestDeal: false, active: true, order: 1 },
      { name: "Basic",     ksPrice: 60,  txAmount: 20,  bonusTx: 0,  isBestDeal: false, active: true, order: 2 },
      { name: "Standard",  ksPrice: 90,  txAmount: 30,  bonusTx: 0,  isBestDeal: false, active: true, order: 3 },
      { name: "Best Deal", ksPrice: 100, txAmount: 50,  bonusTx: 20, isBestDeal: true,  active: true, order: 4 },
      { name: "Pro",       ksPrice: 150, txAmount: 50,  bonusTx: 0,  isBestDeal: false, active: true, order: 5 },
      { name: "Elite",     ksPrice: 300, txAmount: 100, bonusTx: 0,  isBestDeal: false, active: true, order: 6 },
      { name: "Ultimate",  ksPrice: 600, txAmount: 200, bonusTx: 0,  isBestDeal: false, active: true, order: 7 }
    ]);
  }

  const teamCount = await Team.countDocuments();
  if (teamCount === 0) {
    await Team.insertMany([
      { name: "geston-host1", active: true },
      { name: "geston-host2", active: true }
    ]);
  }

  await ensureAdmin();

  await mongoose.disconnect();
}

seed().catch(err => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
