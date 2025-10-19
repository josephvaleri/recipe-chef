"use client";

import React from "react";
// Removed Tabs imports - using custom segmented control instead
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// ScrollArea and Separator components not available, using divs instead
import { Hash, Search, Users, Plus, ExternalLink, Calendar, Columns, Grid3X3, List, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import MyFeed from "./MyFeed";
import Discovery from "./Discovery";

type GlobalRecipeItem = {
  user_recipe_id: number;
  title: string | null;
  accepted_at: string | null;
  author_name?: string | null;
};

type GroupCard = {
  group_id: number;
  name: string;
  slug: string;
  category: "cuisine" | "focus" | "identity";
  description: string | null;
};

export default function CommunityLayoutsPreview({
  globalRecipes,
  myGroups,
}: {
  globalRecipes: GlobalRecipeItem[];
  myGroups: GroupCard[];
}) {
  // CACHE BUST - v1.2.2 - Force browser to reload new layout
  const [activeLayout, setActiveLayout] = React.useState("three");
  function TopicsPanel() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search topics (#tag)" className="pl-9" />
          </div>
          <div className="text-xs text-muted-foreground">
            Topic hubs coming soon. Search by hashtags and mentions in Phase 2.
          </div>
        </CardContent>
      </Card>
    );
  }

  function MyBadgesPanel() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            My Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Your earned badges will appear here. Keep cooking to unlock achievements!
          </div>
          <Button size="sm" variant="outline" className="w-full" asChild>
            <Link href="/badges">
              View All Badges
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function MyFeedSection() {
    return <MyFeed />;
  }

  function DiscoverySection() {
    return <Discovery />;
  }

  function MyGroupsList() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Your Groups & Clubs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myGroups.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              You're not in any groups yet. Join some communities to get started!
            </div>
          ) : (
            <div className="h-[320px] overflow-y-auto pr-2">
              <div className="space-y-3">
                {myGroups.map((g) => (
                  <div key={g.group_id}>
                    <Link href={`/groups/${g.slug}`} className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-orange-100 hover:border-orange-200 transition-colors cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-orange-900">
                          {g.name}
                        </div>
                        <div className="text-xs text-orange-600 flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className="rounded-full text-xs"
                          >
                            {g.category}
                          </Badge>
                          <span>/groups/{g.slug}</span>
                        </div>
                        {g.description && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {g.description}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        Open
                      </Button>
                      </div>
                    </Link>
                    <div className="my-2 border-t border-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 space-y-2">
            <Button size="sm" className="gap-2 w-full" asChild>
              <Link href="/groups/create">
                <Plus className="h-4 w-4" /> 
                Create Group
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="gap-2 w-full" asChild>
              <Link href="/groups">
                <Hash className="h-4 w-4" /> 
                Discover Groups
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function EditorsTableCard() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Editor's Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Featured recipes and culinary highlights coming soon.
          </div>
        </CardContent>
      </Card>
    );
  }

  function TopBadgeWinnersCard() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Badge Winners</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Leaderboard and achievement highlights coming soon.
          </div>
        </CardContent>
      </Card>
    );
  }

  function RecipeOfMonthCard() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recipe of the Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Community-voted recipe spotlight coming soon.
          </div>
        </CardContent>
      </Card>
    );
  }

  function TechniqueOfMonthCard() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Technique of the Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Featured cooking techniques and tutorials coming soon.
          </div>
        </CardContent>
      </Card>
    );
  }

  function ThreeColumn() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Featured Content */}
        <aside className="lg:col-span-3 space-y-4">
          <EditorsTableCard />
          <TopBadgeWinnersCard />
          <RecipeOfMonthCard />
          <TechniqueOfMonthCard />
        </aside>
        
        {/* Center Column: Topics and Your Clubs - UPDATED LAYOUT */}
        <main className="lg:col-span-6 space-y-4">
          <TopicsPanel />
          <MyGroupsList />
        </main>
        
        {/* Right Column: My Feed and Discovery - UPDATED LAYOUT */}
        <aside className="lg:col-span-3 space-y-4">
          <MyFeedSection />
          <DiscoverySection />
        </aside>
      </div>
    );
  }

  function TwoColumn() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <TopicsPanel />
          <MyGroupsList />
          <MyBadgesPanel />
        </div>
        <div className="space-y-4">
          <MyFeedSection />
          <DiscoverySection />
          <EditorsTableCard />
          <TopBadgeWinnersCard />
          <RecipeOfMonthCard />
          <TechniqueOfMonthCard />
        </div>
      </div>
    );
  }

  function GridHub() {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MyFeedSection />
        <DiscoverySection />
        <TopicsPanel />
        <MyGroupsList />
        <MyBadgesPanel />
        <EditorsTableCard />
        <TopBadgeWinnersCard />
        <RecipeOfMonthCard />
        <TechniqueOfMonthCard />
      </div>
    );
  }

  const renderLayoutButtons = () => (
    <div className="inline-flex items-center justify-center rounded-xl border border-yellow-300 bg-orange-50 p-1 mb-6">
      <button
        onClick={() => setActiveLayout("three")}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          activeLayout === "three"
            ? "bg-orange-600 text-white shadow-sm"
            : "text-orange-700 hover:text-orange-800"
        }`}
      >
        <List className="w-4 h-4 mr-2" />
        Three-Column
      </button>
      <button
        onClick={() => setActiveLayout("two")}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          activeLayout === "two"
            ? "bg-orange-600 text-white shadow-sm"
            : "text-orange-700 hover:text-orange-800"
        }`}
      >
        <Columns className="w-4 h-4 mr-2" />
        Two-Column
      </button>
      <button
        onClick={() => setActiveLayout("grid")}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          activeLayout === "grid"
            ? "bg-orange-600 text-white shadow-sm"
            : "text-orange-700 hover:text-orange-800"
        }`}
      >
        <Grid3X3 className="w-4 h-4 mr-2" />
        Grid Hub
      </button>
    </div>
  );

  return (
    <div>
      {renderLayoutButtons()}
      
      {activeLayout === "three" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ThreeColumn />
        </motion.div>
      )}

      {activeLayout === "two" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TwoColumn />
        </motion.div>
      )}

      {activeLayout === "grid" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GridHub />
        </motion.div>
      )}
    </div>
  );
}
