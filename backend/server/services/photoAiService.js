const fs = require("fs");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const fileToBase64 = (filePath) => fs.readFileSync(filePath, { encoding: "base64" });

const buildDataUrl = (file) => `data:${file.mimetype};base64,${fileToBase64(file.path)}`;

const parseJsonFromText = (text) => {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
};

const analyzeWithOpenAI = async ({ beforeFile, afterFile }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            input: [
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: "Compare the before and after washroom photos. Return only JSON with keys beforeScore, afterScore, improvementScore, cleanlinessDelta, and shortReason. Score each image from 0 to 100 where higher means cleaner. improvementScore should reflect how much cleaner the after image is than the before image.",
                        },
                        {
                            type: "input_image",
                            image_url: buildDataUrl(beforeFile),
                        },
                        {
                            type: "input_image",
                            image_url: buildDataUrl(afterFile),
                        },
                    ],
                },
            ],
            temperature: 0,
        }),
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    const text = data.output_text || "";
    const parsed = parseJsonFromText(text);

    if (!parsed) return null;

    return {
        beforeScore: Number(parsed.beforeScore || 0),
        afterScore: Number(parsed.afterScore || 0),
        improvementScore: clamp(Number(parsed.improvementScore || 0), 0, 100),
        shortReason: String(parsed.shortReason || "AI vision comparison"),
        source: "openai",
    };
};

const analyzeWithGenericEndpoint = async ({ beforeFile, afterFile }) => {
    const endpoint = process.env.PHOTO_AI_ENDPOINT;
    if (!endpoint) return null;

    try {
        const payload = {
            beforeImage: fileToBase64(beforeFile.path),
            afterImage: fileToBase64(afterFile.path),
            beforeMimeType: beforeFile.mimetype,
            afterMimeType: afterFile.mimetype,
            beforeFileName: beforeFile.originalname,
            afterFileName: afterFile.originalname,
        };

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(process.env.PHOTO_AI_API_KEY
                    ? { Authorization: `Bearer ${process.env.PHOTO_AI_API_KEY}` }
                    : {}),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        return {
            beforeScore: Number(data.beforeScore || 0),
            afterScore: Number(data.afterScore || 0),
            improvementScore: clamp(Number(data.improvementScore || 0), 0, 100),
            shortReason: String(data.shortReason || "Custom vision endpoint"),
            source: "endpoint",
        };
    } catch {
        return null;
    }
};

const analyzePhotoImprovement = async ({ beforeFile, afterFile }) => {
    const openAiResult = await analyzeWithOpenAI({ beforeFile, afterFile });
    if (openAiResult) return openAiResult;

    const endpointResult = await analyzeWithGenericEndpoint({ beforeFile, afterFile });
    if (endpointResult) return endpointResult;

    const beforeSize = beforeFile.size || 1;
    const afterSize = afterFile.size || 1;
    const sizeDeltaRatio = (beforeSize - afterSize) / beforeSize;
    const sizeBonus = clamp(Math.round(sizeDeltaRatio * 30), -10, 10);
    const balanceBonus = 15;
    const improvementScore = clamp(55 + sizeBonus + balanceBonus, 40, 95);

    return {
        beforeScore: 55,
        afterScore: improvementScore,
        improvementScore,
        shortReason: "Fallback heuristic because no vision API was configured.",
        source: "heuristic",
    };
};

module.exports = {
    analyzePhotoImprovement,
};
