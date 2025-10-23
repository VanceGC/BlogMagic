import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";
import AppNav from "@/components/AppNav";

export default function Posts() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: posts } = trpc.posts.list.useQuery({}, {
    enabled: isAuthenticated,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Generated Posts</h1>
            <p className="text-gray-600">View and manage your AI-generated blog posts</p>
          </div>

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
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card 
                  key={post.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/posts/${post.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                        {post.excerpt && (
                          <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="capitalize">{post.status}</span>
                          <span>•</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          {post.publishedAt && (
                            <>
                              <span>•</span>
                              <span>Published {new Date(post.publishedAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${
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
