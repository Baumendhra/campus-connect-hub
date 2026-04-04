import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { batch_no, name, gender, role } = await req.json();

    if (!batch_no || !name || !gender || !role) {
      return new Response(JSON.stringify({ error: "All fields (batch_no, name, gender, role) are required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const email = `${batch_no}@bhub.local`;
    const password = `bhub_${batch_no}_secure`;
    let userId: string;

    // Step 1: Try to create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Step 2: If user already exists, find their ID
      if (authError.message.includes("already") || authError.message.includes("registered") || authError.message.includes("exists")) {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          return new Response(JSON.stringify({ error: "Could not look up existing user." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const existingUser = listData.users.find((u: any) => u.email === email);
        if (!existingUser) {
          return new Response(JSON.stringify({ error: "Auth user reported as existing but could not be found." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        userId = existingUser.id;
      } else {
        return new Response(JSON.stringify({ error: `Failed to create auth user: ${authError.message}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } else {
      userId = authData.user.id;
    }

    // Step 3: Upsert the profile row
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        batch_no,
        name,
        gender,
        role,
        is_deleted: false,
      }, { onConflict: "id" });

    if (profileError) {
      return new Response(JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
