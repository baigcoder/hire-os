/**
 * AI Model Test Script
 * Tests all ChatAnywhere API models for Hire.OS Job Portal
 * Run: node testAIModels.js
 */

import dotenv from "dotenv";
dotenv.config();

const API_URL = "https://api.chatanywhere.tech/v1/chat/completions";
const API_KEY = process.env.GPT5_API_KEY;

// All available models to test
const MODELS_TO_TEST = [
  { name: "gpt-5.1-ca", description: "Most Accurate - Deep Analysis" },
  { name: "gpt-5-ca", description: "Balanced - Generation Tasks" },
  { name: "gpt-5-mini-ca", description: "Fast - Real-time Responses" },
  { name: "gpt-5-nano-ca", description: "Ultra-fast - Instant Feedback" },
  { name: "deepseek-r1", description: "Reasoning - Complex Problem Solving" },
  { name: "gpt-5.1-chat-latest-ca", description: "Chat Optimized" },
  { name: "gpt-4o", description: "GPT-4o (if available)" },
  { name: "gpt-4o-mini", description: "GPT-4o Mini (if available)" },
  {
    name: "claude-3.5-sonnet",
    description: "Claude 3.5 Sonnet (if available)",
  },
];

// Feature test prompts
const FEATURE_TESTS = {
  MODEL_IDENTITY: {
    prompt: "What model are you? Reply with just your model name.",
    description: "Model Identity Check",
  },
  RESUME_ANALYSIS: {
    prompt: `Analyze this resume excerpt for a Software Engineer position:
"5 years experience in React, Node.js, Python. Led team of 10 engineers. Built microservices processing 1M requests/day."
Rate: Technical Skills, Leadership, Impact. Format: JSON {skills: 1-10, leadership: 1-10, impact: 1-10}`,
    description: "Resume Analysis Feature",
  },
  MCQ_GENERATION: {
    prompt: `Generate 2 MCQ questions for a Senior React Developer interview. 
Format: JSON array [{question: "", options: [A,B,C,D], correct: "A", difficulty: "Medium"}]`,
    description: "MCQ Generation Feature",
  },
  INTERVIEW_RESPONSE: {
    prompt: `You are an AI interviewer. The candidate answered: "I would use React hooks for state management."
Rate this answer for a Frontend Developer position (1-10) and give brief feedback. JSON: {score: X, feedback: "..."}`,
    description: "Interview Response Feature",
  },
  FRAUD_DETECTION: {
    prompt: `Analyze this interview behavior for fraud indicators:
- Response time: 1.2 seconds average
- Tab switches: 12 times
- Copy-paste events: 5
- Confidence pattern: Highly variable
Risk score 0-100 and reasons. JSON: {risk_score: X, indicators: [...]}`,
    description: "Fraud Detection Feature",
  },
  REASONING: {
    prompt: `A company has 50 job openings and 200 applicants. Each recruiter can handle 15 applications per day.
How many recruiters are needed to process all applications in 3 days? Show your reasoning step by step.`,
    description: "Complex Reasoning Test",
  },
};

// Color codes for console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

// Test results storage
const results = {
  models: {},
  features: {},
  summary: { passed: 0, failed: 0, total: 0 },
};

/**
 * Call the ChatAnywhere API
 */
async function callAPI(model, prompt, temperature = 0.6) {
  const startTime = Date.now();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: temperature,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    const endTime = Date.now();
    const latency = endTime - startTime;

    if (data.error) {
      return {
        success: false,
        error: data.error.message || JSON.stringify(data.error),
        latency,
      };
    }

    return {
      success: true,
      model: data.model,
      content: data.choices?.[0]?.message?.content || "",
      reasoning: data.choices?.[0]?.message?.reasoning_content || null,
      usage: data.usage,
      latency,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Test a single model
 */
async function testModel(model) {
  console.log(`\n${colors.cyan}━━━ Testing: ${model.name} ━━━${colors.reset}`);
  console.log(`${colors.gray}Description: ${model.description}${colors.reset}`);

  const result = await callAPI(model.name, FEATURE_TESTS.MODEL_IDENTITY.prompt);

  if (result.success) {
    console.log(`${colors.green}✓ Status: WORKING${colors.reset}`);
    console.log(
      `${colors.gray}  Response: ${result.content.substring(0, 100)}...${colors.reset}`,
    );
    console.log(`${colors.gray}  Actual Model: ${result.model}${colors.reset}`);
    console.log(`${colors.gray}  Latency: ${result.latency}ms${colors.reset}`);
    if (result.usage) {
      console.log(
        `${colors.gray}  Tokens: ${result.usage.total_tokens}${colors.reset}`,
      );
    }
    results.models[model.name] = {
      status: "WORKING",
      latency: result.latency,
      actualModel: result.model,
    };
    results.summary.passed++;
  } else {
    console.log(`${colors.red}✗ Status: FAILED${colors.reset}`);
    console.log(`${colors.red}  Error: ${result.error}${colors.reset}`);
    results.models[model.name] = { status: "FAILED", error: result.error };
    results.summary.failed++;
  }

  results.summary.total++;
  return result;
}

/**
 * Test a feature with optimal model
 */
async function testFeature(featureKey, modelName) {
  const feature = FEATURE_TESTS[featureKey];
  console.log(
    `\n${colors.magenta}━━━ Testing Feature: ${feature.description} ━━━${colors.reset}`,
  );
  console.log(`${colors.gray}Using model: ${modelName}${colors.reset}`);

  const result = await callAPI(modelName, feature.prompt, 0.7);

  if (result.success) {
    console.log(`${colors.green}✓ Feature Working${colors.reset}`);
    console.log(
      `${colors.gray}  Response Preview: ${result.content.substring(0, 200)}...${colors.reset}`,
    );
    console.log(`${colors.gray}  Latency: ${result.latency}ms${colors.reset}`);

    // Check if response is valid JSON when expected
    if (feature.prompt.includes("JSON")) {
      try {
        const jsonStart = result.content.indexOf("{");
        const jsonEnd = result.content.lastIndexOf("}") + 1;
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          JSON.parse(result.content.substring(jsonStart, jsonEnd));
          console.log(`${colors.green}  ✓ Valid JSON output${colors.reset}`);
        }
      } catch {
        console.log(`${colors.yellow}  ⚠ JSON parsing issue${colors.reset}`);
      }
    }

    if (result.reasoning) {
      console.log(
        `${colors.cyan}  📝 Reasoning included (${result.reasoning.length} chars)${colors.reset}`,
      );
    }

    results.features[featureKey] = {
      status: "WORKING",
      latency: result.latency,
    };
  } else {
    console.log(
      `${colors.red}✗ Feature Failed: ${result.error}${colors.reset}`,
    );
    results.features[featureKey] = { status: "FAILED", error: result.error };
  }

  return result;
}

/**
 * Print summary report
 */
function printSummary() {
  console.log(
    `\n\n${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.cyan}║              AI MODEL TEST SUMMARY REPORT                    ║${colors.reset}`,
  );
  console.log(
    `${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`,
  );

  // Model Results
  console.log(`${colors.yellow}📊 MODEL STATUS:${colors.reset}`);
  console.log("─".repeat(60));
  Object.entries(results.models).forEach(([model, data]) => {
    const status =
      data.status === "WORKING"
        ? `${colors.green}✓ WORKING${colors.reset}`
        : `${colors.red}✗ FAILED${colors.reset}`;
    const info =
      data.status === "WORKING"
        ? `${data.latency}ms | ${data.actualModel}`
        : data.error;
    console.log(
      `  ${model.padEnd(25)} ${status.padEnd(20)} ${colors.gray}${info}${colors.reset}`,
    );
  });

  // Feature Results
  console.log(`\n${colors.yellow}🎯 FEATURE STATUS:${colors.reset}`);
  console.log("─".repeat(60));
  Object.entries(results.features).forEach(([feature, data]) => {
    const status =
      data.status === "WORKING"
        ? `${colors.green}✓ WORKING${colors.reset}`
        : `${colors.red}✗ FAILED${colors.reset}`;
    console.log(`  ${feature.padEnd(25)} ${status}`);
  });

  // Summary
  console.log(`\n${colors.yellow}📈 SUMMARY:${colors.reset}`);
  console.log("─".repeat(60));
  console.log(`  Total Models Tested: ${results.summary.total}`);
  console.log(
    `  ${colors.green}Passed: ${results.summary.passed}${colors.reset}`,
  );
  console.log(
    `  ${colors.red}Failed: ${results.summary.failed}${colors.reset}`,
  );
  console.log(
    `  Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`,
  );

  // Recommendations
  console.log(`\n${colors.yellow}💡 RECOMMENDATIONS:${colors.reset}`);
  console.log("─".repeat(60));

  const workingModels = Object.entries(results.models)
    .filter(([_, d]) => d.status === "WORKING")
    .sort((a, b) => a[1].latency - b[1].latency);

  if (workingModels.length > 0) {
    console.log(
      `  Fastest Model: ${workingModels[0][0]} (${workingModels[0][1].latency}ms)`,
    );
    console.log(`  Recommended for Real-time: ${workingModels[0][0]}`);
    if (workingModels.length > 1) {
      console.log(
        `  Recommended for Accuracy: ${workingModels[workingModels.length - 1][0]}`,
      );
    }
  }

  const failedModels = Object.entries(results.models).filter(
    ([_, d]) => d.status === "FAILED",
  );
  if (failedModels.length > 0) {
    console.log(
      `\n  ${colors.red}⚠ Failed Models Need Attention:${colors.reset}`,
    );
    failedModels.forEach(([model, _]) => console.log(`    - ${model}`));
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(
    `${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.cyan}║        HIRE.OS AI MODEL VERIFICATION TEST SUITE              ║${colors.reset}`,
  );
  console.log(
    `${colors.cyan}║        ChatAnywhere API - Full Model Audit                   ║${colors.reset}`,
  );
  console.log(
    `${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}`,
  );

  console.log(`\n${colors.gray}API URL: ${API_URL}${colors.reset}`);
  console.log(
    `${colors.gray}API Key: ${API_KEY ? "***" + API_KEY.slice(-4) : "NOT SET"}${colors.reset}`,
  );
  console.log(
    `${colors.gray}Timestamp: ${new Date().toISOString()}${colors.reset}`,
  );

  if (!API_KEY) {
    console.log(
      `\n${colors.red}ERROR: GPT5_API_KEY not set in environment${colors.reset}`,
    );
    process.exit(1);
  }

  // Test all models
  console.log(
    `\n\n${colors.yellow}═══ PHASE 1: MODEL AVAILABILITY TESTS ═══${colors.reset}`,
  );
  for (const model of MODELS_TO_TEST) {
    await testModel(model);
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 500));
  }

  // Test features with optimal models
  console.log(
    `\n\n${colors.yellow}═══ PHASE 2: FEATURE FUNCTIONALITY TESTS ═══${colors.reset}`,
  );

  // Use working models for feature tests
  const workingModel =
    Object.entries(results.models).find(
      ([_, d]) => d.status === "WORKING",
    )?.[0] || "gpt-5-ca";

  await testFeature("RESUME_ANALYSIS", workingModel);
  await new Promise((r) => setTimeout(r, 500));

  await testFeature("MCQ_GENERATION", workingModel);
  await new Promise((r) => setTimeout(r, 500));

  await testFeature("INTERVIEW_RESPONSE", workingModel);
  await new Promise((r) => setTimeout(r, 500));

  await testFeature("FRAUD_DETECTION", workingModel);
  await new Promise((r) => setTimeout(r, 500));

  // Test deepseek-r1 for reasoning if available
  if (results.models["deepseek-r1"]?.status === "WORKING") {
    await testFeature("REASONING", "deepseek-r1");
  } else {
    await testFeature("REASONING", workingModel);
  }

  // Print final report
  printSummary();

  // Return results for programmatic use
  return results;
}

// Run tests
runAllTests().catch(console.error);
