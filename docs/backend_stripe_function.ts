// Serves HTTP requests via Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Import Supabase Client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// Import Stripe
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

// --- CONFIGURATION ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || ""
// Important: This secret comes from the Stripe Dashboard > Webhooks section for this endpoint
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      throw new Error("No Stripe signature found")
    }

    const body = await req.text() // Read text body for verification
    let event

    // 1. Verify Webhook Signature (Stripe functionality)
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return new Response(JSON.stringify({ error: `Signature error: ${err.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Initialize Supabase
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Log intent (optional)
    console.log(`Processing Stripe Event: ${event.type} [${event.id}]`)

    // 2. Routing Logic
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object
        // Only process paid sessions
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
    console.error("General error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

// --- ACTIONS ---

async function handleUpgrade(supabase, session) {
  const email = session.customer_details?.email || session.customer_email
  const customerId = session.customer // Stripe Customer ID (cus_xxx)
  
  if (!email) {
      console.error("No email found in session", session.id)
      return
  }

  // A. Check if user exists
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  const existingUser = users.find(u => u.email === email)

  if (existingUser) {
    console.log(`Upgrading existing user: ${email}`)
    
    // Update User Metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { user_metadata: { plan: 'pro', stripe_customer_id: customerId } }
    )
    
    if (updateError) console.error("Error upgrading user:", updateError)

    // Audit Log
    await supabase.from('sales_logs').insert({
        customer_email: email,
        customer_name: session.customer_details?.name || 'Stripe User',
        status: 'success',
        message: `Stripe Upgrade: ${session.id}`,
        payload: session
    })

  } else {
    console.log(`Creating new user from Stripe: ${email}`)
    
    // B. Create New User
    const { data: newUser, error: createError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: { 
          plan: 'pro',
          stripe_customer_id: customerId,
          full_name: session.customer_details?.name,
        }
      }
    )

    if (createError) console.error("Error creating user:", createError)

    // Audit Log
    await supabase.from('sales_logs').insert({
        customer_email: email,
        customer_name: session.customer_details?.name,
        status: 'success',
        message: `Stripe New User: ${session.id}`,
        payload: session
    })
  }
}

async function handleDowngrade(supabase, subscription) {
  const customerId = subscription.customer
  
  // We need to find the user by their Stripe Customer ID, or email if we can fetch it
  // Since listUsers doesn't search by metadata easily, we might need to search by email if available, 
  // OR rely on our stored stripe_customer_id if we had a way to query it efficiently.
  // Best approach for Edge Logic without heavy DB calls:
  
  // Try to find user with matching stripe_customer_id in metadata
  // Note: listUsers() returns a limited list. For production, Supabase provides 'getUserByCookie' etc, 
  // but for admin tasks, we might need to rely on the email if the subscription object has it?
  // Usually subscription event does NOT have email directly on root, need to fetch customer.
  
  // BUT: We can use the 'user_metadata' search via SQL or simply iterate if the user base is small.
  // For scalable solution: Create a table 'subscriptions' linking stripe_id -> user_id.
  // For this context (MVP): we will assume we can match via listUsers or fetch customer email from Stripe.
  
  // Let's assume we rely on the implementation we did for Kiwify: verify by Email if possible?
  // Stripe 'customer.subscription.deleted' might NOT have email directly.
  // So standard practice: trust the 'customer' ID.
  
  const { data: { users } } = await supabase.auth.admin.listUsers()
  
  // Find user where metadata.stripe_customer_id === customerId
  const userToDowngrade = users.find(u => u.user_metadata?.stripe_customer_id === customerId)

  if (userToDowngrade) {
      console.log(`Downgrading user ${userToDowngrade.email} due to subscription end`)
      
      const { error } = await supabase.auth.admin.updateUserById(
          userToDowngrade.id,
          { user_metadata: { plan: 'free', stripe_customer_id: null } } // Clear ID or keep it? Keeping it is better for history, but 'free' resets status.
      )

      await supabase.from('sales_logs').insert({
          customer_email: userToDowngrade.email,
          status: 'canceled',
          message: `Stripe Downgrade: ${subscription.id}`,
          payload: subscription
      })

  } else {
      console.error(`Could not find user with Stripe ID: ${customerId}`)
      // Fallback: This logs an orphan event
      await supabase.from('sales_logs').insert({
          customer_email: 'unknown@stripe.event',
          status: 'error',
          message: `Orphan Downgrade: ${customerId}`,
          payload: subscription
      })
  }
}
