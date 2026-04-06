import { LegalLayout } from '@/widgets/sections/legal-layout/ui/legal-layout'

export const metadata = { title: 'Privacy Policy — Premier Fantasy' }

export default function PrivacyPolicyPage() {
    return (
        <LegalLayout title="Privacy Policy" lastUpdated="April 6, 2026">
            <h2>1. Information We Collect</h2>
            <h3>Account Information</h3>
            <p>
                When you create an account, we collect your name, email address, and password (stored securely
                using cryptographic hashing). You may optionally provide a profile image.
            </p>
            <h3>Usage Data</h3>
            <p>
                We collect information about how you use the Service, including competition participation,
                team selections, transfer activity, Coin transactions, and AI feature usage.
            </p>
            <h3>Payment Information</h3>
            <p>
                Payment processing is handled by our third-party payment provider. We do not store your credit
                card details. We retain transaction records including amounts, dates, and status for
                accounting purposes.
            </p>

            <h2>2. How We Use Your Information</h2>
            <ul>
                <li>To provide and maintain the Service.</li>
                <li>To process competitions, scoring, and rewards.</li>
                <li>To process Coin purchases and transactions.</li>
                <li>To provide AI-powered analysis features.</li>
                <li>To communicate with you about your account and the Service.</li>
                <li>To improve the Service and develop new features.</li>
            </ul>

            <h2>3. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul>
                <li>
                    <strong>Payment Processors:</strong> To process Coin purchases securely.
                </li>
                <li>
                    <strong>AI Providers:</strong> Squad and player data is sent to OpenAI for analysis. This
                    does not include your personal identity.
                </li>
                <li>
                    <strong>Football Data Providers:</strong> We receive data from API-Football. No personal
                    information is shared.
                </li>
            </ul>

            <h2>4. Data Security</h2>
            <p>
                We implement industry-standard security measures including encrypted passwords, secure session
                management, HTTPS connections, and webhook signature verification for payment processing.
            </p>

            <h2>5. Data Retention</h2>
            <p>
                We retain your account data for as long as your account is active. You may request deletion at
                any time through the Profile page.
            </p>

            <h2>6. Your Rights</h2>
            <ul>
                <li>Access your personal data.</li>
                <li>Correct inaccurate information via the Profile page.</li>
                <li>Delete your account and all associated data.</li>
                <li>Request a copy of your data.</li>
            </ul>

            <h2>7. Cookies</h2>
            <p>
                We use essential cookies for authentication and theme preferences. No tracking or advertising
                cookies. See our Cookie Policy for details.
            </p>

            <h2>8. Contact</h2>
            <p>
                For privacy-related questions, contact us at{' '}
                <a href="mailto:privacy@premierfantasy.net">privacy@premierfantasy.net</a>.
            </p>
        </LegalLayout>
    )
}
