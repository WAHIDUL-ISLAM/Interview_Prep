// import React from "react";
// import {
//     LineChart,
//     Line,
//     XAxis,
//     YAxis,
//     CartesianGrid,
//     Tooltip,
//     ResponsiveContainer,
//     Label,
// } from "recharts";

// const CustomTooltip = ({ active, payload, label }) => {
//     if (active && payload && payload.length) {
//         const { score } = payload[0].payload;
//         return (
//             <div className="score_info">
//                 <strong>Attempt #{label}</strong>
//                 <br />
//                 Score: <span className="grad_text fw-bold">{score}/100</span>
//             </div>
//         );
//     }
//     return null;
// };

// export default function AttemptsChart({ attempts }) {
//     if (!attempts || !Array.isArray(attempts)) return null;

//     // FIX ORDER — Attempt 1 → Attempt 2 → Attempt 3 → …
//     const data = attempts.map((a, index) => ({
//         attempt: index + 1,
//         score: a.overall_score ?? 0,
//     }));

//     return (
//         <div className="w-full h-80 p-6 rounded-2xl dark-gradient border border-border shadow-xl">
//             <h2 className="text-primary-200 font-bold text-xl mb-4">
//                 📊 Recent Scores
//             </h2>

//             <ResponsiveContainer width="100%" height={230}>
//                 <LineChart
//                     data={data}
//                     margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
//                 >
//                     {/* Gradient for the score line */}
//                     <defs>
//                         <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
//                             <stop offset="5%" stopColor="#49de50" stopOpacity={0.9} />
//                             <stop offset="95%" stopColor="#49de50" stopOpacity={0.2} />
//                         </linearGradient>
//                     </defs>

//                     <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />

//                     {/* X Axis */}
//                     <XAxis dataKey="attempt" stroke="#cac5fe">
//                         <Label
//                             value="Attempts"
//                             offset={-20}
//                             position="insideBottom"
//                             fill="#bbb"
//                         />
//                     </XAxis>

//                     {/* Y Axis */}
//                     <YAxis domain={[0, 100]} stroke="#cac5fe">
//                         <Label
//                             value="Score"
//                             angle={-90}
//                             position="insideLeft"
//                             fill="#bbb"
//                         />
//                     </YAxis>

//                     <Tooltip content={<CustomTooltip />} />

//                     {/* Score Line */}
//                     <Line
//                         type="monotone"
//                         dataKey="score"
//                         stroke="url(#scoreGradient)"
//                         strokeWidth={3}
//                         dot={{
//                             stroke: "#49de50",
//                             strokeWidth: 2,
//                             r: 5,
//                             fill: "#fff",
//                         }}
//                         activeDot={{
//                             stroke: "#fff",
//                             strokeWidth: 3,
//                             r: 7,
//                             fill: "#49de50",
//                         }}
//                     />
//                 </LineChart>
//             </ResponsiveContainer>
//         </div>
//     );
// }



import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Label,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const { score } = payload[0].payload;
        return (
            <div className="score_info">
                <strong>Attempt #{label}</strong>
                <br />
                Score: <span className="grad_text fw-bold">{score}/100</span>
            </div>
        );
    }
    return null;
};

export default function AttemptsChart({ attempts }) {
    if (!attempts || !Array.isArray(attempts)) return null;

    // FIX ORDER — Attempt 1 → Attempt 2 → Attempt 3 → …
    const data = attempts.map((a, index) => ({
        attempt: index + 1,
        score: a.overall_score ?? 0,
    }));

    return (
        <div className="w-full h-80 p-6 rounded-2xl dark-gradient border border-border shadow-xl">
            <h2 className="text-primary-200 font-bold text-xl mb-4">
                📊 Recent Scores
            </h2>

            <ResponsiveContainer width="100%" height={230}>
                <LineChart
                    data={data}
                    // Adjusted margin to allow space for axis labels and ticks
                    margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
                >
                    {/* Gradient for the score line */}
                    <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#49de50" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#49de50" stopOpacity={0.2} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />

                    {/* X Axis: 
                        1. Removed type="number" to fix the decimal tick issue.
                        2. Retained padding to create the desired gap at the edges.
                    */}
                    <XAxis
                        dataKey="attempt"
                        stroke="#cac5fe"
                        // `type="number"` REMOVED. This allows the axis to use discrete data points (1, 2, 3...)
                        interval={0} // Ensure all tick marks are rendered
                        padding={{ left: 20, right: 20 }} // Adds the required gap
                    >
                        <Label
                            value="Attempts"
                            offset={-20}
                            position="insideBottom"
                            fill="#bbb"
                        />
                    </XAxis>

                    {/* Y Axis */}
                    <YAxis domain={[0, 100]} stroke="#cac5fe">
                        <Label
                            value="Score"
                            angle={-90}
                            position="insideLeft"
                            fill="#bbb"
                        />
                    </YAxis>

                    <Tooltip content={<CustomTooltip />} />

                    {/* Score Line */}
                    <Line
                        type="monotone"
                        dataKey="score"
                        stroke="url(#scoreGradient)"
                        strokeWidth={3}
                        dot={{
                            stroke: "#49de50",
                            strokeWidth: 2,
                            r: 5,
                            fill: "#fff",
                        }}
                        activeDot={{
                            stroke: "#fff",
                            strokeWidth: 3,
                            r: 7,
                            fill: "#49de50",
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}