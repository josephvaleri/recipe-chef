export const runtime = "nodejs"
export const preferredRegion = ["iad1"] // match Supabase region
export const dynamic = "force-dynamic"
export const revalidate = 0

import { revalidateTag } from "next/cache"
import { createSupabaseServer } from "@/lib/supabase/server"
import { regionHeader } from "@/lib/route-config"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const payload = await req.json()
  const { data, error } = await supabase
    .from("items")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Invalidate cached list and detail
  revalidateTag("items:list")
  revalidateTag(`items:detail:${id}`)

  return Response.json({ item: data }, { headers: regionHeader() })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Invalidate cached list and detail
  revalidateTag("items:list")
  revalidateTag(`items:detail:${id}`)

  return Response.json({ success: true }, { headers: regionHeader() })
}

