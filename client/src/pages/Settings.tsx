import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import BlogConfigsTab from "@/components/BlogConfigsTab";
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
            <p className="text-gray-600">Manage your API keys, preferences, and downloads</p>
          </div>

          <Tabs defaultValue="api-keys" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              <TabsTrigger value="blog-configs">Blog Configs</TabsTrigger>
              <TabsTrigger value="downloads">Downloads</TabsTrigger>
            </TabsList>

            <TabsContent value="api-keys" className="space-y-6">
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
                  {apiKeys && apiKeys.length > 0 ? (
                    <div className="space-y-3">
                      {apiKeys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{key.keyName}</p>
                            <p className="text-sm text-gray-500 capitalize">{key.provider}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteKey.mutate({ id: key.id })}
                            disabled={deleteKey.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No API keys added yet. Add one above to get started.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blog-configs" className="space-y-6">
              <BlogConfigsTab />
            </TabsContent>

            <TabsContent value="downloads" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* WordPress Plugin */}
                <Card className="border-2 border-purple-200">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.158 12.786l-2.698 7.84c.806.236 1.657.365 2.54.365 1.047 0 2.051-.18 2.986-.51-.024-.037-.046-.078-.065-.123l-2.763-7.572zm-5.316 3.713c-1.098-1.008-1.842-2.403-1.842-3.999 0-1.154.37-2.23 1.004-3.104l2.838 7.783zm10.157-8.499c.002-.027.002-.056.002-.085 0-.27-.098-.514-.258-.705-.16-.19-.385-.285-.675-.285h-.03c-.027.002-.056.002-.085.002-.27 0-.514.098-.705.258-.19.16-.285.385-.285.675 0 .027.002.056.002.085.002.027.002.056.002.085 0 .27.098.514.258.705.16.19.385.285.675.285.027 0 .056-.002.085-.002.027-.002.056-.002.085-.002.27 0 .514-.098.705-.258.19-.16.285-.385.285-.675 0-.027-.002-.056-.002-.085-.002-.027-.002-.056-.002-.085zm1.316 8.499c.806-.236 1.657-.365 2.54-.365 1.047 0 2.051.18 2.986.51-.024.037-.046.078-.065.123l-2.763 7.572-2.698-7.84zm-5.316-3.713c1.098 1.008 1.842 2.403 1.842 3.999 0 1.154-.37 2.23-1.004 3.104l-2.838-7.783z"/>
                      </svg>
                    </div>
                    <CardTitle>WordPress Plugin</CardTitle>
                    <CardDescription className="text-sm">
                      Auto-publish posts to WordPress
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm space-y-2">
                      <p className="font-semibold">Features:</p>
                      <ul className="space-y-1 text-gray-600">
                        <li>✓ Automatic post publishing</li>
                        <li>✓ SEO meta data integration</li>
                        <li>✓ Featured image upload</li>
                        <li>✓ Category & tag management</li>
                      </ul>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                      onClick={() => window.location.href = "/blogmagic-wp.zip"}
                    >
                      Download Plugin
                    </Button>
                  </CardContent>
                </Card>

                {/* Chrome Extension */}
                <Card className="border-2 border-blue-200">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 1.5c5.799 0 10.5 4.701 10.5 10.5S17.799 22.5 12 22.5 1.5 17.799 1.5 12 6.201 1.5 12 1.5zm0 2.25c-4.556 0-8.25 3.694-8.25 8.25s3.694 8.25 8.25 8.25 8.25-3.694 8.25-8.25-3.694-8.25-8.25-8.25z"/>
                      </svg>
                    </div>
                    <CardTitle>Chrome Extension</CardTitle>
                    <CardDescription className="text-sm">
                      Quick access from your browser
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm space-y-2">
                      <p className="font-semibold">Features:</p>
                      <ul className="space-y-1 text-gray-600">
                        <li>✓ One-click post generation</li>
                        <li>✓ Quick stats overview</li>
                        <li>✓ Keyword research helper</li>
                        <li>✓ Notification alerts</li>
                      </ul>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                      onClick={() => window.location.href = "/chrome-extension.zip"}
                    >
                      Download Extension
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
