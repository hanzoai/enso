"""Enso Python example using OpenAI SDK.

Enso serves three frontier tiers:
- enso-ultra: hardest problems, top-tier reasoning and accuracy
- enso-pro: daily tasks, frontier quality
- enso-flash: high volume, low latency, low cost
- enso-auto: intelligent routing to the optimal tier
"""

import os
from openai import OpenAI

api_key = os.environ.get("HANZO_API_KEY")
if not api_key:
    raise ValueError("HANZO_API_KEY environment variable is required")

client = OpenAI(
    api_key=api_key,
    base_url="https://api.hanzo.ai/v1",
)

def chat_example():
    response = client.chat.completions.create(
        model="enso-auto",
        messages=[
            {"role": "system", "content": "You are a helpful and concise assistant."},
            {"role": "user", "content": "Explain the difference between model routing and speculative decoding."},
        ],
        temperature=0.7,
    )
    print("Response from Enso:")
    print(response.choices[0].message.content)

def streaming_example():
    print("\nStreaming response:")
    stream = client.chat.completions.create(
        model="enso-flash",
        messages=[
            {"role": "user", "content": "Write a three-line poem about computational reasoning."},
        ],
        stream=True,
    )
    for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            print(content, end="", flush=True)
    print()

if __name__ == "__main__":
    chat_example()
    streaming_example()
