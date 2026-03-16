import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

const placeholderCards = [
    'Total Users',
    'Active Sessions',
    'Bounce Rate',
    'Avg. Session Duration',
    'Page Views',
    'Conversion Rate',
]

export function DashboardView() {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">Analytics Dashboard</h2>
                <p className="text-sm text-muted-foreground">Overview of your fantasy football stats.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {placeholderCards.map((title) => (
                    <Card key={title} className="border-dashed">
                        <CardHeader>
                            <CardTitle>{title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-muted-foreground">—</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
