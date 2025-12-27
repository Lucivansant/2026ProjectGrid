// Setup for Supabase Edge Functions with Deno.serve (Native)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || ""
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight (OPTIONS request)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 3. Get User (Optional - Guest Checkout Logic)
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

    // 4. Ensure Stripe Customer Exists (Only if authenticated)
    if (user && !stripeCustomerId) {
        // Search by email first to avoid duplicates
        const existingCustomers = await stripe.customers.list({ email: email, limit: 1 })
        
        if (existingCustomers.data.length > 0) {
            stripeCustomerId = existingCustomers.data[0].id
        } else {
            // Create new customer
            const newCustomer = await stripe.customers.create({
                email: email,
                name: user.user_metadata?.full_name || 'ProjectGrid User',
                metadata: { supabase_user_id: user.id }
            })
            stripeCustomerId = newCustomer.id
        }
    }

    // 5. Parse Request Body
    const { priceId, successUrl, cancelUrl } = await req.json()

    if (!priceId) throw new Error("Price ID is required")

    // 6. Build Session Config
    const sessionConfig = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      subscription_data: {
         trial_period_days: 7, 
      }
    }

    // 7. Decide Customer Strategy (User vs Guest)
    if (stripeCustomerId) {
        sessionConfig.customer = stripeCustomerId
    } else {
        // Guest: Let Stripe collect email.
        // customer_creation: 'always' forces Stripe to create a Customer object 
        // which our webhook can then use to find the email and invite the user.
        sessionConfig.customer_creation = 'always'
    }

    // 8. Create Session
    const session = await stripe.checkout.sessions.create(sessionConfig)

    // 9. Return URL
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
