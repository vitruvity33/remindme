import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireBearerUser } from '@/lib/auth/requireBearerUser';
import { guardRequest } from '@/lib/api/guard';

let openaiClient: OpenAI | null = null;
let perplexityClient: OpenAI | null = null;

function openai(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function perplexity(): OpenAI {
  if (!perplexityClient) {
    perplexityClient = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });
  }
  return perplexityClient;
}

interface ResearchInput {
  userInput: string;
  includeLinkedIn: boolean;
  includeConversations: boolean;
  includeMemories: boolean;
  linkedInData?: {
    summary?: string;
    experience?: string;
    skills?: string[];
  };
  conversations?: string[];
  memories?: string[];
}

interface ResearchSuggestion {
  type: 'interest' | 'team' | 'tech' | 'company' | 'market' | 'topic';
  title: string;
  why_it_matters: string;
  links: Array<{
    source: string;
    url: string;
    label: string;
  }>;
  status: 'todo' | 'in_progress' | 'done';
  pinned: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBearerUser(request);
    if (auth instanceof NextResponse) {
      return auth;
    }

    const guarded = await guardRequest<ResearchInput>({
      request,
      userId: auth.user.id,
      module: 'research-suggest',
    });
    if (guarded instanceof NextResponse) {
      return guarded;
    }

    const body = guarded.body;
    const { userInput, includeLinkedIn, includeConversations, includeMemories, linkedInData, conversations, memories } = body;

    // Step 1: Use OpenAI to analyze context and extract key topics
    let contextPrompt = 'Analyze the following information and extract key topics, interests, and areas worth researching:\n\n';
    
    if (userInput) {
      contextPrompt += `User's research interests: ${userInput}\n\n`;
    }
    
    if (includeLinkedIn && linkedInData) {
      contextPrompt += `LinkedIn Profile:\n`;
      if (linkedInData.summary) contextPrompt += `Summary: ${linkedInData.summary}\n`;
      if (linkedInData.experience) contextPrompt += `Experience: ${linkedInData.experience}\n`;
      if (linkedInData.skills?.length) contextPrompt += `Skills: ${linkedInData.skills.join(', ')}\n`;
      contextPrompt += '\n';
    }
    
    if (includeConversations && conversations?.length) {
      contextPrompt += `Recent Conversations:\n${conversations.join('\n')}\n\n`;
    }
    
    if (includeMemories && memories?.length) {
      contextPrompt += `Memories/Notes:\n${memories.join('\n')}\n\n`;
    }

    contextPrompt += `Extract 3-5 specific topics or interests that would be valuable to research. For each topic, identify:
1. The topic name
2. Type (interest, team/sports, technology, company, market, or general topic)
3. Why it matters for building rapport or understanding this person

Return as JSON array with format:
[
  {
    "topic": "topic name",
    "type": "interest|team|tech|company|market|topic",
    "why": "brief explanation"
  }
]`;

    console.log('🔍 Analyzing context with OpenAI...');
    const analysisResponse = await openai().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant that helps identify valuable topics to research about people. Extract specific, actionable research topics from the provided context.'
        },
        {
          role: 'user',
          content: contextPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const analysisContent = analysisResponse.choices[0].message.content;
    let topics: Array<{ topic: string; type: string; why: string }> = [];
    
    try {
      const parsed = JSON.parse(analysisContent || '{}');
      topics = parsed.topics || [];
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      topics = [];
    }

    console.log('📊 Extracted topics:', topics);

    // Step 2: For each topic, use Perplexity to get research with sources
    const suggestions: ResearchSuggestion[] = [];

    for (const topic of topics) {
      try {
        console.log(`🔎 Researching "${topic.topic}" with Perplexity...`);
        
        const researchPrompt = `Research "${topic.topic}" and provide:
1. A brief overview (2-3 sentences)
2. 3-5 relevant links to learn more (YouTube videos, news articles, Wikipedia, official websites, etc.)

Focus on current, relevant information that would help someone understand this topic for conversation.`;

        const perplexityResponse = await perplexity().chat.completions.create({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a research assistant. Provide concise, relevant information with credible sources.'
            },
            {
              role: 'user',
              content: researchPrompt
            }
          ],
        });

        const researchContent = perplexityResponse.choices[0].message.content || '';
        
        // Extract links from the response (Perplexity includes citations)
        const links: Array<{ source: string; url: string; label: string }> = [];
        
        // Parse markdown links [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(researchContent)) !== null) {
          const label = match[1];
          const url = match[2];
          
          // Determine source type from URL
          let source = 'Website';
          if (url.includes('youtube.com') || url.includes('youtu.be')) source = 'YouTube';
          else if (url.includes('wikipedia.org')) source = 'Wikipedia';
          else if (url.includes('news') || url.includes('article')) source = 'News';
          
          links.push({ source, url, label });
        }

        // If no links found in markdown, try to extract plain URLs
        if (links.length === 0) {
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const urls = researchContent.match(urlRegex) || [];
          urls.slice(0, 5).forEach((url, idx) => {
            let source = 'Website';
            if (url.includes('youtube.com') || url.includes('youtu.be')) source = 'YouTube';
            else if (url.includes('wikipedia.org')) source = 'Wikipedia';
            
            links.push({
              source,
              url,
              label: `Resource ${idx + 1}`
            });
          });
        }

        suggestions.push({
          type: topic.type as any,
          title: topic.topic,
          why_it_matters: topic.why,
          links: links.slice(0, 5), // Limit to 5 links per suggestion
          status: 'todo',
          pinned: false,
        });

      } catch (error) {
        console.error(`Error researching topic "${topic.topic}":`, error);
        // Continue with other topics even if one fails
      }
    }

    console.log('✅ Generated', suggestions.length, 'research suggestions');

    return NextResponse.json({
      success: true,
      suggestions,
    });

  } catch (error) {
    console.error('Error in research suggest API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate research suggestions' 
      },
      { status: 500 }
    );
  }
}
