export const runtime = "nodejs" // writes close to DB
export const preferredRegion = ["iad1"] // match your Supabase region
export const dynamic = "force-dynamic"
export const revalidate = 0

import { revalidateTag } from "next/cache"
import { createSupabaseServer } from "@/lib/supabase/server"
import { regionHeader } from "@/lib/route-config"

export async function POST(req: Request) {
  const supabase = await createSupabaseServer()

  const payload = await req.json()
  const { data, error } = await supabase.from("items").insert(payload).select("*").single()
  
  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Invalidate cached list(s)
  revalidateTag("items:list")

  return Response.json({ item: data }, { status: 201, headers: regionHeader() })
}

