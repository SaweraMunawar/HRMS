import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, type RoleCode } from "@/lib/roles";

// Temporary: agle step mein asal dashboards (charts) is ki jagah lenge
export function DashboardPlaceholder({ title, user }: { title: string; user: { name?: string | null; role: RoleCode } }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.name} ({ROLE_LABELS[user.role]})
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming in a later step</CardTitle>
          <CardDescription>This page is protected by role. Its widgets will be added soon.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use the sidebar to open your other dashboards.
        </CardContent>
      </Card>
    </div>
  );
}
