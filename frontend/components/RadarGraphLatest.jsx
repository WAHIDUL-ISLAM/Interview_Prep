"use client";

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

// Define the maximum score here so it's easy to change later
const MAX_SCORE = 250;

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl shadow-xl">
                <p className="text-slate-300 font-medium text-xs uppercase tracking-wider mb-1">
                    {payload[0].payload.subject}
                </p>
                <div className="flex items-baseline gap-1">
                    {/* What you got */}
                    <span className="text-2xl font-bold text-indigo-400">
                        {payload[0].value}
                    </span>
                    {/* The Maximum (250) */}
                    <span className="text-xs text-slate-500">/ {MAX_SCORE}</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function RadarGraphLatest({ latest }) {
    if (!latest) return null;

    const data = [
        { subject: "Clarity", score: latest.total_clarity ?? 0 },
        { subject: "Relevance", score: latest.total_relevance ?? 0 },
        { subject: "Depth", score: latest.total_depth ?? 0 },
        { subject: "Structure", score: latest.total_structure ?? 0 },
    ];

    return (
        <div className="w-full h-full min-h-[350px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <defs>
                        <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>

                    <PolarGrid gridType="polygon" stroke="#e2e8f0" strokeOpacity={0.1} />

                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{
                            fill: "#94a3b8",
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    />

                    {/* This ensures the graph visualizes the data relative to 250 */}
                    <PolarRadiusAxis
                        angle={90}
                        domain={[0, MAX_SCORE]}
                        tick={false}
                        axisLine={false}
                    />

                    <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#818cf8"
                        strokeWidth={3}
                        fill="url(#radarFill)"
                        fillOpacity={0.6}
                        isAnimationActive={true}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={false} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}