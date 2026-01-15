
export interface AIResponse {
    content: string;
    error?: string;
}

export const generateContent = async (apiKey: string, prompt: string, baseUrl?: string): Promise<AIResponse> => {
    // OpenRouter Auto-detection
    if (apiKey.startsWith('sk-or-')) {
        return generateOpenAI(apiKey, prompt, baseUrl || 'https://openrouter.ai/api/v1');
    }

    // OpenCode Zen Auto-detection (Heuristic: sk- + 64 chars = 67 chars)
    if (apiKey.startsWith('sk-') && apiKey.length === 67) {
        return generateOpenAI(apiKey, prompt, baseUrl || 'https://opencode.ai/zen/v1');
    }

    // Basic heuristic to detect provider
    if (apiKey.startsWith('sk-')) {
        return generateOpenAI(apiKey, prompt, baseUrl);
    } else {
        // Default to Google Gemini if not OpenAI
        return generateGemini(apiKey, prompt);
    }
};

const generateOpenAI = async (apiKey: string, prompt: string, baseUrl?: string): Promise<AIResponse> => {
    try {
        const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        // Add OpenRouter/OpenCode specific headers
        if (baseUrl?.includes('openrouter') || baseUrl?.includes('opencode')) {
            headers['HTTP-Referer'] = window.location.href;
            headers['X-Title'] = 'Text Editor';
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                // Use a sensible default model. For OpenCode/Router, 'gpt-3.5-turbo' is practically a universal alias
                // even if it routes to Llama/Qwen.
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return { content: '', error: data.error?.message || 'Failed to fetch from OpenAI/Provider' };
        }

        // OpenRouter sometimes returns 'choices[0].text' instead of message.content for older non-chat models,
        // but /chat/completions standard is .message.content
        return { content: data.choices[0].message.content };
    } catch (e: any) {
        console.error("AI API Error:", e);
        return { content: '', error: e.message || 'Network error (CORS or offline)' };
    }
};

const generateGemini = async (apiKey: string, prompt: string): Promise<AIResponse> => {
    try {
        // Using Gemini 3 Flash Preview
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return { content: '', error: `Gemini Error: ${data.error?.message || 'Failed to fetch'}` };
        }

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return { content: data.candidates[0].content.parts[0].text };
        } else {
            return { content: '', error: 'Unexpected response format from Gemini' };
        }

    } catch (e: any) {
        return { content: '', error: e.message || 'Network error' };
    }
};
