// Hanzo Enso Go Quickstart.
// Connects to Enso Router at /v1/chat/completions.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

type ChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	MaxTokens   int       `json:"max_tokens"`
	Temperature float64   `json:"temperature"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		Message struct {
			Role             string `json:"role"`
			Content          string `json:"content"`
			ReasoningContent string `json:"reasoning_content"`
		} `json:"message"`
	} `json:"choices"`
}

func main() {
	apiHost := os.Getenv("HANZO_API_HOST")
	if apiHost == "" {
		apiHost = "https://api.hanzo.ai"
	}
	apiKey := os.Getenv("HANZO_API_KEY")

	fmt.Printf("Connecting to Enso Router at %s...\n", apiHost)

	reqBody := ChatRequest{
		Model: "enso-free",
		Messages: []Message{
			{Role: "user", Content: "What is model routing?"},
		},
		MaxTokens:   128,
		Temperature: 0.1,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		panic(err)
	}

	url := fmt.Sprintf("%s/v1/chat/completions", strings.TrimRight(apiHost, "/"))
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		panic(err)
	}

	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("Error: HTTP %d: %s\n", resp.StatusCode, string(bodyBytes))
		os.Exit(1)
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(bodyBytes, &chatResp); err != nil {
		panic(err)
	}

	fmt.Printf("Model selected: %s\n", chatResp.Model)
	if len(chatResp.Choices) > 0 {
		fmt.Printf("Response: %s\n", chatResp.Choices[0].Message.Content)
	}
}
