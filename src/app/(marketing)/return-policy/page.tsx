import { LegalLayout } from '@/widgets/sections/legal-layout/ui/legal-layout'

export const metadata = { title: 'Return & Refund Policy — Premier Fantasy' }

export default function ReturnPolicyPage() {
    return (
        <LegalLayout title="Return & Refund Policy" lastUpdated="April 6, 2026">
            <h2>Digital Goods</h2>
            <p>
                Premier Fantasy is a digital service. All purchases of Coins (in-app currency) are considered
                digital goods and are subject to the following refund policy.
            </p>

            <h2>Coin Purchases</h2>
            <h3>Eligible for Refund</h3>
            <ul>
                <li>Payment was processed but Coins were not credited due to a technical error.</li>
                <li>You were charged multiple times for a single purchase.</li>
                <li>Unauthorized purchase on your account (report within 48 hours).</li>
            </ul>

            <h3>Not Eligible for Refund</h3>
            <ul>
                <li>Coins that have already been spent on AI features or other services.</li>
                <li>Change of mind after purchase.</li>
                <li>Account suspension due to Terms of Service violations.</li>
                <li>Competition results you are unsatisfied with.</li>
            </ul>

            <h2>AI Feature Usage</h2>
            <p>
                Coins spent on AI features (Transfer Suggestions, Player Analytics, Match Predictions) are
                non-refundable once the analysis has been generated, regardless of the quality or accuracy of
                the results.
            </p>

            <h2>Competition Rewards</h2>
            <p>
                Coins earned through competition placement are granted automatically and cannot be converted
                to cash.
            </p>

            <h2>How to Request a Refund</h2>
            <ol>
                <li>
                    Contact us at <a href="mailto:support@premierfantasy.net">support@premierfantasy.net</a>{' '}
                    within 14 days of the purchase.
                </li>
                <li>Include your account email, the date of purchase, and the amount.</li>
                <li>Provide a description of the issue.</li>
                <li>We will review your request and respond within 5 business days.</li>
            </ol>

            <h2>Refund Processing</h2>
            <p>
                Approved refunds will be processed to the original payment method within 5-10 business days.
                The corresponding Coins will be deducted from your account balance.
            </p>

            <h2>Contact</h2>
            <p>
                For refund requests, contact us at{' '}
                <a href="mailto:support@premierfantasy.net">support@premierfantasy.net</a>.
            </p>
        </LegalLayout>
    )
}
