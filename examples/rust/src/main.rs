//! Hanzo Enso Rust SDK Quickstart.
//!
//! Submits a query to the Enso router (POST /v1/chat/completions).

use serde_json::json;
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api_host = env::var("HANZO_API_HOST").unwrap_or_else(|_| "https://api.hanzo.ai".into());
    let api_key = env::var("HANZO_API_KEY").unwrap_or_default();

    println!("Connecting to Enso Router at {api_host}...");

    let payload = json!({
        "model": "enso-free",
        "messages": [
            {"role": "user", "content": "Explain single-shot routing in one sentence."}
        ],
        "temperature": 0.1,
        "max_tokens": 256
    });

    let client = reqwest::blocking::Client::new();
    let mut req = client.post(format!("{}/v1/chat/completions", api_host.trim_end_matches('/')))
        .header("Content-Type", "application/json")
        .json(&payload);

    if !api_key.is_empty() {
        req = req.header("Authorization", format!("Bearer {api_key}"));
    }

    let resp = req.send()?;
    let status = resp.status();
    let body: serde_json::Value = resp.json()?;

    println!("HTTP Status: {status}");
    println!("Model Selected: {}", body["model"].as_str().unwrap_or("unknown"));
    if let Some(content) = body["choices"][0]["message"]["content"].as_str() {
        println!("Response:\n{}", content.trim());
    } else {
        println!("Raw Response:\n{}", serde_json::to_string_pretty(&body)?);
    }

    Ok(())
}
