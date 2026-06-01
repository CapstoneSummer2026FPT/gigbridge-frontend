import { useNavigate } from 'react-router';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useScrollRestoration } from '../../../hooks/useScrollRestoration';
import { ArrowLeft, Zap, Users, Globe, Target, Award, Heart, Rocket, TrendingUp } from 'lucide-react';

export default function AboutScreen() {
  const navigate = useNavigate();
  const { saveScrollPosition } = useScrollRestoration();

  return (
    <GuestLayout>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => {
              saveScrollPosition();
              navigate('/');
            }}
            className="btn-ghost-cyan px-4 py-2 mb-8 text-sm flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan to-purple">
                <Zap size={24} className="text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-primary">About GigBridge</h1>
            </div>
            <p className="text-lg text-secondary max-w-3xl mx-auto">
              Revolutionizing the freelance marketplace with artificial intelligence
            </p>
          </div>

          {/* Mission */}
          <div className="glass-card p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Target size={24} className="text-cyan" />
              <h2 className="text-2xl font-bold text-primary">Our Mission</h2>
            </div>
            <p className="text-secondary leading-relaxed">
              At GigBridge, we believe in the power of human talent enhanced by artificial intelligence.
              Our mission is to create a world where freelancers and clients connect seamlessly,
              where opportunities are matched intelligently, and where work happens efficiently.
              We're building the future of work, one smart connection at a time.
            </p>
          </div>

          {/* Story */}
          <div className="glass-card p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Rocket size={24} className="text-purple" />
              <h2 className="text-2xl font-bold text-primary">Our Story</h2>
            </div>
            <div className="space-y-4 text-secondary leading-relaxed">
              <p>
                Founded in 2025, GigBridge emerged from a simple observation: the traditional freelance
                marketplace was broken. Clients spent hours sifting through proposals, freelancers wasted
                time on applications that went nowhere, and great matches were missed due to information overload.
              </p>
              <p>
                We asked ourselves: what if AI could solve this? What if machine learning could analyze skills,
                experience, and compatibility to create perfect matches? What if interviews could be automated,
                proposals could be AI-generated, and the entire process could be intelligent?
              </p>
              <p>
                Today, GigBridge serves over 52,000 freelancers and 18,000 clients worldwide, powered by
                cutting-edge AI that makes finding the right match faster, smarter, and more efficient than ever before.
              </p>
            </div>
          </div>

          {/* Values */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-6 text-center">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  icon: <Users size={24} />,
                  title: 'People First',
                  description: 'Technology serves humans, not the other way around. We build AI that empowers freelancers and clients.',
                  color: 'cyan'
                },
                {
                  icon: <Globe size={24} />,
                  title: 'Global Community',
                  description: 'Talent has no borders. We connect skilled professionals with opportunities worldwide.',
                  color: 'purple'
                },
                {
                  icon: <Award size={24} />,
                  title: 'Excellence',
                  description: 'We set the bar high for quality, both in our platform and the work that happens on it.',
                  color: 'green'
                },
                {
                  icon: <Heart size={24} />,
                  title: 'Trust & Safety',
                  description: 'Secure payments, verified profiles, and AI-powered fraud detection keep our community safe.',
                  color: 'amber'
                },
              ].map((value, i) => (
                <div key={i} className="glass-card p-6">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-${value.color}/20`}>
                    <span className={`text-${value.color}`}>{value.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-2">{value.title}</h3>
                  <p className="text-sm text-secondary leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold text-primary mb-6 text-center">GigBridge by the Numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: '52,847', label: 'Freelancers', icon: <Users size={20} /> },
                { value: '18,234', label: 'Clients', icon: <Globe size={20} /> },
                { value: '$28.4M', label: 'Paid Out', icon: <TrendingUp size={20} /> },
                { value: '96.4%', label: 'Success Rate', icon: <Award size={20} /> },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="flex justify-center mb-2 text-cyan">{stat.icon}</div>
                  <p className="text-3xl font-black text-primary mb-1">{stat.value}</p>
                  <p className="text-sm text-secondary">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
