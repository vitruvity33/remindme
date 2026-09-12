import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { guardRequest } from '@/lib/api/guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// POST /api/decide/workspace/breakdown - Break down a task into smaller steps using AI
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

    const guarded = await guardRequest<{ task?: string }>({
      request,
      userId: user.id,
      module: 'decide-workspace-breakdown',
    });
    if (guarded instanceof NextResponse) {
      return guarded;
    }
    const { task } = guarded.body;

    if (!task || task.trim() === '') {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    // Call OpenAI to break down the task
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
            content: `You are a helpful assistant that breaks down complex tasks into smaller, actionable steps.

For the given task, provide a detailed breakdown with:
- Clear, sequential steps (3-8 steps typically)
- Each step should be specific and actionable
- Realistic time estimates in minutes
- Tips or considerations when helpful

Format your response as a JSON object with this structure:
{
  "subtasks": [
    {
      "step": "Step description",
      "estimatedMinutes": 30,
      "details": "Optional additional context or tips"
    }
  ],
  "totalMinutes": 180,
  "suggestion": "Overall approach or timing suggestion"
}

Be practical and realistic with time estimates.`
          },
          {
            role: 'user',
            content: `Break down this task: ${task}`
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
        error: 'Failed to break down task' 
      }, { status: 500 });
    }

    const openaiResult = await openaiResponse.json();
    const content = openaiResult.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ 
        error: 'No response from AI' 
      }, { status: 500 });
    }

    const breakdown = JSON.parse(content);

    return NextResponse.json({ 
      success: true, 
      data: {
        subtasks: breakdown.subtasks || [],
        totalMinutes: breakdown.totalMinutes || null,
        suggestion: breakdown.suggestion || null
      }
    });

  } catch (error) {
    console.error('Error in POST /api/decide/workspace/breakdown:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
