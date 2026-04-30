import { CheckCircle2 } from "lucide-react";


export function Stepper({ current }: { current: number }) {
    const steps = ["Details", "Prize Pool", "Confirm"];
    return (
        <div className="flex items-center gap-0 mb-10" >
            {
                steps.map((label, i) => {
                    const done = i < current;
                    const active = i === current;
                    return (
                        <div key={i} className="flex items-center" >
                            <div className="flex flex-col items-center gap-1" >
                                <div
                                    className={
                                        `w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${done
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : active
                                                ? "bg-white border-blue-600 text-blue-600"
                                                : "bg-white border-gray-300 text-gray-400"
                                        }`
                                    }
                                >
                                    {done ? <CheckCircle2 className="w-5 h-5" /> : i + 1
                                    }
                                </div>
                                < span className={`text-xs font-medium ${active ? "text-blue-600" : done ? "text-gray-700" : "text-gray-400"}`} >
                                    {label}
                                </span>
                            </div>
                            {
                                i < steps.length - 1 && (
                                    <div className={`h-0.5 w-16 mx-2 mb-5 transition-all duration-500 ${done ? "bg-blue-600" : "bg-gray-200"}`} />
                                )
                            }
                        </div>
                    );
                })}
        </div>
    );
}