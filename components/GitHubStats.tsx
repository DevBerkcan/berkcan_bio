"use client";

import { motion } from "framer-motion";
import { Github, Star, GitFork, Code2 } from "lucide-react";
import { useEffect, useState } from "react";

interface GitHubData {
  public_repos: number;
  followers: number;
}

export const GitHubStats = () => {
  const [stats, setStats] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.github.com/users/DevBerkcan")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="mt-6 rounded-xl bg-gray-900 p-4 text-white"
    >
      <div className="flex items-center gap-2 mb-3">
        <Github size={18} />
        <span className="text-sm font-medium">GitHub Stats</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2">
            <Code2 size={16} className="text-violet-400" />
            <div>
              <p className="text-lg font-bold">{stats.public_repos}</p>
              <p className="text-xs text-gray-400">Repos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2">
            <Star size={16} className="text-yellow-400" />
            <div>
              <p className="text-lg font-bold">{stats.followers}</p>
              <p className="text-xs text-gray-400">Followers</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center">Stats nicht verfügbar</p>
      )}
    </motion.div>
  );
};
