"use client" 

import React from 'react';
import { ArrowRight, Zap, Shield, Globe, Star, ChevronLeft, ChevronRight, Cpu } from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
}

export default function HomePage() {
  const [currentModelIndex, setCurrentModelIndex] = React.useState(0);

  const models: AIModel[] = [
    {
      id: "flux-schnell",
      name: "FLUX.1 [schnell]",
      type: "Fast Image Generation",
      description: "The fastest model tailored for local development.",
      capabilities: [
        "Rapid image generation",
        "Local development",
        "Open-source availability",
        "Integration with various platforms",
      ],
    },
    {
      id: "flux-pro",
      name: "FLUX1.1 [pro]",
      type: "Advanced Image Generation",
      description:
        "The best of FLUX, offering state-of-the-art performance image generation at blazing speeds.",
      capabilities: [
        "Top-tier prompt following",
        "High visual quality", 
        "Detailed image output",
        "Diverse output generation",
      ],
    },
  ];

  const currentModel = models[currentModelIndex];

  const nextModel = () => {
    setCurrentModelIndex((prevIndex) => (prevIndex + 1) % models.length);
  };

  const previousModel = () => {
    setCurrentModelIndex(
      (prevIndex) => (prevIndex - 1 + models.length) % models.length
    );
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-light mb-6 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Build Your Next Project Faster
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 mb-8 font-light">
              A modern UI kit with pre-built components and interactive elements.
              Perfect for your next web application.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center transition-all duration-300 shine shadow-large group">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl flex items-center justify-center transition-all shine shadow-large">
                View Components
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: Zap,
              title: 'Lightning Fast',
              description: 'Optimized for performance and quick loading times'
            },
            {
              icon: Shield,
              title: 'Secure by Default',
              description: 'Built with security best practices in mind'
            },
            {
              icon: Globe,
              title: 'Global Ready',
              description: 'Internationalization support out of the box'
            },
            {
              icon: Star,
              title: 'Premium Quality',
              description: 'Crafted with attention to detail and quality'
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-neutral-800/50 backdrop-blur-md shine hover:scale-105 transition-transform duration-300"
              style={{
                opacity: 0,
                animation: `blurUp 1s ${index * 0.1}s forwards`
              }}
            >
              <feature.icon className="w-12 h-12 mb-4 text-indigo-400" />
              <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
              <p className="text-neutral-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Models Carousel Section */}
      <div className="container mx-auto px-4 py-24 bg-neutral-800/30">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-light mb-6">
            Powered by Advanced AI
          </h2>
          <p className="text-neutral-400">
            Explore our suite of AI models designed to enhance your workflow
          </p>
        </div>
        
        <div className="bg-neutral-800/50 backdrop-blur-md p-6 rounded-3xl shadow-large max-w-md mx-auto shine overflow-hidden">
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={previousModel}
                className="p-2 rounded-full hover:bg-neutral-700/50 transition-colors duration-200 bg-neutral-600/20 shine-large"
              >
                <ChevronLeft size={16} className="text-neutral-200" />
              </button>
              <div className="text-center">
                <p className="text-lg font-medium text-neutral-200">
                  {currentModel.name}
                </p>
                <p className="text-sm text-neutral-400">{currentModel.type}</p>
              </div>
              <button
                onClick={nextModel}
                className="p-2 rounded-full hover:bg-neutral-700/50 transition-colors duration-200 bg-neutral-600/20 shine-large"
              >
                <ChevronRight size={16} className="text-neutral-200" />
              </button>
            </div>
            <div className="bg-neutral-900 rounded-2xl p-6 mb-4 shine">
              <div className="flex items-center mb-4">
                <div className="inline-flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-2xl bg-neutral-800 text-white mr-4">
                  <Cpu size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">
                    Model Details
                  </p>
                  <p className="text-xs text-neutral-400">{currentModel.id}</p>
                </div>
              </div>
              <p className="text-sm text-neutral-300 mb-4">
                {currentModel.description}
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-200">
                  Capabilities:
                </p>
                <ul className="list-disc list-inside text-sm text-neutral-300">
                  {currentModel.capabilities.map((capability, index) => (
                    <li key={index}>{capability}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="border-t border-neutral-800">
        <div className="container mx-auto px-4 py-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '10K+', label: 'Downloads' },
              { number: '2K+', label: 'Github Stars' },
              { number: '500+', label: 'Components' },
              { number: '24/7', label: 'Support' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-light mb-2 bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="text-neutral-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-light mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-neutral-400 mb-8">
            Join thousands of developers building better applications with our UI kit.
          </p>
          <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center transition-all duration-300 mx-auto shine shadow-large group">
            Start Building
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-12">
        <div className="container mx-auto px-4 text-center text-neutral-400">
          <p>© 2024 DreamUI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}