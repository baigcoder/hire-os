/**
 * NetworkConnections Component
 * Professional networking with connection requests and AI suggestions
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  Mail,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CONNECTIONS_API_END_POINT } from "@/utils/constant";

const NetworkConnections = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("connections"); // connections, pending, suggestions
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchConnections();
    fetchPendingRequests();
    fetchSuggestions();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await axios.get(
        `${CONNECTIONS_API_END_POINT}?status=accepted`,
        { withCredentials: true },
      );
      if (res.data.success) {
        setConnections(res.data.connections || []);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await axios.get(`${CONNECTIONS_API_END_POINT}/pending`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setPendingRequests(res.data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await axios.get(`${CONNECTIONS_API_END_POINT}/suggestions`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setSuggestions(res.data.suggestions || []);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleAccept = async (connectionId) => {
    try {
      const res = await axios.put(
        `${CONNECTIONS_API_END_POINT}/accept/${connectionId}`,
        {},
        { withCredentials: true },
      );
      if (res.data.success) {
        toast.success("Connection accepted!");
        fetchConnections();
        fetchPendingRequests();
      }
    } catch (error) {
      toast.error("Failed to accept connection");
    }
  };

  const handleReject = async (connectionId) => {
    try {
      const res = await axios.delete(
        `${CONNECTIONS_API_END_POINT}/${connectionId}`,
        { withCredentials: true },
      );
      if (res.data.success) {
        toast.success("Request declined");
        fetchPendingRequests();
      }
    } catch (error) {
      toast.error("Failed to decline request");
    }
  };

  const handleConnect = async (userId) => {
    try {
      const res = await axios.post(
        `${CONNECTIONS_API_END_POINT}/request/${userId}`,
        {},
        { withCredentials: true },
      );
      if (res.data.success) {
        toast.success("Connection request sent!");
        // Remove from suggestions
        setSuggestions((prev) => prev.filter((s) => s._id !== userId));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    }
  };

  const filteredConnections = connections.filter(
    (conn) =>
      conn.user?.fullname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getRoleBadge = (role) => {
    switch (role) {
      case "recruiter":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "student":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "company_admin":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-[#FFD700]" /> Network
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {connections.length} connections
            {pendingRequests.length > 0 &&
              ` • ${pendingRequests.length} pending`}
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <Input
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#111111] border border-white/10 rounded-xl p-1.5 inline-flex gap-1">
        {[
          {
            id: "connections",
            label: "Connections",
            icon: Users,
            count: connections.length,
          },
          {
            id: "pending",
            label: "Pending",
            icon: UserPlus,
            count: pendingRequests.length,
          },
          {
            id: "suggestions",
            label: "Suggestions",
            icon: Sparkles,
            count: suggestions.length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-[#FFD700] text-black"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-black/20" : "bg-white/10"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "connections" && (
          <motion.div
            key="connections"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-white/10" />
                      <div className="flex-1">
                        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-white/10 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">
                  {searchQuery
                    ? "No matching connections"
                    : "No connections yet"}
                </h3>
                <p className="text-gray-500 mb-6">
                  Start building your professional network
                </p>
                <Button
                  className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                  onClick={() => setActiveTab("suggestions")}
                >
                  Find People to Connect
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConnections.map((conn, idx) => (
                  <motion.div
                    key={conn.connectionId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-[#111111] border border-white/10 rounded-xl p-5 hover:border-[#FFD700]/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12 border-2 border-white/10">
                        <AvatarImage src={conn.user?.profile?.profilePhoto} />
                        <AvatarFallback className="bg-[#FFD700]/20 text-[#FFD700]">
                          {conn.user?.fullname?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate group-hover:text-[#FFD700] transition-colors">
                          {conn.user?.fullname}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">
                          {conn.user?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <Badge className={getRoleBadge(conn.user?.role)}>
                        {conn.user?.role?.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Connected{" "}
                        {new Date(conn.connectedAt).toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" },
                        )}
                      </span>
                    </div>

                    {/* Skills */}
                    {conn.user?.profile?.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {conn.user.profile.skills
                          .slice(0, 3)
                          .map((skill, i) => (
                            <Badge
                              key={i}
                              className="bg-white/5 text-gray-400 border-white/10 text-[10px]"
                            >
                              {skill}
                            </Badge>
                          ))}
                        {conn.user.profile.skills.length > 3 && (
                          <Badge className="bg-white/5 text-gray-500 border-white/10 text-[10px]">
                            +{conn.user.profile.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-white/10 text-gray-400 hover:text-white hover:border-[#FFD700]/30"
                      onClick={() => navigate("/messages")}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" /> Message
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {pendingRequests.length === 0 ? (
              <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                <UserPlus className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">
                  No pending requests
                </h3>
                <p className="text-gray-500">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request, idx) => (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 p-4 bg-[#111111] border border-white/10 rounded-xl hover:border-cyan-500/30 transition-all"
                  >
                    <Avatar className="h-14 w-14 border-2 border-cyan-500/30">
                      <AvatarImage
                        src={request.requester?.profile?.profilePhoto}
                      />
                      <AvatarFallback className="bg-cyan-500/20 text-cyan-400">
                        {request.requester?.fullname?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h4 className="font-semibold text-white">
                        {request.requester?.fullname}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {request.requester?.profile?.bio?.slice(0, 50)}...
                      </p>
                      {request.message && (
                        <p className="text-xs text-cyan-400 mt-1">
                          "{request.message}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => handleAccept(request._id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleReject(request._id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "suggestions" && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-4 p-4 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl">
              <div className="flex items-center gap-2 text-[#FFD700]">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">
                  AI-Powered Suggestions
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Based on your skills and career goals
              </p>
            </div>

            {suggestions.length === 0 ? (
              <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">
                  No suggestions available
                </h3>
                <p className="text-gray-500">
                  Check back later for new suggestions
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((user, idx) => (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-[#111111] border border-white/10 rounded-xl p-5 hover:border-[#FFD700]/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12 border-2 border-white/10">
                        <AvatarImage src={user.profile?.profilePhoto} />
                        <AvatarFallback className="bg-[#FFD700]/20 text-[#FFD700]">
                          {user.fullname?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">
                          {user.fullname}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">
                          {user.reason}
                        </p>
                      </div>
                      {user.matchScore > 0 && (
                        <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20">
                          {user.matchScore}%
                        </Badge>
                      )}
                    </div>

                    <Badge className={getRoleBadge(user.role)}>
                      {user.role?.replace("_", " ")}
                    </Badge>

                    {user.sharedSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 mb-4">
                        {user.sharedSkills.slice(0, 3).map((skill, i) => (
                          <Badge
                            key={i}
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button
                      size="sm"
                      className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90 mt-2"
                      onClick={() => handleConnect(user._id)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" /> Connect
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkConnections;
