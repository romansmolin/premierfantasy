import { LegalLayout } from '@/widgets/sections/legal-layout/ui/legal-layout'

export const metadata = {
    title: 'Terms of Service',
    description:
        'The rules for using Premier Fantasy — accounts, Credits, payments, AI features, and acceptable use.',
}

export default function TermsOfServicePage() {
    return (
        <LegalLayout title="Terms of Service" lastUpdated="November 15, 2026">
            <h2>1. Acceptance of Terms</h2>
            <p>
                By accessing or using the Premier Fantasy platform (&quot;Service&quot;), you agree to be
                bound by these Terms of Service. If you do not agree to these terms, please do not use the
                Service.
            </p>

            <p>
                You must be at least 18 years old to use the Service. You are responsible for ensuring that
                use of the Service and any paid features is permitted in your location. Access may be
                restricted where required by applicable law.
            </p>

            <h2>2. Description of Service</h2>
            <p>
                Premier Fantasy is an online analytics tool for fantasy football managers. It provides
                football statistics and AI-powered analysis that users may take into account when choosing a
                squad on a third-party fantasy platform of their choice. Statistics are free. AI-powered
                analysis features are paid for with prepaid units (&quot;Credits&quot;).
            </p>

            <h2>3. User Accounts</h2>
            <p>
                You must create an account to use the Service. You are responsible for maintaining the
                confidentiality of your account credentials and for all activities that occur under your
                account. You must provide accurate and complete information during registration.
            </p>

            <h2>4. Credits</h2>
            <ul>
                <li>Credits are a prepaid unit used to pay for AI features of the Service.</li>
                <li>Credits are purchased with real currency through our payment processor.</li>
                <li>Credits never expire.</li>
                <li>
                    Unused Credits you purchased can be refunded on request within 14 days of purchase, as set
                    out in the <a href="/return-policy">Return &amp; Refund Policy</a>. Credits already spent
                    are not refundable.
                </li>
                <li>Credits have no cash value and cannot be exchanged for cash.</li>
                <li>Credits are non-transferable between accounts.</li>
                <li>
                    We may change the price of Credit packs and of AI features. A change does not affect
                    Credits you have already purchased.
                </li>
            </ul>

            <h2>5. What Premier Fantasy Is Not</h2>
            <p>
                Premier Fantasy does not operate fantasy games, contests, leagues or prizes, and does not
                accept entry fees, stakes or wagers. Nothing you do on the Service earns points, rankings or
                rewards. Any squad you choose is entered by you on a third-party platform, which has its own
                rules. Premier Fantasy is independent and is not affiliated with, endorsed by, or connected to
                the Premier League, Fantasy Premier League, UEFA or any fantasy game operator.
            </p>

            <h2>6. AI Features</h2>
            <p>
                AI-powered features (currently Player Analysis and Match Prediction) are provided as
                informational tools. They are powered by third-party AI models and do not guarantee accuracy
                or any result on any fantasy platform. Credits spent on AI features are not refundable once
                the result has been delivered, without prejudice to your statutory rights. You may re-open a
                match prediction you already paid for at any time, and a player analysis for 7 days after it
                was generated, without further Credits being charged. After that, a new request for the same
                player is charged again.
            </p>

            <h2>7. Payments</h2>
            <p>
                All payments for Credit purchases are processed through our third-party payment provider. By
                making a purchase, you agree to the payment processor&apos;s terms and conditions. Your
                statutory consumer rights, including any applicable right of withdrawal, remain unaffected.
                See our <a href="/return-policy">Return &amp; Refund Policy</a> for details.
            </p>

            <h2>8. Prohibited Conduct</h2>
            <ul>
                <li>Creating multiple accounts to abuse the Service.</li>
                <li>Using automated tools, bots, or scripts to interact with the Service.</li>
                <li>Attempting to obtain Credits or AI results without paying, or to exploit bugs.</li>
                <li>Harassing, threatening, or abusing other users.</li>
                <li>Reverse-engineering or attempting to extract source code from the Service.</li>
            </ul>

            <h2>9. Termination</h2>
            <p>
                We reserve the right to suspend or terminate your account at any time for violation of these
                terms or for any other reason at our sole discretion. Upon termination, your access to the
                Service and any unused Credits will be forfeited, unless we terminate your account without a
                breach on your part, in which case we will refund your unused purchased Credits.
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
                Credits, data, or profits, or any result you obtain on a third-party fantasy platform.
            </p>

            <h2>12. Changes to Terms</h2>
            <p>
                We may update these Terms of Service from time to time. Continued use of the Service after
                changes constitutes acceptance of the revised terms. We will notify users of significant
                changes via the platform.
            </p>

            <h2>13. Governing Law and Jurisdiction</h2>
            <p>
                These Terms are governed by Polish law. This choice does not deprive consumers of mandatory
                protections available under the law of their country of residence. Disputes may be brought
                before the competent courts determined by applicable law, including mandatory consumer
                jurisdiction rules.
            </p>

            <h2>14. Contact</h2>
            <p>
                DIGIDROP Sp. z o.o., KRS 0001185058, Aleja Jana Pawła II 27, 00-867 Warszawa, Poland. For
                questions about these Terms, contact{' '}
                <a href="mailto:support@premierfantasy.net">support@premierfantasy.net</a>.
            </p>
        </LegalLayout>
    )
}
