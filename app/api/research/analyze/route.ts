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
      defaultHeaders: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
    });
  }
  return perplexityClient;
}

interface AnalyzeRequest {
  type: 'interest' | 'company' | 'tech_stack';
  topic?: string; // For interests
  companyName?: string;
  companyLinkedInUrl?: string;
  customInstructions?: string; // Custom research instructions
  contextData?: {
    profile?: any;
    linkedin?: any;
    conversations?: any[];
    notes?: any[];
  };
  personContext?: {
    name?: string;
    role?: string;
    company?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBearerUser(request);
    if (auth instanceof NextResponse) {
      return auth;
    }

    const guarded = await guardRequest<AnalyzeRequest>({
      request,
      userId: auth.user.id,
      module: 'research-analyze',
    });
    if (guarded instanceof NextResponse) {
      return guarded;
    }

    // Check API keys
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error('Perplexity API key is not configured. Please add PERPLEXITY_API_KEY to your .env.local file.');
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env.local file.');
    }

    const body = guarded.body;
    const { type, topic, companyName, companyLinkedInUrl, customInstructions, contextData, personContext } = body;

    console.log(`🔍 Analyzing ${type}:`, topic || companyName);
    if (customInstructions) {
      console.log(`📝 Custom instructions: ${customInstructions}`);
    }
    if (contextData) {
      console.log(`📦 Context provided:`, Object.keys(contextData));
    }

    let result: any = {};

    switch (type) {
      case 'interest':
        result = await analyzeInterest(topic!, contextData);
        break;
      case 'company':
        result = await analyzeCompany(companyName!, companyLinkedInUrl, customInstructions, contextData);
        break;
      case 'tech_stack':
        result = await analyzeTechStack(companyName!, personContext);
        break;
      default:
        throw new Error(`Unknown research type: ${type}`);
    }

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error) {
    console.error('❌ Error in research analyze API:', error);
    
    // Better error messages
    let errorMessage = 'Failed to analyze research topic';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific API errors
      if (error.message.includes('401') || error.message.includes('Authorization')) {
        errorMessage = 'API authentication failed. Please check your Perplexity API key in .env.local';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

async function analyzeInterest(topic: string, contextData?: any) {
  console.log(`📰 Researching interest: ${topic}`);
  
  // Build context-aware query
  let query = `Latest news and updates about ${topic}`;
  
  if (contextData) {
    if (contextData.profile) {
      query += ` (relevant to ${contextData.profile.name}, ${contextData.profile.role})`;
    }
    // Note: Perplexity Search API doesn't take context in the query, but we can use it for filtering
  }
  
  // Try Perplexity Search API first, fallback to OpenAI if it fails
  try {
    console.log('🔮 Attempting to use Perplexity Search API...');
    
    const response = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results: 5,
        search_recency_filter: 'week',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Perplexity Search succeeded!');
    
    // Extract results
    const results = data.results || [];
    const links = results.map((result: any) => ({
      source: new URL(result.url).hostname.replace('www.', ''),
      url: result.url,
      label: result.title,
    }));

    // Create summary from snippets
    const summary = results
      .slice(0, 3)
      .map((r: any) => r.snippet)
      .join(' ')
      .substring(0, 300);

    return {
      type: 'interest',
      topic,
      summary: summary || `Latest updates about ${topic}`,
      links,
      last_updated: new Date().toISOString(),
    };
  } catch (perplexityError: any) {
    console.error('❌ Perplexity failed with error:', perplexityError.message);
    console.warn('⚠️ Falling back to OpenAI...');
    
    // Fallback to OpenAI
    const prompt = `Research "${topic}" and provide a brief summary (2-3 sentences) about recent news or updates. Include 3-4 example links where someone could learn more (format as markdown links).`;
    
    const response = await openai().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant. Provide concise summaries with example links in markdown format [text](url).'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const content = response.choices[0].message.content || '';
    const links = extractLinks(content);

    console.log('✅ OpenAI fallback succeeded');
    return {
      type: 'interest',
      topic,
      summary: content,
      links: links.length > 0 ? links : [
        { source: 'Google', url: `https://www.google.com/search?q=${encodeURIComponent(topic)}`, label: 'Search Google' },
        { source: 'YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`, label: 'Search YouTube' }
      ],
      last_updated: new Date().toISOString(),
    };
  }
}

async function analyzeCompany(companyName: string, linkedInUrl?: string, customInstructions?: string, contextData?: any) {
  console.log(`🏢 Researching company: ${companyName}`);
  
  // Build context section if provided
  let contextSection = '';
  if (contextData) {
    contextSection = '\n\nADDITIONAL CONTEXT:\n';
    
    if (contextData.profile) {
      contextSection += `\nProfile: ${contextData.profile.name} - ${contextData.profile.role} at ${contextData.profile.company}`;
    }
    
    if (contextData.linkedin) {
      contextSection += `\n\nLinkedIn Profile Data:\n${JSON.stringify(contextData.linkedin).substring(0, 1000)}`;
    }
    
    if (contextData.conversations && contextData.conversations.length > 0) {
      contextSection += `\n\nRecent Conversations:\n${contextData.conversations.map((c: any) => c.content || c.text).join('\n').substring(0, 1000)}`;
    }
    
    if (contextData.notes && contextData.notes.length > 0) {
      contextSection += `\n\nExisting Notes:\n${contextData.notes.map((n: any) => n.content || n.text).join('\n').substring(0, 500)}`;
    }
  }
  
  const basePrompt = customInstructions 
    ? `Research the company "${companyName}"${linkedInUrl ? ` (LinkedIn: ${linkedInUrl})` : ''}.

SPECIFIC FOCUS: ${customInstructions}${contextSection}

FORMAT INSTRUCTIONS:
- For EACH specific article or update you mention, include the FULL DIRECT URL to that article, not the homepage
- Format links as: [Specific Article Title](https://domain.com/article/full-path)
- Example: [Netflix's $83B Acquisition Impact](https://adweek.com/tvnewser/netflix-acquisition-analysis/12345) NOT [Adweek](https://adweek.com)
- DO NOT include generic homepage links like adweek.com - only link to specific articles
- Organize by source/publication with clear headings
- Use markdown formatting for readability with proper spacing between sections

Focus on providing actionable, specific article links that the user can click to read immediately.`
    : `Research the company "${companyName}"${linkedInUrl ? ` (LinkedIn: ${linkedInUrl})` : ''} and provide:

1. Company Overview (2-3 sentences): What they do, size, industry
2. Latest News (1-2 items): Recent funding, product launches, news
3. Key Products/Services
4. Organizational Structure hints (if available)${contextSection}

Provide 5-7 relevant links including:
- Company website
- Recent news articles
- LinkedIn company page
- Crunchbase or similar
- Any relevant blog posts or press releases`;
  
  const prompt = basePrompt;

  const response = await perplexity().chat.completions.create({
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content: 'You are a business research assistant providing comprehensive company information.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
  });

  const content = response.choices[0].message.content || '';
  const links = extractLinks(content);

  // Generate a concise title if the input is long (likely custom instructions)
  let topic = companyName;
  if (customInstructions && customInstructions.length > 50) {
    // Extract a shorter title from the instructions
    const titleMatch = customInstructions.match(/(?:scan|updates?|news).+?(?:on|about|for)\s+(.+?)(?:\s+(?:look|from|today|1\.|$))/i);
    topic = titleMatch ? titleMatch[1].trim() : companyName.substring(0, 50) + '...';
  }

  return {
    type: 'company',
    topic: topic,
    summary: content,
    data: {
      company_name: companyName,
      linkedin_url: linkedInUrl,
    },
    links,
    last_updated: new Date().toISOString(),
  };
}

async function analyzeTechStack(companyName: string, personContext?: any) {
  console.log(`💻 Researching tech stack for: ${companyName}`);
  
  // Step 1: Use OpenAI to structure the research query
  const structurePrompt = `I need to research the technology stack used by ${companyName}. 
${personContext?.role ? `The person works as ${personContext.role}.` : ''}

Generate a focused research query to find:
1. Programming languages and frameworks they use
2. Infrastructure and cloud platforms
3. Databases and data tools
4. Development tools and practices

Return a concise search query (1-2 sentences).`;

  const structureResponse = await openai().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a technical research assistant. Generate focused search queries.'
      },
      {
        role: 'user',
        content: structurePrompt
      }
    ],
    temperature: 0.3,
  });

  const searchQuery = structureResponse.choices[0].message.content || '';
  console.log('🔎 Search query:', searchQuery);

  // Step 2: Use Perplexity to research with the structured query
  const researchPrompt = `${searchQuery}

Provide:
1. **Frontend Technologies**: Languages, frameworks, libraries
2. **Backend Technologies**: Languages, frameworks, APIs
3. **Infrastructure**: Cloud platforms, databases, caching, queues
4. **Development Tools**: Version control, CI/CD, monitoring

Format as clear sections. Include 6-8 relevant links:
- Job postings mentioning tech stack
- Engineering blog posts
- StackShare profile
- GitHub repositories (if public)
- Tech conference talks
- LinkedIn posts from engineers`;

  const researchResponse = await perplexity().chat.completions.create({
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content: 'You are a technical research assistant specializing in technology stack analysis.'
      },
      {
        role: 'user',
        content: researchPrompt
      }
    ],
  });

  const content = researchResponse.choices[0].message.content || '';
  const links = extractLinks(content);

  // Step 3: Use OpenAI to structure the output
  const parsePrompt = `Parse this tech stack research and extract structured data:

${content}

Return JSON with this structure:
{
  "frontend": ["React", "TypeScript", ...],
  "backend": ["Node.js", "Python", ...],
  "infrastructure": ["AWS", "PostgreSQL", ...],
  "tools": ["Git", "Docker", ...]
}

Only include technologies explicitly mentioned. Return valid JSON only.`;

  const parseResponse = await openai().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You extract structured data from text. Return only valid JSON.'
      },
      {
        role: 'user',
        content: parsePrompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  let technologies = {};
  try {
    technologies = JSON.parse(parseResponse.choices[0].message.content || '{}');
  } catch (e) {
    console.error('Failed to parse technologies:', e);
  }

  return {
    type: 'tech_stack',
    topic: `${companyName} - Tech Stack`,
    summary: content.substring(0, 500) + '...',
    data: {
      company_name: companyName,
      technologies,
    },
    links,
    last_updated: new Date().toISOString(),
  };
}

function extractLinks(content: string): Array<{ source: string; url: string; label: string }> {
  const links: Array<{ source: string; url: string; label: string }> = [];
  
  // Extract markdown links [text](url)
  const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownRegex.exec(content)) !== null) {
    const label = match[1];
    const url = match[2];
    
    let source = 'Website';
    if (url.includes('youtube.com') || url.includes('youtu.be')) source = 'YouTube';
    else if (url.includes('wikipedia.org')) source = 'Wikipedia';
    else if (url.includes('linkedin.com')) source = 'LinkedIn';
    else if (url.includes('github.com')) source = 'GitHub';
    else if (url.includes('stackoverflow.com')) source = 'StackOverflow';
    else if (url.includes('stackshare.io')) source = 'StackShare';
    else if (url.includes('crunchbase.com')) source = 'Crunchbase';
    else if (url.includes('techcrunch.com')) source = 'TechCrunch';
    else if (url.includes('news') || url.includes('blog')) source = 'News';
    
    links.push({ source, url, label });
  }
  
  // If no markdown links, try to extract plain URLs
  if (links.length === 0) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    urls.slice(0, 8).forEach((url, idx) => {
      let source = 'Website';
      if (url.includes('youtube.com')) source = 'YouTube';
      else if (url.includes('linkedin.com')) source = 'LinkedIn';
      else if (url.includes('github.com')) source = 'GitHub';
      
      links.push({
        source,
        url,
        label: `Resource ${idx + 1}`
      });
    });
  }
  
  return links.slice(0, 8); // Limit to 8 links
}
