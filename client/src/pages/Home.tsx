import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {APP_TITLE}
          </h1>
          <Button asChild variant="outline">
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Automate Your Blog with AI
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Generate SEO-optimized blog posts automatically. Connect your WordPress site,
            configure your business details, and let AI create professional content for you.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600">
              <a href={getLoginUrl()}>Start Free Trial</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">Learn More</a>
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            30-day free trial • Then $9/month • Cancel anytime
          </p>
        </div>

        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <Card>
            <CardHeader>
              <div className="text-4xl mb-4">🤖</div>
              <CardTitle>AI-Powered Content</CardTitle>
              <CardDescription>
                Generate high-quality, SEO-optimized blog posts using advanced AI technology
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-4xl mb-4">🔗</div>
              <CardTitle>WordPress Integration</CardTitle>
              <CardDescription>
                Seamlessly publish to your WordPress site with our easy-to-install plugin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-4xl mb-4">🎨</div>
              <CardTitle>Auto Image Generation</CardTitle>
              <CardDescription>
                Every post includes a professionally designed featured image created by AI
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-4xl mb-4">📈</div>
              <CardTitle>SEO Optimized</CardTitle>
              <CardDescription>
                Built-in SEO optimization with meta titles, descriptions, and keyword targeting
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-4xl mb-4">⚡</div>
              <CardTitle>Autopilot Mode</CardTitle>
              <CardDescription>
                Set your posting frequency and let the platform handle everything automatically
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-4xl mb-4">🔐</div>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                Bring your own API keys for full control and transparency over costs
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center mt-20">
          <h3 className="text-3xl font-bold mb-4">Ready to Automate Your Blog?</h3>
          <p className="text-gray-600 mb-8">Start your 30-day free trial today. No credit card required.</p>
          <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600">
            <a href={getLoginUrl()}>Get Started Free</a>
          </Button>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <div className="text-center text-gray-600 text-sm">
          <p>© 2024 {APP_TITLE}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

