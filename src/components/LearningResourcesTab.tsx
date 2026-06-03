import React from 'react';
import { BookOpen, Zap, Sparkles, Lightbulb, ArrowRight } from 'lucide-react';

/**
 * LearningResourcesTab – a premium, interactive hub for all things Poppo Live training.
 * It is only reachable by authenticated users (protected via NavItem flag).
 * The UI follows the project's vibrant gold‑accent theme and uses subtle micro‑animations.
 */
export function LearningResourcesTab() {
  const tools = [
    {
      title: 'Profile Optimizer',
      icon: BookOpen,
      description: 'Upload multiple cover photos & get peer feedback instantly.',
    },
    {
      title: 'Live Quality Lab',
      icon: Zap,
      description: 'Record a 30‑second test stream and run automated audio‑visual checks.',
    },
    {
      title: 'Visibility Budget Planner',
      icon: Sparkles,
      description: 'Allocate Lucky Box / PK spend and forecast follower growth.',
    },
    {
      title: 'Engagement Simulator',
      icon: Lightbulb,
      description: 'Mock chat interactions with AI‑driven personas to practice dialogue.',
    },
  ];

  return (
    <section className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-3xl font-black tracking-widest text-[#D4AF37] uppercase mb-2">
          Learning Resources
        </h1>
        <p className="text-sm text-[#A09E9A] max-w-2xl mx-auto">
          All the interactive tools and best‑practice guides to master the Poppo Live training
          modules. Use them to sharpen your host or agent skills and receive personalized
          recommendations.
        </p>
      </header>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool, idx) => (
          <article
            key={tool.title}
            className="group flex items-start gap-4 p-4 rounded-xl bg-[#21202B] border border-[#D4AF37]/15 hover:border-[#D4AF37]/40 transition-shadow duration-200"
          >
            <tool.icon className="flex-shrink-0 w-6 h-6 text-[#D4AF37]" />
            <div className="flex-1">
              <h2 className="font-medium text-[#F0EFE8]">{tool.title}</h2>
              <p className="text-xs text-[#A09E9A] mt-1">{tool.description}</p>
            </div>
            <ArrowRight
              className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#D4AF37]"
            />
          </article>
        ))}
      </div>

      {/* Call‑to‑Action */}
      <div className="text-center mt-8">
        <button
          className="inline-flex items-center gap-2 px-6 py-2 bg-[#D4AF37]/20 text-[#D4AF37] font-bold rounded-lg hover:bg-[#D4AF37]/30 transition-colors"
        >
          Explore Full Training Platform
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
