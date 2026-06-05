import { useNavigate } from 'react-router';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useScrollRestoration } from '../../../hooks/useScrollRestoration';
import { ArrowLeft, Download, FileText, Image, Zap, Mail } from 'lucide-react';

const ASSETS = [
  {
    category: 'Logos',
    items: [
      { name: 'GigBridge Logo (PNG)', size: '2048x2048', format: 'PNG' },
      { name: 'GigBridge Logo (SVG)', size: 'Vector', format: 'SVG' },
      { name: 'GigBridge Logo Light (PNG)', size: '2048x2048', format: 'PNG' },
      { name: 'GigBridge Icon Only (PNG)', size: '512x512', format: 'PNG' },
    ]
  },
  {
    category: 'Brand Colors',
    colors: [
      { name: 'Primary Cyan', hex: '#0077FF', rgb: 'rgb(0, 119, 255)' },
      { name: 'Primary Purple', hex: '#9F4BFF', rgb: 'rgb(159, 75, 255)' },
      { name: 'Success Green', hex: '#22C55E', rgb: 'rgb(34, 197, 94)' },
      { name: 'Warning Amber', hex: '#F59E0B', rgb: 'rgb(245, 158, 11)' },
      { name: 'Error Red', hex: '#EF4444', rgb: 'rgb(239, 68, 68)' },
    ]
  },
  {
    category: 'Screenshots',
    items: [
      { name: 'Dashboard Screenshot', size: '2560x1440', format: 'PNG' },
      { name: 'AI Matching Interface', size: '2560x1440', format: 'PNG' },
      { name: 'Mobile App View', size: '1170x2532', format: 'PNG' },
      { name: 'Job Posting Flow', size: '2560x1440', format: 'PNG' },
    ]
  },
  {
    category: 'Documents',
    items: [
      { name: 'Brand Guidelines', size: '8.2 MB', format: 'PDF' },
      { name: 'Company Fact Sheet', size: '1.5 MB', format: 'PDF' },
      { name: 'Press Release Template', size: '450 KB', format: 'DOCX' },
    ]
  },
];

const COMPANY_INFO = {
  founded: '2025',
  headquarters: 'San Francisco, California',
  employees: '50-100',
  funding: 'Series A ($15M)',
  users: '70,000+',
  countries: '150+',
};

const KEY_STATS = [
  { label: 'Active Freelancers', value: '52,847' },
  { label: 'Active Clients', value: '18,234' },
  { label: 'Projects Completed', value: '134,562' },
  { label: 'Total Paid Out', value: '$28.4M' },
  { label: 'Average Match Time', value: '<2 hours' },
  { label: 'Success Rate', value: '96.4%' },
];

export default function PressKitScreen() {
  const navigate = useNavigate();
  const { saveScrollPosition } = useScrollRestoration();

  return (
    <GuestLayout>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
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
                <FileText size={24} className="text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-primary">Press Kit</h1>
            </div>
            <p className="text-lg text-secondary max-w-3xl mx-auto">
              Media resources and brand assets for journalists, bloggers, and partners
            </p>
          </div>

          {/* Company Overview */}
          <div className="glass-card p-8 mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">About GigBridge</h2>
            <p className="text-secondary leading-relaxed mb-6">
              GigBridge is the world's first AI-powered freelance marketplace, revolutionizing how businesses
              find talent and how freelancers find work. Our platform uses advanced machine learning to create
              intelligent matches, automate interviews, generate proposals, and provide real-time market insights.
              Founded in 2025, we serve over 70,000 users across 150+ countries.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(COMPANY_INFO).map(([key, value]) => (
                <div key={key} className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-muted mb-1 capitalize">{key.replace('_', ' ')}</p>
                  <p className="text-sm text-primary font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Statistics */}
          <div className="glass-card p-8 mb-8">
            <h2 className="text-2xl font-bold text-primary mb-6">Key Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {KEY_STATS.map((stat, i) => (
                <div key={i} className="text-center bg-white/5 rounded-lg p-4">
                  <p className="text-2xl font-black text-primary mb-1">{stat.value}</p>
                  <p className="text-xs text-secondary">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Assets */}
          <div className="space-y-6 mb-8">
            {ASSETS.map((section, i) => (
              <div key={i} className="glass-card p-6">
                <h2 className="text-xl font-bold text-primary mb-4">{section.category}</h2>

                {section.colors ? (
                  <div className="grid md:grid-cols-5 gap-4">
                    {section.colors.map((color, j) => (
                      <div key={j} className="space-y-2">
                        <div
                          className="w-full h-20 rounded-lg border border-white/10"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-primary">{color.name}</p>
                          <p className="text-xs text-muted">{color.hex}</p>
                          <p className="text-xs text-muted">{color.rgb}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {section.items?.map((item, j) => (
                      <div key={j} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          {section.category === 'Screenshots' ? (
                            <Image size={20} className="text-purple" />
                          ) : section.category === 'Documents' ? (
                            <FileText size={20} className="text-cyan" />
                          ) : (
                            <Zap size={20} className="text-green" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-primary">{item.name}</p>
                            <p className="text-xs text-muted">{item.size} • {item.format}</p>
                          </div>
                        </div>
                        <button className="btn-ghost-cyan px-4 py-2 text-xs flex items-center gap-2">
                          <Download size={14} />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Download All */}
          <div className="glass-card p-8 text-center">
            <h3 className="text-xl font-bold text-primary mb-3">Download Complete Press Kit</h3>
            <p className="text-secondary mb-6">
              Get all logos, screenshots, brand guidelines, and documents in one package
            </p>
            <button className="btn-cyan px-8 py-3 flex items-center gap-2 mx-auto">
              <Download size={18} />
              Download Full Press Kit (25 MB)
            </button>
          </div>

          {/* Media Contact */}
          <div className="glass-card p-8 mt-8">
            <h3 className="text-xl font-bold text-primary mb-4 text-center">Media Inquiries</h3>
            <p className="text-secondary text-center mb-6">
              For press inquiries, interviews, or additional information, please contact:
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Mail size={18} className="text-cyan" />
                <a href="mailto:press@gigbridge.com" className="hover:text-cyan transition-colors">
                  press@gigbridge.com
                </a>
              </div>
              <p className="text-sm text-secondary">
                Response time: Within 24 hours
              </p>
            </div>
          </div>

          {/* Usage Guidelines */}
          <div className="glass-card p-6 mt-8">
            <h3 className="text-lg font-bold text-primary mb-3">Brand Usage Guidelines</h3>
            <ul className="space-y-2 text-sm text-secondary">
              <li>• Do not modify, rotate, or alter the GigBridge logo</li>
              <li>• Maintain clear space around the logo (minimum 20px)</li>
              <li>• Use official brand colors; do not create custom color variations</li>
              <li>• Do not use the logo as part of your product or company name</li>
              <li>• For detailed guidelines, download the Brand Guidelines PDF</li>
            </ul>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
