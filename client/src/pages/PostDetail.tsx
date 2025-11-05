import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import AppNav from "@/components/AppNav";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PostDetail() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/posts/:id");
  const postId = params?.id ? parseInt(params.id) : null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateTopic, setRegenerateTopic] = useState("");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [showScheduling, setShowScheduling] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);

  const { data: post, isLoading, refetch } = trpc.posts.getById.useQuery(
    { id: postId! },
    { enabled: !!postId && isAuthenticated }
  );

  const { data: blogConfigs } = trpc.blogConfigs.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch categories for the post's blog config
  const { data: categories, isLoading: loadingCategories } = trpc.blogConfigs.getCategories.useQuery(
    { blogConfigId: post?.blogConfigId! },
    { enabled: !!post?.blogConfigId }
  );

  useEffect(() => {
    if (categories) {
      setAvailableCategories(categories);
    }
  }, [categories]);

  const updatePost = trpc.posts.update.useMutation({
    onSuccess: () => {
      toast.success("Post updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update post");
    },
  });

  const generateImage = trpc.posts.generateImage.useMutation({
    onSuccess: () => {
      toast.success("Featured image generated!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate image");
    },
  });

  const publishPost = trpc.posts.publish.useMutation({
    onSuccess: () => {
      toast.success("Post published to WordPress!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish post");
    },
  });

  const regenerateContent = trpc.posts.regenerateContent.useMutation({
    onSuccess: (data) => {
      toast.success("Content regenerated successfully!");
      setTitle(data.title);
      setContent(data.content);
      setExcerpt(data.excerpt);
      setShowRegenerateModal(false);
      setRegenerateTopic("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to regenerate content");
    },
  });

  const updateSchedule = trpc.posts.updateSchedule.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update schedule");
    },
  });

  const changeBlogConfig = trpc.posts.changeBlogConfig.useMutation({
    onSuccess: () => {
      toast.success("Blog configuration updated!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update blog configuration");
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setContent(post.content || "");
      setExcerpt(post.excerpt || "");
      
      // Load categories - use post categories if set, otherwise use blog config defaults
      if (post.categories) {
        setSelectedCategories(JSON.parse(post.categories));
      } else {
        // Find the blog config and use its default categories
        const blogConfig = blogConfigs?.find(bc => bc.id === post.blogConfigId);
        if (blogConfig?.defaultCategories) {
          setSelectedCategories(JSON.parse(blogConfig.defaultCategories));
        }
      }
      
      if (post.scheduledFor) {
        // Convert to local datetime-local format
        const date = new Date(post.scheduledFor);
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setScheduledFor(localDateTime);
      } else {
        setScheduledFor("");
      }
    }
  }, [post]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-16">
              <h3 className="text-xl font-semibold mb-2">Post not found</h3>
              <Button onClick={() => setLocation("/posts")}>Back to Posts</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!postId) return;
    updatePost.mutate({
      id: postId,
      title,
      content,
      excerpt,
      categories: selectedCategories.length > 0 ? JSON.stringify(selectedCategories) : undefined,
    });
  };

  const handleGenerateImage = () => {
    if (!postId) return;
    generateImage.mutate({ postId });
  };

  const handlePublish = () => {
    if (!postId) return;
    publishPost.mutate({ postId });
  };

  const handleRegenerateContent = () => {
    if (!postId) return;
    regenerateContent.mutate({
      postId,
      topic: regenerateTopic || undefined,
    });
  };

  const handleSchedulePost = () => {
    if (!postId || !scheduledFor) return;
    
    // Convert local datetime to UTC
    // scheduledFor is in format "2025-11-12T10:00" which represents local time
    const localDate = new Date(scheduledFor);
    const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
    
    updateSchedule.mutate({
      postId,
      scheduledFor: utcDate.toISOString(),
      status: "scheduled",
    });
  };

  const handleChangeBlogConfig = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!postId) return;
    const newBlogConfigId = parseInt(e.target.value);
    changeBlogConfig.mutate({
      postId,
      newBlogConfigId,
    });
  };

  const handleRemoveSchedule = () => {
    if (!postId) return;
    updateSchedule.mutate({
      postId,
      scheduledFor: null,
      status: "draft",
    });
    setScheduledFor("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Button variant="ghost" onClick={() => setLocation("/posts")}>
                ← Back to Posts
              </Button>
              <h1 className="text-3xl font-bold mt-2">Edit Post</h1>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm px-3 py-1 rounded-full ${
                  post.status === "published"
                    ? "bg-green-100 text-green-700"
                    : post.status === "draft"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {post.status}
              </span>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Featured Image */}
            <Card>
              <CardHeader>
                <CardTitle>Featured Image</CardTitle>
                <CardDescription>
                  AI-generated image for your blog post
                </CardDescription>
              </CardHeader>
              <CardContent>
                {post.featuredImageUrl ? (
                  <div className="space-y-4">
                    <img
                      src={post.featuredImageUrl}
                      alt={post.title || "Featured image"}
                      className="w-full rounded-lg border"
                    />
                    <Button
                      variant="outline"
                      onClick={handleGenerateImage}
                      disabled={generateImage.isPending}
                      className="w-full"
                    >
                      {generateImage.isPending ? "Generating..." : "Regenerate Image"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-600 mb-4">No featured image yet</p>
                    <Button
                      onClick={handleGenerateImage}
                      disabled={generateImage.isPending}
                    >
                      {generateImage.isPending ? "Generating..." : "Generate Featured Image"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post Content */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Post Content</CardTitle>
                    <CardDescription>Edit your blog post details</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowRegenerateModal(true)}
                    disabled={regenerateContent.isPending}
                  >
                    🔄 Regenerate Content
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter post title..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Brief summary of the post..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your post content..."
                    rows={20}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={updatePost.isPending}
                    className="flex-1"
                  >
                    {updatePost.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={publishPost.isPending || post.status === "published"}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    {publishPost.isPending
                      ? "Publishing..."
                      : post.status === "published"
                      ? "Already Published"
                      : "Publish to WordPress"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling */}
            {post.status !== "published" && (
              <Card>
                <CardHeader>
                  <CardTitle>📅 Schedule Post</CardTitle>
                  <CardDescription>
                    {post.status === "scheduled"
                      ? "This post is scheduled for automatic publishing"
                      : "Schedule this post for future publishing"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledFor">Scheduled Date & Time</Label>
                    <Input
                      id="scheduledFor"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500">
                      Select when this post should be published (in your local timezone)
                    </p>
                  </div>

                  {post.status === "scheduled" && post.scheduledFor && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-purple-900 mb-1">
                        Currently scheduled for:
                      </p>
                      <p className="text-sm text-purple-700">
                        {new Date(post.scheduledFor).toLocaleString(undefined, {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSchedulePost}
                      disabled={!scheduledFor || updateSchedule.isPending}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {updateSchedule.isPending
                        ? "Updating..."
                        : post.status === "scheduled"
                        ? "Update Schedule"
                        : "Schedule Post"}
                    </Button>
                    {post.status === "scheduled" && (
                      <Button
                        onClick={handleRemoveSchedule}
                        disabled={updateSchedule.isPending}
                        variant="outline"
                        className="flex-1"
                      >
                        Remove Schedule
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Post Info */}
            <Card>
              <CardHeader>
                <CardTitle>Post Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                </div>
                {post.publishedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Published:</span>
                    <span>{new Date(post.publishedAt).toLocaleString()}</span>
                  </div>
                )}
                {post.wordpressPostId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">WordPress Post ID:</span>
                    <span>{post.wordpressPostId}</span>
                  </div>
                )}
                {!post.wordpressPostId && blogConfigs && blogConfigs.length > 0 && (
                  <div className="pt-3 border-t">
                    {(post as any).isOrphaned ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <Label htmlFor="blogConfig" className="text-orange-700 font-semibold">
                            Blog Configuration Deleted
                          </Label>
                        </div>
                        <p className="text-sm text-orange-600 mb-3">
                          The blog configuration for this post was deleted. Please reassign to a different blog or delete this post.
                        </p>
                      </>
                    ) : blogConfigs.length > 1 ? (
                      <>
                        <Label htmlFor="blogConfig" className="text-gray-600 mb-2 block">
                          Blog Configuration
                        </Label>
                        <p className="text-xs text-gray-500 mb-2">
                          Change which WordPress site this post will be published to
                        </p>
                      </>
                    ) : null}
                    <select
                      id="blogConfig"
                      value={post.blogConfigId}
                      onChange={handleChangeBlogConfig}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      disabled={changeBlogConfig.isPending}
                    >
                      {(post as any).isOrphaned && <option value="" disabled>Select a blog configuration</option>}
                      {blogConfigs.map((config) => (
                        <option key={config.id} value={config.id}>
                          {config.siteName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* WordPress Categories */}
                {!post.wordpressPostId && (
                  <div className="pt-3 border-t">
                    <Label className="text-gray-600 mb-2 block">WordPress Categories</Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Select categories for this post when publishing to WordPress
                    </p>
                    {loadingCategories ? (
                      <div className="text-sm text-gray-500">Loading categories...</div>
                    ) : availableCategories.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {availableCategories.map((category) => (
                          <label
                            key={category.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(category.id)}
                              onChange={(e) => {
                                const newCategories = e.target.checked
                                  ? [...selectedCategories, category.id]
                                  : selectedCategories.filter(id => id !== category.id);
                                setSelectedCategories(newCategories);
                                // Debounced save will trigger from useEffect
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{category.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        No categories available. Check blog configuration.
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Regenerate Content Modal */}
      <Dialog open={showRegenerateModal} onOpenChange={setShowRegenerateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Post Content</DialogTitle>
            <DialogDescription>
              Generate new title, excerpt, and content while keeping the featured image.
              Optionally specify a topic, or leave blank to generate based on your blog configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="regenerate-topic">Topic (Optional)</Label>
              <Input
                id="regenerate-topic"
                value={regenerateTopic}
                onChange={(e) => setRegenerateTopic(e.target.value)}
                placeholder="e.g., 'How to improve productivity with AI tools'"
              />
              <p className="text-sm text-gray-500">
                Leave blank to auto-generate a topic tailored to your audience
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRegenerateModal(false);
                setRegenerateTopic("");
              }}
              disabled={regenerateContent.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegenerateContent}
              disabled={regenerateContent.isPending}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {regenerateContent.isPending ? "Regenerating..." : "✨ Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

