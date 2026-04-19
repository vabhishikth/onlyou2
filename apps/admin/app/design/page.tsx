"use client";
import { colors } from "@onlyou/core/tokens/colors";
import {
  Logo,
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Dialog,
  DialogTitle,
  DialogDescription,
  ToastProvider,
  useToast,
  OtpInput,
  Skeleton,
  EmptyState,
  SearchEmptyState,
  FilterEmptyState,
  ErrorState,
  InlineError,
} from "@onlyou/ui";
import { useState } from "react";

export default function DesignPage() {
  return (
    <ToastProvider>
      <DesignContent />
    </ToastProvider>
  );
}

function DesignContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const toast = useToast();

  return (
    <main className="min-h-screen bg-[color:var(--color-background)] px-6 py-16 md:px-12">
      <div className="mx-auto max-w-5xl">
        <Logo size={56} className="mb-4" />
        <p className="mb-16 text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-tertiary)]">
          Design system — @onlyou/admin
        </p>

        <Section title="Typography">
          <TypeRow label="H1 / Serif 700">
            <h1 className="font-[family-name:var(--font-serif)] text-5xl font-bold leading-[1.05]">
              Your care, private
            </h1>
          </TypeRow>
          <TypeRow label="H2 / Serif 600">
            <h2 className="font-[family-name:var(--font-serif)] text-4xl font-semibold leading-[1.15]">
              Treatment that fits you
            </h2>
          </TypeRow>
          <TypeRow label="H3 / Serif 600">
            <h3 className="font-[family-name:var(--font-serif)] text-2xl font-semibold leading-[1.3]">
              Book a free consultation
            </h3>
          </TypeRow>
          <TypeRow label="Body / Sans 400">
            <p className="text-base leading-[1.6]">
              A board-certified doctor reviews your case and creates a
              personalized plan — you only pay if they prescribe.
            </p>
          </TypeRow>
          <TypeRow label="Body Secondary">
            <p className="text-base leading-[1.6] text-[color:var(--color-text-secondary)]">
              Takes about 5 minutes. Your answers stay private.
            </p>
          </TypeRow>
          <TypeRow label="Small / Tertiary">
            <p className="text-xs text-[color:var(--color-text-tertiary)]">
              Reviewed within 24 hours · Free · No card required
            </p>
          </TypeRow>
        </Section>

        <Section title="Core Palette">
          <SwatchGrid
            swatches={[
              { name: "Primary", hex: colors.primary },
              { name: "Background", hex: colors.background },
              { name: "Off-White", hex: colors.offWhite },
              { name: "Lavender", hex: colors.accent },
              { name: "Warm Gold", hex: colors.accentWarm },
            ]}
          />
        </Section>

        <Section title="Status Colors">
          <SwatchGrid
            swatches={[
              { name: "Success", hex: colors.success },
              { name: "Warning", hex: colors.warning },
              { name: "Error", hex: colors.error },
              { name: "Info", hex: colors.info },
              { name: "Neutral", hex: colors.primaryScale[50] },
            ]}
          />
        </Section>

        <Section title="Buttons — 7 variants">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Continue</Button>
            <Button variant="secondary">Back</Button>
            <Button variant="ghost">Skip</Button>
            <Button variant="accent">Start free consultation</Button>
            <Button variant="outline">Learn more</Button>
            <Button variant="destructive">Delete account</Button>
            <Button variant="link">Read more</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra large</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="max-w-md space-y-3">
            <Input placeholder="Default state — enter your phone" />
            <Input placeholder="Focused (click me)" />
            <Input placeholder="Error state" error />
            <Input placeholder="Disabled" disabled />
            <InlineError message="This number is not valid." />
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
                OTP input
              </p>
              <OtpInput value={otp} onChange={setOtp} />
            </div>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">DEFAULT</Badge>
            <Badge variant="success">COMPLETED</Badge>
            <Badge variant="warning">AWAITING REVIEW</Badge>
            <Badge variant="error">URGENT</Badge>
            <Badge variant="info">IN PROGRESS</Badge>
            <Badge variant="accent">NEW</Badge>
            <Badge variant="gold">PREMIUM</Badge>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hair Loss</CardTitle>
                <CardDescription>
                  Personalized treatment backed by evidence. Starts at
                  ₹999/month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="primary" size="sm">
                  Learn more
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Weight Management</CardTitle>
                <CardDescription>
                  Doctor-led program with medication, nutrition, and check-ins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="primary" size="sm">
                  Learn more
                </Button>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Dialog & Toast">
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.show("Saved successfully", "success")}
            >
              Show toast
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTitle>Dialog example</DialogTitle>
            <DialogDescription>
              This is a native dialog element styled with onlyou tokens. Press
              Esc or click backdrop to close.
            </DialogDescription>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Confirm
              </Button>
            </div>
          </Dialog>
        </Section>

        <Section title="Skeleton">
          <div className="space-y-3">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-80" />
          </div>
        </Section>

        <Section title="Empty State">
          <EmptyState
            title="No consultations yet"
            description="Your consultation history will appear here."
          />
          <div className="mt-6">
            <SearchEmptyState query="hairlss" />
          </div>
          <div className="mt-6">
            <FilterEmptyState />
          </div>
        </Section>

        <Section title="Error State">
          <ErrorState
            title="Unable to load"
            description="We couldn't load your consultations. Try again in a moment."
            action={
              <Button variant="primary" size="sm">
                Retry
              </Button>
            }
          />
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <section
      id={anchor}
      className="mb-16 border-t border-[color:var(--color-border)] pt-12"
    >
      <h2 className="mb-6 font-[family-name:var(--font-serif)] text-3xl font-semibold">
        <a
          href={`#${anchor}`}
          className="hover:text-[color:var(--color-accent)]"
        >
          {title}
        </a>
      </h2>
      {children}
    </section>
  );
}

function TypeRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-baseline gap-6 border-b border-[color:var(--color-border)] py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function SwatchGrid({
  swatches,
}: {
  swatches: { name: string; hex: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {swatches.map((s) => (
        <div
          key={s.hex}
          className="overflow-hidden rounded-[14px] border border-[color:var(--color-border)] bg-white"
        >
          <div className="h-20" style={{ background: s.hex }} />
          <div className="p-3">
            <div className="text-xs font-semibold">{s.name}</div>
            <div className="mt-1 font-mono text-[11px] text-[color:var(--color-text-tertiary)]">
              {s.hex}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
