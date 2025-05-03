import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Threads from "../components/ui/threads";

export default function Hero() {
  return (
    <div>
      <div className="fixed inset-0 -z-10">
        <div className="w-full h-full">
          <Threads
            amplitude={6}
            distance={0}
            enableMouseInteraction={true}
            color={[1, 1, 1]}
          />
        </div>
        <div className="absolute inset-0 backdrop-blur-sm bg-black/10 dark:bg-black/30"></div>
      </div>
      <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col items-center  py-16 md:py-24">
        {/* Enhanced Decorative Background */}

        <div className="relative max-w-5xl mx-auto text-center space-y-12 px-4 z-10 w-full">
          <style>
            {`
            @keyframes bg-x {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes float {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
              100% { transform: translateY(0px); }
            }
            `}
          </style>
          <div className="flex flex-col items-center">
            <span
              className="p-2 text-6xl md:text-8xl lg:text-9xl font-extrabold bg-gradient-to-r from-yellow-400 via-pink-500 to-red-500 bg-[length:300%_auto] bg-clip-text text-transparent drop-shadow-sm"
              style={{ animation: "bg-x 6s infinite" }}
            >
              Tarang
            </span>
            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto mt-8 font-medium tracking-wide">
              <span className="text-amber-400 font-semibold">Effortless</span>{" "}
              automation for{" "}
              <span className="text-amber-400 font-semibold">smart</span>{" "}
              trading
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-12">
              <Link to="/dashboard">
                <Button className="text-base px-8 py-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 rounded-xl">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a
                href="https://github.com/ritikx01/signal_algo"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="text-base px-8 py-6 border-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                >
                  View on GitHub
                </Button>
              </a>
            </div>
          </div>
        </div>
        <div className="left-1/2 w-2/3 bg-slate-900/50 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-slate-700/50 mt-16">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-amber-400" />
            What is Tarang and the motivation behind it?
          </h2>
          <p className=" flex flex-col text-base text-gray-300 leading-relaxed">
            <span className="font-bold">Motivation</span>
            <span>
              In November 2024, while trading on Binance, I noticed that certain
              altcoin pairs experienced rapid price surges within short
              timeframes.
            </span>
            <span>
              This observation led me to create <strong>Tarang</strong> (meaning
              "wave" in Sanskrit) — an automated trading platform designed to
              detect such price movements early.
            </span>
            <span className="font-bold pt-5">What it does?</span>
            <span>
              Tarang analyzes subtle microeconomic patterns that often precede a
              surge. I'm currently focused on minimizing noise and reducing
              false positives to improve its precision.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
