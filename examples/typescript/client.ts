import OpenAI from "openai";

const apiKey = process.env.HANZO_API_KEY;
if (!apiKey) {
  console.error("Error: HANZO_API_KEY environment variable is required");
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.hanzo.ai/v1",
});

async function main() {
  console.log("Calling Enso via TypeScript OpenAI client...");

  // 1. Standard completion with enso-auto
  const completion = await client.chat.completions.create({
    model: "enso-auto",
    messages: [
      { role: "system", content: "You are an expert engineer." },
      { role: "user", content: "What is masked block diffusion in decision models?" },
    ],
  });

  console.log("\nEnso Response:");
  console.log(completion.choices[0].message.content);

  // 2. Streaming completion with enso-flash
  console.log("\nStreaming with enso-flash:");
  const stream = await client.chat.completions.create({
    model: "enso-flash",
    messages: [
      { role: "user", content: "List 3 advantages of pure Rust runtime over Python for inference." },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || "";
    process.stdout.write(text);
  }
  console.log("\n");
}

main().catch(console.error);
