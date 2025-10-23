import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import AppNav from "@/components/AppNav";

type SortOption = "scheduled" | "status" | "created";

export default function Posts() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBlogId, setSelectedBlogId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("scheduled");

  const { data: posts } = trpc.posts.list.useQuery({}, {
    enabled: isAuthenticated,
  });

  const { data: blogConfigs } = trpc.blogConfigs.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/");
    }
  }, [loading, isAuthenticated, setLocation]);

  // Create a map of blog configs for easy lookup
  const blogConfigMap = useMemo(() => {
    return new Map(blogConfigs?.map(config => [config.id, config]) || []);
  }, [blogConfigs]);

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    if (!posts) return [];

    // Apply blog filter
    let filtered = posts;
    if (selectedBlogId !== "all") {
      filtered = posts.filter((post) => post.blogConfigId === parseInt(selectedBlogId));
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "scheduled") {
        // Smart sorting by status:
        // 1. Scheduled posts by scheduledFor (earliest first)
        // 2. Drafts by createdAt (newest first)
        // 3. Published by publishedAt (newest first)
        
        // Group by status first
        const statusOrder = { scheduled: 0, draft: 1, published: 2, failed: 3 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        
        // Within same status, apply specific sorting
        if (a.status === "scheduled" && b.status === "scheduled") {
          // Scheduled: earliest first
          if (!a.scheduledFor) return 1;
          if (!b.scheduledFor) return -1;
          return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
        } else if (a.status === "draft" && b.status === "draft") {
          // Drafts: newest first
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (a.status === "published" && b.status === "published") {
          // Published: newest first
          if (!a.publishedAt) return 1;
          if (!b.publishedAt) return -1;
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        }
        return 0;
      } else if (sortBy === "status") {
        // Sort by status alphabetically
        return a.status.localeCompare(b.status);
      } else if (sortBy === "created") {
        // Sort by created date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return sorted;
  }, [posts, selectedBlogId, sortBy]);

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Generated Posts</h1>
            <p className="text-gray-600">View and manage your AI-generated blog posts</p>
          </div>

          {/* Filters and Sorting */}
          {posts && posts.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-4">
              {/* Blog Filter */}
              {blogConfigs && blogConfigs.length > 1 && (
                <div className="w-64">
                  <Select value={selectedBlogId} onValueChange={setSelectedBlogId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by blog" />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Blogs</SelectItem>
                    {blogConfigs.map((config) => (
                      <SelectItem key={config.id} value={config.id.toString()}>
                        {config.siteName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sort Dropdown */}
              <div className="w-64">
                <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Smart Sort (Recommended)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="created">Created Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results count */}
              <div className="text-sm text-gray-600 ml-auto">
                Showing {filteredAndSortedPosts.length} of {posts.length} posts
              </div>
            </div>
          )}

          {!posts || posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                <p className="text-gray-600 mb-6">
                  Configure a blog and generate your first AI-powered post
                </p>
                <Button onClick={() => setLocation("/blogs")}>
                  Go to Blog Configurations
                </Button>
              </CardContent>
            </Card>
          ) : filteredAndSortedPosts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <h3 className="text-xl font-semibold mb-2">No posts found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters
                </p>
                <Button onClick={() => setSelectedBlogId("all")}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedPosts.map((post) => {
                const blogConfig = blogConfigMap.get(post.blogConfigId);
                const blogColor = blogConfig?.color || "#8B5CF6";

                return (
                  <Card 
                    key={post.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setLocation(`/posts/${post.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Blog badge */}
                          {blogConfig && (
                            <div className="mb-3">
                              <span
                                className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full font-medium"
                                style={{
                                  backgroundColor: `${blogColor}20`,
                                  color: blogColor,
                                }}
                              >
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: blogColor }}
                                />
                                {blogConfig.siteName}
                              </span>
                            </div>
                          )}

                          <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                          {post.excerpt && (
                            <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="capitalize">{post.status}</span>
                            <span>•</span>
                            {post.status === "scheduled" && post.scheduledFor ? (
                              <span className="text-purple-600 font-medium">
                                📅 Scheduled for {new Date(post.scheduledFor).toLocaleDateString()} at {new Date(post.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : post.publishedAt ? (
                              <span>Published {new Date(post.publishedAt).toLocaleDateString()}</span>
                            ) : (
                              <span>Created {new Date(post.createdAt).toLocaleDateString()}</span>
                            )}
                            {post.featuredImageUrl && (
                              <>
                                <span>•</span>
                                <span className="text-green-600">✓ Image</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-3 py-1 rounded-full ${
                              post.status === "published"
                                ? "bg-green-100 text-green-700"
                                : post.status === "scheduled"
                                ? "bg-purple-100 text-purple-700"
                                : post.status === "draft"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {post.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

