import React, { useState } from 'react';
import {
  Zap, ArrowRight, FolderOpen,
  Code2, Terminal, Cpu, Activity, Globe, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CinematicVideoBackground from '../components/Visualization/CinematicVideoBackground';

export default function Landing() {

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] }
    }
  };

  return (
    <div className="relative min-h-screen w-full text-white bg-black selection:bg-accent/40 overflow-x-hidden"
      style={{ fontFamily: "'Google Sans', 'Inter', sans-serif" }}
    >
      <CinematicVideoBackground />

      {/* Structural Dot Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.06] z-10"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />



      {/* ═══════════════ NAVIGATION ═══════════════ */}
      <nav className="fixed top-0 left-0 w-full z-[100] flex items-center justify-between px-8 md:px-16 h-24 backdrop-blur-xl border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.5)]">
            <Zap size={18} fill="white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-sans font-black tracking-[-0.05em] text-xl uppercase italic">RepoSensei</span>
            <span className="text-[8px] font-black tracking-[0.3em] uppercase text-white/20 mt-0.5">Neural Synthesis Engine</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <Link to="/onboarding" className="hidden md:block text-[10px] font-black tracking-[0.2em] uppercase text-white/40 hover:text-white transition-colors">Documentation</Link>
          <Link to="/onboarding" className="px-7 py-3 bg-accent text-white rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)] transition-all">
            Log In
          </Link>
        </div>
      </nav>

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative pt-56 pb-48 px-6 flex flex-col items-center text-center z-20 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 max-w-5xl"
        >
          {/* Status Pill */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full mb-12">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_#6366f1]" />
            <span className="text-[10px] font-black tracking-[0.25em] text-white/40 uppercase">Nebula Protocol Active</span>
          </div>

          <h1 className="text-6xl md:text-[9.5rem] font-bold tracking-tight mb-10 leading-[0.85]">
            Architect your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-accent to-cyan-400">
              understanding
            </span>
          </h1>

          <p className="text-white/40 text-xl md:text-2xl max-w-3xl mx-auto font-medium tracking-tight mb-20 leading-relaxed">
            Turn complex codebases into intuitive interactive maps. Visualize architecture, identify bottlenecks, and simplify legacy codebases.
          </p>

          <div className="flex flex-col items-center gap-6">
            <Link to="/onboarding">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group px-16 py-6 rounded-full bg-gradient-to-r from-accent to-indigo-600 shadow-[0_10px_40px_rgba(99,102,241,0.4)] hover:shadow-[0_15px_50px_rgba(99,102,241,0.6)] transition-all"
              >
                <span className="text-white font-black text-xs tracking-[0.3em] uppercase flex items-center gap-4">
                  GET STARTED NOW
                  <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </span>
              </motion.button>
            </Link>
            <button className="text-[10px] font-black tracking-[0.2em] text-white/20 uppercase hover:text-white/60 transition-colors">
              Watch Demo
            </button>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════ NEURAL MAPPING SECTION ═══════════════ */}
      <section className="relative py-40 px-8 md:px-24 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            <motion.p variants={itemVariants} className="text-[10px] font-black tracking-[0.3em] uppercase text-accent mb-6">
              Core Module 01
            </motion.p>
            <motion.h2 variants={itemVariants} className="text-5xl md:text-6xl font-bold tracking-tight mb-8 leading-tight">
              Neural<br />Mapping
            </motion.h2>
            <motion.p variants={itemVariants} className="text-white/30 text-lg leading-relaxed mb-14">
              Our innovative neural mapping system scans, analyzes and maps your architecture with surgical precision, ensuring you have the clearest view of your codebase.
            </motion.p>

            <div className="space-y-5">
              {[
                { icon: FolderOpen, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/10', title: 'Architecture', desc: 'Deep analysis of project structure and dependencies.' },
                { icon: Cpu, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/10', title: 'Scale Mobility', desc: 'Optimize performance with intelligent resource management.' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  whileHover={{ x: 6, backgroundColor: 'rgba(255,255,255,0.04)' }}
                  className={`flex gap-6 p-8 bg-white/[0.02] border ${item.border} rounded-3xl group transition-all duration-500 cursor-default`}
                >
                  <div className={`w-12 h-12 rounded-2xl ${item.bg} border ${item.border} flex items-center justify-center shrink-0`}>
                    <item.icon size={22} className={item.color} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                    <p className="text-white/30 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Visual Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
            className="relative aspect-square rounded-[48px] bg-gradient-to-br from-indigo-950/40 via-black to-black border border-indigo-500/10 flex items-center justify-center overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-accent/5 animate-pulse rounded-[48px]" />
            {/* Orbital rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 h-72 rounded-full border border-accent/10 border-dashed animate-spin" style={{ animationDuration: '20s' }} />
              <div className="absolute w-48 h-48 rounded-full border border-cyan-400/10 border-dashed animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
              <div className="absolute w-24 h-24 rounded-full border border-purple-400/20 animate-pulse" />
            </div>
            <Terminal size={80} className="text-white/10 relative z-10" />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ INTERACTIVE INSIGHTS ═══════════════ */}
      <section className="relative py-40 px-8 text-center z-10 bg-white/[0.01] border-y border-white/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-accent mb-6">Core Module 02</p>
          <h2 className="text-6xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">Interactive<br />Insights</h2>
          <p className="text-white/30 text-xl leading-relaxed max-w-2xl mx-auto">
            Deep dive into your codebase with real-time interactive insights that show the true health and connectivity of your development stack.
          </p>
        </motion.div>

        {/* Preview Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          className="mt-8 max-w-6xl mx-auto aspect-video rounded-[48px] bg-gradient-to-b from-indigo-950/30 to-black/80 border border-indigo-500/10 relative overflow-hidden flex items-center justify-center shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <Activity size={100} className="text-accent/20 animate-pulse" />
          <div className="absolute bottom-10 left-10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30">Live Analysis Stream</span>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════ PERFORMANCE STATS ═══════════════ */}
      <section className="relative py-48 px-8 md:px-24 text-center z-10">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[10px] font-black tracking-[0.5em] uppercase text-white/20 mb-24"
        >
          Engineered for Performance
        </motion.h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto">
          {[
            { val: '0.4s', label: 'Blazing fast synthesis' },
            { val: '60fps', label: '3D render performance' },
            { val: '12ms', label: 'Neural processing latency' },
            { val: '100%', label: 'Server uptime guaranteed' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.8 }}
              className="flex flex-col items-center group"
            >
              <span className="text-6xl md:text-7xl font-bold tracking-tighter mb-5 bg-clip-text text-transparent bg-gradient-to-b from-white to-accent">
                {stat.val}
              </span>
              <div className="w-6 h-px bg-white/10 mb-5 group-hover:w-12 transition-all duration-500" />
              <p className="text-white/25 text-[10px] font-black tracking-[0.2em] uppercase leading-relaxed max-w-[100px]">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="relative py-32 px-8 md:px-24 border-t border-white/5 bg-black/60 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-20 mb-20">
          {/* Brand Column */}
          <div className="max-w-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
                <Zap size={16} fill="white" />
              </div>
              <span className="font-black tracking-[-0.05em] uppercase italic">RepoSensei</span>
            </div>
            <p className="text-white/25 text-sm leading-relaxed mb-8">
              A powerful neural architecture platform that allows you to understand your codebase like never before.
            </p>
            <div className="flex gap-5">
              <Globe size={18} className="text-white/20 hover:text-accent cursor-pointer transition-colors" />
              <Code2 size={18} className="text-white/20 hover:text-accent cursor-pointer transition-colors" />
              <Sparkles size={18} className="text-white/20 hover:text-accent cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
            {[
              { heading: 'Product', links: ['Onboard Repo', 'Visualization', 'Ecosystem'] },
              { heading: 'Company', links: ['About Us', 'Features', 'Careers'] },
              { heading: 'Legal', links: ['Privacy', 'Cookies', 'Terms'] }
            ].map((col) => (
              <div key={col.heading} className="flex flex-col gap-5">
                <span className="text-[9px] font-black tracking-[0.35em] uppercase text-accent">{col.heading}</span>
                <div className="flex flex-col gap-4">
                  {col.links.map((link) => (
                    <span key={link} className="text-sm text-white/25 hover:text-white cursor-pointer transition-colors">{link}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-black tracking-[0.25em] uppercase text-white/15">
          <span>© RepoSensei. All rights reserved.</span>
          <div className="flex gap-8">
            <span className="hover:text-white/40 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-white/40 cursor-pointer transition-colors">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
