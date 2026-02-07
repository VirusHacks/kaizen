export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">Last updated: January 1, 2026</p>
      
      <div className="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p>
            Commando AI collects information you provide directly to us, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account information (name, email address)</li>
            <li>Authentication data from third-party services (Google, Discord, Notion, Slack)</li>
            <li>Workflow configurations and automation settings</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Process and execute your workflow automations</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Third-Party Services</h2>
          <p>
            Our service integrates with third-party services including Google Drive, 
            Discord, Notion, and Slack. When you connect these services, we access 
            only the data necessary to provide our automation features. We do not 
            sell or share your data with third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal 
            information. However, no method of transmission over the Internet is 
            100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us 
            at: virustechhacks@gmail.com
          </p>
        </section>
      </div>
    </div>
  )
}
