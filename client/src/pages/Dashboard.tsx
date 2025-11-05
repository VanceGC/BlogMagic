import { useAuth } from "@/_core/hooks/useAuth";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import AppNav from "@/components/AppNav";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBlogId, setSelectedBlogId] = React.useState<number | null>(null);

  const { data: subscription } = trpc.subscription.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: blogConfigs, refetch: refetchBlogs } = trpc.blogConfigs.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  // Auto-select first blog if none selected
  React.useEffect(() => {
    if (blogConfigs && blogConfigs.length > 0 && !selectedBlogId) {
      setSelectedBlogId(blogConfigs[0].id);
    }
  }, [blogConfigs, selectedBlogId]);

  const generatePost = trpc.posts.generate.useMutation({
    onSuccess: () => {
      toast.success("Post generated successfully! Check the Posts page.");
      refetchPosts();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate post");
    },
  });

  const { data: posts, refetch: refetchPosts } = trpc.posts.list.useQuery({}, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Welcome to {APP_TITLE}</CardTitle>
            <CardDescription>Sign in with Google to get started - we'll create your account automatically</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <a href={getLoginUrl()}>Sign In with Google →</a>
            </Button>
            <p className="text-sm text-gray-500 text-center mt-4">
              New users get 30 days free • No credit card required
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPosts = posts?.length || 0;
  const draftPosts = posts?.filter(p => p.status === 'draft').length || 0;
  const publishedPosts = posts?.filter(p => p.status === 'published').length || 0;
  const totalBlogs = blogConfigs?.length || 0;

  const hasActiveSubscription = subscription && subscription.status && ['active', 'trialing'].includes(subscription.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        {!hasActiveSubscription && (
          <Card className="mb-6 border-yellow-400 bg-yellow-50">
            <CardHeader>
              <CardTitle>Start Your Free Trial</CardTitle>
              <CardDescription>
                Get 30 days free, then just $9/month to automate your blog with AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/subscription">Start Free Trial</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Posts</CardDescription>
              <CardTitle className="text-4xl">{totalPosts}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Draft Posts</CardDescription>
              <CardTitle className="text-4xl text-yellow-600">{draftPosts}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Published</CardDescription>
              <CardTitle className="text-4xl text-green-600">{publishedPosts}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Blog Configs</CardDescription>
              <CardTitle className="text-4xl text-purple-600">{totalBlogs}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your blog automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full" variant="default">
                <Link href="/blogs">➕ Add Blog Configuration</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/settings">🔑 Configure API Keys</Link>
              </Button>
              
              {/* Blog Selection Dropdown */}
              {totalBlogs > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Select Blog:</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={selectedBlogId || ""}
                    onChange={(e) => setSelectedBlogId(Number(e.target.value))}
                  >
                    {blogConfigs?.map((blog) => (
                      <option key={blog.id} value={blog.id}>
                        {blog.siteName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  if (totalBlogs === 0) {
                    toast.error("Please create a blog configuration first");
                    setLocation("/blogs");
                  } else if (!selectedBlogId) {
                    toast.error("Please select a blog configuration");
                  } else {
                    generatePost.mutate({ blogConfigId: selectedBlogId });
                  }
                }}
                disabled={generatePost.isPending || !selectedBlogId}
              >
                ✨ {generatePost.isPending ? "Generating..." : "Generate New Post"}
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/posts">📝 View All Posts</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Follow these steps to automate your blog</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Add your OpenAI API key in Settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Create a blog configuration with your WordPress details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Install the WordPress plugin on your site</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">4</span>
                  <span>Generate your first AI-powered blog post!</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

