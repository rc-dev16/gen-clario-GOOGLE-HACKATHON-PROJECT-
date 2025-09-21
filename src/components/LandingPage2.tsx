import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle, Star, ArrowRight, Shield, Zap, Users, Sparkles, Globe, Lock, TrendingUp } from 'lucide-react';
import Header from './header2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Typing Animation Hook
const useTypingAnimation = (text: string, speed: number = 100, startDelay: number = 0) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(startDelay === 0);

  useEffect(() => {
    if (!hasStarted && startDelay > 0) {
      const startTimeout = setTimeout(() => {
        setHasStarted(true);
      }, startDelay);
      return () => clearTimeout(startTimeout);
    }

    if (!hasStarted) return;

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, text, speed, hasStarted, startDelay]);

  return { displayText, isComplete };
};

// Continuous Typing Animation Hook for looping text
const useContinuousTyping = (texts: string[], speed: number = 80, pauseDuration: number = 2000, startDelay: number = 0) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(startDelay === 0);

  useEffect(() => {
    if (!hasStarted && startDelay > 0) {
      const startTimeout = setTimeout(() => {
        setHasStarted(true);
        setIsTyping(true);
      }, startDelay);
      return () => clearTimeout(startTimeout);
    }

    if (!hasStarted) return;

    const currentText = texts[currentTextIndex];

    if (isTyping && currentIndex < currentText.length) {
      // Typing phase
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + currentText[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (isTyping && currentIndex >= currentText.length) {
      // Pause after typing complete
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    } else if (!isTyping && displayText.length > 0) {
      // Erasing phase
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev.slice(0, -1));
      }, speed / 2);
      return () => clearTimeout(timeout);
    } else if (!isTyping && displayText.length === 0) {
      // Move to next text
      setCurrentTextIndex(prev => (prev + 1) % texts.length);
      setCurrentIndex(0);
      setIsTyping(true);
    }
  }, [currentIndex, currentTextIndex, displayText, isTyping, texts, speed, pauseDuration, hasStarted, startDelay]);

  return { displayText, isTyping };
};

const LandingPage: React.FC = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Static typing for first line
  const line1 = useTypingAnimation("Analyze Legal Contracts", 80);
  
  // Continuous typing for the rotating text
  const continuousText = useContinuousTyping(
    ["with AI", "and Precision"], 
    80, 
    2000, 
    line1.isComplete ? 500 : 0
  );

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: Zap,
      title: "AI-Powered Analysis",
      description: "Advanced Gemini AI analyzes your contracts in seconds, not hours",
      color: "from-amber-400 to-orange-500"
    },
    {
      icon: Shield,
      title: "Risk Assessment",
      description: "Identify potential risks and missing clauses before signing",
      color: "from-emerald-400 to-green-500"
    },
    {
      icon: CheckCircle,
      title: "Completeness Check",
      description: "Ensure all essential fields are properly filled and documented",
      color: "from-blue-400 to-cyan-500"
    },
    {
      icon: Users,
      title: "Plain English Summary",
      description: "Complex legal jargon translated into easy-to-understand language",
      color: "from-violet-400 to-purple-500"
    }
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Legal Counsel, TechStart Inc.",
      content: "This tool has revolutionized how we review contracts. What used to take hours now takes minutes.",
      rating: 5,
      avatar: "PS"
    },
    {
      name: "Rajesh Kumar",
      role: "Business Owner",
      content: "As a non-lawyer, this gives me confidence in understanding my contracts before signing.",
      rating: 5,
      avatar: "RK"
    },
    {
      name: "Anjali Patel",
      role: "Contract Manager",
      content: "The risk assessment feature has saved us from several problematic agreements.",
      rating: 5,
      avatar: "AP"
    }
  ];

  const navigate = useNavigate();
  const { user } = useAuth();
  const handleStart = () => {
    if (user) {
      navigate('/analyzer');
    } else {
      navigate('/auth?mode=register');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      <Header />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-900/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gray-800/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gray-700/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center relative z-10">
            {/* Badge */}
            <div className={`inline-flex items-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-semibold mb-8 shadow-lg transition-all duration-1000 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              <Star className="h-5 w-5 text-amber-400 animate-pulse" />
              <span>First 5 Contract Analysis Free</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>

            {/* Main Heading */}
            <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-8 leading-tight text-shadow">
                <span className="block">
                  {line1.displayText}
                  {!line1.isComplete && <span className="animate-pulse">|</span>}
                </span>
                <span className="block text-gray-700 relative min-h-[1.4em]">
                  {continuousText.displayText}
                  {line1.isComplete && <span className="animate-pulse">|</span>}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-pulse"></div>
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <div className={`transition-all duration-1000 ${line1.isComplete ? 'animate-slide-up delay-700' : 'opacity-0'}`}>
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
                Transform complex legal documents into clear, actionable insights. 
                Get instant summaries, risk assessments, and completeness checks powered by advanced AI.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row gap-6 justify-center mb-16 transition-all duration-1000 ${line1.isComplete ? 'animate-slide-up delay-900' : 'opacity-0'}`}>
              <button
                onClick={handleStart}
                className="group relative bg-gray-900 text-white px-10 py-5 rounded-2xl hover:bg-gray-800 transition-all duration-300 font-bold text-xl flex items-center justify-center space-x-3 shadow-2xl hover:shadow-3xl hover:scale-105 shimmer-effect"
              >
                <span className="relative z-10">Start Free Analysis</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
              </button>
              <button
                className="group border-2 border-gray-300 text-gray-700 px-10 py-5 rounded-2xl hover:border-gray-900 hover:bg-gray-900 hover:text-white backdrop-blur-sm transition-all duration-300 font-bold text-xl hover:scale-105 hover:shadow-xl"
                onClick={() => setShowDemoModal(true)}
              >
                <span className="transition-colors duration-300">How It Works</span>
              </button>
            </div>

            {/* Stats */}
            {/*
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto transition-all duration-1000 ${line1.isComplete ? 'animate-fade-in delay-1100' : 'opacity-0'}`}>
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
            */}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 text-shadow">
              Why Choose 
              <span className="text-gray-700"> Clario?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Powerful features designed to make contract analysis fast, accurate, and accessible to everyone.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group text-center card-hover">
                <div className="relative mb-8">
                  <div className={`w-20 h-20 bg-gradient-to-r ${feature.color} rounded-3xl flex items-center justify-center mx-auto shadow-2xl group-hover:shadow-3xl transition-all duration-300`}>
                    <feature.icon className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gray-900/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-gray-700 transition-colors duration-300">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-lg">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-100 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 text-shadow">
              Trusted by 
              <span className="text-gray-700"> Legal Professionals</span>
            </h2>
            <p className="text-xl text-gray-600 font-medium">
              See what our users say about Clario
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="group bg-white p-8 rounded-3xl shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300 card-hover">
                <div className="flex items-center space-x-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-8 leading-relaxed text-lg font-medium">"{testimonial.content}"</p>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{testimonial.name}</p>
                    <p className="text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 text-shadow">
              Simple, 
              <span className="text-gray-700">Transparent Pricing</span>
            </h2>
            <p className="text-xl text-gray-600 font-medium">
              Start free, upgrade when you need more
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-3xl border-2 border-gray-200 hover:border-gray-400 transition-all duration-300 shadow-xl hover:shadow-2xl card-hover">
              <h3 className="text-3xl font-bold text-gray-900 mb-3">Free</h3>
              <p className="text-gray-600 mb-8 text-lg">Perfect for getting started</p>
              <div className="text-5xl font-bold text-gray-900 mb-8">$0<span className="text-xl text-gray-600">/month</span></div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <span className="text-lg">5 contract analyses</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <span className="text-lg">Basic summaries</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <span className="text-lg">Field extraction</span>
                </li>
              </ul>
              <button
                onClick={handleStart}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl hover:bg-gray-800 transition-all duration-300 font-bold text-lg hover:scale-105 shadow-lg"
              >
                Get Started
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative bg-gray-900 p-8 rounded-3xl text-white shadow-2xl hover:shadow-3xl card-hover overflow-hidden">
              <div className="absolute top-6 right-6 bg-amber-400 text-gray-900 px-4 py-2 rounded-full text-sm font-bold">
                Popular
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-gray-700/20 animate-pulse"></div>
              <div className="relative z-10">
                <h3 className="text-3xl font-bold mb-3">Pro</h3>
                <p className="text-gray-300 mb-8 text-lg">For professionals and small teams</p>
                <div className="text-5xl font-bold mb-8">$29<span className="text-xl text-gray-400">/month</span></div>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-white" />
                    <span className="text-lg">100 contract analyses</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-white" />
                    <span className="text-lg">Advanced risk assessment</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-white" />
                    <span className="text-lg">Compare different versions of same contract</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-white" />
                    <span className="text-lg">Priority support</span>
                  </li>
                </ul>
                <button className="w-full bg-white text-gray-900 py-4 rounded-2xl hover:bg-gray-100 transition-all duration-300 font-bold text-lg hover:scale-105 shadow-lg">
                  Upgrade to Pro
                </button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-3xl border-2 border-gray-200 hover:border-gray-400 transition-all duration-300 shadow-xl hover:shadow-2xl card-hover">
              <h3 className="text-3xl font-bold text-gray-900 mb-3">Enterprise</h3>
              <p className="text-gray-600 mb-8 text-lg">For large organizations</p>
              <div className="text-5xl font-bold text-gray-900 mb-8">Custom</div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <span className="text-lg">Unlimited analyses</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <span className="text-lg">Custom integrations</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <span className="text-lg">Dedicated support</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <span className="text-lg">SLA guarantee</span>
                </li>
              </ul>
              <button
                className="w-full bg-gray-900 text-white py-4 rounded-2xl hover:bg-gray-800 transition-all duration-300 font-bold text-lg hover:scale-105 shadow-lg"
                onClick={() => {
                  const footer = document.querySelector('footer');
                  if (footer) {
                    footer.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800/50 to-gray-700/50"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 text-shadow">
            Ready to Transform Your 
            <span className="block text-gray-300">
              Contract Analysis?
            </span>
          </h2>
          <p className="text-2xl text-gray-300 mb-12 font-medium">
            Join thousands of professionals who trust Clario for their contract review needs.
          </p>
          <button
            onClick={handleStart}
            className="bg-white text-gray-900 px-12 py-6 rounded-2xl hover:bg-gray-100 transition-all duration-300 font-bold text-xl shadow-2xl hover:shadow-3xl hover:scale-105 shimmer-effect"
          >
            <span className="relative z-10">Start Your Free Analysis Today</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-white py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-gray-800 rounded-2xl">
                  <Scale className="h-8 w-8 text-white" />
                </div>
                <span className="text-2xl font-bold">Clario</span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed">
                Clarity for Legal Documents.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-xl">Product</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors text-lg" onClick={e => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors text-lg" onClick={e => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}>Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-xl">Support</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="mailto:rohanc1604@gmail.com" className="hover:text-white transition-colors text-lg">Contact: rohanc1604@gmail.com</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p className="text-lg">☕ Made with lots of coffee by Rohan 💻</p>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl p-8 relative animate-scale-in mx-4">
            <button 
              onClick={() => setShowDemoModal(false)} 
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-2xl font-bold transition-all duration-200 hover:rotate-90 transform"
            >
              ×
            </button>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
              <p className="text-gray-600 text-lg max-w-lg mx-auto">
                Upload your contract, and our AI will instantly analyze it for risks, completeness, and key terms. Get a plain English summary and actionable insights in seconds.
              </p>
            </div>
            
            <div className="space-y-6 mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">Upload your contract</h3>
                  <p className="text-gray-600">Support for PDF and TXT files</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">AI Analysis</h3>
                  <p className="text-gray-600">Our AI instantly analyzes for risks, completeness, and key terms</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">Get Results</h3>
                  <p className="text-gray-600">Receive plain English summary and actionable insights</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="text-center">
                <p className="font-bold text-gray-900 mb-2">Example Result:</p>
                <p className="text-gray-700 italic">
                  "This contract is low risk, complete, and clearly outlines payment terms and parties involved. No major issues detected."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;