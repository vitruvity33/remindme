import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { requireBearerUser } from "@/lib/auth/requireBearerUser";
import { guardRequest } from "@/lib/api/guard";

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

    const guarded = await guardRequest({
      request,
      userId: user.id,
      module: "delete-memory",
    });
    if (guarded instanceof NextResponse) {
      return guarded;
    }

    const { id: memoryId } = await params;

    // Delete memory_people links first
    await supabase
      .from("memory_people")
      .delete()
      .eq("memory_id", memoryId);

    // Delete the memory from Supabase
    const { error: deleteError } = await supabase
      .from("memories")
      .delete()
      .eq("id", memoryId)
      .eq("user_id", user.id); // Ensure user owns this memory

    if (deleteError) {
      console.error("❌ Error deleting memory:", deleteError);
      throw deleteError;
    }

    console.log("✅ Memory deleted from Supabase:", memoryId);

    // Also delete from Pinecone
    if (process.env.PINECONE_API_KEY) {
      try {
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME || "remind-me");
        
        await index.deleteOne(memoryId);
        console.log("✅ Memory deleted from Pinecone:", memoryId);
      } catch (pineconeError) {
        console.error("⚠️ Pinecone deletion error (non-fatal):", pineconeError);
        // Don't fail the whole operation if Pinecone fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Memory deleted successfully"
    });

  } catch (error: any) {
    console.error("Error deleting memory:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete memory" },
      { status: 500 }
    );
  }
}
