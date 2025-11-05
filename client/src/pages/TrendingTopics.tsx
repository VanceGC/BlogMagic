import { useAuth } from "@/_core/hooks/useAuth";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function TrendingTopics() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBlogConfigId, setSelectedBlogConfigId] = useState<number | null>(null);
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);
  const [generatedTopics, setGeneratedTopics] = useState<any[]>([]);
  const [filterBlogConfig, setFilterBlogConfig] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: blogConfigs } = trpc.blogConfigs.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: savedTopics, refetch: refetchSaved } = trpc.trending.listSaved.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: subscription } = trpc.subscription.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();

  const generateTrendingMutation = trpc.trending.getSuggestions.useMutation({
    onSuccess: async (data) => {
      toast.success("Trending topics generated! 10 credits deducted.");
      setGeneratedTopics(data);
      utils.subscription.get.invalidate();
      
      // Auto-save all generated topics to database
      if (data && data.length > 0 && selectedBlogConfigId) {
        for (const topic of data) {
          try {
            await saveTopicMutation.mutateAsync({
              blogConfigId: selectedBlogConfigId,
              title: topic.title,
              reason: topic.reason,
              searchVolume: topic.searchVolume as "high" | "medium" | "low",
              keywords: topic.keywords,
              source: topic.source,
            });
          } catch (error) {
            console.error("Failed to auto-save topic:", error);
          }
        }
        // Refresh saved topics list
        refetchSaved();
        toast.success(`${data.length} topics saved to your library!`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to generate topics: ${error.message}`);
    },
  });

  const saveTopicMutation = trpc.trending.saveTopic.useMutation({
    onSuccess: () => {
      toast.success("Topic saved!");
      refetchSaved();
    },
    onError: (error) => {
      toast.error(`Failed to save topic: ${error.message}`);
    },
  });

  const deleteTopicMutation = trpc.trending.deleteSaved.useMutation({
    onSuccess: () => {
      toast.success("Topic deleted!");
      refetchSaved();
    },
    onError: (error) => {
      toast.error(`Failed to delete topic: ${error.message}`);
    },
  });

  const generatePostMutation = trpc.posts.generate.useMutation({
    onSuccess: () => {
      toast.success("Post generated successfully!");
      setGeneratingTopic(null);
      setLocation("/posts");
    },
    onError: (error) => {
      toast.error(`Failed to generate post: ${error.message}`);
      setGeneratingTopic(null);
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/");
    }
  }, [loading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (blogConfigs && blogConfigs.length > 0 && !selectedBlogConfigId) {
      setSelectedBlogConfigId(blogConfigs[0].id);
    }
  }, [blogConfigs, selectedBlogConfigId]);

  const handleGenerateTrending = () => {
    if (!selectedBlogConfigId) return;
    generateTrendingMutation.mutate({ blogConfigId: selectedBlogConfigId });
  };

  const handleSaveTopic = (topic: any) => {
    if (!selectedBlogConfigId) return;
    saveTopicMutation.mutate({
      blogConfigId: selectedBlogConfigId,
      title: topic.title,
      reason: topic.reason,
      source: topic.source,
      keywords: topic.keywords,
      searchVolume: topic.searchVolume,
    });
  };

  const handleGeneratePost = (topicTitle: string, blogConfigId: number) => {
    setGeneratingTopic(topicTitle);
    generatePostMutation.mutate({
      blogConfigId,
      topic: topicTitle,
      generateImage: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Filter saved topics
  const filteredSavedTopics = savedTopics?.filter((topic) => {
    if (filterBlogConfig !== "all" && topic.blogConfigId !== parseInt(filterBlogConfig)) {
      return false;
    }
    if (filterRating !== "all" && topic.searchVolume !== filterRating) {
      return false;
    }
    if (searchQuery && !topic.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">🔥 Trending Topics</h1>
              <p className="text-gray-600">
                Discover viral content ideas and save them for your content calendar
              </p>
            </div>
            {subscription && (
              <div className="bg-white border rounded-lg px-4 py-3 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Credits Remaining</div>
                <div className="text-2xl font-bold text-purple-600">{subscription.credits}</div>
                <div className="text-xs text-gray-500 mt-1">10 credits per generation</div>
              </div>
            )}
          </div>

          {/* Saved Topics Section */}
          <Card>
            <CardHeader>
              <CardTitle>📌 Saved Topics</CardTitle>
              <CardDescription>Topics you've saved for future content creation</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterBlogConfig} onValueChange={setFilterBlogConfig}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by blog" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Blogs</SelectItem>
                    {blogConfigs?.map((config) => (
                      <SelectItem key={config.id} value={config.id.toString()}>
                        {config.siteName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Saved Topics List */}
              {filteredSavedTopics.length > 0 ? (
                <div className="space-y-3">
                  {filteredSavedTopics.map((topic) => {
                    const blogConfig = blogConfigs?.find((c) => c.id === topic.blogConfigId);
                    return (
                      <div
                        key={topic.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{topic.title}</h3>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  topic.searchVolume === "high"
                                    ? "bg-red-100 text-red-700"
                                    : topic.searchVolume === "medium"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {topic.searchVolume.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{topic.reason}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>📝 {blogConfig?.siteName || "Unknown Blog"}</span>
                              <span>📅 {new Date(topic.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {topic.keywords.slice(0, 5).map((keyword: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleGeneratePost(topic.title, topic.blogConfigId)}
                              disabled={generatingTopic !== null}
                              className="bg-gradient-to-r from-purple-600 to-blue-600"
                            >
                              {generatingTopic === topic.title ? "Generating..." : "✨ Generate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteTopicMutation.mutate({ id: topic.id })}
                              disabled={deleteTopicMutation.isPending}
                            >
                              🗑️ Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">No saved topics yet</p>
                  <p className="text-sm">Generate trending topics below and save them for later</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate New Topics Section */}
          <Card>
            <CardHeader>
              <CardTitle>🔍 Discover New Trending Topics</CardTitle>
              <CardDescription>
                Generate fresh trending topic ideas based on your blog configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Blog Selection & Generate Button */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Select Blog Configuration</label>
                  <Select
                    value={selectedBlogConfigId?.toString()}
                    onValueChange={(value) => setSelectedBlogConfigId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a blog" />
                    </SelectTrigger>
                    <SelectContent>
                      {blogConfigs?.map((config) => (
                        <SelectItem key={config.id} value={config.id.toString()}>
                          {config.siteName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerateTrending}
                  disabled={!selectedBlogConfigId || generateTrendingMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {generateTrendingMutation.isPending ? "Generating..." : "🔥 Generate Trending Topics"}
                </Button>
              </div>

              {/* Generated Topics Grid */}
              {generatedTopics.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {generatedTopics.map((topic, index) => (
                    <Card
                      key={index}
                      className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg flex-1">{topic.title}</CardTitle>
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              topic.searchVolume === "high"
                                ? "bg-red-100 text-red-700"
                                : topic.searchVolume === "medium"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {topic.searchVolume.toUpperCase()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Why it's trending:</strong>
                            </p>
                            <p className="text-sm text-gray-600">{topic.reason}</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Source:</strong>
                            </p>
                            <p className="text-sm text-gray-600">{topic.source}</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-700 mb-2">
                              <strong>Keywords:</strong>
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {topic.keywords.map((keyword: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSaveTopic(topic)}
                              disabled={saveTopicMutation.isPending}
                              variant="outline"
                              className="flex-1"
                            >
                              💾 Save Topic
                            </Button>
                            <Button
                              onClick={() => handleGeneratePost(topic.title, selectedBlogConfigId!)}
                              disabled={generatingTopic !== null}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                            >
                              {generatingTopic === topic.title ? "Generating..." : "✨ Generate Post"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

