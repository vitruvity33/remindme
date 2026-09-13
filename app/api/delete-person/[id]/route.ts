import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { requireBearerUser } from "@/lib/auth/requireBearerUser";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBearerUser(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { user, supabase } = auth;

    const { id: personId } = await params;
    console.log("🗑️ Delete person API called for:", personId);

    const userId = user.id;
    console.log("✅ Authenticated user:", userId);

    // Delete from Pinecone first (get memories associated with this person)
    console.log("📋 Checking for memory associations...");
    const { data: memoryPeople, error: memoryError } = await supabase
      .from("memory_people")
      .select("memory_id")
      .eq("person_id", personId);

    if (memoryError) {
      console.error("❌ Error fetching memory_people:", memoryError);
    }

    console.log(`Found ${memoryPeople?.length || 0} memory associations`);

    if (memoryPeople && memoryPeople.length > 0) {
      console.log("🧹 Deleting from Pinecone...");
      try {
        const pinecone = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY!,
        });

        const index = pinecone.index("remind-me");

        // Delete vectors for each memory
        for (const mp of memoryPeople) {
          try {
            console.log(`🔍 Attempting to delete vector: ${mp.memory_id}`);
            
            // First, try to fetch the vector to confirm it exists
            const fetchResult = await index.fetch([mp.memory_id]);
            console.log(`📊 Fetch result for ${mp.memory_id}:`, JSON.stringify(fetchResult));
            
            // Delete the vector
            await index.deleteOne(mp.memory_id);
            console.log(`✅ Delete command sent for: ${mp.memory_id}`);
            
            // Verify deletion
            const verifyResult = await index.fetch([mp.memory_id]);
            console.log(`🔍 Verify after delete:`, JSON.stringify(verifyResult));
            
          } catch (error) {
            console.error(`❌ Failed to delete vector for memory ${mp.memory_id}:`, error);
            // Continue even if Pinecone delete fails
          }
        }
      } catch (pineconeError) {
        console.error("❌ Pinecone error:", pineconeError);
        // Continue even if Pinecone fails
      }
    }

    // Delete from Supabase (cascade will handle related records)
    console.log("🗑️ Deleting business profiles...");
    const { error: profileError } = await supabase
      .from("people_business_profiles")
      .delete()
      .eq("person_id", personId);

    if (profileError) {
      console.error("❌ Error deleting business profiles:", profileError);
    }

    console.log("🗑️ Deleting memory associations...");
    const { error: memAssocError } = await supabase
      .from("memory_people")
      .delete()
      .eq("person_id", personId);

    if (memAssocError) {
      console.error("❌ Error deleting memory associations:", memAssocError);
    }

    console.log("🗑️ Deleting follow-ups...");
    const { error: followUpError } = await supabase
      .from("follow_ups")
      .delete()
      .eq("person_id", personId);

    if (followUpError) {
      console.error("❌ Error deleting follow-ups:", followUpError);
    }

    // Delete the person
    console.log("🗑️ Deleting person record...");
    const { error: deleteError } = await supabase
      .from("people")
      .delete()
      .eq("id", personId)
      .eq("user_id", userId); // Ensure user owns this person

    if (deleteError) {
      console.error("❌ Error deleting person from Supabase:", deleteError);
      throw deleteError;
    }

    console.log("✅ Person deleted successfully!");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error in delete-person API:", error);
    console.error("Error details:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to delete person" },
      { status: 500 }
    );
  }
}
