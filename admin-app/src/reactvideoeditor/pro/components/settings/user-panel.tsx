import React, { useEffect, useState } from "react";
import { SidebarGroup, SidebarGroupContent, SidebarHeader } from "../ui/sidebar";
import { Button } from "../ui/button";
import { LogOut, User, Coins } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { markSignOut } from "../../../../lib/signOutState";
import { signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "../../../../lib/firebase";

export const UserPanel: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, setCurrentUser);
  }, []);

  const handleSignOut = () => {
    markSignOut();
    const returnTo = `${window.location.pathname}${window.location.search}`;
    void signOut(auth).then(() => {
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <SidebarHeader className="border-b border-border px-4 py-8.5">
        <h2 className="text-lg font-semibold">User Profile</h2>
      </SidebarHeader>

      <SidebarGroup className="flex-1 overflow-y-auto">
        <SidebarGroupContent className="p-4 space-y-6">
          {currentUser ? (
            <>
              {/* User Identity */}
              <div className="flex flex-col items-center justify-center space-y-3 pb-4 border-b border-border">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-primary/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-semibold">
                    {(currentUser.displayName || currentUser.email || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="text-center">
                  <h3 className="font-medium text-lg">{currentUser.displayName || "User"}</h3>
                  <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                </div>
              </div>

              {/* Credits Placeholder */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Coins className="w-4 h-4" />
                  <span>Credits</span>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border flex items-center justify-between">
                  <span className="font-semibold text-xl">100</span>
                  <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your current credit balance.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-auto">
                <Button 
                  variant="destructive" 
                  className="w-full flex items-center gap-2 cursor-pointer hover:opacity-95"
                  title="Click to sign out"
                  onClick={() => setConfirmSignOutOpen(true)}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 space-y-4">
              <User className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Not signed in</p>
              <Button onClick={() => window.location.assign(`/login?returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`)}>
                Sign in
              </Button>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <Dialog open={confirmSignOutOpen} onOpenChange={setConfirmSignOutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm sign out</DialogTitle>
            <DialogDescription>
              You are about to sign out from this account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmSignOutOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
