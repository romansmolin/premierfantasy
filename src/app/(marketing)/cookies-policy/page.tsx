import { LegalLayout } from '@/widgets/sections/legal-layout/ui/legal-layout'

export const metadata = { title: 'Cookie Policy — Premier Fantasy' }

export default function CookiesPolicyPage() {
    return (
        <LegalLayout title="Cookie Policy" lastUpdated="April 6, 2026">
            <h2>What Are Cookies</h2>
            <p>
                Cookies are small text files stored on your device when you visit a website. They help the
                website remember your preferences and provide essential functionality.
            </p>

            <h2>Cookies We Use</h2>
            <h3>Essential Cookies</h3>
            <p>These cookies are required for the Service to function and cannot be disabled.</p>
            <table>
                <thead>
                    <tr>
                        <th>Cookie</th>
                        <th>Purpose</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <code>better-auth.session_token</code>
                        </td>
                        <td>Authentication — keeps you signed in</td>
                        <td>7 days</td>
                    </tr>
                    <tr>
                        <td>
                            <code>sidebar_state</code>
                        </td>
                        <td>Remembers sidebar open/closed preference</td>
                        <td>7 days</td>
                    </tr>
                    <tr>
                        <td>
                            <code>theme</code>
                        </td>
                        <td>Stores light/dark mode preference</td>
                        <td>1 year</td>
                    </tr>
                </tbody>
            </table>

            <h3>Cookies We Do NOT Use</h3>
            <ul>
                <li>No advertising or tracking cookies.</li>
                <li>No third-party analytics cookies.</li>
                <li>No social media cookies.</li>
            </ul>

            <h2>Third-Party Cookies</h2>
            <p>
                When you use the payment checkout, the payment processor may set its own cookies. These are
                governed by the payment processor&apos;s own cookie policy.
            </p>

            <h2>Managing Cookies</h2>
            <p>
                You can manage cookies through your browser settings. Disabling essential cookies will prevent
                you from staying signed in.
            </p>

            <h2>Contact</h2>
            <p>
                Questions about cookies? Contact us at{' '}
                <a href="mailto:support@premierfantasy.net">support@premierfantasy.net</a>.
            </p>
        </LegalLayout>
    )
}
