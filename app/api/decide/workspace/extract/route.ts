import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { guardRequest } from '@/lib/api/guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// POST /api/decide/workspace/extract - Extract action items from text using AI
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guarded = await guardRequest<{ text?: string }>({
      request,
      userId: user.id,
      module: 'decide-workspace-extract',
    });
    if (guarded instanceof NextResponse) {
      return guarded;
    }
    const { text } = guarded.body;

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Call OpenAI to extract action items
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that extracts action items and TODOs from meeting notes, emails, and other text. 
            
Extract clear, actionable tasks. Each task should:
- Start with a verb (e.g., "Send", "Schedule", "Review")
- Be specific and concrete
- Include context when helpful

Format your response as a JSON object with this structure:
{
  "todos": ["task 1", "task 2", ...],
  "priorities": ["high", "medium", "low", ...],
  "estimatedMinutes": [30, 60, 15, ...]
}

Priorities should be "high", "medium", or "low" based on urgency/importance.
Estimated minutes should be realistic estimates for each task (optional, can be null).`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json({ 
        error: 'Failed to extract action items' 
      }, { status: 500 });
    }

    const openaiResult = await openaiResponse.json();
    const content = openaiResult.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ 
        error: 'No response from AI' 
      }, { status: 500 });
    }

    const extracted = JSON.parse(content);

    return NextResponse.json({ 
      success: true, 
      data: {
        todos: extracted.todos || [],
        priorities: extracted.priorities || [],
        estimatedMinutes: extracted.estimatedMinutes || []
      }
    });

  } catch (error) {
    console.error('Error in POST /api/decide/workspace/extract:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
