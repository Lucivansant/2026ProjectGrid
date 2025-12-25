// Serves HTTP requests via Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Import Supabase Client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// --- CONFIGURATION ---
// Ensure you have these set in your Edge Function secrets or .env
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

// --- HELPERS ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Parse Kiwify Webhook Payload
    const payload = await req.json()
    console.log("Webhook Received:", payload)

    // Helper: Initialize Supabase Admin
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. Extract Event Info
    const eventStatus = payload.order_status || payload.status // Kiwify sometimes varies
    const customer = payload.Customer || {}
    const email = customer.email
    const cpf = customer.cpf
    const mobile = customer.mobile
    
    // Log the event to DB (Auditing)
    await supabaseAdmin.from('sales_logs').insert({
      customer_email: email,
      customer_name: customer.full_name,
      cpf: cpf,
      status: eventStatus,
      message: `Event received: ${eventStatus}`,
      payload: payload
    })

    if (!email) {
      throw new Error("No email provided in payload")
    }

    // 3. Routing Logic based on Event
    if (eventStatus === 'paid' || eventStatus === 'approved') {
      return await handleUpgrade(supabaseAdmin, email, cpf, customer)
    } else if (['refunded', 'chargedback', 'canceled', 'subscription_canceled', 'subscription_late'].includes(eventStatus)) {
      return await handleDowngrade(supabaseAdmin, email, cpf, eventStatus)
    } else {
      return new Response(JSON.stringify({ message: "Event ignored", status: eventStatus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

  } catch (error) {
    console.error("Error processing webhook:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

// --- ACTIONS ---

async function handleUpgrade(supabase, email, cpf, customerData) {
  // A. Check if user exists
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  const existingUser = users.find(u => u.email === email)

  if (existingUser) {
    // B. Security Check: CPF Matching
    // Fetch user's current metadata to see if they already have a CPF set
    // NOTE: This assumes you store CPF in user_metadata. If it's in a 'profiles' table, query that instead.
    const registeredCpf = existingUser.user_metadata?.cpf
    
    if (registeredCpf) {
      // Clean CPFs for comparison (remove punctuation)
      const cleanRegistered = registeredCpf.replace(/\D/g, '')
      const cleanPayload = (cpf || '').replace(/\D/g, '')

      if (cleanRegistered !== cleanPayload) {
        // SECURITY ALERT: CPFs do not match
        console.error(`Security Block: User ${email} attempted upgrade with different CPF.`)
        
        await supabase.from('sales_logs').insert({
          customer_email: email,
          status: 'blocked',
          message: `CPF Mismatch: registered ending in ${cleanRegistered.slice(-4)} vs payload ending in ${cleanPayload.slice(-4)}`
        })
        
        return new Response(JSON.stringify({ error: "Security Block: CPF verification failed" }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
           status: 403 
        })
      }
    }

    // C. Upgrade User
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { user_metadata: { plan: 'pro', cpf: cpf } } // Store CPF if not already set, and upgrade plan
    )
    
    if (updateError) throw updateError

    return new Response(JSON.stringify({ message: "User upgraded to PRO", userId: existingUser.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
    })

  } else {
    // D. Create New User (Invite Flow)
    const { data: newUser, error: createError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: { 
          plan: 'pro',
          cpf: cpf,
          full_name: customerData.full_name,
          mobile: customerData.mobile
        }
      }
    )

    if (createError) throw createError

    return new Response(JSON.stringify({ message: "New user created and invited", userId: newUser.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
    })
  }
}

async function handleDowngrade(supabase, email, cpf, eventStatus) {
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existingUser = users.find(u => u.email === email)

  if (!existingUser) {
    return new Response(JSON.stringify({ message: "User to downgrade not found", email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
    })
  }

  // B. Security Check: CPF Matching (Same as Upgrade)
  const registeredCpf = existingUser.user_metadata?.cpf
  
  if (registeredCpf) {
    const cleanRegistered = registeredCpf.replace(/\D/g, '')
    const cleanPayload = (cpf || '').replace(/\D/g, '')

    if (cleanRegistered !== cleanPayload) {
      console.error(`Security Block (Downgrade): User ${email} attempted downgrade with different CPF.`)
      
      await supabase.from('sales_logs').insert({
        customer_email: email,
        status: 'blocked',
        message: `CPF Mismatch (Downgrade): registered ending in ${cleanRegistered.slice(-4)} vs payload ending in ${cleanPayload.slice(-4)}`
      })
      
      return new Response(JSON.stringify({ error: "Security Block: CPF verification failed for downgrade" }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 403 
      })
    }
  }

  // Set plan back to free
  const { error } = await supabase.auth.admin.updateUserById(
    existingUser.id,
    { user_metadata: { plan: 'free' } }
  )

  if (error) throw error

  console.log(`User ${email} downgraded to FREE due to ${eventStatus}`)

  return new Response(JSON.stringify({ message: `User downgraded to FREE`, reason: eventStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
  })
}
