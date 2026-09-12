import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { guardRequest } from '@/lib/api/guard';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface StrategyRequest {
  business_id?: string;
  meeting_id?: string;
  meeting_type?: string;
  situation?: string;
  goal?: string;
  context_sources: string[];
  clarifying_qa?: { question: string; answer: string }[];
  attendee_ids?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
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

    const guarded = await guardRequest<StrategyRequest>({
      request,
      userId: user.id,
      module: 'conversations-generate-strategy',
    });
    if (guarded instanceof NextResponse) {
      return guarded;
    }
    const { business_id, meeting_id, meeting_type, situation, goal, context_sources, clarifying_qa, attendee_ids } = guarded.body;

    if (!business_id && !meeting_id) {
      return NextResponse.json({ error: 'Either business_id or meeting_id is required' }, { status: 400 });
    }

    // Gather context based on selected sources
    let contextData: any = {
      business: null,
      meetings: [],
      notes: [],
      people: [],
      attendees: []
    };

    // Get business details if business_id provided
    if (business_id) {
      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', business_id)
        .single();
      
      contextData.business = business;
    }

    // Get meeting details if meeting_id provided
    if (meeting_id) {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('*, businesses(*)')
        .eq('id', meeting_id)
        .single();
      
      if (meeting) {
        contextData.meeting = meeting;
        if (meeting.businesses) {
          contextData.business = meeting.businesses;
        }
      }
    }

    // Get attendee LinkedIn data if attendees context source is selected
    if (context_sources.includes('attendees') && attendee_ids && attendee_ids.length > 0) {
      const { data: attendees } = await supabase
        .from('people')
        .select('*')
        .in('id', attendee_ids);
      
      contextData.attendees = attendees || [];
    }

    // Gather context from selected sources
    if (context_sources.includes('meetings') && business_id) {
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*, meeting_notes(*)')
        .eq('business_id', business_id)
        .order('meeting_date', { ascending: false })
        .limit(5);
      contextData.meetings = meetings || [];
    }

    if (context_sources.includes('notes') && business_id) {
      const { data: notes } = await supabase
        .from('business_notes')
        .select('*')
        .eq('business_id', business_id)
        .order('created_at', { ascending: false })
        .limit(10);
      contextData.notes = notes || [];
    }

    if ((context_sources.includes('linkedin') || context_sources.includes('conversations') || context_sources.includes('memories')) && business_id) {
      const { data: people } = await supabase
        .from('people')
        .select('*')
        .eq('business_id', business_id);
      contextData.people = people || [];
    }

    // Build context string for OpenAI
    const contextString = buildContextString(contextData, context_sources);

    // Call OpenAI to generate strategy
    console.log('\n========================================');
    console.log('🤖 GENERATE STRATEGY - API CALL');
    console.log('========================================');
    
    const messages = [
      {
        role: "system",
          content: `You are an expert conversation strategist helping a business professional who tends to speak quickly and jump to conclusions before establishing foundational understanding.

Your task is to break down a conversation goal into AS MANY STEPS AS NEEDED to ensure the audience understands each concept before moving forward. This could be 2 steps for simple topics, or 6-8+ steps for complex topics.

STRUCTURE YOUR RESPONSE:
Return JSON in this exact format:
{
  "steps": [
    {
      "title": "Step 1 Title",
      "description": "Main point to communicate.\n\nSupporting detail or example.\n\nWhy this matters or next action."
    },
    {
      "title": "Step 2 Title",
      "description": "Main point to communicate.\n\nSupporting detail or example.\n\nWhy this matters or next action."
    }
  ]
}

IMPORTANT: Format each description with line breaks (\n\n) between key points or paragraphs. This makes it easier to read.

CRITICAL PRINCIPLES:
1. Establish foundational concepts BEFORE advancing to complex ideas
2. Each step should build logical understanding - don't skip ahead
3. If the topic is complex, use MORE steps to break it down properly
4. If the topic is simple, use FEWER steps - don't over-complicate
5. Build trust and rapport first, then establish context, then dive deeper
6. Address potential confusion or gaps in understanding at each stage

Use however many steps are needed to lead someone from where they are to complete understanding. Quality of understanding > arbitrary step count.`
        },
        {
          role: "user",
          content: `Context about the business and situation:
${contextString}

Current Situation:
${situation || 'Not specified'}

Goal:
${goal || 'Not specified'}

${clarifying_qa && clarifying_qa.length > 0 ? `
Clarifying Information:
${clarifying_qa.map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')}
` : ''}

Generate strategic conversation steps that create a clear roadmap from where they are now to achieving the goal. Use as many steps as needed to ensure proper foundational understanding before advancing concepts.`
        }
    ];
    
    console.log('\n📤 REQUEST TO OPENAI:');
    console.log(JSON.stringify(messages, null, 2));
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const aiResponse = completion.choices[0].message.content;
    
    console.log('\n📥 RESPONSE FROM OPENAI:');
    console.log(aiResponse);
    console.log('========================================\n');
    let steps = [];
    
    try {
      const parsed = JSON.parse(aiResponse || '{}');
      steps = parsed.steps || [];
      
      console.log('AI Response:', aiResponse);
      console.log('Parsed steps:', steps);
      
      if (!steps || steps.length === 0) {
        console.error('No steps generated by AI');
        return NextResponse.json({ 
          error: 'AI did not generate any steps. Please try again with more context.' 
        }, { status: 500 });
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
      console.error('Raw response:', aiResponse);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Save strategy to database
    const strategyData: any = {
      user_id: user.id,
      situation,
      goal,
      context_sources,
      clarifying_qa: clarifying_qa || []
    };

    // Set either business_id or meeting_id
    if (business_id) {
      strategyData.business_id = business_id;
    } else if (meeting_id) {
      strategyData.meeting_id = meeting_id;
      if (meeting_type) {
        strategyData.meeting_type = meeting_type;
      }
      if (attendee_ids) {
        strategyData.attendee_ids = attendee_ids;
      }
    }

    const { data: strategy, error: strategyError } = await supabase
      .from('meeting_conversation_strategies_active')
      .insert(strategyData)
      .select()
      .single();

    if (strategyError) {
      console.error('Error saving strategy:', strategyError);
      console.error('Strategy data attempted:', strategyData);
      return NextResponse.json({ 
        error: 'Failed to save strategy', 
        details: strategyError.message || strategyError,
        data: strategyData 
      }, { status: 500 });
    }

    // Save steps to database
    const stepsToInsert = steps.map((step: any, index: number) => ({
      strategy_id: strategy.id,
      step_order: index + 1,
      title: step.title || `Step ${index + 1}`,
      description: step.description || '',
      ai_suggestion: step.description || ''
    }));

    console.log('Inserting steps:', stepsToInsert);

    const { data: savedSteps, error: stepsError } = await supabase
      .from('meeting_conversation_steps')
      .insert(stepsToInsert)
      .select();

    if (stepsError) {
      console.error('Error saving steps:', stepsError);
      return NextResponse.json({ error: 'Failed to save steps', details: stepsError }, { status: 500 });
    }

    console.log('Saved steps:', savedSteps);

    return NextResponse.json({
      success: true,
      strategy,
      steps: savedSteps
    });

  } catch (error: any) {
    console.error('Error generating strategy:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate strategy' },
      { status: 500 }
    );
  }
}

function buildContextString(contextData: any, sources: string[]): string {
  let context = '';

  if (contextData.meeting) {
    context += `Meeting: ${contextData.meeting.title}\n`;
    context += `Date: ${contextData.meeting.meeting_date || 'Not scheduled'}\n`;
    context += `Goal: ${contextData.meeting.goal || 'N/A'}\n`;
    
    if (contextData.meeting.key_ideas && contextData.meeting.key_ideas.length > 0) {
      context += `\nKey Ideas to Communicate:\n`;
      contextData.meeting.key_ideas.forEach((idea: any, index: number) => {
        context += `${index + 1}. ${idea.text}\n`;
      });
    }
    
    if (contextData.meeting.agenda_items && contextData.meeting.agenda_items.length > 0) {
      context += `\nAgenda:\n`;
      contextData.meeting.agenda_items.forEach((item: any, index: number) => {
        context += `${index + 1}. ${item.title}\n`;
      });
    }
    
    context += '\n';
  }

  if (contextData.business) {
    context += `Business: ${contextData.business.name}\n`;
    context += `Industry: ${contextData.business.industry || 'N/A'}\n`;
    context += `Stage: ${contextData.business.stage || 'N/A'}\n\n`;
  }

  if (sources.includes('attendees') && contextData.attendees.length > 0) {
    context += 'Meeting Attendees:\n';
    contextData.attendees.forEach((person: any) => {
      context += `- ${person.name}`;
      if (person.title) context += ` (${person.title})`;
      if (person.company) context += ` at ${person.company}`;
      context += '\n';
      
      if (person.linkedin_keywords && person.linkedin_keywords.length > 0) {
        context += `  Keywords: ${person.linkedin_keywords.join(', ')}\n`;
      }
      
      if (person.linkedin_text) {
        const summary = person.linkedin_text.substring(0, 300);
        context += `  Profile: ${summary}...\n`;
      }
    });
    context += '\n';
  }

  if (sources.includes('meetings') && contextData.meetings.length > 0) {
    context += 'Recent Meetings:\n';
    contextData.meetings.slice(0, 3).forEach((meeting: any) => {
      context += `- ${meeting.title} (${meeting.date})\n`;
      if (meeting.meeting_notes && meeting.meeting_notes.length > 0) {
        meeting.meeting_notes.forEach((note: any) => {
          context += `  Notes: ${note.content?.substring(0, 200)}...\n`;
        });
      }
    });
    context += '\n';
  }

  if (sources.includes('notes') && contextData.notes.length > 0) {
    context += 'Business Notes:\n';
    contextData.notes.slice(0, 5).forEach((note: any) => {
      context += `- ${note.content.substring(0, 150)}...\n`;
    });
    context += '\n';
  }

  if (contextData.people.length > 0) {
    context += 'Key People:\n';
    contextData.people.slice(0, 5).forEach((person: any) => {
      context += `- ${person.name}`;
      if (person.role) context += ` (${person.role})`;
      if (person.company) context += ` at ${person.company}`;
      context += '\n';
    });
  }

  return context || 'No additional context available.';
}
