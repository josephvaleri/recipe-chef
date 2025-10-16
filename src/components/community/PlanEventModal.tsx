"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, Clock, MapPin, Users, ChefHat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlanEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupSlug: string;
}

export function PlanEventModal({ isOpen, onClose, groupName, groupSlug }: PlanEventModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    location: "",
    maxAttendees: "",
    eventType: "cooking" as "cooking" | "tasting" | "social" | "other",
    isVirtual: false,
  });
  const [loading, setLoading] = useState(false);

  const eventTypes = [
    { value: "cooking", label: "Cooking Session", icon: <ChefHat className="w-4 h-4" /> },
    { value: "tasting", label: "Food Tasting", icon: <Users className="w-4 h-4" /> },
    { value: "social", label: "Social Gathering", icon: <Users className="w-4 h-4" /> },
    { value: "other", label: "Other", icon: <Calendar className="w-4 h-4" /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.eventDate) return;

    setLoading(true);
    try {
      // TODO: Implement event creation API
      console.log("Creating event:", { ...formData, groupSlug });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        eventDate: "",
        eventTime: "",
        location: "",
        maxAttendees: "",
        eventType: "cooking",
        isVirtual: false,
      });
      onClose();
    } catch (error) {
      console.error("Error creating event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Plan Event
                </CardTitle>
                <CardDescription>
                  Create a new event for {groupName}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-orange-900">Event Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Italian Pasta Making Workshop"
                    required
                    maxLength={100}
                  />
                </div>

                {/* Event Type */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-orange-900">Event Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {eventTypes.map((type) => (
                      <motion.div
                        key={type.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <label className="block">
                          <input
                            type="radio"
                            name="eventType"
                            value={type.value}
                            checked={formData.eventType === type.value}
                            onChange={(e) => handleInputChange("eventType", e.target.value)}
                            className="sr-only"
                          />
                          <Card className={`cursor-pointer transition-all ${
                            formData.eventType === type.value
                              ? "ring-2 ring-orange-500 border-orange-200"
                              : "hover:border-orange-200"
                          }`}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded ${
                                  formData.eventType === type.value
                                    ? "bg-orange-100 text-orange-600"
                                    : "bg-gray-100 text-gray-600"
                                }`}>
                                  {type.icon}
                                </div>
                                <span className="text-sm font-medium">{type.label}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </label>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-orange-900">Event Date</label>
                    <Input
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => handleInputChange("eventDate", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-orange-900">Event Time</label>
                    <Input
                      type="time"
                      value={formData.eventTime}
                      onChange={(e) => handleInputChange("eventTime", e.target.value)}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-orange-900">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="Enter location or virtual meeting link"
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isVirtual"
                      checked={formData.isVirtual}
                      onChange={(e) => handleInputChange("isVirtual", e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="isVirtual" className="text-sm text-muted-foreground">
                      This is a virtual event
                    </label>
                  </div>
                </div>

                {/* Max Attendees */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-orange-900">Max Attendees (Optional)</label>
                  <Input
                    type="number"
                    value={formData.maxAttendees}
                    onChange={(e) => handleInputChange("maxAttendees", e.target.value)}
                    placeholder="e.g., 12"
                    min="1"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-orange-900">Event Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe what will happen at this event, what attendees should bring, etc..."
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {formData.description.length}/1000 characters
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading || !formData.title.trim() || !formData.eventDate}
                    className="bg-orange-600 hover:bg-orange-700 gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    {loading ? "Creating..." : "Create Event"}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
