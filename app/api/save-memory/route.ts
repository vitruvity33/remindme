import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { tagConversationOrMemory } from "@/lib/ai-tagger";
import { requireBearerUser } from "@/lib/auth/requireBearerUser";
import { guardRequest } from "@/lib/api/guard";

export async function POST(request: Request) {
  try {
    const auth = await requireBearerUser(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { user, supabase } = auth;
    const userId = user.id;

    const guarded = await guardRequest<{
      rawText?: string;
      structuredData: any;
      personId?: string;
    }>({ request, userId, module: "save-memory" });
    if (guarded instanceof NextResponse) {
      return guarded;
    }
    const { structuredData, personId } = guarded.body;
    console.log("📝 Received personId for update:", personId);

    // 1. Create or get event if mentioned
    let eventId = null;
    if (structuredData.event && structuredData.event.name && structuredData.event.name.trim()) {
      const { data: existingEvent } = await supabase
        .from("events")
        .select("id")
        .eq("user_id", userId)
        .eq("name", structuredData.event.name.trim())
        .single();

      if (existingEvent) {
        eventId = existingEvent.id;
      } else {
        const { data: newEvent, error: eventError } = await supabase
          .from("events")
          .insert({
            user_id: userId,
            name: structuredData.event.name.trim(),
            date: structuredData.event.date || null,
            location: structuredData.event.location || null,
          })
          .select()
          .single();

        if (eventError) throw eventError;
        eventId = newEvent.id;
      }
    }

    // Filter out empty entries
    const validConversations = (structuredData.additional_notes || []).filter((note: any) => {
      const text = typeof note === 'string' ? note : note.text;
      return text && text.trim();
    });
    
    const validMemories = (structuredData.memories || []).filter((mem: any) => {
      const text = typeof mem === 'string' ? mem : mem.text;
      return text && text.trim();
    });
    
    console.log("📋 Conversations to save:", validConversations.length, validConversations);
    console.log("🎭 Memories to save:", validMemories.length, validMemories);
    
    // Note: We only create NEW memories/conversations. Existing ones are preserved.
    // The frontend filters out existing items before sending.

    // 2. Create or update people
    const peopleIds: string[] = [];
    if (structuredData.people) {
      for (const personData of structuredData.people) {
        let person;
        
        // If personId is provided, UPDATE existing person
        if (personId) {
          console.log("🔄 Updating existing person:", personId);
          const { data: updatedPerson, error: updateError } = await supabase
            .from("people")
            .update({
              name: personData.name,
              company: personData.company,
              role: personData.role,
              location: personData.location || null,
              linkedin_url: personData.linkedin_url || null,
              company_linkedin_url: personData.company_linkedin_url || null,
              inspiration_level: personData.inspiration_level || null,
              relationship_potential: personData.relationship_potential || null,
              relationship_notes: personData.relationship_notes || null,
              relationship_circle: personData.relationship_circle || null,
              interaction_details: personData.interaction_details || [],
              interests: personData.interests || [],
            })
            .eq("id", personId)
            .eq("user_id", userId)
            .select()
            .single();

          if (updateError) {
            console.error("❌ Person update error:", updateError);
            throw updateError;
          }
          person = updatedPerson;
          console.log("✅ Person updated:", person.id);
        } else {
          // Insert new person
          console.log("➕ Creating new person");
          const { data: newPerson, error: personError } = await supabase
            .from("people")
            .insert({
              user_id: userId,
              name: personData.name,
              company: personData.company,
              role: personData.role,
              location: personData.location || null,
              linkedin_url: personData.linkedin_url || null,
              company_linkedin_url: personData.company_linkedin_url || null,
              inspiration_level: personData.inspiration_level || null,
              relationship_potential: personData.relationship_potential || null,
              relationship_notes: personData.relationship_notes || null,
              relationship_circle: personData.relationship_circle || null,
              interaction_details: personData.interaction_details || [],
              interests: personData.interests || [],
            })
            .select()
            .single();

          if (personError) {
            console.error("❌ Person insert error:", personError);
            throw personError;
          }
          person = newPerson;
          console.log("✅ Person created:", person.id, "-", personData.name);
        }
        
        peopleIds.push(person.id);

        // If we have background data (from parsed LinkedIn), save to people_background
        if (personData.about || personData.experience || personData.education || personData.follower_count || 
            personData.skills || personData.technologies || personData.interests) {
          const { error: backgroundError } = await supabase
            .from("people_background")
            .upsert({
              person_id: person.id,
              user_id: userId,
              about: personData.about || null,
              experience: personData.experience || null,
              education: personData.education || null,
              follower_count: personData.follower_count || null,
              skills: personData.skills || [],
              technologies: personData.technologies || [],
              interests: personData.interests || [],
              business_needs: personData.business_needs || null,
              opportunities: personData.opportunities || null,
            }, {
              onConflict: 'person_id'
            });

          if (backgroundError) {
            console.error("Error saving people_background:", backgroundError);
            // Don't throw - background data is optional
          } else {
            console.log("✅ Background data saved for person:", person.id);
          }
        }
      }
    }

    // 3. Create conversations with AI tagging (after people exist)
    console.log("💬 Starting conversation creation. Valid conversations:", validConversations.length, "People IDs:", peopleIds.length);
    if (validConversations.length > 0 && peopleIds.length > 0) {
      const personName = structuredData.people?.[0]?.name;
      
      for (const note of validConversations) {
        const text = typeof note === 'string' ? note : note.text;
        const dateStr = note.date || new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        
        // AI tag the conversation
        console.log("🤖 AI tagging conversation...");
        const tags = await tagConversationOrMemory(text, personName);
        
        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            person_id: peopleIds[0], // Direct link to person
            text: text.trim(),
            date: dateStr,
            keywords: tags.keywords,
            entities: tags.entities,
            industries: tags.industries,
          })
          .select()
          .single();

        if (convError) {
          console.error("❌ Conversation insert error:", convError);
          throw convError;
        }
        console.log("✅ Conversation created:", conversation.id, "| Keywords:", tags.keywords);
      }
    }

    // 4. Create memories with AI tagging (after people exist)
    const memoryIds: string[] = [];
    if (validMemories.length > 0) {
      const personName = structuredData.people?.[0]?.name;
      
      for (const mem of validMemories) {
        const text = typeof mem === 'string' ? mem : mem.text;
        const dateStr = mem.date || new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        
        // AI tag the memory
        console.log("🤖 AI tagging memory...");
        const tags = await tagConversationOrMemory(text, personName);
        
        const { data: memory, error: memError } = await supabase
          .from("memories")
          .insert({
            user_id: userId,
            text: text.trim(),
            date: dateStr,
            event_id: eventId,
            keywords: tags.keywords,
            entities: tags.entities,
            industries: tags.industries,
          })
          .select()
          .single();

        if (memError) {
          console.error("❌ Memory insert error:", memError);
          throw memError;
        }
        memoryIds.push(memory.id);
        console.log("✅ Memory created:", memory.id, "| Keywords:", tags.keywords);
      }
    }

    // 5. Link all memories to all people
    if (peopleIds.length > 0 && memoryIds.length > 0) {
      const memoryPeopleLinks = [];
      for (const memoryId of memoryIds) {
        for (const personId of peopleIds) {
          memoryPeopleLinks.push({
            memory_id: memoryId,
            person_id: personId,
          });
        }
      }

      const { error: linkError } = await supabase
        .from("memory_people")
        .insert(memoryPeopleLinks);

      if (linkError) {
        console.error("❌ Memory-People link error:", linkError);
        throw linkError;
      }
      console.log(`✅ Linked ${memoryIds.length} memories to ${peopleIds.length} people`);
    }

    // 5. Handle follow-ups
    if (structuredData.follow_ups && peopleIds.length > 0) {
      const targetPersonId = peopleIds[0];
      
      // If updating existing person, delete old follow-ups first to avoid duplicates
      if (personId) {
        const { error: deleteError } = await supabase
          .from("follow_ups")
          .delete()
          .eq("person_id", personId)
          .eq("user_id", userId);
        
        if (deleteError) {
          console.error("❌ Error deleting old follow-ups:", deleteError);
        } else {
          console.log("🗑️ Deleted old follow-ups for person");
        }
      }
      
      // Create follow-ups (strip out isExisting and id fields)
      const followUps = structuredData.follow_ups.map((fu: any) => ({
        user_id: userId,
        person_id: targetPersonId,
        memory_id: memoryIds[0] || null, // Link to first memory if available
        description: fu.description,
        priority: fu.priority || "medium",
        urgency: fu.urgency || "not-urgent-not-important",
        status: fu.status || "not-started",
        date: fu.date || new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }),
        due_date: fu.due_date || null,
        // Note: Don't include 'id' or 'isExisting' - those are UI-only fields
      }));

      const { error: followUpError } = await supabase
        .from("follow_ups")
        .insert(followUps);

      if (followUpError) {
        console.error("❌ Follow-ups insert error:", followUpError);
        throw followUpError;
      }
      console.log("✅ Created", followUps.length, "follow-ups");
    }

    // 6. Store conversations and memories in Pinecone with AI-tagged metadata
    if (process.env.PINECONE_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME || "remind-me");

        const personName = structuredData.people?.[0]?.name || "";
        const personCompany = structuredData.people?.[0]?.company || "";
        const personId = peopleIds[0] || null;

        // 6a. Save conversations to Pinecone
        if (validConversations.length > 0 && personId) {
          const { data: savedConversations } = await supabase
            .from("conversations")
            .select("id, text, keywords, entities, industries")
            .eq("person_id", personId)
            .in("text", validConversations.map((c: any) => (typeof c === 'string' ? c : c.text).trim()));

          for (const conv of savedConversations || []) {
            if (!conv.text?.trim()) continue;

            const embeddingResponse = await openai.embeddings.create({
              model: "text-embedding-3-large",
              input: conv.text,
              dimensions: 1024,
            });

            await index.upsert([{
              id: conv.id,
              values: embeddingResponse.data[0].embedding,
              metadata: {
                type: "conversation",
                user_id: userId,
                ...(personId && { person_id: personId }),
                person_name: personName,
                company: personCompany,
                keywords: conv.keywords || [],
                entities: conv.entities || [],
                industries: conv.industries || [],
              },
            }]);

            console.log("✅ Saved conversation to Pinecone:", conv.id, "| Keywords:", conv.keywords);
          }
        }

        // 6b. Save memories to Pinecone
        if (memoryIds.length > 0) {
          const { data: savedMemories } = await supabase
            .from("memories")
            .select("id, text, keywords, entities, industries")
            .in("id", memoryIds);

          for (const mem of savedMemories || []) {
            if (!mem.text?.trim()) continue;

            const embeddingResponse = await openai.embeddings.create({
              model: "text-embedding-3-large",
              input: mem.text,
              dimensions: 1024,
            });

            await index.upsert([{
              id: mem.id,
              values: embeddingResponse.data[0].embedding,
              metadata: {
                type: "memory",
                user_id: userId,
                ...(personId && { person_id: personId }),
                person_name: personName,
                company: personCompany,
                keywords: mem.keywords || [],
                entities: mem.entities || [],
                industries: mem.industries || [],
              },
            }]);

            console.log("✅ Saved memory to Pinecone:", mem.id, "| Keywords:", mem.keywords);
          }
        }
      } catch (pineconeError) {
        console.error("❌ Pinecone error (non-fatal):", pineconeError);
        // Don't throw - Pinecone is optional
      }
    }

    return NextResponse.json({ 
      success: true, 
      memoryIds: memoryIds,
      peopleCount: peopleIds.length,
      followUpsCount: structuredData.follow_ups?.length || 0,
      eventId: eventId,
      message: "Memory saved successfully!"
    });

  } catch (error: any) {
    console.error("Error saving memory:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save memory" },
      { status: 500 }
    );
  }
}
