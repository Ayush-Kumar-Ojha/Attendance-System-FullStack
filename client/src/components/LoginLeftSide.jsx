import {
    Clock,
    Users,
    Wallet,
    PalmtreeIcon,
    BarChart3,
    MessageSquare,
    Receipt,
    Banknote,
} from "lucide-react";

// Each feature: icon, label, and a short caption for the card
const features = [
    { icon: Clock, label: "Attendance", caption: "Real-time" },
    { icon: Users, label: "Employees", caption: "Directory" },
    { icon: Wallet, label: "Payroll", caption: "Automated" },
    { icon: PalmtreeIcon, label: "Leave", caption: "Tracked" },
    { icon: BarChart3, label: "Reports", caption: "Insights" },
    { icon: MessageSquare, label: "Walls", caption: "Connect" },
    { icon: Receipt, label: "Bill Claims", caption: "Reimburse" },
    { icon: Banknote, label: "Advance", caption: "Requests" },
];

// Compute an even radial layout around the center hub
const RADIUS = 41; // percentage of container
const nodes = features.map((feature, index) => {
    const angle = (360 / features.length) * index - 90; // start at top
    const rad = (angle * Math.PI) / 180;
    const x = 50 + RADIUS * Math.cos(rad);
    const y = 50 + RADIUS * Math.sin(rad);
    return { ...feature, x, y, angle, index };
});

const LoginLeftSide = () => {
    return (
        <div className="hidden md:flex w-1/2 bg-indigo-950 relative overflow-hidden border-r border-slate-200">
            <div className="absolute -top-30 -left-30 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl"></div>

            {/* Twinkling star field */}
            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 26 }).map((_, i) => (
                    <span
                        key={i}
                        className="hrms-star"
                        style={{
                            top: `${(i * 37) % 100}%`,
                            left: `${(i * 53) % 100}%`,
                            animationDelay: `${(i % 7) * 0.6}s`,
                            opacity: 0.15 + ((i * 13) % 40) / 100,
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 flex flex-col items-start justify-center p-12 lg:p-16 w-full h-full">
                <h1 className="text-4xl lg:text-5xl font-medium text-white mb-4 leading-tight tracking-tight">HR <br /> Management System</h1>
                <p className="text-slate-400 text-base max-w-md leading-relaxed mb-8">Streamline your workflow operations, track attendance , manage holidays, and empower your team securely</p>

                {/* Radial feature orbit */}
                <div className="relative w-full max-w-[440px] aspect-square mx-auto hrms-orbit-float">

                    {/* Connector lines */}
                    <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                    >
                        {nodes.map((node) => (
                            <g key={`line-${node.label}`}>
                                <line
                                    x1="50"
                                    y1="50"
                                    x2={node.x}
                                    y2={node.y}
                                    stroke="rgba(129,140,248,0.35)"
                                    strokeWidth="0.4"
                                    strokeDasharray="1.2 1.6"
                                />
                                <circle
                                    cx={50 + (node.x - 50) * 0.5}
                                    cy={50 + (node.y - 50) * 0.5}
                                    r="0.9"
                                    fill="#a5b4fc"
                                    opacity="0.8"
                                />
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r="0.9"
                                    fill="#818cf8"
                                />
                            </g>
                        ))}
                    </svg>

                    {/* Center hub */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.45)]">
                            <div className="w-11 h-11 rounded-full bg-indigo-500 flex items-center justify-center">
                                <Users size={20} className="text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Satellite feature cards */}
                    {nodes.map((node) => (
                        <div
                            key={node.label}
                            className="hrms-feature-node absolute"
                            style={{
                                left: `${node.x}%`,
                                top: `${node.y}%`,
                                animationDelay: `${node.index * 0.35}s`,
                            }}
                        >
                            <div className="w-[92px] rounded-xl border border-indigo-400/30 bg-indigo-500/10 backdrop-blur-sm px-2.5 py-2.5 text-center shadow-[0_0_18px_rgba(99,102,241,0.15)]">
                                <div className="mx-auto mb-1.5 w-7 h-7 rounded-lg bg-indigo-500/25 flex items-center justify-center">
                                    <node.icon size={14} className="text-indigo-200" />
                                </div>
                                <p className="text-[10px] font-semibold text-white leading-tight">
                                    {node.label}
                                </p>
                                <p className="text-[9px] text-indigo-300/80 leading-tight">
                                    {node.caption}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Water-like waves at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none overflow-hidden">
                <svg
                    className="hrms-wave hrms-wave-back absolute bottom-0 left-0 w-[200%] h-full"
                    viewBox="0 0 200 40"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0,20 C 15,28 35,12 50,20 C 65,28 85,12 100,20 C 115,28 135,12 150,20 C 165,28 185,12 200,20 L200,40 L0,40 Z"
                        fill="rgba(99,102,241,0.10)"
                    />
                </svg>
                <svg
                    className="hrms-wave hrms-wave-front absolute bottom-0 left-0 w-[200%] h-full"
                    viewBox="0 0 200 40"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0,24 C 15,16 35,32 50,24 C 65,16 85,32 100,24 C 115,16 135,32 150,24 C 165,16 185,32 200,24 L200,40 L0,40 Z"
                        fill="rgba(129,140,248,0.14)"
                    />
                </svg>
            </div>

            <style>{`
                .hrms-star {
                    position: absolute;
                    width: 2px;
                    height: 2px;
                    border-radius: 9999px;
                    background: #c7d2fe;
                    animation: hrms-twinkle 3.5s ease-in-out infinite;
                }

                @keyframes hrms-twinkle {
                    0%, 100% { opacity: 0.15; }
                    50% { opacity: 0.7; }
                }

                .hrms-orbit-float {
                    animation: hrms-orbit-breathe 8s ease-in-out infinite;
                }

                @keyframes hrms-orbit-breathe {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }

                .hrms-feature-node {
                    transform: translate(-50%, -50%);
                    animation: hrms-node-float 4.5s ease-in-out infinite;
                }

                @keyframes hrms-node-float {
                    0%, 100% { margin-top: 0px; }
                    50% { margin-top: -9px; }
                }

                .hrms-wave {
                    animation: hrms-wave-drift 14s linear infinite;
                }

                .hrms-wave-back {
                    animation-duration: 18s;
                }

                .hrms-wave-front {
                    animation-duration: 11s;
                    animation-direction: reverse;
                }

                @keyframes hrms-wave-drift {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
};

export default LoginLeftSide;