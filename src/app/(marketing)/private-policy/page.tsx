import { LegalLayout } from '@/widgets/sections/legal-layout/ui/legal-layout'

export const metadata = {
    title: 'Privacy Policy',
    description:
        'How Premier Fantasy collects, uses, and protects your data — account details, usage data, payment records, and your privacy rights.',
}

export default function PrivacyPolicyPage() {
    return (
        <LegalLayout title="Privacy Policy" lastUpdated="November 15, 2026">
            <p>
                The data controller is DIGIDROP Sp. z o.o., KRS 0001185058, Aleja Jana Pawła II 27, 00-867
                Warszawa, Poland. Contact:{' '}
                <a href="mailto:support@premierfantasy.net">support@premierfantasy.net</a>.
            </p>
            <h2>1. Information We Collect</h2>
            <h3>Account Information</h3>
            <p>
                When you create an account, we collect your name, email address, and password (stored securely
                using cryptographic hashing). You may optionally provide a profile image.
            </p>
            <h3>Usage Data</h3>
            <p>
                We collect information about how you use the Service, including Credit transactions and AI
                feature usage. We store the AI results you requested (for example, a player analysis) so that
                you can re-open them without paying again.
            </p>
            <h3>Payment Information</h3>
            <p>
                Payment processing is handled by our third-party payment provider. We do not store your credit
                card details. When you start a payment, we collect and send your billing name, email, phone
                number, billing address, and optional date of birth to the payment provider. We retain
                transaction records including amounts, dates, and status for accounting purposes.
            </p>

            <h2>2. How We Use Your Information</h2>
            <ul>
                <li>To provide and maintain the Service.</li>
                <li>To process Credit purchases and transactions.</li>
                <li>To provide AI-powered analysis features.</li>
                <li>To communicate with you about your account and the Service.</li>
                <li>To improve the Service and develop new features.</li>
            </ul>

            <h3>Legal bases</h3>
            <p>
                We process account, payment and requested AI service data to perform our contract with you
                (GDPR Article 6(1)(b)); accounting records to comply with legal obligations (Article 6(1)(c));
                and data needed for security, fraud prevention, support and service improvement under our
                legitimate interests, subject to your rights (Article 6(1)(f)). Where consent is required for
                optional processing, we rely on consent (Article 6(1)(a)); you may withdraw it at any time
                without affecting earlier processing.
            </p>

            <h2>3. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul>
                <li>
                    <strong>Payment Processors:</strong> To process Credit purchases securely.
                </li>
                <li>
                    <strong>AI Providers:</strong> Player and match data is sent to OpenAI to produce the
                    analysis you request. We do not intentionally send your name or email as part of these
                    requests.
                </li>
                <li>
                    <strong>Football Data Providers:</strong> We receive data from API-Football. No personal
                    information is shared.
                </li>
            </ul>

            <h3>International transfers</h3>
            <p>
                Some service providers, including AI providers, may process data outside the European Economic
                Area. International transfers of personal data are subject to the GDPR. Depending on the
                recipient and destination, the legal mechanism may be an adequacy decision or appropriate
                safeguards such as the European Commission&apos;s standard contractual clauses. Contact us for
                information about a particular transfer.
            </p>

            <h2>4. Data Security</h2>
            <p>
                We implement industry-standard security measures including encrypted passwords, secure session
                management, HTTPS connections, and webhook signature verification for payment processing.
            </p>

            <h2>5. Data Retention</h2>
            <p>
                We retain your account data for as long as your account is active. You may request deletion by
                contacting us. Accounting records may be subject to statutory retention requirements,
                generally five years where Polish accounting rules apply. Other retention periods depend on
                the purpose of processing and applicable legal obligations. Contact us for information about a
                particular record.
            </p>

            <h2>6. Your Rights</h2>
            <ul>
                <li>Access your personal data.</li>
                <li>Correct inaccurate information via the Profile page.</li>
                <li>Request deletion or restriction of your personal data, subject to legal exceptions.</li>
                <li>
                    Request a copy or portability of your data where applicable, and object to processing
                    based on legitimate interests.
                </li>
                <li>
                    Lodge a complaint with the Polish data protection authority, UODO (
                    <a href="https://uodo.gov.pl/">uodo.gov.pl</a>), or another competent supervisory
                    authority.
                </li>
            </ul>

            <h2>7. Cookies</h2>
            <p>
                We use essential cookies for authentication and theme preferences. No tracking or advertising
                cookies. See our Cookie Policy for details.
            </p>

            <h2>8. Contact</h2>
            <p>
                For privacy-related questions, contact us at{' '}
                <a href="mailto:support@premierfantasy.net">support@premierfantasy.net</a>.
            </p>
        </LegalLayout>
    )
}
