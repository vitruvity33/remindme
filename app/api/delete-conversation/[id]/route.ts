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

    const { id: conversationId } = await params;

    // Delete the conversation from Supabase
    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", user.id); // Ensure user owns this conversation

    if (deleteError) {
      console.error("❌ Error deleting conversation:", deleteError);
      throw deleteError;
    }

    console.log("✅ Conversation deleted from Supabase:", conversationId);

    // Also delete from Pinecone
    if (process.env.PINECONE_API_KEY) {
      try {
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME || "remind-me");
        
        await index.deleteOne(conversationId);
        console.log("✅ Conversation deleted from Pinecone:", conversationId);
      } catch (pineconeError) {
        console.error("⚠️ Pinecone deletion error (non-fatal):", pineconeError);
        // Don't fail the whole operation if Pinecone fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Conversation deleted successfully"
    });

  } catch (error: any) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
