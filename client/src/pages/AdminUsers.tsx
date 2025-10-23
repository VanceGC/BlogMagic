import { useAuth } from "@/_core/hooks/useAuth";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminUsers() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, refetch } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const adjustCreditsMutation = trpc.admin.adjustCredits.useMutation({
    onSuccess: () => {
      toast.success("Credits updated successfully!");
      setSelectedUser(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update credits: ${error.message}`);
    },
  });

  const resetCreditsMutation = trpc.admin.resetUserCredits.useMutation({
    onSuccess: () => {
      toast.success("Credits reset to 200!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reset credits: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      setLocation("/");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const handleOpenAdjustModal = (user: any) => {
    setSelectedUser(user);
    setCreditAmount(user.subscription?.credits || 0);
  };

  const handleAdjustCredits = () => {
    if (!selectedUser) return;
    adjustCreditsMutation.mutate({
      userId: selectedUser.id,
      credits: creditAmount,
    });
  };

  const filteredUsers = users?.filter((u) => {
    if (!searchQuery) return true;
    return (
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">👥 User Management</h1>
            <p className="text-gray-600">Manage user credits and subscriptions</p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Total users: {filteredUsers.length}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Subscription</th>
                      <th className="text-left py-3 px-4">Credits</th>
                      <th className="text-left py-3 px-4">Last Sign In</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{u.name || "Unknown"}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{u.email || "N/A"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              u.role === "admin"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.subscription ? (
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                u.subscription.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : u.subscription.status === "trialing"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {u.subscription.status}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">No subscription</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {u.subscription ? (
                            <span className="font-semibold text-purple-600">
                              {u.subscription.credits}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(u.lastSignedIn).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {u.subscription && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenAdjustModal(u)}
                                >
                                  Adjust Credits
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resetCreditsMutation.mutate({ userId: u.id })}
                                  disabled={resetCreditsMutation.isPending}
                                >
                                  Reset to 200
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Adjust Credits Modal */}
      <Dialog open={selectedUser !== null} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credits</DialogTitle>
            <DialogDescription>
              Set the credit amount for {selectedUser?.name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                min="0"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-2">
                Current: {selectedUser?.subscription?.credits || 0} credits
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjustCredits}
              disabled={adjustCreditsMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {adjustCreditsMutation.isPending ? "Updating..." : "Update Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

