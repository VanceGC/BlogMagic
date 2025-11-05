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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppNav from "@/components/AppNav";
import { toast } from "sonner";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function BlogConfigs() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
  
  // Scheduling fields
  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [autoPublish, setAutoPublish] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1); // Monday
  const [timezone, setTimezone] = useState("America/New_York");
  const [color, setColor] = useState("#8B5CF6");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);

  // Category fetching - use different endpoints for editing vs creating
  const [categoryBlogConfigId, setCategoryBlogConfigId] = useState<number | null>(null);
  const [fetchCategoriesManually, setFetchCategoriesManually] = useState(false);
  
  // For editing existing blog configs
  const { data: categoriesFromConfig, isLoading: loadingCategoriesFromConfig } = trpc.blogConfigs.getCategories.useQuery(
    { blogConfigId: categoryBlogConfigId! },
    { enabled: categoryBlogConfigId !== null }
  );
  
  // For creating new blog configs (fetch by credentials)
  const { data: categoriesFromCredentials, isLoading: loadingCategoriesFromCredentials } = trpc.blogConfigs.getCategoriesByCredentials.useQuery(
    {
      wordpressUrl,
      wordpressUsername,
      wordpressAppPassword,
    },
    { enabled: fetchCategoriesManually && !editingId && !!wordpressUrl && !!wordpressUsername && !!wordpressAppPassword }
  );
  
  const categories = editingId ? categoriesFromConfig : categoriesFromCredentials;
  const loadingCategories = editingId ? loadingCategoriesFromConfig : loadingCategoriesFromCredentials;

  useEffect(() => {
    if (categories) {
      setAvailableCategories(categories);
    }
  }, [categories]);

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
    onError: (error: any) => {
      toast.error(error.message || "Failed to create blog configuration");
    },
  });

  const updateConfig = trpc.blogConfigs.update.useMutation({
    onSuccess: () => {
      toast.success("Blog configuration updated successfully");
      setIsOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update blog configuration");
    },
  });

  const deleteConfig = trpc.blogConfigs.delete.useMutation({
    onSuccess: () => {
      toast.success("Blog configuration deleted");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete blog configuration");
    },
  });

  const enableScheduling = trpc.blogConfigs.enableScheduling.useMutation({
    onSuccess: () => {
      toast.success("Scheduling enabled! Next 3 posts generated.");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to enable scheduling");
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
    setSchedulingEnabled(false);
    setAutoPublish(false);
    setScheduleTime("09:00");
    setScheduleDayOfWeek(1);
    setTimezone("America/New_York");
    setColor("#8B5CF6");
    setEditingId(null);
    setSelectedCategories([]);
    setAvailableCategories([]);
    setFetchCategoriesManually(false);
    setCategoryBlogConfigId(null);
  };

  const loadConfigForEdit = (config: any) => {
    setEditingId(config.id);
    setSiteName(config.siteName);
    setWordpressUrl(config.wordpressUrl);
    setWordpressUsername(config.wordpressUsername || "");
    setWordpressAppPassword(config.wordpressAppPassword || "");
    setBusinessDescription(config.businessDescription || "");
    setCompetitors(config.competitors || "");
    setKeywords(config.keywords || "");
    setLocale(config.locale || "national");
    setTargetAudience(config.targetAudience || "");
    setToneOfVoice(config.toneOfVoice || "professional");
    setPostingFrequency(config.postingFrequency || "weekly");
    setSchedulingEnabled(config.schedulingEnabled === 1);
    setAutoPublish(config.autoPublish === 1);
    setScheduleTime(config.scheduleTime || "09:00");
    setScheduleDayOfWeek(config.scheduleDayOfWeek || 1);
    setTimezone(config.timezone || "America/New_York");
    setColor(config.color || "#8B5CF6");
    
    // Load categories
    const savedCategories = config.defaultCategories ? JSON.parse(config.defaultCategories) : [];
    setSelectedCategories(savedCategories);
    
    // Trigger category fetch from WordPress
    setCategoryBlogConfigId(config.id);
    
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !wordpressUrl) {
      toast.error("Please fill in required fields");
      return;
    }

    const data = {
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
      schedulingEnabled: schedulingEnabled ? 1 : 0,
      autoPublish: autoPublish ? 1 : 0,
      scheduleTime: schedulingEnabled ? scheduleTime : undefined,
      scheduleDayOfWeek: schedulingEnabled && (postingFrequency === "weekly" || postingFrequency === "biweekly") ? scheduleDayOfWeek : undefined,
      timezone,
      color,
      defaultCategories: selectedCategories.length > 0 ? JSON.stringify(selectedCategories) : undefined,
    };

    if (editingId) {
      updateConfig.mutate({ id: editingId, ...data });
    } else {
      createConfig.mutate(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const showDayOfWeek = postingFrequency === "weekly" || postingFrequency === "biweekly";

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Blog Configurations</h1>
              <p className="text-gray-600">Manage your WordPress blog settings and scheduling</p>
            </div>
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600" onClick={resetForm}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Blog Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Blog Configuration" : "Add Blog Configuration"}</DialogTitle>
                  <DialogDescription>
                    {editingId ? "Update your WordPress blog settings" : "Configure your WordPress blog for automated content generation"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Basic Settings</h3>
                    
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

                    <div className="space-y-2">
                      <Label htmlFor="color">Blog Color</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="color"
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-20 h-10 cursor-pointer"
                        />
                        <span className="text-sm text-gray-600">Choose a color to identify this blog</span>
                      </div>
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

                    {/* WordPress Categories */}
                    {(editingId || (wordpressUrl && wordpressUsername && wordpressAppPassword)) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Default WordPress Categories</Label>
                            <p className="text-sm text-gray-500 mb-2">
                              Select categories for scheduled posts (you can override per post)
                            </p>
                          </div>
                          {!editingId && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFetchCategoriesManually(true)}
                              disabled={loadingCategories || !wordpressUrl || !wordpressUsername || !wordpressAppPassword}
                            >
                              {loadingCategories ? "Loading..." : "Fetch Categories"}
                            </Button>
                          )}
                        </div>
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
                                    if (e.target.checked) {
                                      setSelectedCategories([...selectedCategories, category.id]);
                                    } else {
                                      setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm">{category.name}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            No categories found. Make sure WordPress credentials are correct.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content Settings */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg">Content Settings</h3>
                    
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
                  </div>

                  {/* Scheduling Settings */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg">Scheduling Settings</h3>
                    
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div>
                        <Label htmlFor="schedulingEnabled" className="text-base font-medium">Enable Auto-Scheduling</Label>
                        <p className="text-sm text-gray-600 mt-1">Automatically generate and schedule posts</p>
                      </div>
                      <Switch
                        id="schedulingEnabled"
                        checked={schedulingEnabled}
                        onCheckedChange={setSchedulingEnabled}
                      />
                    </div>

                    {schedulingEnabled && (
                      <>
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div>
                            <Label htmlFor="autoPublish" className="text-base font-medium">Auto-Publish Posts</Label>
                            <p className="text-sm text-gray-600 mt-1">Publish automatically or save as drafts for review</p>
                          </div>
                          <Switch
                            id="autoPublish"
                            checked={autoPublish}
                            onCheckedChange={setAutoPublish}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="scheduleTime">Post Time</Label>
                            <Input
                              id="scheduleTime"
                              type="time"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="timezone">Timezone</Label>
                            <Select value={timezone} onValueChange={setTimezone}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIMEZONES.map((tz) => (
                                  <SelectItem key={tz} value={tz}>
                                    {tz.replace(/_/g, " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {showDayOfWeek && (
                          <div className="space-y-2">
                            <Label htmlFor="scheduleDayOfWeek">Day of Week</Label>
                            <Select value={scheduleDayOfWeek.toString()} onValueChange={(v) => setScheduleDayOfWeek(parseInt(v))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS_OF_WEEK.map((day) => (
                                  <SelectItem key={day.value} value={day.value.toString()}>
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> When you enable scheduling, the system will automatically generate the next 3 blog posts as {autoPublish ? "scheduled for auto-publishing" : "drafts for your review"}.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createConfig.isPending || updateConfig.isPending}>
                      {editingId 
                        ? (updateConfig.isPending ? "Updating..." : "Update Configuration")
                        : (createConfig.isPending ? "Creating..." : "Create Configuration")
                      }
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
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: config.color || "#8B5CF6" }}
                        />
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
                      </div>
                      <div className="flex gap-2">
                        {config.schedulingEnabled === 1 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                            ⏰ Scheduled
                          </span>
                        )}
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
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {config.schedulingEnabled === 1 && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm font-semibold text-purple-900 mb-1">Scheduling Active</p>
                        <p className="text-xs text-purple-700">
                          {config.postingFrequency} at {config.scheduleTime || "09:00"} ({config.timezone})
                        </p>
                        <p className="text-xs text-purple-700">
                          {config.autoPublish === 1 ? "Auto-publishing enabled" : "Saving as drafts"}
                        </p>
                      </div>
                    )}

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

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => loadConfigForEdit(config)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setLocation(`/posts?blog=${config.id}`)}
                      >
                        View Posts
                      </Button>
                      {config.schedulingEnabled === 0 && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => enableScheduling.mutate({ id: config.id })}
                          disabled={enableScheduling.isPending}
                        >
                          {enableScheduling.isPending ? "Enabling..." : "Enable Scheduling"}
                        </Button>
                      )}
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
