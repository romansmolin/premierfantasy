import { LegalLayout } from '@/widgets/sections/legal-layout/ui/legal-layout'

export const metadata = { title: 'Terms of Service — Premier Fantasy' }

export default function TermsOfServicePage() {
    return (
        <LegalLayout title="Terms of Service" lastUpdated="April 6, 2026">
            <h2>1. Acceptance of Terms</h2>
            <p>
                By accessing or using the Premier Fantasy platform (&quot;Service&quot;), you agree to be
                bound by these Terms of Service. If you do not agree to these terms, please do not use the
                Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
                Premier Fantasy is an online fantasy sports platform where users create virtual teams of real
                Premier League players, compete in rolling 5-gameweek competitions, and earn in-app currency
                (&quot;Coins&quot;) based on performance. The platform also offers AI-powered analysis
                features available for Coin purchases.
            </p>

            <h2>3. User Accounts</h2>
            <p>
                You must create an account to use the Service. You are responsible for maintaining the
                confidentiality of your account credentials and for all activities that occur under your
                account. You must provide accurate and complete information during registration.
            </p>

            <h2>4. In-App Currency (Coins)</h2>
            <ul>
                <li>Coins are a virtual currency used within the platform.</li>
                <li>Coins can be earned through competition placement (1st: 500, 2nd: 300, 3rd: 100).</li>
                <li>Coins can be purchased using real currency through our payment processor.</li>
                <li>Coins have no real-world monetary value and cannot be exchanged for cash.</li>
                <li>Coins are non-transferable between accounts.</li>
                <li>We reserve the right to modify Coin pricing and reward amounts at any time.</li>
            </ul>

            <h2>5. Competitions</h2>
            <p>
                Competitions are automatically generated in rolling 5-gameweek cycles. Users may join an
                active competition before the join deadline. Each user may have only one fantasy team per
                competition. Points are calculated based on real Premier League match data.
            </p>

            <h2>6. AI Features</h2>
            <p>
                AI-powered features (Transfer Suggestions, Player Analytics, Match Predictions) are provided
                as entertainment and informational tools. They are powered by third-party AI models and do not
                guarantee accuracy. Coin costs for AI features are non-refundable once consumed.
            </p>

            <h2>7. Payments</h2>
            <p>
                All payments for Coin purchases are processed through our third-party payment provider. By
                making a purchase, you agree to the payment processor&apos;s terms and conditions. All
                purchases are final unless otherwise required by applicable law.
            </p>

            <h2>8. Prohibited Conduct</h2>
            <ul>
                <li>Creating multiple accounts to gain unfair advantage.</li>
                <li>Using automated tools, bots, or scripts to interact with the Service.</li>
                <li>Attempting to manipulate competition results or exploit bugs.</li>
                <li>Harassing, threatening, or abusing other users.</li>
                <li>Reverse-engineering or attempting to extract source code from the Service.</li>
            </ul>

            <h2>9. Termination</h2>
            <p>
                We reserve the right to suspend or terminate your account at any time for violation of these
                terms or for any other reason at our sole discretion. Upon termination, your access to the
                Service and any accumulated Coins will be forfeited.
            </p>

            <h2>10. Disclaimer of Warranties</h2>
            <p>
                The Service is provided &quot;as is&quot; without warranties of any kind, either express or
                implied. We do not guarantee uninterrupted or error-free operation of the Service. Football
                data is provided by third-party APIs and may contain inaccuracies.
            </p>

            <h2>11. Limitation of Liability</h2>
            <p>
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental,
                special, or consequential damages arising from your use of the Service, including loss of
                Coins, data, or profits.
            </p>

            <h2>12. Changes to Terms</h2>
            <p>
                We may update these Terms of Service from time to time. Continued use of the Service after
                changes constitutes acceptance of the revised terms. We will notify users of significant
                changes via the platform.
            </p>

            <h2>13. Contact</h2>
            <p>
                For questions about these Terms, please contact us at{' '}
                <a href="mailto:support@premierfantasy.net">support@premierfantasy.net</a>.
            </p>
        </LegalLayout>
    )
}
