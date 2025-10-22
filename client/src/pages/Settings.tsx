import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppNav from "@/components/AppNav";
import { toast } from "sonner";

export default function Settings() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [provider, setProvider] = useState<"openai" | "anthropic" | "stability">("openai");
  const [keyName, setKeyName] = useState("");
  const [apiKey, setApiKey] = useState("");

  const { data: apiKeys, refetch } = trpc.apiKeys.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createKey = trpc.apiKeys.create.useMutation({
    onSuccess: () => {
      toast.success("API key added successfully");
      setKeyName("");
      setApiKey("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add API key");
    },
  });

  const deleteKey = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      toast.success("API key deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete API key");
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName || !apiKey) {
      toast.error("Please fill in all fields");
      return;
    }
    createKey.mutate({ provider, keyName, apiKey });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-gray-600">Manage your API keys and preferences</p>
          </div>

          <div className="space-y-6">
            {/* Add API Key */}
            <Card>
              <CardHeader>
                <CardTitle>Add API Key</CardTitle>
                <CardDescription>
                  Add your AI provider API keys to enable content generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT-4, DALL-E)</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                        <SelectItem value="stability">Stability AI (Image Generation)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., My OpenAI Key"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createKey.isPending}
                  >
                    {createKey.isPending ? "Adding..." : "Add API Key"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Existing API Keys */}
            <Card>
              <CardHeader>
                <CardTitle>Your API Keys</CardTitle>
                <CardDescription>
                  Manage your stored API keys (keys are encrypted)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!apiKeys || apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <p>No API keys added yet</p>
                    <p className="text-sm mt-2">Add your first API key above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold">{key.keyName}</p>
                            <p className="text-sm text-gray-500 capitalize">{key.provider}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              key.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {key.isActive ? "Active" : "Inactive"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteKey.mutate({ id: key.id })}
                            disabled={deleteKey.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Need Help Getting API Keys?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-blue-900">OpenAI:</p>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Get your API key from OpenAI Platform →
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Anthropic:</p>
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Get your API key from Anthropic Console →
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Stability AI:</p>
                  <a
                    href="https://platform.stability.ai/account/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Get your API key from Stability AI Platform →
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

