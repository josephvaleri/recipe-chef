/**
 * About Chef Tony Page
 * The story of Chef Anthony "Tony" and his culinary journey
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefOuiOui } from '@/components/chef-ouioui';
import { useRouter } from 'next/navigation';
import { 
  ChefHat, 
  Heart, 
  MapPin, 
  GraduationCap, 
  Sparkles, 
  Globe,
  Book,
  Home,
  Baby,
  ArrowRight,
  Plane
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AboutChefTonyPage() {
  const router = useRouter();

  const milestones = [
    {
      icon: Baby,
      year: 'Age 5',
      title: 'The Plastic Knife Moment',
      description: 'Little Anthony wanted to help his dad cook. Dad handed him a plastic knife and taught him to cut garlic for Sunday sauce. A chef was born.',
      color: 'from-orange-400 to-orange-500'
    },
    {
      icon: GraduationCap,
      title: 'CIA Graduate',
      description: 'Graduated from the prestigious Culinary Institute of America, specializing in Asian cuisine (his absolute favorite!).',
      color: 'from-blue-400 to-blue-500'
    },
    {
      icon: Heart,
      title: 'La Dolce Vita',
      description: 'Met Giulia on a family trip to Italy. After COVID separated them across continents, he packed his knives and moved to Umbria to be with her.',
      color: 'from-red-400 to-pink-500'
    },
    {
      icon: Book,
      title: 'Global Cookbook Curator',
      description: 'Now curates the Global Cookbook from his parents\' olive farm in Umbria, inventing and sharing recipes from around the world.',
      color: 'from-green-400 to-emerald-500'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          
          {/* Hero Section with Avatar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Card className="bg-white/90 backdrop-blur-sm border-orange-200 p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Chef Tony Avatar */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <ChefOuiOui className="mx-auto" />
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="absolute -top-4 -right-4 bg-orange-500 text-white rounded-full p-2"
                    >
                      <ChefHat className="w-6 h-6" />
                    </motion.div>
                  </div>
                </div>

                {/* Introduction */}
                <div className="flex-1 text-left">
                  <h1 className="text-4xl font-bold text-orange-900 mb-2">
                    Meet Chef Anthony "Tony"
                  </h1>
                  <p className="text-lg text-orange-700 mb-4 italic">
                    "My parents still call me Anthony, but everyone else calls me Tony"
                  </p>
                  <div className="flex items-center gap-4 text-sm text-orange-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Umbria, Italy</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <span>Global Cookbook Curator</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <p className="text-sm text-blue-800">
                      <Sparkles className="w-4 h-4 inline mr-1" />
                      <strong>Fun fact:</strong> Yes, that avatar is really him! Those piercing blue eyes 
                      and dark hair are 100% authentic.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* The Story */}
          <div className="mb-12">
            <Card className="bg-white/90 backdrop-blur-sm border-orange-200">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-orange-900 mb-6 text-center">
                  A Culinary Love Story
                </h2>

                <div className="prose prose-orange max-w-none">
                  <p className="text-lg text-gray-700 leading-relaxed mb-4">
                    Named after his grandfather, Anthony was born in <strong>Annapolis, Maryland</strong>, 
                    where the Chesapeake Bay whispered promises of fresh seafood and adventure. His family 
                    moved to <strong>Seattle, Washington</strong> when he was just a toddler, where the 
                    Pacific Northwest taught him about wild salmon and coffee culture. At age 4, Chef Tony, 
                    his parents, and his two new sisters <strong>Malia</strong> and <strong>Angelina</strong>, 
                    settled in <strong>Ellicott City, Maryland</strong>, a charming town where his Italian 
                    American family's kitchen became his first classroom.
                  </p>

                  <p className="text-lg text-gray-700 leading-relaxed mb-4">
                    Growing up in an <strong>Italian American household</strong>, Sunday dinners were sacred. 
                    The aroma of simmering tomato sauce, the sound of fresh pasta being rolled, and the 
                    warmth of family gathered around the table shaped everything he would become. His father, 
                    recognizing a kindred spirit, started teaching him to cook at the tender age of five. 
                    The legendary moment? Little Anthony loved to watch his Dad cook and wanted to help. 
                    His dad smiled, handed him a <em>plastic knife</em>, and taught him how to cut garlic 
                    for the Sunday sauce. That simple act of trust and teaching would change everything.
                  </p>

                  <p className="text-lg text-gray-700 leading-relaxed mb-4">
                    That plastic knife moment sparked a lifelong passion. Anthony went on to attend the 
                    prestigious <strong>Culinary Institute of America (CIA)</strong>, where he 
                    specialized in <strong>Asian cuisine</strong>—a delicious plot twist for an Italian 
                    American kid! To this day, if you ask him his favorite food, he'll light up talking 
                    about Thai curries, Japanese ramen, Korean barbecue, and Vietnamese pho. The fusion 
                    of his Italian roots and Asian expertise creates magic in the kitchen.
                  </p>

                  <div className="my-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border-2 border-pink-200">
                    <div className="flex items-start gap-3">
                      <Heart className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Then Came Giulia...
                        </h3>
                        <p className="text-gray-700 leading-relaxed">
                          Everything changed on a family trip to Italy when he met <strong>Giulia</strong>, 
                          a beautiful Italian woman with eyes that sparkled like the Umbrian sun. It wasn't 
                          just love at first sight—it was love at first <em>bite</em>. She introduced him 
                          to the food of her home, <strong>Emilia-Romagna</strong>, and together they 
                          explored Italy, Europe, and soon the world together.
                        </p>
                        <p className="text-gray-700 leading-relaxed mt-3">
                          Then COVID hit, separating them across continents—he was in America, she was in 
                          Italy. But distance couldn't stop their connection. Every night he would cook 
                          with his family, and Giulia would join them on a video call to be part of the 
                          experience. They cooked together across thousands of miles, proving that food 
                          truly brings people together, no matter the distance.
                        </p>
                        <p className="text-gray-700 leading-relaxed mt-3">
                          As soon as he could, he didn't hesitate. Chef Tony packed his dreams, his knives, 
                          and his heart, and moved to <strong>Umbria, Italy</strong>—the green heart of 
                          Italy. Now, from a sun-drenched kitchen on his parents' olive farm, overlooking 
                          rolling vineyards and olive trees, he creates, experiments, and shares his 
                          culinary adventures with the world.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-lg text-gray-700 leading-relaxed mb-4">
                    These days, Chef Tony is the proud <strong>curator of the Global Cookbook</strong>, 
                    a treasure trove of recipes from every corner of the world. But here's the secret: 
                    many of those recipes aren't just curated—they're <strong>invented by him</strong>. 
                    That Asian-Italian fusion pasta? Tony's creation. He loves pushing boundaries, combining 
                    his Italian heritage with his Asian expertise, always with a mischievous grin and 
                    a "What if we tried this?" and "I think I can make it better if I add..."
                  </p>

                  <p className="text-lg text-gray-700 leading-relaxed mb-4">
                    While the world calls him Tony, his parents steadfastly call him <strong>Anthony</strong>—because 
                    that's the name they gave him. They also fell in love with Italy and moved to Umbria, 
                    where they now run an olive farm. The whole family together again, this time under 
                    the Umbrian sun—it's the kind of ending (or beginning!) that only happens in the best 
                    food stories.
                  </p>

                  <p className="text-lg text-gray-700 leading-relaxed">
                    When Chef Tony isn't inventing new recipes or curating the Global Cookbook, you'll 
                    find him at the local market in Umbria, chatting with vendors in his improving 
                    Italian, selecting the perfect ingredients for his next culinary experiment. His 
                    blue eyes still light up when he talks about food—whether it's his father's Sunday 
                    sauce or the perfect bowl of ramen. Because for Chef Tony, cooking isn't just about 
                    feeding people; it's about telling stories, building bridges between cultures, and 
                    sharing love, one recipe at a time.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Milestones */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-orange-900 text-center mb-8">
              The Journey
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {milestones.map((milestone, index) => {
                const Icon = milestone.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-white/90 backdrop-blur-sm border-orange-200 h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`flex-shrink-0 p-3 bg-gradient-to-br ${milestone.color} rounded-full`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            {milestone.year && (
                              <div className="text-sm font-semibold text-orange-600 mb-1">
                                {milestone.year}
                              </div>
                            )}
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {milestone.title}
                            </h3>
                            <p className="text-gray-700">
                              {milestone.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Fun Facts */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 mb-12">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-orange-900 mb-6 text-center">
                <Sparkles className="w-6 h-6 inline mr-2" />
                Chef Tony's Fun Facts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-gray-700">
                    Started his culinary journey at age 5 when his dad handed him a plastic knife to cut garlic for Sunday sauce
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-gray-700">
                    Born in Annapolis, MD → Seattle, WA → Ellicott City, MD → Umbria, Italy 🇮🇹
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-gray-700">
                    Has two sisters, Malia and Angelina, who grew up watching their big brother become a chef
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    4
                  </div>
                  <p className="text-gray-700">
                    Specializes in Asian cuisine but was raised on Italian American cooking (best of both worlds!)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    5
                  </div>
                  <p className="text-gray-700">
                    Met Giulia from Emilia-Romagna on a family trip to Italy—cooked together via video call during COVID before moving to be with her
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    6
                  </div>
                  <p className="text-gray-700">
                    His parents loved Italy so much they moved there too and now run an olive farm in Umbria!
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    7
                  </div>
                  <p className="text-gray-700">
                    Many recipes in the Global Cookbook are his own inventions—always asking "What if we tried this?"
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    8
                  </div>
                  <p className="text-gray-700">
                    His parents still call him "Anthony"—no shortcuts allowed in this family!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chef Tony's Signature */}
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 mb-8">
            <CardContent className="p-8 text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ChefHat className="w-16 h-16 text-white mx-auto mb-4" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-4">
                "Cooking is not just about feeding people—it's about telling stories, 
                building bridges between cultures, and sharing love, one recipe at a time."
              </h2>
              <p className="text-orange-100 text-lg">
                — Chef Anthony "Tony"
              </p>
            </CardContent>
          </Card>

          {/* Where He Lives Now */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <Card className="bg-white/90 backdrop-blur-sm border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-400 to-green-500 rounded-full">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Life in Umbria
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Chef Tony now calls the rolling hills of <strong>Umbria, Italy</strong> home. 
                  Living with Giulia on his parents' olive farm, surrounded by olive groves and vineyards, 
                  he spends his days experimenting in the kitchen, shopping at local markets, and 
                  perfecting recipes that blend his Italian American heritage with his love for 
                  Asian flavors. The best part? His whole family is there—his parents run the farm, 
                  and everyone gathers together for those sacred Sunday dinners, now under the Italian sun.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Global Cookbook Curator
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  As the curator of Recipe Chef's <strong>Global Cookbook</strong>, Tony scours 
                  the world for exceptional recipes while also inventing his own. His culinary 
                  philosophy? "Why choose between cultures when you can celebrate them all?" 
                  The result is a cookbook filled with authentic traditions, creative fusions, 
                  and dishes that tell the story of food's incredible journey across borders.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-orange-900 text-center mb-8">
              The Timeline
            </h2>
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card className="bg-white/90 backdrop-blur-sm border-orange-200 overflow-hidden">
                    <div className="flex">
                      <div className={`w-2 bg-gradient-to-b ${milestone.color}`} />
                      <CardContent className="p-6 flex-1">
                        <div className="flex items-center gap-4">
                          <div className={`flex-shrink-0 p-4 bg-gradient-to-br ${milestone.color} rounded-lg`}>
                            {React.createElement(milestone.icon, { className: 'w-8 h-8 text-white' })}
                          </div>
                          <div className="flex-1">
                            {milestone.year && (
                              <div className="text-sm font-bold text-orange-600 mb-1">
                                {milestone.year}
                              </div>
                            )}
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                              {milestone.title}
                            </h3>
                            <p className="text-gray-700 text-lg">
                              {milestone.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0">
              <CardContent className="p-10">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Ready to Cook with Chef Tony?
                </h2>
                <p className="text-orange-100 text-lg mb-6">
                  Explore the Global Cookbook and discover recipes from around the world, 
                  handpicked and often invented by Chef Tony himself!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => router.push('/finder')}
                    size="lg"
                    className="bg-white text-orange-600 hover:bg-orange-50 text-lg px-8 py-6"
                  >
                    <Globe className="w-5 h-5 mr-2" />
                    Explore Global Recipes
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    onClick={() => router.push('/cookbook')}
                    size="lg"
                    className="bg-white text-orange-600 hover:bg-orange-50 text-lg px-8 py-6"
                  >
                    <Book className="w-5 h-5 mr-2" />
                    Start Your Cookbook
                  </Button>
                  <Button
                    onClick={() => window.open('https://www.airbnb.com/rooms/1338487608075217338', '_blank')}
                    size="lg"
                    className="bg-white text-orange-600 hover:bg-orange-50 text-lg px-8 py-6"
                  >
                    <Plane className="w-5 h-5 mr-2" />
                    Visit Chef Tony in Umbria
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

