import { NextResponse } from "next/server";
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

    const { id: followUpId } = await params;

    // Delete the follow-up from Supabase
    const { error: deleteError } = await supabase
      .from("follow_ups")
      .delete()
      .eq("id", followUpId)
      .eq("user_id", user.id); // Ensure user owns this follow-up

    if (deleteError) {
      console.error("❌ Error deleting follow-up:", deleteError);
      throw deleteError;
    }

    console.log("✅ Follow-up deleted from Supabase:", followUpId);

    return NextResponse.json({ 
      success: true,
      message: "Follow-up deleted successfully"
    });

  } catch (error: any) {
    console.error("Error deleting follow-up:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete follow-up" },
      { status: 500 }
    );
  }
}
