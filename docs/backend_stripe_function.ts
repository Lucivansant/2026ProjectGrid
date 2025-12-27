
// Serves HTTP requests via Deno Native (No std lib to avoid conflicts)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

console.log("Stripe Webhook Loaded (Async Version)")

// --- CONFIGURATION ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || ""
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate Signature
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      console.error("No Stripe signature found")
      return new Response("No signature", { status: 400 })
    }

    const body = await req.text() // Read raw body
    let event

    try {
      // CRITICAL FIX: Use constructEventAsync for Deno/Edge Runtime
      // expected the crypto provider to be sync, but in Deno it is async.
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return new Response(`Signature error: ${err.message}`, { status: 400 })
    }

    // 2. Initialize Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    console.log(`Processing Event: ${event.type}`)

    // 3. Handle Events
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object
        if (session.payment_status === 'paid') {
            await handleUpgrade(supabaseAdmin, session)
        }
        break

      case 'customer.subscription.deleted':
        const subscription = event.data.object
        await handleDowngrade(supabaseAdmin, subscription)
        break

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error("Server error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

// --- ACTIONS ---

async function handleUpgrade(supabase, session) {
  const email = session.customer_details?.email || session.customer_email
  const customerId = session.customer // Stripe Customer ID
  
  if (!email) {
      console.error("No email in session")
      return
  }

  // Check if user exists (by email)
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existingUser = users.find(u => u.email === email)

  // LOGIC:
  // If user exists -> Update metadata to 'pro'
  // If new user -> Invite by email with 'pro' metadata

  if (existingUser) {
    console.log(`Upgrading existing user: ${email}`)
    
    // Attempt to update
    const { error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { user_metadata: { plan: 'pro', stripe_customer_id: customerId } }
    )
    
    if (error) console.error("Error updating user:", error)

    await supabase.from('sales_logs').insert({
        customer_email: email,
        customer_name: session.customer_details?.name || 'User',
        status: 'upgraded',
        message: `Stripe Upgrade: ${session.id}`,
        payload: session
    })

  } else {
    console.log(`Inviting new user: ${email}`)
    
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: { 
          plan: 'pro',
          stripe_customer_id: customerId,
          full_name: session.customer_details?.name,
        }
      }
    )

    if (error) console.error("Error invoking user:", error)

    await supabase.from('sales_logs').insert({
        customer_email: email,
        customer_name: session.customer_details?.name,
        status: 'invited',
        message: `Stripe Invite: ${session.id}`,
        payload: session
    })
  }
}

async function handleDowngrade(supabase, subscription) {
  const customerId = subscription.customer
  
  // Find user by Stripe Customer ID
  // Note: List users is limited to 50 by default. In prod, use search or dedicated table.
  const { data: { users } } = await supabase.auth.admin.listUsers()
  
  // Try to find matching stripe_customer_id
  const user = users.find(u => u.user_metadata?.stripe_customer_id === customerId)

  if (user) {
      console.log(`Downgrading user: ${user.email}`)
      await supabase.auth.admin.updateUserById(
          user.id,
          { user_metadata: { plan: 'free' } } // Keep customer_id for history
      )

      await supabase.from('sales_logs').insert({
          customer_email: user.email,
          status: 'canceled',
          message: `Stripe Downgrade`,
          payload: subscription
      })
  } else {
      console.log(`No user found for downgrade: ${customerId}`)
  }
}
