import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { guardRequest } from '@/lib/api/guard';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QuestionsRequest {
  business_id?: string;
  meeting_id?: string;
  situation?: string;
  goal?: string;
  context_sources: string[];
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

    const guarded = await guardRequest<QuestionsRequest>({
      request,
      userId: user.id,
      module: 'conversations-generate-questions',
    });
    if (guarded instanceof NextResponse) {
      return guarded;
    }
    const { business_id, meeting_id, situation, goal, context_sources } = guarded.body;

    if (!business_id && !meeting_id) {
      return NextResponse.json({ error: 'Either business_id or meeting_id is required' }, { status: 400 });
    }

    // Gather context to assess what's available
    let business = null;
    
    if (business_id) {
      const { data } = await supabase
        .from('businesses')
        .select('name, industry, stage')
        .eq('id', business_id)
        .single();
      business = data;
    } else if (meeting_id) {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('*, businesses(name, industry, stage)')
        .eq('id', meeting_id)
        .single();
      
      if (meeting?.businesses) {
        business = meeting.businesses;
      }
    }

    // Get counts of available context
    let contextAvailable: any = {
      meetings: 0,
      notes: 0,
      people: 0
    };

    if (context_sources.includes('meetings')) {
      const { count } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business_id);
      contextAvailable.meetings = count || 0;
    }

    if (context_sources.includes('notes')) {
      const { count } = await supabase
        .from('business_notes')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business_id);
      contextAvailable.notes = count || 0;
    }

    if (context_sources.includes('linkedin') || context_sources.includes('conversations') || context_sources.includes('memories')) {
      const { count } = await supabase
        .from('people')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business_id);
      contextAvailable.people = count || 0;
    }

    // Call OpenAI to generate clarifying questions (or skip if we have enough)
    console.log('\n========================================');
    console.log('🤖 GENERATE QUESTIONS - API CALL');
    console.log('========================================');
    
    const messages = [
      {
        role: "system",
          content: `You are an expert conversation strategist. Use this framework to assess what you need to create an effective conversation strategy.

REQUIRED FRAMEWORK FOR EFFECTIVE STRATEGY:
1. WHO: Who are the key people in this conversation? (names, roles, decision-making power)
2. RELATIONSHIP: What's the current relationship state and history?
3. CONSTRAINTS: Are there timing, budget, political, or other constraints?
4. CONTEXT: What's been tried before? What worked/didn't work?
5. SUCCESS: What does success look like? How will we measure it?
6. RISKS: What could go wrong? What are the sensitive areas?

ASSESSMENT PROCESS:
Step 1: Review available data:
- ${contextAvailable.meetings} meeting records
- ${contextAvailable.notes} business notes  
- ${contextAvailable.people} people profiles
- User's situation description
- User's goal description

Step 2: Check framework - what's MISSING or UNCLEAR?

Step 3: Decide:
- If you can answer 5+ framework items confidently: { "questions": [] }
- If you DO need to ask questions, ask ONLY 2-3 of the MOST CRITICAL ones (never more than 3): 

IMPORTANT: Be smart about what you already know from the situation/goal. Don't ask redundant questions.`
        },
        {
          role: "user",
          content: `Business: ${business?.name || 'Unknown'} (${business?.industry || 'N/A'})

Situation:
${situation || 'Not specified'}

Goal:
${goal || 'Not specified'}

Available Context Data:
- ${contextAvailable.meetings} meetings
- ${contextAvailable.notes} notes
- ${contextAvailable.people} people

Using the framework, assess what you have vs. what you need. Return JSON with questions array (empty if you have enough, or 2-3 questions if critical info is missing).`
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
    let questions = [];
    
    try {
      const parsed = JSON.parse(aiResponse || '{}');
      questions = parsed.questions || [];
    } catch (e) {
      console.error('Error parsing AI response:', e);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      questions
    });

  } catch (error: any) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
