import { useAuth } from "@/_core/hooks/useAuth";
import AppNav from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Calendar() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBlogId, setSelectedBlogId] = useState<string>("all");

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Create a map of blog configs for easy lookup
  const blogConfigMap = new Map(blogConfigs?.map(config => [config.id, config]) || []);

  // Filter scheduled posts
  let scheduledPosts = posts?.filter((post) => post.status === "scheduled" && post.scheduledFor) || [];
  
  // Apply blog filter
  if (selectedBlogId !== "all") {
    scheduledPosts = scheduledPosts.filter((post) => post.blogConfigId === parseInt(selectedBlogId));
  }

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter((post) =>
      post.scheduledFor && isSameDay(new Date(post.scheduledFor), date)
    );
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const today = () => setCurrentMonth(new Date());

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

  // Calculate stats
  const upcomingPosts = scheduledPosts.filter(
    (post) => post.scheduledFor && new Date(post.scheduledFor) > new Date()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Content Calendar</h1>
              <p className="text-gray-600">View and manage your scheduled blog posts</p>
            </div>
            
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
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-purple-600">{scheduledPosts.length}</div>
                <div className="text-sm text-gray-600">Total Scheduled</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-blue-600">{upcomingPosts.length}</div>
                <div className="text-sm text-gray-600">Upcoming Posts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">
                  {scheduledPosts.filter((p) => p.featuredImageUrl).length}
                </div>
                <div className="text-sm text-gray-600">With Images</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {format(currentMonth, "MMMM yyyy")}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={prevMonth}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                    <Button variant="outline" size="sm" onClick={today}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const dayPosts = getPostsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          relative min-h-[80px] p-2 rounded-lg border-2 transition-all
                          ${isCurrentMonth ? "bg-white" : "bg-gray-50"}
                          ${isToday ? "border-blue-500" : "border-gray-200"}
                          ${isSelected ? "ring-2 ring-purple-500 border-purple-500" : ""}
                          ${dayPosts.length > 0 ? "hover:shadow-md" : ""}
                          hover:border-gray-300
                        `}
                      >
                        <div
                          className={`
                            text-sm font-medium mb-1
                            ${!isCurrentMonth ? "text-gray-400" : "text-gray-900"}
                            ${isToday ? "text-blue-600 font-bold" : ""}
                          `}
                        >
                          {format(day, "d")}
                        </div>

                        {dayPosts.length > 0 && (
                          <div className="space-y-1">
                            {dayPosts.slice(0, 2).map((post) => {
                              const blogConfig = blogConfigMap.get(post.blogConfigId);
                              const blogColor = blogConfig?.color || "#8B5CF6";
                              
                              return (
                                <div
                                  key={post.id}
                                  className="text-xs px-2 py-1 rounded truncate"
                                  style={{ 
                                    backgroundColor: `${blogColor}20`,
                                    color: blogColor,
                                    borderLeft: `3px solid ${blogColor}`
                                  }}
                                  title={`${blogConfig?.siteName}: ${post.title}`}
                                >
                                  {post.title.substring(0, 20)}...
                                </div>
                              );
                            })}
                            {dayPosts.length > 2 && (
                              <div className="text-xs text-gray-500 font-medium">
                                +{dayPosts.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected date details */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  selectedDatePosts.length > 0 ? (
                    <div className="space-y-4">
                      {selectedDatePosts.map((post) => {
                        const blogConfig = blogConfigMap.get(post.blogConfigId);
                        const blogColor = blogConfig?.color || "#8B5CF6";
                        
                        return (
                          <div
                            key={post.id}
                            className="p-4 rounded-lg cursor-pointer hover:shadow-md transition-all border-l-4"
                            style={{ 
                              backgroundColor: `${blogColor}10`,
                              borderLeftColor: blogColor
                            }}
                            onClick={() => setLocation(`/posts/${post.id}`)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: blogColor }}
                              />
                              <span className="text-xs font-medium text-gray-600">
                                {blogConfig?.siteName}
                              </span>
                            </div>
                            <h4 className="font-semibold text-sm mb-2 line-clamp-2">{post.title}</h4>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>
                                ⏰ {format(new Date(post.scheduledFor!), "h:mm a")}
                              </div>
                              {post.featuredImageUrl && (
                                <div className="text-green-600">✓ Has image</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm">No posts scheduled for this date</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Click on a date to see scheduled posts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 ring-2 ring-purple-500 rounded"></div>
                  <span>Selected Date</span>
                </div>
                
                {/* Blog color legend */}
                {blogConfigs && blogConfigs.length > 0 && (
                  <>
                    <div className="w-px h-4 bg-gray-300"></div>
                    {blogConfigs.map((config) => (
                      <div key={config.id} className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: config.color || "#8B5CF6" }}
                        />
                        <span>{config.siteName}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

