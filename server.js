const express = require("express");
const cors = require("cors");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/api/parse-questions", async (req, res) => {
  try {
    const { text, apiKey } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!apiKey) {
      return res.status(400).json({ error: "API Key is required" });
    }

    // Detect if using OpenRouter key
    const isOpenRouter = apiKey.startsWith("sk-or-");
    const apiUrl = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (isOpenRouter) {
      headers["HTTP-Referer"] = "http://localhost:3000"; // Optional for OpenRouter
      headers["X-Title"] = "Study Tracker"; // Optional for OpenRouter
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that extracts questions and answers from text.
                        Analyze the user provided text and extract all Question-Answer pairs.
                        For math, physics, or chemistry problems, ensure the Answer field contains step-by-step solutions, with each step on a NEW LINE.
                        Return the result ONLY as a raw JSON array of objects.
                        Each object must have these fields:
                        - "serial": a number starting from 1 and incrementing.
                        - "question": the question text (clean up any numbering or labels like "Q1", "Question:", etc).
                        - "answer": the answer text (clean up any labels like "Ans", "Answer:", etc). Maintain newlines for steps.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/improve-question", async (req, res) => {
  try {
    const { question, answer, apiKey } = req.body;

    if (!question || !answer) {
      return res
        .status(400)
        .json({ error: "Question and Answer are required" });
    }

    if (!apiKey) {
      return res.status(400).json({ error: "API Key is required" });
    }

    // Detect if using OpenRouter key
    const isOpenRouter = apiKey.startsWith("sk-or-");
    const apiUrl = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (isOpenRouter) {
      headers["HTTP-Referer"] = "http://localhost:3000";
      headers["X-Title"] = "Study Tracker";
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that improves the clarity, grammar, and formatting of study questions and answers.
                        You will receive a question and an answer.
                        Your task is to rewrite them to be clearer, more concise, and better formatted.
                        IMPORTANT: For calculation problems or multi-step explanations, you MUST use newlines (\n) to separate each step. Do not bunch steps into one paragraph.
                        Do not change the underlying meaning or facts.
                        Return the result ONLY as a raw JSON object with these fields:
                        - "question": the improved question text.
                        - "answer": the improved answer text (with newlines for steps).`,
          },
          {
            role: "user",
            content: `Question: ${question}\nAnswer: ${answer}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
