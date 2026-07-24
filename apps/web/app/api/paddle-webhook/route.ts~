import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log('PADDLE WEBHOOK')
    console.log(JSON.stringify(body, null, 2))

    const eventType = body.event_type
    const data = body.data

    if (
      eventType === 'subscription.created' ||
      eventType === 'subscription.updated'
    ) {
      const userId = data.custom_data?.user_id

      if (!userId) {
        console.log('No user_id in custom_data')
        return NextResponse.json({ received: true })
      }

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            paddle_subscription_id: data.id,
            paddle_customer_id: data.customer_id,
            status: data.status,
            plan: data.items?.[0]?.price?.billing_cycle?.interval ?? null,
            current_period_end:
              data.current_billing_period?.ends_at ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) {
        console.error(error)
      }
    }

    if (eventType === 'subscription.canceled') {
      const userId = data.custom_data?.user_id

      if (userId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('user_id', userId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}