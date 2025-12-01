import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { FeedbackDialog } from '../components/FeedbackDialog';
import { ThemeToggle } from '../components/ThemeToggle';
import { LogOut, ArrowRight, Brain, Zap, Target, TrendingUp, Briefcase, Sparkles } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-300 to-purple-300 dark:from-indigo-900 dark:to-purple-900 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-blue-300 to-cyan-300 dark:from-blue-900 dark:to-cyan-900 rounded-full opacity-40 blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-gradient-to-br from-purple-300 to-pink-300 dark:from-purple-900 dark:to-pink-900 rounded-full opacity-30 blur-3xl animate-float" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={isAuthenticated ? "/workflows" : "/"} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 group-hover:scale-105 transition-transform">
              <Briefcase size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              JobFlow
            </h1>
            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-md shadow-sm">
              AI
            </span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <FeedbackDialog />

            {isAuthenticated ? (
              <>
                <Link to="/workflows">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 transition-all px-5">
                    Dashboard
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
                <Button 
                  onClick={logout}
                  variant="outline" 
                  className="border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium rounded-xl transition-all"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 transition-all px-6">
                  Sign In
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full">
            <Brain size={16} className="text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI-Powered Job Search Platform</span>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>

          {/* Title */}
          <div className="space-y-6">
            <h2 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
              Your AI-Powered
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                Job Search Assistant
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Automate job hunting with smart workflows, AI-powered resume matching, 
              skill gap analysis, and real-time market insights—all running locally in your browser.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to={isAuthenticated ? "/workflow/new" : "/register"}>
              <Button className="h-14 px-8 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-xl shadow-indigo-300/50 dark:shadow-indigo-900/30 transition-all rounded-xl glow">
                <Sparkles size={20} className="mr-2" />
                Get Started
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">5+</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Job Platforms</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">AI</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Powered Matching</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">24/7</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Auto Scraping</div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 mt-32">
          <div className="group p-6 glass-card rounded-2xl hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg glow">
              <Zap size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Visual Workflows</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Build automation pipelines with a drag-and-drop workflow editor like n8n.
            </p>
          </div>

          <div className="group p-6 glass-card rounded-2xl hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg glow-purple">
              <Brain size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Resume Match</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Get AI-powered job-resume matching scores running 100% in your browser.
            </p>
          </div>

          <div className="group p-6 glass-card rounded-2xl hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
              <Target size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Skill Gap Analysis</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Identify missing skills and get recommendations to improve your profile.
            </p>
          </div>

          <div className="group p-6 glass-card rounded-2xl hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
              <TrendingUp size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Market Trends</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Real-time insights on skill demand, salaries, and top hiring companies.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="mt-32">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">How It Works</h3>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-16 max-w-2xl mx-auto">
            Create automated workflows to collect jobs, then use AI to find the perfect matches for your skills.
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: 'Build Workflow', desc: 'Create your automation pipeline', icon: Zap, color: 'from-indigo-500 to-purple-500' },
              { step: 2, title: 'Collect Jobs', desc: 'Aggregate from 5+ platforms', icon: Briefcase, color: 'from-blue-500 to-cyan-500' },
              { step: 3, title: 'Upload Resume', desc: 'Let AI extract your skills', icon: Brain, color: 'from-purple-500 to-pink-500' },
              { step: 4, title: 'Get Insights', desc: 'Match scores & market trends', icon: Target, color: 'from-emerald-500 to-teal-500' },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon size={28} className="text-white" />
                </div>
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">STEP {item.step}</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 text-center">
          <div className="inline-block glass-card rounded-3xl p-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Supercharge Your Job Search?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
              Join JobFlow today and let AI help you find the perfect job opportunities.
            </p>
            <Link to={isAuthenticated ? "/workflows" : "/register"}>
              <Button className="h-14 px-10 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-xl shadow-indigo-300/50 dark:shadow-indigo-900/30 transition-all rounded-xl">
                Get Started Now
                <ArrowRight size={20} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 dark:text-gray-400 text-sm">
          © 2025 JobFlow. Built with ❤️ by <a href="https://github.com/404paras" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">Paras Garg</a>
        </div>
      </footer>
    </div>
  );
}
