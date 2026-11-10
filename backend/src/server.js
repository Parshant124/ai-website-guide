import express from "express";
import { config, assertConfig } from "./config.js";
import { GuidanceError } from "./errors.js";
import { GuideRequestSchema, validateGuidance } from "./schema.js";
import { askModel } from "./ai.js";

assertConfig();

const app = express();
app.use(express.json({ limit: "200kb" }));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/guide", async (req, res, next) => {
  const parsed = GuideRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: {
        code: "INVALID_REQUEST",
        message: "Request did not match the expected format.",
        details: parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`),
      },
    });
  }

  try {
    const started = Date.now();
    const raw = await askModel(parsed.data);
    const guidance = validateGuidance(raw, parsed.data.page);
    res.json({
      status: "ok",
      scanId: parsed.data.page.scanId, // echoed by the backend, never taken from the AI
      guidance,
      meta: { model: config.geminiModel, latencyMs: Date.now() - started },
    });
  } catch (err) {
    next(err);
  }
});

app.use((req, res) =>
  res.status(404).json({
    status: "error",
    error: { code: "NOT_FOUND", message: "Unknown route." },
  }),
);

// Central error handler. Never log req.body: it contains page content.
app.use((err, req, res, next) => {
  if (err instanceof GuidanceError) {
    return res.status(err.httpStatus).json({
      status: "error",
      error: { code: err.code, message: err.message },
    });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "error",
      error: { code: "INVALID_REQUEST", message: "Body is not valid JSON." },
    });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      status: "error",
      error: { code: "INVALID_REQUEST", message: "Request body is too large." },
    });
  }
  console.error("Unhandled error:", err.message);
  res.status(500).json({
    status: "error",
    error: { code: "INTERNAL", message: "Something went wrong on the server." },
  });
});

app.listen(config.port, () =>
  console.log(
    `Backend running on http://localhost:${config.port} (model: ${config.geminiModel})`,
  ),
);
