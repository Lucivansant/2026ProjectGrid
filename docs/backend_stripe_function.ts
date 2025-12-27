
// Serves HTTP requests via Deno Native (No std lib to avoid conflicts)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

console.log("Stripe Webhook Loaded (Temp Password Version)")

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
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      return new Response("No signature", { status: 400 })
    }

    const body = await req.text() 
    let event

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error(`Signature error: ${err.message}`)
      return new Response(`Signature error: ${err.message}`, { status: 400 })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    console.log(`Processing Event: ${event.type}`)

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
  const customerId = session.customer 
  
  if (!email) return

  // Check if user exists
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existingUser = users.find(u => u.email === email)

  if (existingUser) {
    console.log(`Upgrading existing user: ${email}`)
    await supabase.auth.admin.updateUserById(
      existingUser.id,
      { user_metadata: { plan: 'pro', stripe_customer_id: customerId } }
    )
    
    // Log
    await supabase.from('sales_logs').insert({
        customer_email: email,
        customer_name: session.customer_details?.name,
        status: 'upgraded',
        message: `Upgrade (No Pwd): ${session.id}`,
        payload: session
    })

  } else {
    // NEW USER -> Generate Temp Password
    console.log(`Creating new user with Temp Password: ${email}`)
    
    // Generate simple 8-char password: "Grid-" + 4 random numbers
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    const tempPassword = `Grid-${randomCode}`

    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm
      user_metadata: { 
          plan: 'pro',
          stripe_customer_id: customerId,
          full_name: session.customer_details?.name,
      }
    })

    if (error) {
      console.error("Error creating user:", error)
      return
    }

    // STORE CREDENTIALS FOR SUCCESS PAGE
    // We store using session.id as the key, so frontend can fetch it via URL param
    if (session.id) {
       await supabase.from('payment_temp_access').insert({
           session_id: session.id,
           email: email,
           temp_password: tempPassword
       })
    }

    await supabase.from('sales_logs').insert({
        customer_email: email,
        customer_name: session.customer_details?.name,
        status: 'created',
        message: `New User Created. Pwd: ${tempPassword}`,
        payload: session
    })
  }
}

async function handleDowngrade(supabase, subscription) {
  const customerId = subscription.customer
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const user = users.find(u => u.user_metadata?.stripe_customer_id === customerId)

  if (user) {
      console.log(`Downgrading user: ${user.email}`)
      await supabase.auth.admin.updateUserById(
          user.id,
          { user_metadata: { plan: 'free' } }
      )
      await supabase.from('sales_logs').insert({
          customer_email: user.email,
          status: 'canceled',
          message: `Stripe Downgrade`,
          payload: subscription
      })
  }
}
