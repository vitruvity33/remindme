import { NextResponse } from "next/server";
import { requireBearerUser } from "@/lib/auth/requireBearerUser";

export async function PATCH(
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
    const body = await request.json();
    const { status, priority, urgency, due_date } = body;

    // Prepare update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (urgency) updateData.urgency = urgency;
    if (due_date !== undefined) updateData.due_date = due_date;

    // Update the follow-up
    const { error: updateError } = await supabase
      .from("follow_ups")
      .update(updateData)
      .eq("id", followUpId)
      .eq("user_id", user.id); // Ensure user owns this follow-up

    if (updateError) {
      console.error("❌ Error updating follow-up:", updateError);
      throw updateError;
    }

    console.log("✅ Follow-up updated:", followUpId, updateData);

    return NextResponse.json({ 
      success: true,
      message: "Follow-up updated successfully"
    });

  } catch (error: any) {
    console.error("Error updating follow-up:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update follow-up" },
      { status: 500 }
    );
  }
}
