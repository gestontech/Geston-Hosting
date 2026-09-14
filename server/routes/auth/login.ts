import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../../models/User.js";
import { authRateLimit } from "../../middleware/rateLimit.js";
import { generateToken, setAuthCookie, userPayload } from "./shared.js";

const router = Router();

router.post("/login", authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ usernameOrEmail: z.string().min(1), password: z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { usernameOrEmail, password } = parsed.data;
    const isEmail = usernameOrEmail.includes("@");
    const user = isEmail
      ? await User.findOne({ email: usernameOrEmail.toLowerCase() })
      : await User.findOne({ username: usernameOrEmail.toLowerCase() });
    if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }
    if (user.isBanned) { res.status(403).json({ error: user.banReason ? `Your account has been banned: ${user.banReason}` : "Your account has been banned. Contact support for assistance.", isBanned: true, banReason: user.banReason || "" }); return; }
    if (!user.passwordHash) { res.status(400).json({ error: "This account uses GitHub or email link login." }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const token = generateToken(user._id.toString());
    setAuthCookie(res, token);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
