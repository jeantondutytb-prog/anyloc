import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Connecte-toi pour continuer." }, { status: 401 });
  }

  const { error } = await supabase
    .from("device_tokens")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[device] Delete failed:", error);
    return Response.json(
      { error: "Impossible de supprimer cet appareil." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
