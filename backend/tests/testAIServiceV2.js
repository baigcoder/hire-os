/**
 * AI Service V2 Test Suite
 * Tests multi-provider fallback and all AI features
 * Run: node tests/testAIServiceV2.js
 */

import dotenv from "dotenv";
dotenv.config();

import {
  callAI,
  analyzeResume,
  generateMCQ,
  getInterviewResponse,
  analyzeFraud,
  generateCEOReport,
  AI_MODELS,
  getMemory,
  addToMemory,
} from "../utils/aiServiceV2.js";

// Color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

const results = { passed: 0, failed: 0, tests: [] };

async function test(name, fn) {
  console.log(`\n${colors.cyan}━━━ Testing: ${name} ━━━${colors.reset}`);
  try {
    const startTime = Date.now();
    const result = await fn();
    const latency = Date.now() - startTime;

    console.log(`${colors.green}✓ PASSED${colors.reset} (${latency}ms)`);
    if (result?.model) console.log(`  Model: ${result.model}`);
    if (result?.provider) console.log(`  Provider: ${result.provider}`);

    results.passed++;
    results.tests.push({ name, status: "PASSED", latency });
    return result;
  } catch (error) {
    console.log(`${colors.red}✗ FAILED: ${error.message}${colors.reset}`);
    results.failed++;
    results.tests.push({ name, status: "FAILED", error: error.message });
    return null;
  }
}

async function runTests() {
  console.log(
    `${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.cyan}║           AI SERVICE V2 - INDUSTRIAL GRADE TEST              ║${colors.reset}`,
  );
  console.log(
    `${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}`,
  );

  console.log(`\nAPI Keys Status:`);
  console.log(
    `  ChatAnywhere: ${process.env.GPT5_API_KEY ? "✓ SET" : "✗ NOT SET"}`,
  );
  console.log(`  Groq: ${process.env.GROQ_API_KEY ? "✓ SET" : "✗ NOT SET"}`);
  console.log(
    `  Gemini: ${process.env.GEMINI_API_KEY ? "✓ SET" : "✗ NOT SET"}`,
  );

  // Test 1: Basic callAI with gpt-4o-mini
  await test("Basic callAI (gpt-4o-mini)", async () => {
    return await callAI("What is 2+2? Reply with just the number.", {
      temperature: 0.1,
      maxTokens: 50,
    });
  });

  // Test 2: Memory System
  await test("Memory System", async () => {
    const sessionId = "test_session_123";
    addToMemory(sessionId, "user", "Hello, I am John");
    addToMemory(sessionId, "assistant", "Nice to meet you, John!");
    addToMemory(sessionId, "user", "I have 5 years of React experience");

    const memory = getMemory(sessionId);
    if (memory.messages.length !== 3) {
      throw new Error("Memory not storing correctly");
    }
    return { model: "Memory Store", provider: "Local", success: true };
  });

  // Test 3: Resume Analysis
  await test("Resume Analysis", async () => {
    const resumeText = `
John Doe - Software Engineer
5 years experience in React, Node.js, TypeScript
Led team of 8 engineers at TechCorp
Built microservices processing 2M requests/day
MS Computer Science, Stanford University
`;
    return await analyzeResume(
      resumeText,
      "Senior Software Engineer - React/Node.js",
      "test_candidate_1",
    );
  });

  // Test 4: MCQ Generation
  await test("MCQ Generation", async () => {
    return await generateMCQ(
      "React Developer",
      ["React", "JavaScript", "TypeScript"],
      "Mid",
      3,
    );
  });

  // Test 5: Interview Response with Memory
  await test("Interview Response with Memory", async () => {
    return await getInterviewResponse(
      "Explain how React hooks work",
      "React hooks allow functional components to use state and lifecycle features. useState manages state, useEffect handles side effects.",
      "Senior React Developer position",
      "test_interview_1",
    );
  });

  // Test 6: Fraud Detection
  await test("Fraud Detection", async () => {
    return await analyzeFraud({
      avgResponseTime: 1500,
      tabSwitches: 3,
      copyPasteCount: 1,
      cameraOn: true,
      faceDetected: true,
      multipleFaces: false,
    });
  });

  // Test 7: CEO Report with Reasoning (deepseek-r1)
  await test("CEO Report (deepseek-r1 reasoning)", async () => {
    return await generateCEOReport({
      candidateName: "John Doe",
      jobTitle: "Senior Software Engineer",
      companyName: "TechCorp",
      interviewDate: new Date().toISOString(),
      mcqScore: 12,
      mcqTotal: 15,
      resumeScore: 85,
      interviewRating: 8,
      fraudRiskScore: 5,
      recruiterNotes:
        "Excellent communication, strong technical skills, team player",
    });
  });

  // Print Summary
  console.log(
    `\n\n${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.cyan}║                      TEST SUMMARY                             ║${colors.reset}`,
  );
  console.log(
    `${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}`,
  );

  console.log(`\n${colors.yellow}Results:${colors.reset}`);
  results.tests.forEach((t) => {
    const icon = t.status === "PASSED" ? colors.green + "✓" : colors.red + "✗";
    console.log(
      `  ${icon} ${t.name}${colors.reset} ${t.latency ? `(${t.latency}ms)` : ""}`,
    );
  });

  console.log(`\n${colors.yellow}Summary:${colors.reset}`);
  console.log(`  Total: ${results.passed + results.failed}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(
    `  Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`,
  );
}

runTests().catch(console.error);
