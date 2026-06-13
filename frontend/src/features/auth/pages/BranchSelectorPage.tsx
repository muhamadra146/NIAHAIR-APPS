import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoSrc from "@/assets/logo-niahair.png";

export function BranchSelectorPage() {
  const navigate                      = useNavigate();
  const { user, branchId, setBranch, logout } = useAuthStore();

  const branches    = user?.branches ?? [];
  const isSwitching = !!branchId;
  const noBranch    = branches.length === 0;

  function handleSelect(id: string) {
    setBranch(id);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={logoSrc} alt="NIA HAIR" className="h-12 w-auto object-contain" draggable={false} />
        </div>

        {noBranch ? (
          /* ── No branch assigned ──────────────────────────────── */
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">No Branch Assigned</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your account has not been assigned to any branch yet.
                  Please contact your administrator to get access.
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={logout}>
              Back to Login
            </Button>
          </div>
        ) : (
          /* ── Branch list ─────────────────────────────────────── */
          <>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">
                {isSwitching ? "Switch Branch" : "Select Branch"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSwitching
                  ? "Choose a different branch to work in"
                  : "Choose the branch you want to work in"}
              </p>
            </div>

            <div className="space-y-2">
              {branches.map((branch) => (
                <Card
                  key={branch.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    branchId === branch.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => handleSelect(branch.id)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{branch.name}</p>
                      <p className="text-xs text-muted-foreground">{branch.code}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {isSwitching && (
              <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
