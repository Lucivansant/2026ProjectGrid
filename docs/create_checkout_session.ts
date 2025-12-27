
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

console.log("Function Loaded")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // 1. Always handle CORS first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize inside handler to catch config errors
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
    if (!stripeKey) {
        throw new Error("STRIPE_SECRET_KEY is missing in Supabase Secrets")
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY is missing")
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 3. Logic
    let user = null
    let email = null
    let stripeCustomerId = null

    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
        const { data, error } = await supabaseClient.auth.getUser()
        if (!error && data?.user) {
            user = data.user
            email = user.email
            stripeCustomerId = user.user_metadata?.stripe_customer_id
        }
    }

    // 4. Ensure Stripe Customer
    if (user && !stripeCustomerId) {
        const existingCustomers = await stripe.customers.list({ email: email, limit: 1 })
        if (existingCustomers.data.length > 0) {
            stripeCustomerId = existingCustomers.data[0].id
        } else {
            const newCustomer = await stripe.customers.create({
                email: email,
                name: user.user_metadata?.full_name || 'ProjectGrid User',
                metadata: { supabase_user_id: user.id }
            })
            stripeCustomerId = newCustomer.id
        }
    }

    // 5. Create Session
    const { priceId, successUrl, cancelUrl } = await req.json()

    if (!priceId) throw new Error("Price ID is required")

    const sessionConfig = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 }
    }

    if (stripeCustomerId) {
        sessionConfig.customer = stripeCustomerId
    } else {
        sessionConfig.customer_creation = 'always'
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Handler Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
