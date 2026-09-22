import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { reviewsRouter } from "./routes/reviews";

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/api/reviews", reviewsRouter);

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});
