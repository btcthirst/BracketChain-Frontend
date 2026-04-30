import { Link } from "lucide-react";

export default function ComingSoonPage() {
    return (
        <div className="min-h-screen flex flex-col items-center 
                    justify-center bg-[#0a1929] text-white gap-4">
            <h1 className="text-3xl font-bold">Coming Soon</h1>
            <p className="text-gray-400">This page is under construction.</p>
            <Link href="/" className="text-blue-400 hover:underline">
                ← Back to Home
            </Link>
        </div>
    );
}