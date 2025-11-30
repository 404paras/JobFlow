import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { FeedbackDialog } from '../components/FeedbackDialog';
import { LogOut, ArrowRight } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full opacity-40 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full opacity-30 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-100 bg-white/70 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={isAuthenticated ? "/workflows" : "/"} className="flex items-center gap-3 group">
            <img src="/logo.svg" alt="JobFlow" className="w-10 h-10 shadow-lg shadow-purple-200 rounded-xl group-hover:scale-105 transition-transform" />
            <h1 className="text-xl font-bold text-gray-900">
              JobFlow
            </h1>
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-md shadow-sm">
              BETA
            </span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Anonymous Feedback Dialog */}
            <FeedbackDialog />

            {isAuthenticated ? (
              <>
                <span className="text-gray-600 text-sm hidden md:block">
                  Welcome, {user?.name}
                </span>
                <Link to="/workflows">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                    My Workflows
                  </Button>
                </Link>
                <Button 
                  onClick={logout}
                  variant="outline" 
                  className="border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button 
                    variant="ghost" 
                    className="text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 font-medium px-4"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:bg-right transition-all duration-300 text-white shadow-lg shadow-indigo-200/50 font-semibold px-6 rounded-full">
                    Get Started Free
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-indigo-700">Automated Job Search Platform</span>
          </div>

          {/* Title */}
          <div className="space-y-6">
            <h2 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight tracking-tight">
              Automate Your
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Job Search Workflow
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Build powerful automation pipelines to aggregate, filter, and get daily email digests 
              of job listings from LinkedIn, Indeed, and Naukri.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to={isAuthenticated ? "/workflow/new" : "/register"}>
              <Button className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xl shadow-indigo-200 transition-all rounded-xl">
                Create Your Workflow
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </Link>
            <Link to="/workflows">
              <Button variant="outline" className="h-14 px-8 text-lg font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl">
                View Workflows
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-32">
          <div className="group p-8 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Multi-Platform Scraping</h3>
            <p className="text-gray-600 leading-relaxed">
              Connect to LinkedIn, Indeed, and Naukri. Aggregate jobs from multiple sources in one workflow.
            </p>
          </div>

          <div className="group p-8 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-violet-200">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Filtering</h3>
            <p className="text-gray-600 leading-relaxed">
              Normalize and filter job listings by title, company, location, salary, and more.
            </p>
          </div>

          <div className="group p-8 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-amber-200">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Daily Email Digests</h3>
            <p className="text-gray-600 leading-relaxed">
              Get scheduled email notifications with curated job listings delivered to your inbox.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="mt-32">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-16">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: 'Set Trigger', desc: 'Start with a job trigger node', color: 'from-indigo-500 to-purple-500', shadow: 'shadow-indigo-200' },
              { step: 2, title: 'Add Sources', desc: 'Connect job platforms', color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-200' },
              { step: 3, title: 'Filter & Clean', desc: 'Normalize and filter data', color: 'from-orange-500 to-red-500', shadow: 'shadow-orange-200' },
              { step: 4, title: 'Get Notified', desc: 'Receive daily email updates', color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200' },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg ${item.shadow} group-hover:scale-110 transition-transform`}>
                  {item.step}
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-100 bg-white/50 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          © 2025 JobFlow. Built with ❤️ by <a href="https://github.com/404paras" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium">Paras Garg</a>
        </div>
      </footer>
    </div>
  );
}
