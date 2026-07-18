export default function TermsPage() {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '60px 22px 80px', boxSizing: 'border-box' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, color: '#3A3A38', marginBottom: 8 }}>Terms of Service</div>
          <div style={{ fontSize: 13, color: '#8A8880', marginBottom: 32 }}>Last updated: July 18, 2026</div>
  
          <Section title="1. Acceptance of Terms">
            By accessing or using Afterwords (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.
          </Section>
  
          <Section title="2. Description of Service">
            Afterwords is a reading companion application that generates AI-based reflection questions, stores your journal entries, and helps you track your reading progress. The Service is provided &quot;as is&quot; and we make no guarantees about the accuracy of AI-generated content.
          </Section>
  
          <Section title="3. Accounts">
            You must create an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must be at least 13 years old to use the Service.
          </Section>
  
          <Section title="4. Subscriptions and Billing">
            Afterwords offers a free tier and a paid subscription (&quot;Afterwords Plus&quot;), billed monthly or annually. Subscriptions renew automatically unless cancelled. Billing is processed by our payment provider, Paddle.com, which acts as the merchant of record for your purchase. See our Refund Policy for cancellation and refund terms.
          </Section>
  
          <Section title="5. User Content">
            You retain ownership of the journal entries, reflections, and quotes you create using the Service. By using the Service, you grant us a limited license to store and process this content solely to provide the Service to you (including generating AI responses based on your content).
          </Section>
  
          <Section title="6. AI-Generated Content">
            The Service uses artificial intelligence to generate reading questions, summaries, and other content. This content may occasionally be inaccurate, especially regarding specific plot details of books. AI-generated content is provided for reflection and entertainment purposes and should not be relied upon as factually authoritative.
          </Section>
  
          <Section title="7. Acceptable Use">
            You agree not to misuse the Service, including attempting to interfere with its normal operation, reverse-engineering the application, or using it for any unlawful purpose.
          </Section>
  
          <Section title="8. Termination">
            We reserve the right to suspend or terminate your account if you violate these Terms. You may delete your account at any time by contacting us.
          </Section>
  
          <Section title="9. Limitation of Liability">
            The Service is provided without warranties of any kind. To the maximum extent permitted by law, Afterwords shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.
          </Section>
  
          <Section title="10. Changes to These Terms">
            We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.
          </Section>
  
          <Section title="11. Contact">
            Questions about these Terms can be sent to teamafterwords@gmail.com.
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