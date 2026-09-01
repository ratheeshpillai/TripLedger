import { useEffect, useState } from "react";
import type { AcceptedDriverInvitation, DriverInvitationDetails } from "../../types/driverInvitation";
import { getSafeErrorMessage, logDevError } from "../../utils/errors";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";

type Props = {
  token: string;
  userEmail: string;
  onLoad: (token: string) => Promise<DriverInvitationDetails>;
  onAccept: (token: string) => Promise<AcceptedDriverInvitation>;
  onContinue: () => void;
  onSignOut: () => Promise<void>;
};

export function DriverInvitationPage({ token, userEmail, onLoad, onAccept, onContinue, onSignOut }: Props) {
  const [invitation, setInvitation] = useState<DriverInvitationDetails | null>(null);
  const [accepted, setAccepted] = useState<AcceptedDriverInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void Promise.resolve().then(() => onLoad(token)).then(
      (details) => active && setInvitation(details),
      (loadError) => {
        if (!active) return;
        logDevError("Driver invitation lookup failed", loadError);
        setError(getSafeErrorMessage(loadError, "invitation.load"));
      }
    ).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token, onLoad]);

  async function accept() {
    if (accepting) return;
    setAccepting(true);
    setError("");
    try {
      setAccepted(await onAccept(token));
    } catch (acceptError) {
      logDevError("Driver invitation acceptance failed", acceptError);
      setError(getSafeErrorMessage(acceptError, "invitation.accept"));
    } finally {
      setAccepting(false);
    }
  }

  const effectiveStatus = accepted ? "accepted" : invitation?.status;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 dark:bg-[#0b1120]">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">TripLoggy</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">Driver Invitation</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Link your account to an existing Fleet Owner driver profile.</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">{accepted ? "Invitation accepted" : "Review invitation"}</h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400" title={userEmail}>Signed in as {userEmail}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking invitation...</p>}

            {(invitation || accepted) && (
              <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <div><dt className="font-semibold text-slate-500 dark:text-slate-400">Fleet Owner</dt><dd className="mt-1 font-black text-slate-950 dark:text-slate-50">{accepted?.organizationName || invitation?.organizationName}</dd></div>
                <div><dt className="font-semibold text-slate-500 dark:text-slate-400">Driver profile</dt><dd className="mt-1 font-black text-slate-950 dark:text-slate-50">{accepted?.driverName || invitation?.driverName}</dd></div>
              </dl>
            )}

            {effectiveStatus === "expired" && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">This invitation has expired. Ask the Fleet Owner to create a new invitation.</p>}
            {effectiveStatus === "cancelled" && <p role="alert" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">This invitation was cancelled by the Fleet Owner.</p>}
            {effectiveStatus === "accepted" && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">Your account is linked to this driver profile.</p>}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}

            {effectiveStatus === "pending" && <Button type="button" variant="primary" className="w-full" disabled={accepting} onClick={() => void accept()}>{accepting ? "Accepting..." : "Accept Driver Invitation"}</Button>}
            {effectiveStatus === "accepted" && <Button type="button" variant="primary" className="w-full" onClick={onContinue}>Continue to TripLoggy</Button>}
            {!accepted && <Button type="button" variant="ghost" className="w-full" onClick={() => void onSignOut()}>Sign in with another account</Button>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
