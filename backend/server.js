
"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const crypto = require("crypto");

const { QUESTIONS, publicQuestion } = require("./questions");

const app = express();
const PORT = process.env.PORT || 5000;
const ROUND_ID = "R4";
const ROUND_TITLE = "The Temporal Lock";
const TEAM_COLLECTION = "r4_teams";

app.use(express.json({ limit: "100kb" }));

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as local scripts.
      if (!origin) return callback(null, true);

      const allowed =
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

      if (allowed) return callback(null, true);

      return callback(new Error("Origin not allowed by CORS"));
    }
  })
);

// ---------- FIREBASE / FIRESTORE ----------

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const raw = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");

    return JSON.parse(raw);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  // Local development only. Do not commit this file.
  const localPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (localPath) {
    return require(localPath);
  }

  throw new Error(
    "Firebase credentials are missing. Configure the service-account environment variable."
  );
}

const serviceAccount = loadServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const teams = db.collection(TEAM_COLLECTION);

// ---------- QUESTION ASSIGNMENT ----------

const LEVELS = ["easy", "medium", "hard"];

function randomQuestion(pool) {
  return pool[crypto.randomInt(0, pool.length)];
}

function assignQuestions() {
  return LEVELS.map((level) => {
    const pool = QUESTIONS.filter((q) => q.level === level);

    if (!pool.length) {
      throw new Error(`No questions available for level: ${level}`);
    }

    return randomQuestion(pool).id;
  });
}

function teamDocumentId(teamId) {
  return teamId;
}

function normalizeTeamId(value) {
  if (typeof value !== "string") return "";

  // IDs can be flexible: BLUE7, TEAM-A, 42, and similar.
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

function validateTeamId(teamId) {
  return /^[A-Z0-9][A-Z0-9_-]{0,29}$/.test(teamId);
}

function normalizeTeamName(value) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, 60)
    : "";
}

function getAssignedQuestions(team) {
  return team.assignedQuestionIds.map((id) => {
    const q = QUESTIONS.find((item) => item.id === id);
    return publicQuestion(q);
  });
}

function publicTeam(team) {
  return {
    team_id: team.teamId,
    team_name: team.teamName,
    round_id: ROUND_ID,
    assigned_questions: getAssignedQuestions(team),
    status: team.status,
    started_at: team.startedAt || null,
    completed_at: team.completedAt || null,
    time_taken_seconds: team.timeTakenSeconds ?? null,
    current_question_index: team.currentQuestionIndex || 0,
    draft_answers: team.draftAnswers || {},
    attempts_by_question: team.attemptsByQuestion || {},
    total_attempts: team.totalAttempts || 0,
    final_answers: team.finalAnswers || null,
    points: team.points ?? 0,
    question_scores: team.questionScores || null
  };
}

async function getTeam(teamIdValue) {
  const teamId = normalizeTeamId(teamIdValue);

  if (!validateTeamId(teamId)) {
    return { error: "invalid_team_id" };
  }

  const snapshot = await teams.doc(teamDocumentId(teamId)).get();

  if (!snapshot.exists) {
    return { error: "team_not_found" };
  }

  return { team: snapshot.data() };
}

function getQuestionForTeam(team, questionId) {
  if (!team.assignedQuestionIds.includes(questionId)) return null;
  return QUESTIONS.find((q) => q.id === questionId) || null;
}

function parseCode(value) {
  if (typeof value !== "string") return "";
  const code = value.trim();
  return /^[01]*$/.test(code) ? code : "";
}

// ---------- HEALTH ----------

app.get("/api/R4/health", (req, res) => {
  res.json({
    ok: true,
    round_id: ROUND_ID,
    round_title: ROUND_TITLE
  });
});

// ---------- REGISTER / RESUME TEAM ----------

app.post("/api/R4/register", async (req, res) => {
  try {
    const teamId = normalizeTeamId(req.body.team_id);
    const teamName = normalizeTeamName(req.body.team_name);

    if (!validateTeamId(teamId)) {
      return res.status(400).json({
        error: "invalid_team_id",
        message:
          "Use 1–30 letters, numbers, hyphens, or underscores. The ID must start with a letter or number."
      });
    }

    if (teamName.length < 2) {
      return res.status(400).json({
        error: "invalid_team_name",
        message: "Enter a team name with at least 2 characters."
      });
    }

    const ref = teams.doc(teamDocumentId(teamId));

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (snap.exists) {
        const existing = snap.data();

        if (
          existing.teamName.toLowerCase() !== teamName.toLowerCase()
        ) {
          return { conflict: "name_mismatch" };
        }

        return { team: existing, resumed: true };
      }

      const now = new Date().toISOString();

      const record = {
        teamId,
        teamName,
        roundId: ROUND_ID,
        assignedQuestionIds: assignQuestions(),
        status: "registered",
        registeredAt: now,
        startedAt: null,
        completedAt: null,
        timeTakenSeconds: null,
        currentQuestionIndex: 0,
        draftAnswers: {},
        attemptsByQuestion: {},
        totalAttempts: 0,
        finalAnswers: null,
        questionScores: null,
        points: 0
      };

      tx.create(ref, record);

      return { team: record, resumed: false };
    });

    if (result.conflict) {
      return res.status(409).json({
        error: result.conflict,
        message: "This Team ID is already registered under another name."
      });
    }

    return res.json({
      ...publicTeam(result.team),
      resumed: result.resumed
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      error: "server_error",
      message: "Could not register the team."
    });
  }
});

// ---------- GET ASSIGNED QUESTIONS / RESUME ----------

app.get("/api/R4/questions", async (req, res) => {
  try {
    const result = await getTeam(req.query.team_id);

    if (result.error) {
      return res.status(
        result.error === "team_not_found" ? 404 : 400
      ).json({ error: result.error });
    }

    return res.json({
      team_id: result.team.teamId,
      team_name: result.team.teamName,
      round_id: ROUND_ID,
      assigned_questions: getAssignedQuestions(result.team)
    });
  } catch (error) {
    console.error("Questions error:", error);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------- START ELAPSED TIMER ----------

app.post("/api/R4/start", async (req, res) => {
  try {
    const result = await getTeam(req.body.team_id);

    if (result.error) {
      return res.status(
        result.error === "team_not_found" ? 404 : 400
      ).json({ error: result.error });
    }

    const team = result.team;

    if (team.status === "completed") {
      return res.status(409).json({ error: "already_completed" });
    }

    if (!team.startedAt) {
      team.startedAt = new Date().toISOString();
      team.status = "in_progress";

      await teams.doc(team.teamId).update({
        startedAt: team.startedAt,
        status: team.status
      });
    }

    return res.json({
      started_at: team.startedAt,
      status: team.status
    });
  } catch (error) {
    console.error("Start error:", error);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------- SAVE DRAFTS / NAVIGATION ----------

app.post("/api/R4/progress", async (req, res) => {
  try {
    const result = await getTeam(req.body.team_id);

    if (result.error) {
      return res.status(
        result.error === "team_not_found" ? 404 : 400
      ).json({ error: result.error });
    }

    const team = result.team;

    if (team.status === "completed") {
      return res.status(409).json({ error: "already_completed" });
    }

    const index = Number(req.body.current_question_index);

    if (!Number.isInteger(index) || index < 0 || index > 2) {
      return res.status(400).json({
        error: "invalid_question_index"
      });
    }

    const incoming = req.body.draft_answers || {};

    if (
      typeof incoming !== "object" ||
      Array.isArray(incoming) ||
      Object.keys(incoming).some(
        (id) => !team.assignedQuestionIds.includes(id)
      )
    ) {
      return res.status(400).json({ error: "invalid_draft_answers" });
    }

    const drafts = {};

    for (const id of team.assignedQuestionIds) {
      const value = incoming[id];

      if (value == null || value === "") {
        drafts[id] = "";
      } else if (typeof value === "string" && /^[01]+$/.test(value)) {
        drafts[id] = value.slice(0, 10);
      } else {
        return res.status(400).json({
          error: "invalid_answer_format",
          question_id: id
        });
      }
    }

    await teams.doc(team.teamId).update({
      currentQuestionIndex: index,
      draftAnswers: drafts,
      lastProgressAt: new Date().toISOString()
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Progress error:", error);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------- RECORD AN ANSWER ATTEMPT ----------

app.post("/api/R4/attempt", async (req, res) => {
  try {
    const result = await getTeam(req.body.team_id);

    if (result.error) {
      return res.status(
        result.error === "team_not_found" ? 404 : 400
      ).json({ error: result.error });
    }

    const team = result.team;

    if (team.status === "completed") {
      return res.status(409).json({ error: "already_completed" });
    }

    if (!team.startedAt) {
      return res.status(409).json({ error: "round_not_started" });
    }

    const questionId = String(req.body.question_id || "");
    const question = getQuestionForTeam(team, questionId);
    const code = parseCode(req.body.code);

    if (!question) {
      return res.status(400).json({
        error: "question_not_assigned"
      });
    }

    if (!code || code.length !== question.correctCode.length) {
      return res.status(400).json({
        error: "invalid_code_format",
        message: "Enter the correct number of binary digits."
      });
    }

    const ref = teams.doc(team.teamId);
    const attemptResult = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Team not found");

      const current = snap.data();

      if (current.status === "completed") {
        return { completed: true };
      }

      const attempts = {
        ...(current.attemptsByQuestion || {})
      };

      attempts[questionId] = (attempts[questionId] || 0) + 1;

      tx.update(ref, {
        attemptsByQuestion: attempts,
        totalAttempts: (current.totalAttempts || 0) + 1,
        lastAttemptAt: new Date().toISOString()
      });

      return {
        completed: false,
        correct: code === question.correctCode,
        attempts: attempts[questionId]
      };
    });

    if (attemptResult.completed) {
      return res.status(409).json({ error: "already_completed" });
    }

    return res.json({
      correct: attemptResult.correct,
      attempts_for_question: attemptResult.attempts,
      message: attemptResult.correct
        ? "Correct answer."
        : "Incorrect answer. You can try again."
    });
  } catch (error) {
    console.error("Attempt error:", error);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------- FINAL SUBMISSION / SCORING ----------

app.post("/api/R4/submit", async (req, res) => {
  try {
    const result = await getTeam(req.body.team_id);

    if (result.error) {
      return res.status(
        result.error === "team_not_found" ? 404 : 400
      ).json({ error: result.error });
    }

    const team = result.team;

    if (team.status === "completed") {
      return res.json({
        already_submitted: true,
        points: team.points,
        time_taken_seconds: team.timeTakenSeconds,
        question_scores: team.questionScores
      });
    }

    if (!team.startedAt) {
      return res.status(409).json({ error: "round_not_started" });
    }

    // UI must only enable final submission while viewing question 3.
    if (Number(req.body.current_question_index) !== 2) {
      return res.status(400).json({
        error: "submission_only_on_question_3"
      });
    }

    const answers = req.body.answers;

    if (
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers)
    ) {
      return res.status(400).json({ error: "invalid_answers" });
    }

    const finalAnswers = {};
    const questionScores = {};
    let points = 0;

    for (const questionId of team.assignedQuestionIds) {
      const question = QUESTIONS.find((q) => q.id === questionId);
      const raw = answers[questionId];
      const code = typeof raw === "string" ? raw.trim() : "";
      const valid = code !== "" && /^[01]+$/.test(code);
      const correct =
        valid && code === question.correctCode;

      finalAnswers[questionId] = code;
      questionScores[questionId] = {
        points: correct ? 5 : 0,
        correct
      };

      if (correct) points += 5;
    }

    const startedMs = Date.parse(team.startedAt);
    const completedAt = new Date().toISOString();
    const timeTakenSeconds = Math.max(
      0,
      Math.floor((Date.parse(completedAt) - startedMs) / 1000)
    );

    const ref = teams.doc(team.teamId);

    // Transaction prevents two simultaneous submissions from overwriting
    // the first recorded final result.
    const saved = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Team not found");

      const current = snap.data();

      if (current.status === "completed") {
        return {
          points: current.points,
          timeTakenSeconds: current.timeTakenSeconds,
          questionScores: current.questionScores,
          alreadySubmitted: true
        };
      }

      tx.update(ref, {
        status: "completed",
        finalAnswers,
        questionScores,
        points,
        completedAt,
        timeTakenSeconds,
        currentQuestionIndex: 2,
        submittedAt: completedAt
      });

      return {
        points,
        timeTakenSeconds,
        questionScores,
        alreadySubmitted: false
      };
    });

    return res.json({
      ok: true,
      already_submitted: saved.alreadySubmitted,
      round_id: ROUND_ID,
      points: saved.points,
      max_points: 15,
      time_taken_seconds: saved.timeTakenSeconds,
      question_scores: saved.questionScores
    });
  } catch (error) {
    console.error("Submit error:", error);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------- ORGANIZER CSV EXPORT ----------

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text)
    ? '"' + text.replace(/"/g, '""') + '"'
    : text;
}

app.get("/api/R4/export.csv", async (req, res) => {
  const expectedKey = process.env.ORGANIZER_KEY;
  const providedKey = req.get("X-Organizer-Key") || "";

  if (!expectedKey) {
    return res.status(503).json({
      error: "organizer_key_not_configured"
    });
  }

  const a = Buffer.from(providedKey);
  const b = Buffer.from(expectedKey);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const snapshot = await teams.get();

    const columns = [
      "team_id",
      "team_name",
      "round_id",
      "assigned_questions",
      "final_answers",
      "question_scores",
      "points",
      "started_at",
      "completed_at",
      "time_taken_seconds",
      "total_attempts",
      "attempts_by_question",
      "status"
    ];

    const rows = snapshot.docs.map((doc) => {
      const team = doc.data();

      const record = {
        team_id: team.teamId,
        team_name: team.teamName,
        round_id: ROUND_ID,
        assigned_questions: (team.assignedQuestionIds || []).join(";"),
        final_answers: JSON.stringify(team.finalAnswers || {}),
        question_scores: JSON.stringify(team.questionScores || {}),
        points: team.points || 0,
        started_at: team.startedAt || "",
        completed_at: team.completedAt || "",
        time_taken_seconds: team.timeTakenSeconds ?? "",
        total_attempts: team.totalAttempts || 0,
        attempts_by_question: JSON.stringify(
          team.attemptsByQuestion || {}
        ),
        status: team.status || ""
      };

      return columns.map((column) => csvCell(record[column])).join(",");
    });

    const csv = [
      columns.join(","),
      ...rows
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="round4_results.csv"'
    );

    return res.send("\uFEFF" + csv);
  } catch (error) {
    console.error("CSV export error:", error);
    return res.status(500).json({ error: "server_error" });
  }
});

// ---------- ERROR HANDLER ----------

app.use((err, req, res, next) => {
  if (err.message === "Origin not allowed by CORS") {
    return res.status(403).json({ error: "origin_not_allowed" });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "server_error" });
});

app.listen(PORT, () => {
  console.log(`Round 4 backend listening on port ${PORT}`);
});
