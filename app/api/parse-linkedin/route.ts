import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireBearerUser } from "@/lib/auth/requireBearerUser";
import { guardRequest } from "@/lib/api/guard";

let openaiClient: OpenAI | null = null;

function openai(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export async function POST(request: Request) {
  try {
    const auth = await requireBearerUser(request);
    if (auth instanceof NextResponse) {
      return auth;
    }

    const guarded = await guardRequest<{ profileText?: string }>({
      request,
      userId: auth.user.id,
      module: "parse-linkedin",
    });
    if (guarded instanceof NextResponse) {
      return guarded;
    }

    const { profileText } = guarded.body;

    if (!profileText) {
      return NextResponse.json(
        { error: "No profile text provided" },
        { status: 400 }
      );
    }

    const completion = await openai().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a LinkedIn profile parser. Extract structured information from the pasted LinkedIn profile text.

Extract and return JSON with:
- name: Full name
- company: Current company
- role: Current job title
- about: About/summary section
- experience: Array of work history with {company, role, dates, description}
- education: Array of education with {school, degree, dates}
- skills: Array of skills mentioned
- follower_count: Number of followers if mentioned

Return ONLY valid JSON, no additional text.`,
        },
        {
          role: "user",
          content: profileText,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = completion.choices[0].message.content;
    const parsedData = JSON.parse(result || "{}");

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Error parsing LinkedIn profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse LinkedIn profile" },
      { status: 500 }
    );
  }
}
