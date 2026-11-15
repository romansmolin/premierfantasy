import { LegalLayout } from '@/widgets/sections/legal-layout/ui/legal-layout'

export const metadata = {
    title: 'Return & Refund Policy',
    description:
        'Premier Fantasy refund policy for Credit purchases — what qualifies for a refund, how to request one, and processing times.',
}

export default function ReturnPolicyPage() {
    return (
        <LegalLayout title="Return & Refund Policy" lastUpdated="November 15, 2026">
            <h2>Digital Goods</h2>
            <p>
                Premier Fantasy is a digital service. All purchases of Credits (prepaid units for AI features)
                are considered digital goods and are subject to the following refund policy.
            </p>

            <h2>Consumer Right of Withdrawal</h2>
            <p>
                Consumers may have a statutory right to withdraw from a distance contract within 14 days
                without giving a reason. To exercise it, contact us using the details below with a clear
                statement of your decision. Mandatory remedies for faulty digital content or services and
                other rights under applicable law are not affected.
            </p>
            <p>
                For digital content, the right of withdrawal may be lost when delivery begins only if the
                applicable legal conditions are met, including your prior express consent, acknowledgement of
                the loss of that right and confirmation of the contract. Different rules may apply to digital
                services. Using Credits does not by itself waive rights that cannot legally be waived.
            </p>

            <h2>Credit Purchases</h2>
            <h3>Eligible for Refund</h3>
            <ul>
                <li>
                    You ask for a refund of unused Credits within 14 days of the purchase. Credits that were
                    already spent are not included.
                </li>
                <li>Payment was processed but Credits were not added due to a technical error.</li>
                <li>You were charged multiple times for a single purchase.</li>
                <li>Unauthorized purchase on your account (please report it promptly).</li>
            </ul>

            <h3>Not Eligible for Refund</h3>
            <ul>
                <li>Credits that have already been spent on AI features.</li>
                <li>Change of mind where no statutory right of withdrawal applies.</li>
                <li>Account suspension due to Terms of Service violations.</li>
                <li>
                    AI results you are unsatisfied with, once delivered, where the service worked as
                    described.
                </li>
            </ul>

            <h2>AI Feature Usage</h2>
            <p>
                Credits spent on AI features (Player Analysis, Match Prediction) are subject to your statutory
                rights, including remedies for faulty services. Re-opening a result you already paid for does
                not cost further Credits.
            </p>

            <h2>Credits Do Not Expire</h2>
            <p>Credits never expire and have no cash value outside of the refund rules above.</p>

            <h2>How to Request a Refund</h2>
            <ol>
                <li>
                    Contact us at <a href="mailto:support@premierfantasy.net">support@premierfantasy.net</a>{' '}
                    with your request. Statutory deadlines and remedies remain applicable.
                </li>
                <li>Include your account email, the date of purchase, and the amount.</li>
                <li>Provide a description of the issue.</li>
                <li>We will review your request and respond within 5 business days.</li>
            </ol>

            <h2>Refund Processing</h2>
            <p>
                Approved refunds will be processed to the original payment method within 5-10 business days.
                The corresponding Credits will be deducted from your account balance.
            </p>

            <h2>Contact</h2>
            <p>
                For refund requests, contact us at{' '}
                <a href="mailto:support@premierfantasy.net">support@premierfantasy.net</a>.
            </p>
        </LegalLayout>
    )
}
