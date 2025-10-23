import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppNav from "@/components/AppNav";
import { toast } from "sonner";

export default function BlogConfigs() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const [siteName, setSiteName] = useState("");
  const [wordpressUrl, setWordpressUrl] = useState("");
  const [wordpressUsername, setWordpressUsername] = useState("");
  const [wordpressAppPassword, setWordpressAppPassword] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [keywords, setKeywords] = useState("");
  const [locale, setLocale] = useState<"local" | "national" | "global">("national");
  const [targetAudience, setTargetAudience] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("professional");
  const [postingFrequency, setPostingFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");

  const { data: blogConfigs, refetch } = trpc.blogConfigs.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createConfig = trpc.blogConfigs.create.useMutation({
    onSuccess: () => {
      toast.success("Blog configuration created successfully");
      setIsOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create blog configuration");
    },
  });

  const deleteConfig = trpc.blogConfigs.delete.useMutation({
    onSuccess: () => {
      toast.success("Blog configuration deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete blog configuration");
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/");
    }
  }, [loading, isAuthenticated, setLocation]);

  const resetForm = () => {
    setSiteName("");
    setWordpressUrl("");
    setWordpressUsername("");
    setWordpressAppPassword("");
    setBusinessDescription("");
    setCompetitors("");
    setKeywords("");
    setLocale("national");
    setTargetAudience("");
    setToneOfVoice("professional");
    setPostingFrequency("weekly");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !wordpressUrl) {
      toast.error("Please fill in required fields");
      return;
    }
    createConfig.mutate({
      siteName,
      wordpressUrl,
      wordpressUsername: wordpressUsername || undefined,
      wordpressAppPassword: wordpressAppPassword || undefined,
      businessDescription: businessDescription || undefined,
      competitors: competitors || undefined,
      keywords: keywords || undefined,
      locale,
      targetAudience: targetAudience || undefined,
      toneOfVoice,
      postingFrequency,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Blog Configurations</h1>
              <p className="text-gray-600">Manage your WordPress blog settings</p>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Blog Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Blog Configuration</DialogTitle>
                  <DialogDescription>
                    Configure your WordPress blog for automated content generation
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name *</Label>
                    <Input
                      id="siteName"
                      placeholder="My Awesome Blog"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wordpressUrl">WordPress URL *</Label>
                    <Input
                      id="wordpressUrl"
                      type="url"
                      placeholder="https://myblog.com"
                      value={wordpressUrl}
                      onChange={(e) => setWordpressUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wordpressUsername">WordPress Username</Label>
                      <Input
                        id="wordpressUsername"
                        placeholder="admin"
                        value={wordpressUsername}
                        onChange={(e) => setWordpressUsername(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wordpressAppPassword">Application Password</Label>
                      <Input
                        id="wordpressAppPassword"
                        type="password"
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={wordpressAppPassword}
                        onChange={(e) => setWordpressAppPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessDescription">Business Description</Label>
                    <Textarea
                      id="businessDescription"
                      placeholder="Describe your business, products, or services..."
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                    <Input
                      id="keywords"
                      placeholder="SEO, marketing, content"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="competitors">Competitors (comma-separated)</Label>
                    <Input
                      id="competitors"
                      placeholder="competitor1.com, competitor2.com"
                      value={competitors}
                      onChange={(e) => setCompetitors(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="locale">Locale</Label>
                      <Select value={locale} onValueChange={(v: any) => setLocale(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local</SelectItem>
                          <SelectItem value="national">National</SelectItem>
                          <SelectItem value="global">Global</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postingFrequency">Posting Frequency</Label>
                      <Select value={postingFrequency} onValueChange={(v: any) => setPostingFrequency(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAudience">Target Audience</Label>
                    <Input
                      id="targetAudience"
                      placeholder="Small business owners, marketers, etc."
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="toneOfVoice">Tone of Voice</Label>
                    <Input
                      id="toneOfVoice"
                      placeholder="professional, casual, friendly, etc."
                      value={toneOfVoice}
                      onChange={(e) => setToneOfVoice(e.target.value)}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createConfig.isPending}>
                      {createConfig.isPending ? "Creating..." : "Create Configuration"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {!blogConfigs || blogConfigs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">No blog configurations yet</h3>
                <p className="text-gray-600 mb-6">
                  Create your first blog configuration to start automating content
                </p>
                <Button onClick={() => setIsOpen(true)}>
                  Add Your First Blog
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {blogConfigs.map((config) => (
                <Card key={config.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{config.siteName}</CardTitle>
                        <CardDescription className="mt-1">
                          <a
                            href={config.wordpressUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {config.wordpressUrl}
                          </a>
                        </CardDescription>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          config.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {config.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {config.businessDescription && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Description:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {config.businessDescription}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-700">Locale:</p>
                        <p className="text-gray-600 capitalize">{config.locale}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Frequency:</p>
                        <p className="text-gray-600 capitalize">
                          {config.postingFrequency?.replace("biweekly", "bi-weekly")}
                        </p>
                      </div>
                    </div>

                    {config.keywords && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Keywords:</p>
                        <div className="flex flex-wrap gap-1">
                          {config.keywords.split(",").slice(0, 5).map((keyword, i) => (
                            <span
                              key={i}
                              className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
                            >
                              {keyword.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setLocation(`/posts?blog=${config.id}`)}
                      >
                        View Posts
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteConfig.mutate({ id: config.id })}
                        disabled={deleteConfig.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
