export default function PrivacyPage() {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '60px 22px 80px', boxSizing: 'border-box' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, color: '#3A3A38', marginBottom: 8 }}>Privacy Policy</div>
          <div style={{ fontSize: 13, color: '#8A8880', marginBottom: 32 }}>Last updated: July 18, 2026</div>
  
          <Section title="1. Information We Collect">
            When you use Afterwords, we collect: your email address (for account creation), the books, journal entries, reflections, and quotes you add to the app, your reading level preference, and basic usage data (such as check-in counts) needed to operate the Service.
          </Section>
  
          <Section title="2. How We Use Your Information">
            We use your information to: provide and operate the Service, generate AI-based reading questions and connections personalized to your content, process subscription payments (via Paddle), and communicate with you about your account.
          </Section>
  
          <Section title="3. AI Processing">
            To generate reflection questions and cross-book connections, portions of your journal content are sent to third-party AI providers (such as Anthropic) for processing. This content is used solely to generate responses for you and is not used to train AI models by us.
          </Section>
  
          <Section title="4. Data Storage">
            Your data is stored securely using Supabase, our database provider. We take reasonable measures to protect your data but cannot guarantee absolute security.
          </Section>
  
          <Section title="5. Payment Information">
            We do not directly store your payment card details. Payments are processed by Paddle.com, which acts as merchant of record and handles all payment data in accordance with its own privacy policy.
          </Section>
  
          <Section title="6. Data Sharing">
            We do not sell your personal data. We share data only with service providers necessary to operate the Service (such as our database, AI, and payment providers), or when required by law.
          </Section>
  
          <Section title="7. Your Rights">
            You may access, correct, or delete your account data at any time by contacting us. You may also request an export of your journal data.
          </Section>
  
          <Section title="8. Data Retention">
            We retain your data for as long as your account is active. If you delete your account, we will delete your associated data within a reasonable period, except where retention is required by law.
          </Section>
  
          <Section title="9. Children's Privacy">
            Afterwords is not intended for children under 13. We do not knowingly collect data from children under 13.
          </Section>
  
          <Section title="10. Changes to This Policy">
            We may update this Privacy Policy from time to time. Continued use of the Service after changes constitutes acceptance of the updated policy.
          </Section>
  
          <Section title="11. Contact">
            Questions about this Privacy Policy can be sent to teamafterwords@gmail.com.
          </Section>
        </div>
      </div>
    )
  }
  
  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: '#3A3A38', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: '#4a4636' }}>{children}</div>
      </div>
    )
  }